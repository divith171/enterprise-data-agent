from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException, Response

from app.api.routes import auth as auth_routes
from services.rate_limit_service import RateLimitDecision


def make_request(ip="127.0.0.1"):
    return SimpleNamespace(
        client=SimpleNamespace(host=ip)
    )


@pytest.mark.asyncio
async def test_login_email_rate_limit_blocks_before_auth(
    monkeypatch,
):
    limiter = AsyncMock(
        return_value=RateLimitDecision(
            allowed=False,
            limit=5,
            used=6,
            remaining=0,
            retry_after=120,
        )
    )

    login_mock = AsyncMock()
    audit_events = []

    monkeypatch.setattr(
        auth_routes,
        "consume_rate_limit",
        limiter,
    )

    monkeypatch.setattr(
        auth_routes,
        "login",
        login_mock,
    )

    monkeypatch.setattr(
        auth_routes,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    with pytest.raises(HTTPException) as exc:
        await auth_routes.login_user(
            auth_routes.LoginRequest(
                email="user@example.com",
                password="wrong-password",
            ),
            make_request(),
            Response(),
        )

    assert exc.value.status_code == 429

    login_mock.assert_not_awaited()

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "login"
    assert event["outcome"] == "blocked"
    assert (
        event["reason_code"]
        == "LOGIN_EMAIL_RATE_LIMIT_EXCEEDED"
    )

    assert event["subject_hash"] != "user@example.com"
    assert event["client_ip_hash"] != "127.0.0.1"

    assert "password" not in event


@pytest.mark.asyncio
async def test_login_ip_rate_limit_blocks_before_auth(
    monkeypatch,
):
    limiter = AsyncMock(
        side_effect=[
            RateLimitDecision(
                allowed=True,
                limit=5,
                used=1,
                remaining=4,
                retry_after=300,
            ),
            RateLimitDecision(
                allowed=False,
                limit=20,
                used=21,
                remaining=0,
                retry_after=180,
            ),
        ]
    )

    login_mock = AsyncMock()
    audit_events = []

    monkeypatch.setattr(
        auth_routes,
        "consume_rate_limit",
        limiter,
    )

    monkeypatch.setattr(
        auth_routes,
        "login",
        login_mock,
    )

    monkeypatch.setattr(
        auth_routes,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    with pytest.raises(HTTPException) as exc:
        await auth_routes.login_user(
            auth_routes.LoginRequest(
                email="user@example.com",
                password="wrong-password",
            ),
            make_request(),
            Response(),
        )

    assert exc.value.status_code == 429

    login_mock.assert_not_awaited()

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "login"
    assert event["outcome"] == "blocked"
    assert (
        event["reason_code"]
        == "LOGIN_IP_RATE_LIMIT_EXCEEDED"
    )

    assert event["subject_hash"] != "user@example.com"
    assert event["client_ip_hash"] != "127.0.0.1"

    assert "password" not in event


@pytest.mark.asyncio
async def test_successful_login_clears_email_bucket(
    monkeypatch,
):
    limiter = AsyncMock(
        side_effect=[
            RateLimitDecision(
                allowed=True,
                limit=5,
                used=1,
                remaining=4,
                retry_after=300,
            ),
            RateLimitDecision(
                allowed=True,
                limit=20,
                used=1,
                remaining=19,
                retry_after=300,
            ),
        ]
    )

    login_mock = AsyncMock(
        return_value={
            "session_id": "session-123",
            "user_id": "user-123",
            "company_id": "company-123",
            "email": "user@example.com",
            "role": "admin",
        }
    )

    clear_mock = AsyncMock()

    monkeypatch.setattr(
        auth_routes,
        "consume_rate_limit",
        limiter,
    )

    monkeypatch.setattr(
        auth_routes,
        "login",
        login_mock,
    )

    monkeypatch.setattr(
        auth_routes,
        "clear_rate_limit",
        clear_mock,
    )

    result = await auth_routes.login_user(
        auth_routes.LoginRequest(
            email="user@example.com",
            password="correct-password",
        ),
        make_request(),
        Response(),
    )

    assert result["user_id"] == "user-123"

    clear_mock.assert_awaited_once_with(
        "login_email",
        "user@example.com",
    )


@pytest.mark.asyncio
async def test_failed_login_does_not_clear_email_bucket(
    monkeypatch,
):
    limiter = AsyncMock(
        side_effect=[
            RateLimitDecision(
                allowed=True,
                limit=5,
                used=1,
                remaining=4,
                retry_after=300,
            ),
            RateLimitDecision(
                allowed=True,
                limit=20,
                used=1,
                remaining=19,
                retry_after=300,
            ),
        ]
    )

    login_mock = AsyncMock(
        side_effect=ValueError(
            "INVALID_CREDENTIALS"
        )
    )

    clear_mock = AsyncMock()

    monkeypatch.setattr(
        auth_routes,
        "consume_rate_limit",
        limiter,
    )

    monkeypatch.setattr(
        auth_routes,
        "login",
        login_mock,
    )

    monkeypatch.setattr(
        auth_routes,
        "clear_rate_limit",
        clear_mock,
    )

    with pytest.raises(HTTPException) as exc:
        await auth_routes.login_user(
            auth_routes.LoginRequest(
                email="user@example.com",
                password="wrong-password",
            ),
            make_request(),
            Response(),
        )

    assert exc.value.status_code == 401

    clear_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_signup_ip_rate_limit_blocks_before_signup(
    monkeypatch,
):
    limiter = AsyncMock(
        return_value=RateLimitDecision(
            allowed=False,
            limit=5,
            used=6,
            remaining=0,
            retry_after=1800,
        )
    )

    signup_mock = AsyncMock()
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

    with pytest.raises(HTTPException) as exc:
        await auth_routes.signup_user(
            auth_routes.SignupRequest(
                email="new@example.com",
                password="SomeLongPassword123!",
                company_name="Test Company",
                company_slug="test-company",
            ),
            make_request(),
        )

    assert exc.value.status_code == 429
    assert exc.value.headers["Retry-After"] == "1800"

    signup_mock.assert_not_awaited()

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "signup"
    assert event["outcome"] == "blocked"
    assert (
        event["reason_code"]
        == "SIGNUP_IP_RATE_LIMIT_EXCEEDED"
    )

    assert event["client_ip_hash"] != "127.0.0.1"

    assert "password" not in event


@pytest.mark.asyncio
async def test_failed_login_emits_security_audit_event(
    monkeypatch,
):
    limiter = AsyncMock(
        side_effect=[
            RateLimitDecision(
                allowed=True,
                limit=5,
                used=1,
                remaining=4,
                retry_after=300,
            ),
            RateLimitDecision(
                allowed=True,
                limit=20,
                used=1,
                remaining=19,
                retry_after=300,
            ),
        ]
    )

    login_mock = AsyncMock(
        side_effect=ValueError(
            "INVALID_CREDENTIALS"
        )
    )

    audit_events = []

    monkeypatch.setattr(
        auth_routes,
        "consume_rate_limit",
        limiter,
    )

    monkeypatch.setattr(
        auth_routes,
        "login",
        login_mock,
    )

    monkeypatch.setattr(
        auth_routes,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    with pytest.raises(HTTPException) as exc:
        await auth_routes.login_user(
            auth_routes.LoginRequest(
                email="user@example.com",
                password="wrong-password",
            ),
            make_request(
                ip="10.0.0.5"
            ),
            Response(),
        )

    assert exc.value.status_code == 401

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "login"
    assert event["outcome"] == "failure"
    assert (
        event["reason_code"]
        == "INVALID_CREDENTIALS"
    )

    assert (
        event["subject_hash"]
        != "user@example.com"
    )

    assert (
        event["client_ip_hash"]
        != "10.0.0.5"
    )

    assert "password" not in event
    assert "session_id" not in event


@pytest.mark.asyncio
async def test_successful_login_emits_safe_security_audit_event(
    monkeypatch,
):
    limiter = AsyncMock(
        side_effect=[
            RateLimitDecision(
                allowed=True,
                limit=5,
                used=1,
                remaining=4,
                retry_after=300,
            ),
            RateLimitDecision(
                allowed=True,
                limit=20,
                used=1,
                remaining=19,
                retry_after=300,
            ),
        ]
    )

    login_mock = AsyncMock(
        return_value={
            "session_id": "SECRET-AUTH-SESSION",
            "user_id": "user-123",
            "company_id": "company-123",
            "email": "user@example.com",
            "role": "admin",
        }
    )

    clear_mock = AsyncMock()

    audit_events = []

    monkeypatch.setattr(
        auth_routes,
        "consume_rate_limit",
        limiter,
    )

    monkeypatch.setattr(
        auth_routes,
        "login",
        login_mock,
    )

    monkeypatch.setattr(
        auth_routes,
        "clear_rate_limit",
        clear_mock,
    )

    monkeypatch.setattr(
        auth_routes,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    result = await auth_routes.login_user(
        auth_routes.LoginRequest(
            email="user@example.com",
            password="correct-password",
        ),
        make_request(
            ip="10.0.0.5"
        ),
        Response(),
    )

    assert result["user_id"] == "user-123"

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "login"
    assert event["outcome"] == "success"
    assert (
        event["reason_code"]
        == "AUTHENTICATED"
    )

    assert event["user_id"] == "user-123"
    assert event["tenant_id"] == "company-123"

    assert (
        event["subject_hash"]
        != "user@example.com"
    )

    assert (
        event["client_ip_hash"]
        != "10.0.0.5"
    )

    assert "password" not in event
    assert "session_id" not in event

    assert (
        "SECRET-AUTH-SESSION"
        not in str(event)
    )