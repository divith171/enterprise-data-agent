from unittest.mock import AsyncMock, MagicMock, patch
from types import SimpleNamespace
import pytest

from tools.sql_tool import QueryValidationError, run_query


def make_pool(conn):
    pool = MagicMock()

    connection_context = MagicMock()
    connection_context.__aenter__ = AsyncMock(
        return_value=conn
    )
    connection_context.__aexit__ = AsyncMock(
        return_value=None
    )

    pool.connection.return_value = connection_context

    return pool


@pytest.mark.anyio
async def test_run_query_success():
    cursor = AsyncMock()

    cursor.description = [
        SimpleNamespace(name="id"),
        SimpleNamespace(name="name"),
    ]

    cursor.fetchall.return_value = [
        (1, "Alice"),
        (2, "Bob"),
    ]

    conn = MagicMock()

    cursor_context = MagicMock()
    cursor_context.__aenter__ = AsyncMock(
        return_value=cursor
    )
    cursor_context.__aexit__ = AsyncMock(
        return_value=None
    )

    conn.cursor.return_value = cursor_context

    pool = make_pool(conn)

    with (
        patch(
            "tools.sql_tool.get_pool",
            return_value=pool,
        ),
        patch(
            "tools.sql_tool.validate_query"
        ),
    ):
        result = await run_query(
            "SELECT * FROM users"
        )

    assert result == {
        "status": "success",
        "columns": [
            "id",
            "name",
        ],
        "data": [
            (1, "Alice"),
            (2, "Bob"),
        ],
    }

    cursor.execute.assert_awaited_once_with(
        "SELECT * FROM users"
    )

    cursor.fetchall.assert_awaited_once()


@pytest.mark.anyio
async def test_run_query_validation_error():
    audit_events = []

    with (
        patch(
            "tools.sql_tool.validate_query",
            side_effect=QueryValidationError(
                "Invalid SQL",
                "invalid_sql",
            ),
        ),
        patch(
            "tools.sql_tool.log_security_event",
            side_effect=lambda **kwargs:
                audit_events.append(kwargs),
        ),
    ):
        result = await run_query(
            "DROP TABLE users"
        )

    assert result == {
        "status": "validation_error",
        "error": "Invalid SQL",
    }

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "sql_execution"
    assert event["outcome"] == "blocked"
    assert event["reason_code"] == "invalid_sql"

    assert (
        event["resource_type"]
        == "generated_sql"
    )

    assert (
        "DROP TABLE users"
        not in str(event)
    )


@pytest.mark.anyio
async def test_run_query_execution_error():
    cursor = AsyncMock()

    cursor.execute.side_effect = RuntimeError(
        "database unavailable"
    )

    conn = MagicMock()

    cursor_context = MagicMock()
    cursor_context.__aenter__ = AsyncMock(
        return_value=cursor
    )
    cursor_context.__aexit__ = AsyncMock(
        return_value=None
    )

    conn.cursor.return_value = cursor_context

    pool = make_pool(conn)

    with (
        patch(
            "tools.sql_tool.get_pool",
            return_value=pool,
        ),
        patch(
            "tools.sql_tool.validate_query"
        ),
    ):
        result = await run_query(
            "SELECT * FROM users"
        )

    assert (
        result["status"]
        == "execution_error"
    )

    assert (
        result["error"]
        == "Database query execution failed."
    )

    assert "database unavailable" not in result["error"]


@pytest.mark.anyio
async def test_run_query_does_not_touch_database_when_sql_is_rejected():
    audit_events = []

    dangerous_sql = "SELECT pg_sleep(10)"

    with (
        patch(
            "tools.sql_tool.get_pool"
        ) as mock_get_pool,
        patch(
            "tools.sql_tool.log_security_event",
            side_effect=lambda **kwargs:
                audit_events.append(kwargs),
        ),
    ):
        result = await run_query(
            dangerous_sql
        )

    assert (
        result["status"]
        == "validation_error"
    )

    mock_get_pool.assert_not_called()

    assert len(audit_events) == 1

    event = audit_events[0]

    assert event["action"] == "sql_execution"
    assert event["outcome"] == "blocked"

    assert (
        event["reason_code"]
        == "FORBIDDEN_OPERATION"
    )

    assert (
        event["resource_type"]
        == "generated_sql"
    )

    assert dangerous_sql not in str(event)