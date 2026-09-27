from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from observability.context import get_request_context
from observability.middleware import RequestContextMiddleware
from observability import middleware as middleware_module


class FakeRequest:

    method = "POST"

    url = SimpleNamespace(
        path="/query"
    )

    async def json(self):
        return {
            "session_id": "conversation-123"
        }


@pytest.mark.asyncio
async def test_unhandled_exception_is_sanitized_and_still_raised(
    monkeypatch,
):
    events = []

    monkeypatch.setattr(
        middleware_module,
        "log_event",
        lambda event: events.append(event),
    )

    logger_error = MagicMock()

    monkeypatch.setattr(
        middleware_module.logger,
        "error",
        logger_error,
    )

    middleware = RequestContextMiddleware(
        app=MagicMock()
    )

    async def failing_call_next(request):
        raise RuntimeError(
            "SECRET-DATABASE-ERROR"
        )

    with pytest.raises(
        RuntimeError,
        match="SECRET-DATABASE-ERROR",
    ):
        await middleware.dispatch(
            FakeRequest(),
            failing_call_next,
        )

    failed_events = [
        event
        for event in events
        if event.get("event_type")
        == middleware_module.EventTypes.REQUEST_FAILED
    ]

    assert len(failed_events) == 1

    event = failed_events[0]

    assert (
        event["error_code"]
        == "UNHANDLED_REQUEST_EXCEPTION"
    )

    assert (
        event["error_type"]
        == "RuntimeError"
    )

    assert "error" not in event

    assert (
        "SECRET-DATABASE-ERROR"
        not in str(event)
    )

    logger_error.assert_called_once()

    assert (
        "SECRET-DATABASE-ERROR"
        not in str(logger_error.call_args)
    )

    assert get_request_context() is None