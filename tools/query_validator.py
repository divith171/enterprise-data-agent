import re


FORBIDDEN_KEYWORDS = [
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "truncate",
    "create",
    "grant",
    "revoke",
    "into"
]


FORBIDDEN_FUNCTIONS = [
    "pg_sleep",
    "pg_sleep_for",
    "pg_sleep_until",
    "pg_cancel_backend",
    "pg_terminate_backend",
    "pg_reload_conf",
    "pg_rotate_logfile",
    "pg_read_file",
    "pg_read_binary_file",
    "pg_ls_dir",
    "lo_import",
    "lo_export",
    "nextval",
    "setval",
    "pg_advisory_lock",
    "pg_advisory_xact_lock",
]

class QueryValidationError(Exception):
    def __init__(self, message: str, code: str):
        self.code = code
        super().__init__(message)


def validate_query(query: str) -> None:
    """
    Validates that the query is read-only and safe to execute.
    Raises QueryValidationError if validation fails.
    """

    if not query or not query.strip():
        raise QueryValidationError("Query is empty.",code="EMPTY_QUERY")

    query_lower = query.lower().strip()

    # 1️⃣ Reject multiple statements (more than one semicolon not at end)
    if ";" in query_lower[:-1]:
        raise QueryValidationError("Multiple SQL statements are not allowed.",code="MULTIPLE_STATEMENTS")

    # 2️⃣ Check forbidden keywords
    for keyword in FORBIDDEN_KEYWORDS:
        pattern = r"\b" + keyword + r"\b"

        if re.search(pattern, query_lower):
            raise QueryValidationError(
                f"Forbidden keyword detected: {keyword.upper()}",
                code="FORBIDDEN_OPERATION"
            )

    # Check dangerous PostgreSQL functions
    for function_name in FORBIDDEN_FUNCTIONS:
        pattern = r"\b" + re.escape(function_name) + r"\b"

        if re.search(pattern, query_lower):
            raise QueryValidationError(
                f"Forbidden function detected: {function_name}",
                code="FORBIDDEN_OPERATION"
            )

    # 3️⃣ Must contain SELECT somewhere (allow CTE with WITH)
    if not query_lower.startswith("select") and not query_lower.startswith("with"):
        raise QueryValidationError("Only SELECT queries are allowed.",code="INVALID_QUERY_TYPE")