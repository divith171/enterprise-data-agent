import json
from typing import Any, Dict, List, Sequence


# ---------------------------------------------------------
# V1 EXPLANATION DATA-EGRESS POLICY
# ---------------------------------------------------------

# Hard ceilings.
#
# These are NOT the intelligence layer.
# They are the final safety boundary that prevents an
# unrestricted fetchall() result from flowing to an LLM.
MAX_LLM_RESULT_ROWS = 50
MAX_LLM_PAYLOAD_CHARS = 12000
MAX_CELL_TEXT_CHARS = 500


# ---------------------------------------------------------
# SENSITIVE COLUMN POLICY
# ---------------------------------------------------------

# These fields should not be included in the external
# explanation payload by default.
#
# This list is intentionally conservative for V1.
SENSITIVE_COLUMN_MARKERS = {
    "email",
    "phone",
    "mobile",
    "ssn",
    "social_security",
    "date_of_birth",
    "dob",
    "address",
    "postal_code",
    "zip_code",
    "account_number",
    "card_number",
    "credit_card",
    "iban",
    "routing_number",
    "password",
    "passwd",
    "secret",
    "token",
    "api_key",
    "apikey",
    "access_key",
    "private_key",
    "session",
    "csrf",
}


# ---------------------------------------------------------
# COLUMN HELPERS
# ---------------------------------------------------------

def _normalize_column_name(
    column_name: str,
) -> str:
    return (
        str(column_name)
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )


def is_sensitive_column(
    column_name: str,
) -> bool:
    normalized = _normalize_column_name(
        column_name
    )

    return any(
        marker in normalized
        for marker in SENSITIVE_COLUMN_MARKERS
    )


# ---------------------------------------------------------
# ROW NORMALIZATION
# ---------------------------------------------------------

def _row_to_values(
    row: Any,
    columns: Sequence[str],
) -> List[Any]:

    if isinstance(row, dict):
        return [
            row.get(column)
            for column in columns
        ]

    if isinstance(row, (list, tuple)):
        return list(row)

    return [row]


def _contains_oversized_text(
    value: Any,
) -> bool:

    return (
        isinstance(value, str)
        and len(value) > MAX_CELL_TEXT_CHARS
    )


# ---------------------------------------------------------
# SAFE RESULT EXTRACTION
# ---------------------------------------------------------

def _filter_sensitive_columns(
    columns: Sequence[str],
    rows: Sequence[Any],
):
    safe_indexes = []
    safe_columns = []
    removed_columns = []

    for index, column in enumerate(columns):

        if is_sensitive_column(column):
            removed_columns.append(
                str(column)
            )
            continue

        safe_indexes.append(index)
        safe_columns.append(
            str(column)
        )

    filtered_rows = []

    for row in rows:
        values = _row_to_values(
            row,
            columns,
        )

        filtered_row = []

        for index in safe_indexes:

            if index >= len(values):
                filtered_row.append(None)
                continue

            filtered_row.append(
                values[index]
            )

        filtered_rows.append(
            filtered_row
        )

    return (
        safe_columns,
        filtered_rows,
        removed_columns,
    )


# ---------------------------------------------------------
# PAYLOAD SIZE
# ---------------------------------------------------------

def _serialized_size(
    payload: Dict[str, Any],
) -> int:

    return len(
        json.dumps(
            payload,
            default=str,
            ensure_ascii=False,
        )
    )


# ---------------------------------------------------------
# EXPLANATION CONTEXT BUILDER
# ---------------------------------------------------------

def build_explanation_context(
    *,
    columns: Sequence[str],
    rows: Sequence[Any],
) -> Dict[str, Any]:
    """
    Build the bounded database-result context that may
    be sent to an external LLM for explanation.

    IMPORTANT:

    - The full database result is NOT modified.
    - This function creates a separate LLM-safe view.
    - Sensitive columns are removed.
    - Large result sets are not sampled and presented
      as though they represent the full dataset.
    - Oversized payloads fail into summary-only mode.
    """

    columns = list(columns or [])
    rows = list(rows or [])

    total_rows = len(rows)

    (
        safe_columns,
        safe_rows,
        removed_columns,
    ) = _filter_sensitive_columns(
        columns,
        rows,
    )

    # -----------------------------------------------------
    # No safe columns remain
    # -----------------------------------------------------

    if not safe_columns:

        return {
            "safe_to_send": False,
            "mode": "blocked",
            "llm_context": {
                "row_count": total_rows,
                "message": (
                    "The result contains no fields "
                    "approved for external explanation."
                ),
            },
            "metadata": {
                "rows_returned": total_rows,
                "rows_sent": 0,
                "columns_returned": len(columns),
                "columns_sent": 0,
                "removed_columns": removed_columns,
            },
        }

    # -----------------------------------------------------
    # Large result
    #
    # Do NOT send the first N rows and pretend that they
    # represent the whole result.
    # -----------------------------------------------------

    if total_rows > MAX_LLM_RESULT_ROWS:

        return {
            "safe_to_send": True,
            "mode": "summary_only",
            "llm_context": {
                "row_count": total_rows,
                "columns": safe_columns,
                "message": (
                    "The complete query result is too "
                    "large to transmit to the external "
                    "explanation model. Only result "
                    "metadata is available."
                ),
            },
            "metadata": {
                "rows_returned": total_rows,
                "rows_sent": 0,
                "columns_returned": len(columns),
                "columns_sent": len(
                    safe_columns
                ),
                "removed_columns": removed_columns,
            },
        }

    # -----------------------------------------------------
    # Prevent large text values from crossing boundary
    # -----------------------------------------------------

    for row in safe_rows:
        for value in row:

            if _contains_oversized_text(value):

                return {
                    "safe_to_send": True,
                    "mode": "summary_only",
                    "llm_context": {
                        "row_count": total_rows,
                        "columns": safe_columns,
                        "message": (
                            "The query result contains "
                            "large text values. Raw values "
                            "were not transmitted to the "
                            "external explanation model."
                        ),
                    },
                    "metadata": {
                        "rows_returned": total_rows,
                        "rows_sent": 0,
                        "columns_returned": len(
                            columns
                        ),
                        "columns_sent": len(
                            safe_columns
                        ),
                        "removed_columns": (
                            removed_columns
                        ),
                    },
                }

    # -----------------------------------------------------
    # Candidate bounded analytical result
    # -----------------------------------------------------

    llm_context = {
        "row_count": total_rows,
        "columns": safe_columns,
        "rows": safe_rows,
    }

    payload_size = _serialized_size(
        llm_context
    )

    # -----------------------------------------------------
    # Serialized payload too large
    # -----------------------------------------------------

    if payload_size > MAX_LLM_PAYLOAD_CHARS:

        return {
            "safe_to_send": True,
            "mode": "summary_only",
            "llm_context": {
                "row_count": total_rows,
                "columns": safe_columns,
                "message": (
                    "The query result exceeded the "
                    "maximum explanation payload size. "
                    "Raw values were not transmitted."
                ),
            },
            "metadata": {
                "rows_returned": total_rows,
                "rows_sent": 0,
                "columns_returned": len(columns),
                "columns_sent": len(
                    safe_columns
                ),
                "removed_columns": removed_columns,
            },
        }

    # -----------------------------------------------------
    # Safe bounded result
    # -----------------------------------------------------

    return {
        "safe_to_send": True,
        "mode": "bounded_result",
        "llm_context": llm_context,
        "metadata": {
            "rows_returned": total_rows,
            "rows_sent": total_rows,
            "columns_returned": len(columns),
            "columns_sent": len(
                safe_columns
            ),
            "removed_columns": removed_columns,
        },
    }