from unittest.mock import AsyncMock, patch

import pytest

from app.api.routes.query import QueryRequest, query_agent
from observability.context import (
    clear_request_context,
    create_request_context,
    set_request_context,
)


@pytest.mark.anyio
async def test_query_route_new_query_orchestrates_dependencies():
    session_id = "test-session"
    user_input = "show sales over last month"

    context = create_request_context(session_id=session_id)
    set_request_context(context)

    fake_result = {
        "status": "success",
        "sql": "SELECT 1",
        "data": [(100,)],
    }

    try:
        with patch(
            "app.api.routes.query.session_exists",
            new=AsyncMock(return_value=False),
        ) as mock_session_exists, \
            patch(
                "app.api.routes.query.create_session",
                new=AsyncMock(),
            ) as mock_create_session, \
            patch(
                "app.api.routes.query.get_current_query",
                new=AsyncMock(return_value=None),
            ), \
            patch(
                "app.api.routes.query.get_context",
                new=AsyncMock(return_value={}),
            ), \
            patch(
                "app.api.routes.query.set_current_query",
                new=AsyncMock(),
            ) as mock_set_current_query, \
            patch(
                "app.api.routes.query.set_context",
                new=AsyncMock(),
            ) as mock_set_context, \
            patch(
                "app.api.routes.query.classify_intent_continuation",
                return_value={"intent_type": "new_query"},
            ), \
            patch(
                "app.api.routes.query.parse_user_response",
                return_value={},
            ), \
            patch(
                "app.api.routes.query.run_sql_agent",
                new=AsyncMock(return_value=fake_result),
            ) as mock_run_sql_agent:

            response = await query_agent(
                QueryRequest(
                    message=user_input,
                    session_id=session_id,
                )
            )

        mock_session_exists.assert_awaited_once_with(session_id)

        mock_create_session.assert_awaited_once_with(
            session_id,
            {
                "current_query": user_input,
                "context": {},
            },
        )

        mock_set_current_query.assert_awaited_with(
            session_id,
            user_input,
        )

        mock_set_context.assert_awaited()

        mock_run_sql_agent.assert_awaited_once_with(
            user_input,
            context={},
        )

        assert response["status"] == "success"
        assert response["session_id"] == session_id
        assert response["context"] == {}

        assert response["trace_log"]["session_id"] == session_id
        assert response["trace_log"]["user_input"] == user_input

        assert response["trace_log"]["intent_result"] == {
            "intent_type": "new_query"
        }

        assert response["trace_log"]["refined_query"] == user_input

    finally:
        clear_request_context()