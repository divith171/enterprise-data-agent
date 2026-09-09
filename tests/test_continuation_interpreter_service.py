from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from services.continuation_interpreter_service import interpret_continuation


def build_response(content):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=content)
            )
        ]
    )


def test_interpret_continuation_parses_valid_json():
    content = """
    {
        "refined_query": "monthly payment totals grouped by state",
        "group_by": "state",
        "time_granularity": null,
        "filter_condition": null,
        "metric_refinement": null
    }
    """

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(content)

    with patch(
        "services.continuation_interpreter_service.client",
        mock_client,
    ):
        result = interpret_continuation(
            "monthly payment totals",
            "grouped by state",
        )

    assert result == {
        "refined_query": "monthly payment totals grouped by state",
        "group_by": "state",
        "time_granularity": None,
        "filter_condition": None,
        "metric_refinement": None,
    }

    mock_client.chat.completions.create.assert_called_once()


def test_interpret_continuation_strips_json_code_fence():
    content = """```json
{
    "refined_query": "monthly payment totals for last year",
    "group_by": null,
    "time_granularity": "month",
    "filter_condition": "last year",
    "metric_refinement": null
}
```"""

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(content)

    with patch(
        "services.continuation_interpreter_service.client",
        mock_client,
    ):
        result = interpret_continuation(
            "monthly payment totals",
            "show monthly totals for last year",
        )

    assert result["refined_query"] == "monthly payment totals for last year"
    assert result["time_granularity"] == "month"
    assert result["filter_condition"] == "last year"


def test_interpret_continuation_returns_fallback_for_invalid_json():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        "not valid json"
    )

    with patch(
        "services.continuation_interpreter_service.client",
        mock_client,
    ):
        result = interpret_continuation(
            "monthly payment totals",
            "grouped by state",
        )

    assert result == {
        "refined_query": "monthly payment totals grouped by state",
        "group_by": None,
        "time_granularity": None,
        "filter_condition": None,
        "metric_refinement": None,
    }