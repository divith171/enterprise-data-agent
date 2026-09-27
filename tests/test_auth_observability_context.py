import pytest
from fastapi import HTTPException

from app.auth import dependencies
from observability.context import (
    create_request_context,
    set_request_context,
    get_request_context,
    clear_request_context,
)


class FakeRequest:
    cookies = {
        "eda_session": "test-session"
    }


class MissingCookieRequest:
    cookies = {}


@pytest.mark.asyncio
async def test_authenticated_user_is_bound_to_request_context(
    monkeypatch,
):

    async def fake_get_auth_session(session_id):
        assert session_id == "test-session"

        return {
            "user_id": "user-123"
        }

    async def fake_get_user_by_id(user_id):
        assert user_id == "user-123"

        return (
            "user-123",
            "company-456",
            "test@example.com",
            "admin",
            True,
        )

    monkeypatch.setattr(
        dependencies,
        "get_auth_session",
        fake_get_auth_session,
    )

    monkeypatch.setattr(
        dependencies,
        "get_user_by_id",
        fake_get_user_by_id,
    )

    context = create_request_context()
    set_request_context(context)

    try:
        user = await dependencies.get_current_user(
            FakeRequest()
        )

        current_context = get_request_context()

        assert user["id"] == "user-123"
        assert (
            user["company_id"]
            == "company-456"
        )

        assert (
            current_context.user_id
            == "user-123"
        )

        assert (
            current_context.tenant_id
            == "company-456"
        )

    finally:
        clear_request_context()


@pytest.mark.asyncio
async def test_missing_auth_cookie_is_audited(
    monkeypatch,
):
    audit_events = []

    monkeypatch.setattr(
        dependencies,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    with pytest.raises(
        HTTPException
    ) as exc:
        await dependencies.get_current_user(
            MissingCookieRequest()
        )

    assert exc.value.status_code == 401
    assert (
        exc.value.detail
        == "AUTHENTICATION_REQUIRED"
    )

    assert len(audit_events) == 1

    event = audit_events[0]

    assert (
        event["action"]
        == "authentication"
    )

    assert event["outcome"] == "denied"

    assert (
        event["reason_code"]
        == "AUTH_SESSION_MISSING"
    )

    assert "session_id" not in event


@pytest.mark.asyncio
async def test_invalid_or_expired_auth_session_is_audited_without_cookie_value(
    monkeypatch,
):
    audit_events = []

    async def fake_get_auth_session(
        session_id
    ):
        assert (
            session_id
            == "test-session"
        )

        return None

    monkeypatch.setattr(
        dependencies,
        "get_auth_session",
        fake_get_auth_session,
    )

    monkeypatch.setattr(
        dependencies,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    with pytest.raises(
        HTTPException
    ) as exc:
        await dependencies.get_current_user(
            FakeRequest()
        )

    assert exc.value.status_code == 401

    assert len(audit_events) == 1

    event = audit_events[0]

    assert (
        event["action"]
        == "authentication"
    )

    assert event["outcome"] == "denied"

    assert (
        event["reason_code"]
        == "AUTH_SESSION_INVALID_OR_EXPIRED"
    )

    assert (
        "test-session"
        not in str(event)
    )

    assert "session_id" not in event


@pytest.mark.asyncio
async def test_missing_auth_user_is_audited_without_cookie_value(
    monkeypatch,
):
    audit_events = []

    async def fake_get_auth_session(
        session_id
    ):
        return {
            "user_id": "user-123"
        }

    async def fake_get_user_by_id(
        user_id
    ):
        assert user_id == "user-123"

        return None

    monkeypatch.setattr(
        dependencies,
        "get_auth_session",
        fake_get_auth_session,
    )

    monkeypatch.setattr(
        dependencies,
        "get_user_by_id",
        fake_get_user_by_id,
    )

    monkeypatch.setattr(
        dependencies,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    with pytest.raises(
        HTTPException
    ) as exc:
        await dependencies.get_current_user(
            FakeRequest()
        )

    assert exc.value.status_code == 401

    assert len(audit_events) == 1

    event = audit_events[0]

    assert (
        event["action"]
        == "authentication"
    )

    assert event["outcome"] == "denied"

    assert (
        event["reason_code"]
        == "AUTH_USER_NOT_FOUND"
    )

    assert event["user_id"] == "user-123"

    assert (
        "test-session"
        not in str(event)
    )

    assert "session_id" not in event


@pytest.mark.asyncio
async def test_inactive_user_is_audited_without_cookie_value(
    monkeypatch,
):
    audit_events = []

    async def fake_get_auth_session(
        session_id
    ):
        return {
            "user_id": "user-123"
        }

    async def fake_get_user_by_id(
        user_id
    ):
        return (
            "user-123",
            "company-456",
            "test@example.com",
            "analyst",
            False,
        )

    monkeypatch.setattr(
        dependencies,
        "get_auth_session",
        fake_get_auth_session,
    )

    monkeypatch.setattr(
        dependencies,
        "get_user_by_id",
        fake_get_user_by_id,
    )

    monkeypatch.setattr(
        dependencies,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    with pytest.raises(
        HTTPException
    ) as exc:
        await dependencies.get_current_user(
            FakeRequest()
        )

    assert exc.value.status_code == 401

    assert len(audit_events) == 1

    event = audit_events[0]

    assert (
        event["action"]
        == "authentication"
    )

    assert event["outcome"] == "denied"

    assert (
        event["reason_code"]
        == "AUTH_USER_INACTIVE"
    )

    assert event["user_id"] == "user-123"
    assert (
        event["tenant_id"]
        == "company-456"
    )

    assert (
        "test-session"
        not in str(event)
    )

    assert "session_id" not in event