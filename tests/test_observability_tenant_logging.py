import json

from observability import logger
from observability.context import (
    create_request_context,
    set_request_context,
    clear_request_context,
)


def test_log_event_adds_authenticated_identity(
    tmp_path,
    monkeypatch,
):
    log_file = tmp_path / "agent_logs.jsonl"

    monkeypatch.setattr(
        logger,
        "LOG_FILE",
        log_file,
    )

    context = create_request_context()
    context.user_id = "user-123"
    context.tenant_id = "company-456"

    set_request_context(context)

    try:
        logger.log_event(
            {
                "event_type": "test_event",
            }
        )

        event = json.loads(
            log_file.read_text(
                encoding="utf-8"
            ).strip()
        )

        assert event["user_id"] == "user-123"
        assert event["tenant_id"] == "company-456"

    finally:
        clear_request_context()


def test_authenticated_context_overrides_event_identity(
    tmp_path,
    monkeypatch,
):
    log_file = tmp_path / "agent_logs.jsonl"

    monkeypatch.setattr(
        logger,
        "LOG_FILE",
        log_file,
    )

    context = create_request_context()
    context.user_id = "real-user"
    context.tenant_id = "real-company"

    set_request_context(context)

    try:
        logger.log_event(
            {
                "event_type": "test_event",
                "user_id": "fake-user",
                "tenant_id": "fake-company",
            }
        )

        event = json.loads(
            log_file.read_text(
                encoding="utf-8"
            ).strip()
        )

        assert event["user_id"] == "real-user"
        assert event["tenant_id"] == "real-company"

    finally:
        clear_request_context()