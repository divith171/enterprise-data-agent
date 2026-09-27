from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException, Response

from app.api.routes import auth as auth_routes
from services.rate_limit_service import RateLimitDecision


def make_request(
    ip="127.0.0.1",
    cookies=None,
    headers=None,
):
    return SimpleNamespace(
        client=SimpleNamespace(host=ip),
        cookies=cookies or {},
        headers=headers or {},
    )


@pytest.mark.asyncio
async def test_successful_signup_emits_safe_audit_event(
    monkeypatch,
):
    limiter = AsyncMock(
        return_value=RateLimitDecision(
            allowed=True,
            limit=5,
            used=1,
            remaining=4,
            retry_after=3600,
        )
    )

    signup_mock = AsyncMock(
        return_value={
            "user_id": "user-123",
            "company_id": "company-123",
        }
    )

    audit_events = []

    monkeypatch.setattr(
        auth_routes,
        "consume_rate_limit",
        limiter,
    )

    monkeypatch.setattr(
        auth_routes,
        "signup",
        signup_mock,
    )

    monkeypatch.setattr(
        auth_routes,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    result = await auth_routes.signup_user(
        auth_routes.SignupRequest(
            email="new@example.com",
            password="VERY-SECRET-PASSWORD",
            company_name="Test Company",
            company_slug="test-company",
        ),
        make_request(ip="10.0.0.5"),
    )

    assert result["user_id"] == "user-123"

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "signup"
    assert event["outcome"] == "success"
    assert (
        event["reason_code"]
        == "ACCOUNT_CREATED"
    )

    assert (
        event["subject_hash"]
        != "new@example.com"
    )

    assert (
        event["client_ip_hash"]
        != "10.0.0.5"
    )

    assert "VERY-SECRET-PASSWORD" not in str(event)
    assert "new@example.com" not in str(event)


@pytest.mark.asyncio
async def test_csrf_denied_logout_emits_safe_audit_event(
    monkeypatch,
):
    audit_events = []

    logout_mock = AsyncMock()

    monkeypatch.setattr(
        auth_routes,
        "validate_csrf_token",
        lambda cookie, header: False,
    )

    monkeypatch.setattr(
        auth_routes,
        "logout",
        logout_mock,
    )

    monkeypatch.setattr(
        auth_routes,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    request = make_request(
        ip="10.0.0.5",
        cookies={
            "eda_csrf": "SECRET-CSRF-TOKEN",
            "eda_session": "SECRET-AUTH-SESSION",
        },
        headers={
            "X-CSRF-Token": "WRONG-CSRF-TOKEN",
        },
    )

    with pytest.raises(HTTPException) as exc:
        await auth_routes.logout_user(
            request,
            Response(),
        )

    assert exc.value.status_code == 403

    logout_mock.assert_not_awaited()

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "logout"
    assert event["outcome"] == "denied"
    assert (
        event["reason_code"]
        == "CSRF_VALIDATION_FAILED"
    )

    assert "SECRET-CSRF-TOKEN" not in str(event)
    assert "WRONG-CSRF-TOKEN" not in str(event)
    assert "SECRET-AUTH-SESSION" not in str(event)


@pytest.mark.asyncio
async def test_successful_logout_emits_safe_audit_event(
    monkeypatch,
):
    audit_events = []

    logout_mock = AsyncMock()

    monkeypatch.setattr(
        auth_routes,
        "validate_csrf_token",
        lambda cookie, header: True,
    )

    monkeypatch.setattr(
        auth_routes,
        "logout",
        logout_mock,
    )

    monkeypatch.setattr(
        auth_routes,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    request = make_request(
        ip="10.0.0.5",
        cookies={
            "eda_csrf": "SECRET-CSRF-TOKEN",
            "eda_session": "SECRET-AUTH-SESSION",
        },
        headers={
            "X-CSRF-Token": "SECRET-CSRF-TOKEN",
        },
    )

    result = await auth_routes.logout_user(
        request,
        Response(),
    )

    assert result["status"] == "success"

    logout_mock.assert_awaited_once_with(
        "SECRET-AUTH-SESSION"
    )

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "logout"
    assert event["outcome"] == "success"
    assert (
        event["reason_code"]
        == "SESSION_TERMINATED"
    )

    assert (
        event["resource_type"]
        == "auth_session"
    )

    assert "SECRET-CSRF-TOKEN" not in str(event)
    assert "SECRET-AUTH-SESSION" not in str(event)