from db.connection import get_pool
from tools.query_validator import (
    validate_query,
    QueryValidationError,
)
from observability.security_audit import log_security_event

import traceback


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

                results = await cursor.fetchall()

        return {
            "status": "success",
            "columns": columns,
            "data": results,
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