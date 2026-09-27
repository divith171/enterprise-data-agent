import os
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest


# Test-only key so AsyncOpenAI can be constructed.
# No real OpenAI request is made in these tests.
os.environ.setdefault(
    "OPENAI_API_KEY",
    "test-openai-key",
)

from services import explanation_service


@pytest.mark.asyncio
async def test_blocked_context_does_not_call_openai(
    monkeypatch,
):
    create_mock = AsyncMock()

    monkeypatch.setattr(
        explanation_service.client.chat.completions,
        "create",
        create_mock,
    )

    protected_context = {
        "safe_to_send": False,
        "mode": "blocked",
        "llm_context": {
            "row_count": 1,
            "message": (
                "The result contains no fields "
                "approved for external explanation."
            ),
        },
    }

    result = await explanation_service.explain_result(
        "Show customer emails",
        protected_context,
    )

    assert result["explanation_mode"] == "blocked"

    create_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_approved_context_sends_only_protected_data(
    monkeypatch,
):
    response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(
                    content=(
                        "Revenue declined from Q1 to Q2."
                    )
                )
            )
        ]
    )

    create_mock = AsyncMock(
        return_value=response
    )

    monkeypatch.setattr(
        explanation_service.client.chat.completions,
        "create",
        create_mock,
    )

    protected_context = {
        "safe_to_send": True,
        "mode": "bounded_result",
        "llm_context": {
            "row_count": 2,
            "columns": [
                "quarter",
                "revenue",
            ],
            "rows": [
                ["Q1", 1000000],
                ["Q2", 850000],
            ],
        },
    }

    result = await explanation_service.explain_result(
        "How did revenue change?",
        protected_context,
    )

    assert (
        result["explanation"]
        == "Revenue declined from Q1 to Q2."
    )

    assert (
        result["explanation_mode"]
        == "bounded_result"
    )

    create_mock.assert_awaited_once()

    call = create_mock.await_args

    prompt = (
        call.kwargs["messages"][0]["content"]
    )

    assert "Q1" in prompt
    assert "Q2" in prompt
    assert "1000000" in prompt
    assert "850000" in prompt

    assert "SQL query executed" not in prompt

    assert "password" not in prompt.lower()
    assert "secret-auth-session" not in prompt.lower()