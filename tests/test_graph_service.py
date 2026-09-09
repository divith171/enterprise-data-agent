from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import services.graph_service as graph_service


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


@pytest.fixture(autouse=True)
def reset_relationship_cache():
    graph_service.relationship_cache = None
    yield
    graph_service.relationship_cache = None


@pytest.mark.asyncio
async def test_get_relationships_loads_foreign_keys_from_database():
    rows = [
        ("orders", "customer_id", "customers", "customer_id"),
        ("orders", "product_id", "products", "product_id"),
    ]

    pool, cursor = build_mock_pool(rows)

    with patch(
        "services.graph_service.get_pool",
        return_value=pool,
    ):
        result = await graph_service.get_relationships()

    assert result == rows
    cursor.execute.assert_awaited_once()
    assert graph_service.relationship_cache == rows


@pytest.mark.asyncio
async def test_get_relationships_uses_cache():
    cached_rows = [
        ("orders", "customer_id", "customers", "customer_id"),
    ]

    graph_service.relationship_cache = cached_rows

    with patch(
        "services.graph_service.get_pool"
    ) as mock_get_pool:
        result = await graph_service.get_relationships()

    assert result == cached_rows
    mock_get_pool.assert_not_called()


@pytest.mark.asyncio
async def test_build_graph_creates_bidirectional_foreign_key_edges():
    relationships = [
        ("orders", "customer_id", "customers", "customer_id"),
        ("orders", "product_id", "products", "product_id"),
    ]

    schema = {
        "orders": ["order_id", "customer_id", "product_id"],
        "customers": ["customer_id", "name"],
        "products": ["product_id", "name"],
    }

    with (
        patch(
            "services.graph_service.get_relationships",
            new=AsyncMock(return_value=relationships),
        ),
        patch(
            "services.graph_service.get_schema",
            new=AsyncMock(return_value=schema),
        ),
    ):
        result = await graph_service.build_graph()

    assert set(result["orders"]) == {"customers", "products"}
    assert result["customers"] == ["orders"]
    assert result["products"] == ["orders"]


@pytest.mark.asyncio
async def test_build_graph_uses_column_based_fallback():
    schema = {
        "orders": ["order_id", "customer_id", "amount"],
        "customers": ["customer_id", "name"],
    }

    with (
        patch(
            "services.graph_service.get_relationships",
            new=AsyncMock(return_value=[]),
        ),
        patch(
            "services.graph_service.get_schema",
            new=AsyncMock(return_value=schema),
        ),
    ):
        result = await graph_service.build_graph()

    assert "customers" in result["orders"]
    assert "orders" in result["customers"]


@pytest.mark.asyncio
async def test_build_graph_does_not_use_plain_id_as_fallback_signal():
    schema = {
        "orders": ["id", "amount"],
        "archive": ["id", "amount"],
    }

    with (
        patch(
            "services.graph_service.get_relationships",
            new=AsyncMock(return_value=[]),
        ),
        patch(
            "services.graph_service.get_schema",
            new=AsyncMock(return_value=schema),
        ),
    ):
        result = await graph_service.build_graph()

    assert result == {}


@pytest.mark.asyncio
async def test_build_relationship_text_formats_relationships():
    relationships = [
        ("orders", "customer_id", "customers", "customer_id"),
        ("orders", "product_id", "products", "product_id"),
    ]

    with patch(
        "services.graph_service.get_relationships",
        new=AsyncMock(return_value=relationships),
    ):
        result = await graph_service.build_relationship_text()

    assert result == (
        "orders.customer_id = customers.customer_id\n"
        "orders.product_id = products.product_id"
    )