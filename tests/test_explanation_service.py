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
                message=SimpleNamespace(content=content)
            )
        ]
    )


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
            "SELECT SUM(revenue) FROM sales",
            [{"sum": 115000}],
        )

    assert result["explanation"] == (
        "Revenue increased by 15% during the period."
    )
    assert isinstance(result["elapsed"], float)
    assert result["elapsed"] >= 0


@pytest.mark.asyncio
async def test_explain_result_calls_openai_with_expected_parameters():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=build_response("Revenue was $115,000.")
    )

    with patch(
        "services.explanation_service.client",
        mock_client,
    ):
        await explain_result(
            "What is total revenue?",
            "SELECT SUM(revenue) FROM sales",
            [{"sum": 115000}],
        )

    mock_client.chat.completions.create.assert_awaited_once()

    call_kwargs = mock_client.chat.completions.create.await_args.kwargs

    assert call_kwargs["model"] == "gpt-4o-mini"
    assert call_kwargs["temperature"] == 0
    assert len(call_kwargs["messages"]) == 1
    assert call_kwargs["messages"][0]["role"] == "user"


@pytest.mark.asyncio
async def test_explain_result_includes_question_sql_and_result_in_prompt():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=build_response("The result is 100.")
    )

    with patch(
        "services.explanation_service.client",
        mock_client,
    ):
        await explain_result(
            "Show total sales",
            "SELECT SUM(amount) FROM sales",
            [{"sum": 100}],
        )

    prompt = (
        mock_client.chat.completions.create
        .await_args.kwargs["messages"][0]["content"]
    )

    assert "Show total sales" in prompt
    assert "SELECT SUM(amount) FROM sales" in prompt
    assert "[{'sum': 100}]" in prompt