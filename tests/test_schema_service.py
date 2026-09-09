from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.schema_service import get_schema, get_schema_with_types


def build_mock_pool(rows):
    cursor = MagicMock()
    cursor.execute = AsyncMock()
    cursor.fetchall = AsyncMock(return_value=rows)

    cursor_cm = MagicMock()
    cursor_cm.__aenter__ = AsyncMock(return_value=cursor)
    cursor_cm.__aexit__ = AsyncMock(return_value=None)

    connection = MagicMock()
    connection.cursor.return_value = cursor_cm

    connection_cm = MagicMock()
    connection_cm.__aenter__ = AsyncMock(return_value=connection)
    connection_cm.__aexit__ = AsyncMock(return_value=None)

    pool = MagicMock()
    pool.connection.return_value = connection_cm

    return pool, cursor


@pytest.mark.asyncio
async def test_get_schema_builds_table_to_columns_mapping():
    rows = [
        ("customers", "customer_id"),
        ("customers", "name"),
        ("customers", "region"),
        ("orders", "order_id"),
        ("orders", "amount"),
    ]

    pool, cursor = build_mock_pool(rows)

    with patch("services.schema_service.get_pool", return_value=pool):
        result = await get_schema()

    assert result == {
        "customers": ["customer_id", "name", "region"],
        "orders": ["order_id", "amount"],
    }

    cursor.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_schema_returns_empty_schema_when_no_rows():
    pool, cursor = build_mock_pool([])

    with patch("services.schema_service.get_pool", return_value=pool):
        result = await get_schema()

    assert result == {}
    cursor.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_schema_with_types_builds_typed_schema():
    rows = [
        ("customers", "customer_id", "integer"),
        ("customers", "name", "text"),
        ("customers", "created_at", "timestamp"),
        ("orders", "amount", "numeric"),
    ]

    pool, cursor = build_mock_pool(rows)

    with patch("services.schema_service.get_pool", return_value=pool):
        result = await get_schema_with_types()

    assert result == {
        "customers": [
            ("customer_id", "integer"),
            ("name", "text"),
            ("created_at", "timestamp"),
        ],
        "orders": [
            ("amount", "numeric"),
        ],
    }

    cursor.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_schema_with_types_returns_empty_schema_when_no_rows():
    pool, cursor = build_mock_pool([])

    with patch("services.schema_service.get_pool", return_value=pool):
        result = await get_schema_with_types()

    assert result == {}
    cursor.execute.assert_awaited_once()