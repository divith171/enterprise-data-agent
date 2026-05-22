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
    "revoke"
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
            raise QueryValidationError(f"Forbidden keyword detected: {keyword.upper()}",code="FORBIDDEN_OPERATION")

    # 3️⃣ Must contain SELECT somewhere (allow CTE with WITH)
    if not query_lower.startswith("select") and not query_lower.startswith("with"):
        raise QueryValidationError("Only SELECT queries are allowed.",code="INVALID_QUERY_TYPE")