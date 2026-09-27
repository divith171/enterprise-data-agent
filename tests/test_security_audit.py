from observability.context import (
    RequestContext,
    clear_request_context,
    set_request_context,
)
from observability.security_audit import (
    hash_audit_identifier,
    log_security_event,
)


def test_hash_audit_identifier_is_deterministic_and_not_raw():

    first = hash_audit_identifier(
        "User@Example.com"
    )

    second = hash_audit_identifier(
        " user@example.com "
    )

    assert first == second
    assert first != "user@example.com"
    assert len(first) == 64


def test_security_event_contains_safe_structured_fields(
    monkeypatch,
):

    captured = []

    monkeypatch.setattr(
        "observability.security_audit.log_event",
        lambda event: captured.append(event),
    )

    context = RequestContext(
        request_id="request-123",
        trace_id="trace-123",
        session_id="conversation-123",
        user_id="user-123",
        tenant_id="company-123",
    )

    set_request_context(context)

    try:
        log_security_event(
            action="login",
            outcome="success",
            reason_code="AUTHENTICATED",
            resource_type="auth_session",
        )

    finally:
        clear_request_context()

    assert len(captured) == 1

    event = captured[0]

    assert event["event_type"] == "security_audit"
    assert event["category"] == "security"
    assert event["action"] == "login"
    assert event["outcome"] == "success"
    assert event["reason_code"] == "AUTHENTICATED"

    assert event["request_id"] == "request-123"
    assert event["trace_id"] == "trace-123"
    assert event["session_id"] == "conversation-123"

    forbidden_fields = {
        "password",
        "password_hash",
        "csrf_token",
        "api_key",
        "secret",
        "secret_ref",
        "cookie",
    }

    assert forbidden_fields.isdisjoint(
        event.keys()
    )


def test_security_event_rejects_invalid_outcome():

    try:
        log_security_event(
            action="login",
            outcome="maybe",
        )

    except ValueError as exc:
        assert (
            str(exc)
            == "SECURITY_AUDIT_OUTCOME_INVALID"
        )

    else:
        raise AssertionError(
            "Invalid outcome was accepted"
        )