from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from services.intent_continuation_service import classify_intent_continuation


def build_response(content):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=content)
            )
        ]
    )


def test_classify_intent_continuation_parses_valid_json():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        '{"intent_type": "continuation"}'
    )

    with patch(
        "services.intent_continuation_service.client",
        mock_client,
    ):
        result = classify_intent_continuation(
            "monthly payment totals",
            "group by state",
        )

    assert result == {"intent_type": "continuation"}
    mock_client.chat.completions.create.assert_called_once()


def test_classify_intent_continuation_parses_clarification():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        '{"intent_type": "clarification"}'
    )

    with patch(
        "services.intent_continuation_service.client",
        mock_client,
    ):
        result = classify_intent_continuation(
            "monthly payment totals",
            "last 6 months",
        )

    assert result == {"intent_type": "clarification"}


def test_classify_intent_continuation_parses_new_query():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        '{"intent_type": "new_query"}'
    )

    with patch(
        "services.intent_continuation_service.client",
        mock_client,
    ):
        result = classify_intent_continuation(
            "top customers",
            "declining regions",
        )

    assert result == {"intent_type": "new_query"}


def test_classify_intent_continuation_strips_json_code_fence():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        """```json
{"intent_type": "continuation"}
```"""
    )

    with patch(
        "services.intent_continuation_service.client",
        mock_client,
    ):
        result = classify_intent_continuation(
            "monthly payment totals",
            "group by state",
        )

    assert result == {"intent_type": "continuation"}


def test_classify_intent_continuation_falls_back_to_new_query():
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = build_response(
        "not valid json"
    )

    with patch(
        "services.intent_continuation_service.client",
        mock_client,
    ):
        result = classify_intent_continuation(
            "monthly payment totals",
            "group by state",
        )

    assert result == {"intent_type": "new_query"}