import os
os.environ["OPENAI_API_KEY"] = "test-key"
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from services.query_type_service import classify_query_type


def build_response(content):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=content)
            )
        ]
    )


def test_classify_query_type_parses_retrieval():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        '{"query_type": "retrieval"}'
    )

    with patch(
        "services.query_type_service.client",
        mock_client,
    ):
        result = classify_query_type(
            "show all customers from California"
        )

    assert result == {"query_type": "retrieval"}
    mock_client.chat.completions.create.assert_called_once()


def test_classify_query_type_parses_aggregation():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        '{"query_type": "aggregation"}'
    )

    with patch(
        "services.query_type_service.client",
        mock_client,
    ):
        result = classify_query_type(
            "what is the total revenue"
        )

    assert result == {"query_type": "aggregation"}


def test_classify_query_type_parses_ranking():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        '{"query_type": "ranking"}'
    )

    with patch(
        "services.query_type_service.client",
        mock_client,
    ):
        result = classify_query_type(
            "show the top 10 customers"
        )

    assert result == {"query_type": "ranking"}


def test_classify_query_type_parses_trend():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        '{"query_type": "trend"}'
    )

    with patch(
        "services.query_type_service.client",
        mock_client,
    ):
        result = classify_query_type(
            "show revenue trends over the last year"
        )

    assert result == {"query_type": "trend"}


def test_classify_query_type_falls_back_to_aggregation_for_invalid_json():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        "not valid json"
    )

    with patch(
        "services.query_type_service.client",
        mock_client,
    ):
        result = classify_query_type(
            "some analytical question"
        )

    assert result == {"query_type": "aggregation"}