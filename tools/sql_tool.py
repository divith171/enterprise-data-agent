from db.connection import get_pool
from tools.query_validator import (
    validate_query,
    QueryValidationError,
)
from observability.security_audit import log_security_event

import traceback
from psycopg import postgres


def _column_type(column) -> str:
    """Map built-in PostgreSQL OIDs, never guess from values or identifiers."""
    oid = getattr(column, "type_code", None)
    type_info = postgres.types.get(oid) if isinstance(oid, int) else None
    if type_info is None:
        return "unknown"
    return type_info.name + ("[]" if oid == type_info.array_oid else "")


async def run_query(query: str):
    try:
        # -------------------------------
        # Validate before execution
        # -------------------------------

        validate_query(query)

        async with get_pool().connection() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(query)

                columns = [
                    column.name
                    for column in cursor.description
                ]

                column_metadata = [
                    {"index": index, "name": column.name, "type": _column_type(column)}
                    for index, column in enumerate(cursor.description)
                ]

                results = await cursor.fetchall()

        return {
            "status": "success",
            "columns": columns,
            "data": results,
            "column_metadata": column_metadata,
            # fetchall() returns the entire executed result; no server cap exists.
            "truncated": False,
        }

    except QueryValidationError as e:

        # -------------------------------
        # Security Audit
        # -------------------------------

        log_security_event(
            action="sql_execution",
            outcome="blocked",
            reason_code=e.code,
            resource_type="generated_sql",
        )

        return {
            "status": "validation_error",
            "error": str(e),
        }

    except Exception:
        traceback.print_exc()

        return {
            "status": "execution_error",
            "error": "Database query execution failed.",
        }
