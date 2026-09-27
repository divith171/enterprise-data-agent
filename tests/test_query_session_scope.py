from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes.query import (
    QueryRequest,
    query_agent,
)
from services.rate_limit_service import RateLimitDecision


def allowed_limits():
    return [
        RateLimitDecision(
            allowed=True,
            limit=5,
            used=1,
            remaining=4,
            retry_after=60,
        ),
        RateLimitDecision(
            allowed=True,
            limit=30,
            used=1,
            remaining=29,
            retry_after=60,
        ),
    ]


@pytest.mark.asyncio
async def test_query_rejects_existing_session_with_wrong_scope():

    request = QueryRequest(
        message="How many customers are there?",
        session_id="session-a",
        data_source_id="data-source-b",
    )

    current_user = {
        "id": "user-a",
        "company_id": "company-a",
        "email": "user@example.com",
        "role": "admin",
    }

    audit_events = []

    with (
        patch(
            "app.api.routes.query.consume_rate_limit",
            new=AsyncMock(
                side_effect=allowed_limits()
            ),
        ),
        patch(
            "app.api.routes.query.get_authorized_data_source",
            new=AsyncMock(
                return_value=(
                    "data-source-b",
                )
            ),
        ),
        patch(
            "app.api.routes.query.session_exists",
            new=AsyncMock(
                return_value=True
            ),
        ),
        patch(
            "app.api.routes.query.session_matches_scope",
            new=AsyncMock(
                return_value=False
            ),
        ) as mock_scope,
        patch(
            "app.api.routes.query.run_sql_agent",
            new=AsyncMock(),
        ) as mock_agent,
        patch(
            "app.api.routes.query.log_security_event",
            side_effect=lambda **kwargs:
                audit_events.append(kwargs),
        ),
    ):

        with pytest.raises(
            HTTPException
        ) as exc_info:

            await query_agent(
                request,
                current_user=current_user,
            )

    assert exc_info.value.status_code == 403
    assert (
        exc_info.value.detail
        == "SESSION_ACCESS_FORBIDDEN"
    )

    mock_scope.assert_awaited_once_with(
        "session-a",
        "user-a",
        "company-a",
        "data-source-b",
    )

    mock_agent.assert_not_awaited()

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "session_access"
    assert event["outcome"] == "denied"
    assert (
        event["reason_code"]
        == "SESSION_ACCESS_FORBIDDEN"
    )

    assert event["user_id"] == "user-a"
    assert event["tenant_id"] == "company-a"

    assert (
        event["resource_type"]
        == "conversation_session"
    )

    assert (
        event["resource_id"]
        == "session-a"
    )

    assert (
        "How many customers are there?"
        not in str(event)
    )


@pytest.mark.asyncio
async def test_query_rejects_unauthorized_data_source_and_audits_denial():

    request = QueryRequest(
        message="How many customers are there?",
        session_id="session-a",
        data_source_id="data-source-b",
    )

    current_user = {
        "id": "user-a",
        "company_id": "company-a",
        "email": "user@example.com",
        "role": "admin",
    }

    audit_events = []

    session_exists_mock = AsyncMock()

    with (
        patch(
            "app.api.routes.query.consume_rate_limit",
            new=AsyncMock(
                side_effect=allowed_limits()
            ),
        ),
        patch(
            "app.api.routes.query.get_authorized_data_source",
            new=AsyncMock(
                return_value=None
            ),
        ),
        patch(
            "app.api.routes.query.session_exists",
            new=session_exists_mock,
        ),
        patch(
            "app.api.routes.query.run_sql_agent",
            new=AsyncMock(),
        ) as mock_agent,
        patch(
            "app.api.routes.query.log_security_event",
            side_effect=lambda **kwargs:
                audit_events.append(kwargs),
        ),
    ):

        with pytest.raises(
            HTTPException
        ) as exc_info:

            await query_agent(
                request,
                current_user=current_user,
            )

    assert exc_info.value.status_code == 403
    assert (
        exc_info.value.detail
        == "DATA_SOURCE_ACCESS_FORBIDDEN"
    )

    session_exists_mock.assert_not_awaited()
    mock_agent.assert_not_awaited()

    assert len(audit_events) == 1

    event = audit_events[0]

    assert (
        event["action"]
        == "data_source_access"
    )

    assert event["outcome"] == "denied"

    assert (
        event["reason_code"]
        == "DATA_SOURCE_ACCESS_FORBIDDEN"
    )

    assert event["user_id"] == "user-a"
    assert event["tenant_id"] == "company-a"

    assert (
        event["resource_type"]
        == "data_source"
    )

    assert (
        event["resource_id"]
        == "data-source-b"
    )

    assert (
        "How many customers are there?"
        not in str(event)
    )