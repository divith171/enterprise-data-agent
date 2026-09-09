import os

os.environ.setdefault("OPENAI_API_KEY", "test-key")

from unittest.mock import MagicMock, patch

from services.interpretation_service import (
    detect_ambiguities,
    parse_user_response,
)


def test_detect_ambiguities_with_multiple_metrics_comparison_and_missing_time():
    intent = {
        "comparisons": ["high"],
        "time": None,
    }

    concept_mappings = [
        ("customers", "sales"),
        ("customers", "credit_score"),
    ]

    result = detect_ambiguities(
        user_question="show high customers",
        stored_columns=[],
        intent=intent,
        concept_mappings=concept_mappings,
    )

    assert "Which metric should be used: sales, credit_score?" in result
    assert "What threshold defines 'high' for sales?" in result
    assert "What threshold defines 'high' for credit_score?" in result
    assert "Should this be calculated over a specific time period?" in result
    assert len(result) == 4


def test_detect_ambiguities_with_no_comparison_and_defined_time():
    intent = {
        "comparisons": [],
        "time": "last year",
    }

    concept_mappings = [
        ("customers", "sales"),
        ("customers", "sales"),
    ]

    result = detect_ambiguities(
        user_question="show sales",
        stored_columns=[],
        intent=intent,
        concept_mappings=concept_mappings,
    )

    assert result == [
        "Which metric should be used: sales, sales?",
    ]


def test_detect_ambiguities_with_no_mapped_columns():
    intent = {
        "comparisons": [],
        "time": None,
    }

    result = detect_ambiguities(
        user_question="show sales",
        stored_columns=[],
        intent=intent,
        concept_mappings=[],
    )

    assert result == [
        "Should this be calculated over a specific time period?"
    ]


def make_openai_response(content):
    response = MagicMock()
    response.choices[0].message.content = content
    return response


def test_parse_user_response_extracts_threshold_operator_and_time_range():
    llm_response = """
    ```json
    {
        "threshold": 500,
        "operator": "<",
        "time_range": "last 6 months"
    }
    """

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = make_openai_response(
        llm_response
    )

    with patch(
        "services.interpretation_service.client",
        mock_client,
    ):
        result = parse_user_response(
            "show customers with less than five hundred sales "
            "in the last 6 months"
        )

    mock_client.chat.completions.create.assert_called_once()

    call_kwargs = mock_client.chat.completions.create.call_args.kwargs

    assert call_kwargs["model"] == "gpt-4o-mini"
    assert call_kwargs["temperature"] == 0

    assert result == {
        "threshold": 500,
        "operator": "<",
        "time_range": "last 6 months",
    }


def test_parse_user_response_normalizes_word_numbers_before_llm_call():
    llm_response = """
    {
        "threshold": 1000,
        "operator": ">",
        "time_range": "last year"
    }
    """

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = make_openai_response(
        llm_response
    )

    with patch(
        "services.interpretation_service.client",
        mock_client,
    ):
        result = parse_user_response(
            "show customers with more than one thousand sales "
            "in the last year"
        )

    mock_client.chat.completions.create.assert_called_once()

    call_kwargs = mock_client.chat.completions.create.call_args.kwargs
    prompt = call_kwargs["messages"][1]["content"]

    # The service should normalize the standalone word "one" to "1".
    assert "more than 1 thousand sales" in prompt
    assert "more than one thousand sales" not in prompt

    assert result == {
        "threshold": 1000,
        "operator": ">",
        "time_range": "last year",
    }


def test_parse_user_response_invalid_json_returns_empty_values():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = make_openai_response(
        "not valid json"
    )

    with patch(
        "services.interpretation_service.client",
        mock_client,
    ):
        result = parse_user_response("show customers")

    mock_client.chat.completions.create.assert_called_once()

    assert result == {
        "threshold": None,
        "operator": None,
        "time_range": None,
    }