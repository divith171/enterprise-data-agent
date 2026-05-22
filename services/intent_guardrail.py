class IntentViolation(Exception):
    pass


FORBIDDEN_KEYWORDS = [
    "delete",
    "drop",
    "update",
    "insert",
    "truncate",
    "alter",
    "create"
]


def check_user_intent(question: str):
    """
    Detect if user question attempts a destructive operation.
    """

    q = question.lower()

    for word in FORBIDDEN_KEYWORDS:
        if word in q:
            raise IntentViolation(
                "This system supports read-only analytical queries only."
            )