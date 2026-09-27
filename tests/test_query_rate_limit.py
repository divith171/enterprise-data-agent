from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.api.routes import query as query_routes
from services.rate_limit_service import RateLimitDecision


def make_request():
    return query_routes.QueryRequest(
        message="How many customers are there?",
        session_id="session-123",
        data_source_id="datasource-123",
    )


def make_user():
    return {
        "id": "user-123",
        "company_id": "company-123",
        "email": "user@example.com",
        "role": "admin",
    }


@pytest.mark.asyncio
async def test_query_user_rate_limit_blocks_before_datasource_and_agent(
    monkeypatch,
):
    limiter = AsyncMock(
        return_value=RateLimitDecision(
            allowed=False,
            limit=5,
            used=6,
            remaining=0,
            retry_after=30,
        )
    )

    datasource_mock = AsyncMock()
    agent_mock = AsyncMock()

    audit_events = []

    monkeypatch.setattr(
        query_routes,
        "consume_rate_limit",
        limiter,
    )

    monkeypatch.setattr(
        query_routes,
        "get_authorized_data_source",
        datasource_mock,
    )

    monkeypatch.setattr(
        query_routes,
        "run_sql_agent",
        agent_mock,
    )

    monkeypatch.setattr(
        query_routes,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    with pytest.raises(HTTPException) as exc:
        await query_routes.query_agent(
            make_request(),
            make_user(),
        )

    assert exc.value.status_code == 429
    assert exc.value.headers["Retry-After"] == "30"

    datasource_mock.assert_not_awaited()
    agent_mock.assert_not_awaited()

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "query"
    assert event["outcome"] == "blocked"
    assert (
        event["reason_code"]
        == "QUERY_USER_RATE_LIMIT_EXCEEDED"
    )

    assert event["user_id"] == "user-123"
    assert event["tenant_id"] == "company-123"

    assert (
        "How many customers are there?"
        not in str(event)
    )


@pytest.mark.asyncio
async def test_query_company_rate_limit_blocks_before_datasource_and_agent(
    monkeypatch,
):
    limiter = AsyncMock(
        side_effect=[
            RateLimitDecision(
                allowed=True,
                limit=5,
                used=1,
                remaining=4,
                retry_after=60,
            ),
            RateLimitDecision(
                allowed=False,
                limit=30,
                used=31,
                remaining=0,
                retry_after=25,
            ),
        ]
    )

    datasource_mock = AsyncMock()
    agent_mock = AsyncMock()

    audit_events = []

    monkeypatch.setattr(
        query_routes,
        "consume_rate_limit",
        limiter,
    )

    monkeypatch.setattr(
        query_routes,
        "get_authorized_data_source",
        datasource_mock,
    )

    monkeypatch.setattr(
        query_routes,
        "run_sql_agent",
        agent_mock,
    )

    monkeypatch.setattr(
        query_routes,
        "log_security_event",
        lambda **kwargs: audit_events.append(
            kwargs
        ),
    )

    with pytest.raises(HTTPException) as exc:
        await query_routes.query_agent(
            make_request(),
            make_user(),
        )

    assert exc.value.status_code == 429
    assert exc.value.headers["Retry-After"] == "25"

    datasource_mock.assert_not_awaited()
    agent_mock.assert_not_awaited()

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "query"
    assert event["outcome"] == "blocked"
    assert (
        event["reason_code"]
        == "QUERY_COMPANY_RATE_LIMIT_EXCEEDED"
    )

    assert event["user_id"] == "user-123"
    assert event["tenant_id"] == "company-123"

    assert (
        "How many customers are there?"
        not in str(event)
    )