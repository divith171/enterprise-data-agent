from db.connection import get_pool
from tools.query_validator import validate_query, QueryValidationError
import traceback


async def run_query(query: str):
    try:
        # 1️⃣ Validate before execution
        validate_query(query)

        async with get_pool().connection() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(query)
                results = await cursor.fetchall()

        return {
            "status": "success",
            "data": results
        }

    except QueryValidationError as e:
        return {
            "status": "validation_error",
            "error": str(e)
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "status": "execution_error",
            "error": str(e)
        }