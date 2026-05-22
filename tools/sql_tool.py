from db.connection import get_connection
from tools.query_validator import validate_query, QueryValidationError


def run_query(query: str):
    try:
        # 1️⃣ Validate before execution
        validate_query(query)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(query)

        results = cursor.fetchall()
        cursor.close()
        conn.close()

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
        return {
            "status": "execution_error",
            "error": str(e)
        }