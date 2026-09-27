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
    graph_service.relationship_cache.clear()

    yield

    graph_service.relationship_cache.clear()


@pytest.mark.asyncio
async def test_get_relationships_loads_foreign_keys_from_database():
    rows = [
        ("orders", "customer_id", "customers", "customer_id"),
        ("orders", "product_id", "products", "product_id"),
    ]

    pool, cursor = build_mock_pool(rows)

    with (
        patch(
            "services.graph_service.get_current_data_source_id",
            return_value="data-source-a",
        ),
        patch(
            "services.graph_service.get_pool",
            return_value=pool,
        ),
    ):
        result = await graph_service.get_relationships()

    assert result == rows

    cursor.execute.assert_awaited_once()

    assert (
        graph_service.relationship_cache[
            "data-source-a"
        ]["relationships"]
        == rows
    )


@pytest.mark.asyncio
async def test_get_relationships_uses_cache():
    cached_rows = [
        ("orders", "customer_id", "customers", "customer_id"),
    ]

    graph_service.relationship_cache[
        "data-source-a"
    ] = {
        "relationships": cached_rows,
        "loaded_at": graph_service.time.monotonic(),
    }

    with (
        patch(
            "services.graph_service.get_current_data_source_id",
            return_value="data-source-a",
        ),
        patch(
            "services.graph_service.get_pool"
        ) as mock_get_pool,
    ):
        result = await graph_service.get_relationships()

    assert result == cached_rows

    mock_get_pool.assert_not_called()


@pytest.mark.asyncio
async def test_relationship_cache_is_isolated_by_data_source():
    rows_a = [
        (
            "customers",
            "customer_id",
            "orders",
            "customer_id",
        ),
    ]

    rows_b = [
        (
            "accounts",
            "account_id",
            "transactions",
            "account_id",
        ),
    ]

    pool_a, cursor_a = build_mock_pool(rows_a)
    pool_b, cursor_b = build_mock_pool(rows_b)

    with (
        patch(
            "services.graph_service.get_current_data_source_id",
            side_effect=[
                "data-source-a",
                "data-source-b",
                "data-source-a",
            ],
        ),
        patch(
            "services.graph_service.get_pool",
            side_effect=[
                pool_a,
                pool_b,
            ],
        ) as mock_get_pool,
    ):
        result_a_first = (
            await graph_service.get_relationships()
        )

        result_b = (
            await graph_service.get_relationships()
        )

        result_a_second = (
            await graph_service.get_relationships()
        )

    assert result_a_first == rows_a
    assert result_b == rows_b
    assert result_a_second == rows_a

    assert (
        graph_service.relationship_cache[
            "data-source-a"
        ]["relationships"]
        == rows_a
    )

    assert (
        graph_service.relationship_cache[
            "data-source-b"
        ]["relationships"]
        == rows_b
    )

    assert mock_get_pool.call_count == 2

    cursor_a.execute.assert_awaited_once()
    cursor_b.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_expired_relationship_cache_reloads_from_database():
    old_rows = [
        (
            "old_orders",
            "customer_id",
            "old_customers",
            "customer_id",
        ),
    ]

    fresh_rows = [
        (
            "orders",
            "customer_id",
            "customers",
            "customer_id",
        ),
    ]

    graph_service.relationship_cache[
        "data-source-a"
    ] = {
        "relationships": old_rows,
        "loaded_at": 100.0,
    }

    pool, cursor = build_mock_pool(fresh_rows)

    with (
        patch(
            "services.graph_service.get_current_data_source_id",
            return_value="data-source-a",
        ),
        patch(
            "services.graph_service.time.monotonic",
            return_value=500.0,
        ),
        patch(
            "services.graph_service.get_pool",
            return_value=pool,
        ),
    ):
        result = await graph_service.get_relationships()

    assert result == fresh_rows

    cursor.execute.assert_awaited_once()

    assert (
        graph_service.relationship_cache[
            "data-source-a"
        ]["relationships"]
        == fresh_rows
    )

    assert (
        graph_service.relationship_cache[
            "data-source-a"
        ]["loaded_at"]
        == 500.0
    )


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

def test_invalidate_relationship_cache_removes_only_requested_data_source():
    graph_service.relationship_cache["data-source-a"] = {
        "relationships": ["a"],
        "loaded_at": 100.0,
    }

    graph_service.relationship_cache["data-source-b"] = {
        "relationships": ["b"],
        "loaded_at": 100.0,
    }

    graph_service.invalidate_relationship_cache(
        "data-source-a"
    )

    assert "data-source-a" not in graph_service.relationship_cache

    assert (
        graph_service.relationship_cache[
            "data-source-b"
        ]["relationships"]
        == ["b"]
    )