import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

os.environ["OPENAI_API_KEY"] = "test-key"
os.environ["ANTHROPIC_API_KEY"] = "test-key"

from observability.context import (
    clear_request_context,
    create_request_context,
    set_request_context,
)
from services.llm_gateway import (
    LLMGatewayError,
    MAX_RETRIES,
    _anthropic_chat,
    _execute_with_retry,
    _openai_chat,
)


@pytest.mark.anyio
async def test_openai_chat_emits_llm_telemetry():
    context = create_request_context(session_id="test-session")
    set_request_context(context)

    try:
        response = SimpleNamespace(
            usage=SimpleNamespace(
                prompt_tokens=100,
                completion_tokens=25,
                total_tokens=125,
                prompt_tokens_details=SimpleNamespace(cached_tokens=10),
                completion_tokens_details=SimpleNamespace(reasoning_tokens=5),
            )
        )

        with patch(
            "services.llm_gateway._execute_with_retry",
            new=AsyncMock(return_value=response),
        ), patch("services.llm_gateway.log_event") as mock_log:

            result = await _openai_chat(
                model="gpt-4.1",
                messages=[{"role": "user", "content": "test"}],
                layer="reasoning",
            )

        assert result is response
        mock_log.assert_called_once()

        event = mock_log.call_args.args[0]

        assert event["event_type"] == "llm_completed"
        assert event["provider"] == "OpenAI"
        assert event["model"] == "gpt-4.1"
        assert event["layer"] == "reasoning"
        assert event["input_tokens"] == 100
        assert event["output_tokens"] == 25
        assert event["total_tokens"] == 125
        assert event["cached_tokens"] == 10
        assert event["reasoning_tokens"] == 5
        assert event["estimated_cost"] is None
        assert event["status"] == "success"
        assert event["request_id"] == context.request_id
        assert event["trace_id"] == context.trace_id
        assert event["session_id"] == "test-session"
        assert isinstance(event["latency_seconds"], float)

    finally:
        clear_request_context()


@pytest.mark.anyio
async def test_anthropic_chat_emits_llm_telemetry():
    context = create_request_context(session_id="test-session")
    set_request_context(context)

    try:
        response = SimpleNamespace(
            usage=SimpleNamespace(
                input_tokens=200,
                output_tokens=40,
                cache_read_input_tokens=15,
                cache_creation_input_tokens=20,
            )
        )

        with patch(
            "services.llm_gateway._execute_with_retry",
            new=AsyncMock(return_value=response),
        ), patch("services.llm_gateway.log_event") as mock_log:

            result = await _anthropic_chat(
                model="claude-opus-4-8",
                prompt="test prompt",
                layer="business_intent",
            )

        assert result is response
        mock_log.assert_called_once()

        event = mock_log.call_args.args[0]

        assert event["event_type"] == "llm_completed"
        assert event["provider"] == "Anthropic"
        assert event["model"] == "claude-opus-4-8"
        assert event["layer"] == "business_intent"
        assert event["input_tokens"] == 200
        assert event["output_tokens"] == 40
        assert event["total_tokens"] == 240
        assert event["cached_tokens"] == 15
        assert event["cache_creation_input_tokens"] == 20
        assert event["reasoning_tokens"] is None
        assert event["estimated_cost"] is None
        assert event["status"] == "success"
        assert event["request_id"] == context.request_id
        assert event["trace_id"] == context.trace_id
        assert event["session_id"] == "test-session"
        assert isinstance(event["latency_seconds"], float)

    finally:
        clear_request_context()


@pytest.mark.anyio
async def test_execute_with_retry_retries_then_succeeds():
    from httpx import Request, Response
    from openai import RateLimitError

    attempts = 0

    async def operation():
        nonlocal attempts
        attempts += 1

        if attempts < 3:
            request = Request("POST", "https://api.openai.com/v1/test")
            response = Response(429, request=request)

            raise RateLimitError(
                "rate limited",
                response=response,
                body=None,
            )

        return "success"

    with patch("services.llm_gateway.asyncio.sleep", new=AsyncMock()):
        result = await _execute_with_retry(
            operation=operation,
            provider="OpenAI",
            model="gpt-4.1",
        )

    assert result == "success"
    assert attempts == 3


@pytest.mark.anyio
async def test_execute_with_retry_raises_after_max_retries():
    from httpx import Request, Response
    from openai import RateLimitError

    attempts = 0

    async def operation():
        nonlocal attempts
        attempts += 1

        request = Request("POST", "https://api.openai.com/v1/test")
        response = Response(429, request=request)

        raise RateLimitError(
            "rate limited",
            response=response,
            body=None,
        )

    with patch("services.llm_gateway.asyncio.sleep", new=AsyncMock()):
        with pytest.raises(LLMGatewayError) as exc_info:
            await _execute_with_retry(
                operation=operation,
                provider="OpenAI",
                model="gpt-4.1",
            )

    assert attempts == MAX_RETRIES
    assert exc_info.value.provider == "OpenAI"
    assert exc_info.value.model == "gpt-4.1"
    assert exc_info.value.message == "rate limited"