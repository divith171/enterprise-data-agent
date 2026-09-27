import os

os.environ["OPENAI_API_KEY"] = "test-key"

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.explanation_service import explain_result


def build_response(content):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(
                    content=content
                )
            )
        ]
    )


def build_protected_context():
    return {
        "safe_to_send": True,
        "mode": "bounded_result",
        "llm_context": {
            "row_count": 1,
            "columns": [
                "total_revenue",
            ],
            "rows": [
                [115000],
            ],
        },
    }


@pytest.mark.asyncio
async def test_explain_result_returns_explanation_and_elapsed():
    mock_client = MagicMock()

    mock_client.chat.completions.create = AsyncMock(
        return_value=build_response(
            "  Revenue increased by 15% during the period.  "
        )
    )

    with patch(
        "services.explanation_service.client",
        mock_client,
    ):
        result = await explain_result(
            "What happened to revenue?",
            build_protected_context(),
        )

    assert result["explanation"] == (
        "Revenue increased by 15% during the period."
    )

    assert isinstance(
        result["elapsed"],
        float,
    )

    assert result["elapsed"] >= 0

    assert (
        result["explanation_mode"]
        == "bounded_result"
    )


@pytest.mark.asyncio
async def test_explain_result_calls_openai_with_expected_parameters():
    mock_client = MagicMock()

    mock_client.chat.completions.create = AsyncMock(
        return_value=build_response(
            "Revenue was $115,000."
        )
    )

    with patch(
        "services.explanation_service.client",
        mock_client,
    ):
        await explain_result(
            "What is total revenue?",
            build_protected_context(),
        )

    (
        mock_client
        .chat
        .completions
        .create
        .assert_awaited_once()
    )

    call_kwargs = (
        mock_client
        .chat
        .completions
        .create
        .await_args
        .kwargs
    )

    assert (
        call_kwargs["model"]
        == "gpt-4o-mini"
    )

    assert call_kwargs["temperature"] == 0

    assert len(
        call_kwargs["messages"]
    ) == 1

    assert (
        call_kwargs["messages"][0]["role"]
        == "user"
    )


@pytest.mark.asyncio
async def test_explain_result_includes_question_and_only_approved_context():
    mock_client = MagicMock()

    mock_client.chat.completions.create = AsyncMock(
        return_value=build_response(
            "The result is 115000."
        )
    )

    protected_context = build_protected_context()

    with patch(
        "services.explanation_service.client",
        mock_client,
    ):
        await explain_result(
            "Show total sales",
            protected_context,
        )

    prompt = (
        mock_client
        .chat
        .completions
        .create
        .await_args
        .kwargs["messages"][0]["content"]
    )

    assert "Show total sales" in prompt

    assert "total_revenue" in prompt

    assert "115000" in prompt

    # SQL is no longer sent to the explanation model.
    assert "SELECT SUM(amount)" not in prompt

    assert "SQL query executed" not in prompt


@pytest.mark.asyncio
async def test_blocked_context_does_not_call_openai():
    mock_client = MagicMock()

    mock_client.chat.completions.create = AsyncMock()

    protected_context = {
        "safe_to_send": False,
        "mode": "blocked",
        "llm_context": {
            "row_count": 1,
            "message": (
                "No fields are approved "
                "for external explanation."
            ),
        },
    }

    with patch(
        "services.explanation_service.client",
        mock_client,
    ):
        result = await explain_result(
            "Show customer information",
            protected_context,
        )

    (
        mock_client
        .chat
        .completions
        .create
        .assert_not_awaited()
    )

    assert (
        result["explanation_mode"]
        == "blocked"
    )