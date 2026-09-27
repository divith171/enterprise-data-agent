from types import SimpleNamespace
from unittest.mock import Mock

from services import interpretation_service


def make_llm_response(content):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(
                    content=content
                )
            )
        ]
    )


def test_expand_concepts_preserves_valid_list(monkeypatch):
    monkeypatch.setattr(
        interpretation_service.client.chat.completions,
        "create",
        lambda **kwargs: make_llm_response(
            '["payment_amount", "loan_amount"]'
        ),
    )

    result = interpretation_service.expand_concepts(
        "show engagement and exposure",
        {
            "payments": ["payment_amount"],
            "loans": ["loan_amount"],
        },
    )

    assert result == [
        "payment_amount",
        "loan_amount",
    ]


def test_expand_concepts_rejects_code_execution(monkeypatch):
    system_mock = Mock()

    monkeypatch.setattr(
        interpretation_service.os,
        "system",
        system_mock,
    )

    monkeypatch.setattr(
        interpretation_service.client.chat.completions,
        "create",
        lambda **kwargs: make_llm_response(
            '__import__("os").system("SHOULD_NOT_RUN")'
        ),
    )

    result = interpretation_service.expand_concepts(
        "malicious input",
        {
            "payments": ["payment_amount"],
        },
    )

    assert result == []
    system_mock.assert_not_called()