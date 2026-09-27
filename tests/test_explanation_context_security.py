from services.explanation_context_service import (
    MAX_LLM_RESULT_ROWS,
    build_explanation_context,
)


def test_small_aggregate_result_is_allowed():
    result = build_explanation_context(
        columns=[
            "quarter",
            "revenue",
        ],
        rows=[
            ("Q1", 1000000),
            ("Q2", 850000),
        ],
    )

    assert result["safe_to_send"] is True
    assert result["mode"] == "bounded_result"

    assert result["llm_context"] == {
        "row_count": 2,
        "columns": [
            "quarter",
            "revenue",
        ],
        "rows": [
            ["Q1", 1000000],
            ["Q2", 850000],
        ],
    }

    assert result["metadata"]["rows_sent"] == 2
    assert result["metadata"]["removed_columns"] == []


def test_sensitive_columns_are_removed_before_llm():
    result = build_explanation_context(
        columns=[
            "customer_name",
            "email",
            "revenue",
        ],
        rows=[
            (
                "Alice",
                "alice@example.com",
                1000,
            ),
            (
                "Bob",
                "bob@example.com",
                2000,
            ),
        ],
    )

    assert result["safe_to_send"] is True
    assert result["mode"] == "bounded_result"

    assert result["llm_context"]["columns"] == [
        "customer_name",
        "revenue",
    ]

    assert result["llm_context"]["rows"] == [
        ["Alice", 1000],
        ["Bob", 2000],
    ]

    assert result["metadata"]["removed_columns"] == [
        "email"
    ]

    serialized = str(result)

    assert "alice@example.com" not in serialized
    assert "bob@example.com" not in serialized


def test_result_with_only_sensitive_columns_is_blocked():
    result = build_explanation_context(
        columns=[
            "email",
            "phone_number",
            "api_key",
        ],
        rows=[
            (
                "alice@example.com",
                "9999999999",
                "SECRET-KEY",
            )
        ],
    )

    assert result["safe_to_send"] is False
    assert result["mode"] == "blocked"

    assert result["metadata"]["rows_sent"] == 0
    assert result["metadata"]["columns_sent"] == 0

    serialized = str(result)

    assert "alice@example.com" not in serialized
    assert "9999999999" not in serialized
    assert "SECRET-KEY" not in serialized


def test_large_result_becomes_summary_only():
    rows = [
        (
            index,
            index * 100,
        )
        for index in range(
            MAX_LLM_RESULT_ROWS + 1
        )
    ]

    result = build_explanation_context(
        columns=[
            "month_number",
            "revenue",
        ],
        rows=rows,
    )

    assert result["safe_to_send"] is True
    assert result["mode"] == "summary_only"

    assert result["llm_context"]["row_count"] == (
        MAX_LLM_RESULT_ROWS + 1
    )

    assert "rows" not in result["llm_context"]

    assert result["metadata"]["rows_sent"] == 0


def test_large_text_value_is_not_sent():
    secret_text = "X" * 1000

    result = build_explanation_context(
        columns=[
            "category",
            "notes",
        ],
        rows=[
            (
                "enterprise",
                secret_text,
            )
        ],
    )

    assert result["safe_to_send"] is True
    assert result["mode"] == "summary_only"

    assert "rows" not in result["llm_context"]
    assert secret_text not in str(result)

    assert result["metadata"]["rows_sent"] == 0


def test_builder_does_not_modify_original_result():
    columns = [
        "customer_name",
        "email",
        "revenue",
    ]

    rows = [
        (
            "Alice",
            "alice@example.com",
            1000,
        )
    ]

    original_columns = list(columns)
    original_rows = list(rows)

    build_explanation_context(
        columns=columns,
        rows=rows,
    )

    assert columns == original_columns
    assert rows == original_rows