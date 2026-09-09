import pytest

from services.intent_guardrail import (
    IntentViolation,
    check_user_intent,
)


@pytest.mark.parametrize(
    "question",
    [
        "delete all customer records",
        "drop the users table",
        "update customer addresses",
        "insert a new customer",
        "truncate the sales table",
        "alter the orders table",
        "create a new table",
    ],
)
def test_rejects_destructive_intent(question):
    with pytest.raises(
        IntentViolation,
        match="This system supports read-only analytical queries only.",
    ):
        check_user_intent(question)


def test_allows_read_only_analytical_question():
    check_user_intent(
        "Show total sales by region for the last 30 days"
    )


def test_detection_is_case_insensitive():
    with pytest.raises(IntentViolation):
        check_user_intent("DROP the customers table")


def test_does_not_raise_for_empty_question():
    check_user_intent("")


def test_current_substring_matching_behavior():
    with pytest.raises(IntentViolation):
        check_user_intent("Show updated sales numbers")