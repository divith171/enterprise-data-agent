from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tools.sql_tool import QueryValidationError, run_query


def make_pool(conn):
    pool = MagicMock()
    connection_context = MagicMock()
    connection_context.__aenter__ = AsyncMock(return_value=conn)
    connection_context.__aexit__ = AsyncMock(return_value=None)
    pool.connection.return_value = connection_context
    return pool


@pytest.mark.anyio
async def test_run_query_success():
    cursor = AsyncMock()
    cursor.fetchall.return_value = [(1, "Alice"), (2, "Bob")]

    conn = MagicMock()
    cursor_context = MagicMock()
    cursor_context.__aenter__ = AsyncMock(return_value=cursor)
    cursor_context.__aexit__ = AsyncMock(return_value=None)
    conn.cursor.return_value = cursor_context

    pool = make_pool(conn)

    with patch("tools.sql_tool.get_pool", return_value=pool), \
         patch("tools.sql_tool.validate_query"):

        result = await run_query("SELECT * FROM users")

    assert result == {
        "status": "success",
        "data": [(1, "Alice"), (2, "Bob")],
    }

    cursor.execute.assert_awaited_once_with("SELECT * FROM users")
    cursor.fetchall.assert_awaited_once()


@pytest.mark.anyio
async def test_run_query_validation_error():
    with patch(
        "tools.sql_tool.validate_query",
        side_effect=QueryValidationError("Invalid SQL", "invalid_sql"),
    ):
        result = await run_query("DROP TABLE users")

    assert result == {
        "status": "validation_error",
        "error": "Invalid SQL",
    }


@pytest.mark.anyio
async def test_run_query_execution_error():
    cursor = AsyncMock()
    cursor.execute.side_effect = RuntimeError("database unavailable")

    conn = MagicMock()
    cursor_context = MagicMock()
    cursor_context.__aenter__ = AsyncMock(return_value=cursor)
    cursor_context.__aexit__ = AsyncMock(return_value=None)
    conn.cursor.return_value = cursor_context

    pool = make_pool(conn)

    with patch("tools.sql_tool.get_pool", return_value=pool), \
         patch("tools.sql_tool.validate_query"):

        result = await run_query("SELECT * FROM users")

    assert result["status"] == "execution_error"
    assert result["error"] == "database unavailable"
