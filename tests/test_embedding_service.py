import os

os.environ["OPENAI_API_KEY"] = "test-key"

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.embedding_service import (
    get_embedding,
    get_relevant_columns,
    get_table_embeddings,
    store_column_embeddings,
    store_table_embeddings,
)


def build_response(embedding):
    return SimpleNamespace(
        data=[
            SimpleNamespace(
                embedding=embedding
            )
        ]
    )


def build_mock_pool(rows=None):
    cursor = MagicMock()
    cursor.execute = AsyncMock()
    cursor.fetchall = AsyncMock(return_value=rows or [])
    cursor_cm = MagicMock()
    cursor_cm.__aenter__ = AsyncMock(return_value=cursor)
    cursor_cm.__aexit__ = AsyncMock(return_value=None)

    connection = MagicMock()
    connection.cursor.return_value = cursor_cm
    connection.commit = AsyncMock()

    connection_cm = MagicMock()
    connection_cm.__aenter__ = AsyncMock(return_value=connection)
    connection_cm.__aexit__ = AsyncMock(return_value=None)

    pool = MagicMock()
    pool.connection.return_value = connection_cm

    return pool, cursor, connection


def test_get_embedding_returns_embedding():
    mock_client = MagicMock()
    mock_client.embeddings.create.return_value = build_response(
        [0.1, 0.2, 0.3]
    )

    with patch(
        "services.embedding_service.client",
        mock_client,
    ):
        result = get_embedding("revenue by region")

    assert result == [0.1, 0.2, 0.3]

    mock_client.embeddings.create.assert_called_once_with(
        model="text-embedding-3-small",
        input="revenue by region",
    )


@pytest.mark.asyncio
async def test_store_column_embeddings_inserts_each_column():
    schema = {
        "sales": ["sale_id", "sale_amount"],
        "customers": ["customer_id"],
    }

    pool, cursor, connection = build_mock_pool()

    with (
        patch(
            "services.embedding_service.get_schema",
            new=AsyncMock(return_value=schema),
        ),
        patch(
            "services.embedding_service.get_pool",
            return_value=pool,
        ),
        patch(
            "services.embedding_service.get_embedding",
            side_effect=[
                [0.1, 0.2],
                [0.3, 0.4],
                [0.5, 0.6],
            ],
        ) as mock_embedding,
    ):
        await store_column_embeddings()

    assert mock_embedding.call_count == 3
    assert cursor.execute.await_count == 3
    connection.commit.assert_awaited_once()

    calls = cursor.execute.await_args_list

    assert calls[0].args[1][0] == "sales"
    assert calls[0].args[1][1] == "sale_id"

    assert calls[1].args[1][0] == "sales"
    assert calls[1].args[1][1] == "sale_amount"

    assert calls[2].args[1][0] == "customers"
    assert calls[2].args[1][1] == "customer_id"


@pytest.mark.asyncio
async def test_store_table_embeddings_truncates_and_inserts_tables():
    schema = {
        "sales": ["id", "amount"],
        "customers": ["id", "name"],
    }

    pool, cursor, connection = build_mock_pool()

    with (
        patch(
            "services.embedding_service.get_schema",
            new=AsyncMock(return_value=schema),
        ),
        patch(
            "services.embedding_service.get_pool",
            return_value=pool,
        ),
        patch(
            "services.embedding_service.get_embedding",
            side_effect=[
                [0.1, 0.2],
                [0.3, 0.4],
            ],
        ) as mock_embedding,
    ):
        await store_table_embeddings()

    assert mock_embedding.call_count == 2
    assert mock_embedding.call_args_list[0].args == ("sales",)
    assert mock_embedding.call_args_list[1].args == ("customers",)

    assert cursor.execute.await_count == 3
    connection.commit.assert_awaited_once()

    first_call = cursor.execute.await_args_list[0]
    assert "TRUNCATE TABLE table_embeddings" in first_call.args[0]


@pytest.mark.asyncio
async def test_get_relevant_columns_returns_database_results():
    rows = [
        (
            "sales",
            "amount",
            "Sales amount",
            0.12,
        ),
        (
            "sales",
            "region",
            "Sales region",
            0.25,
        ),
    ]

    pool, cursor, _ = build_mock_pool(rows)

    with (
        patch(
            "services.embedding_service.get_embedding",
            return_value=[0.1, 0.2, 0.3],
        ),
        patch(
            "services.embedding_service.get_pool",
            return_value=pool,
        ),
    ):
        result = await get_relevant_columns(
            "sales by region",
            top_k=2,
        )

    assert result == rows
    cursor.execute.assert_awaited_once()

    executed_sql, params = cursor.execute.await_args.args

    assert "LIMIT %s" in executed_sql
    assert "ORDER BY embedding <->" in executed_sql

    assert params == (
        "[0.1,0.2,0.3]",
        "[0.1,0.2,0.3]",
        2,
    )


@pytest.mark.asyncio
async def test_get_table_embeddings_converts_string_embeddings():
    rows = [
        ("sales", "[0.1, 0.2, 0.3]"),
        ("customers", [0.4, 0.5, 0.6]),
    ]

    pool, cursor, _ = build_mock_pool(rows)

    with patch(
        "services.embedding_service.get_pool",
        return_value=pool,
    ):
        result = await get_table_embeddings()

    assert result == [
        ("sales", [0.1, 0.2, 0.3]),
        ("customers", [0.4, 0.5, 0.6]),
    ]

    cursor.execute.assert_awaited_once()

@pytest.mark.anyio
async def test_get_relevant_columns_uses_sql_parameters(
    monkeypatch,
):
    from unittest.mock import AsyncMock, MagicMock

    from services import embedding_service

    monkeypatch.setattr(
        embedding_service,
        "get_embedding",
        lambda text: [0.1, 0.2, 0.3],
    )

    cursor = AsyncMock()
    cursor.fetchall.return_value = []

    cursor_context = MagicMock()
    cursor_context.__aenter__ = AsyncMock(
        return_value=cursor
    )
    cursor_context.__aexit__ = AsyncMock(
        return_value=None
    )

    conn = MagicMock()
    conn.cursor.return_value = cursor_context

    connection_context = MagicMock()
    connection_context.__aenter__ = AsyncMock(
        return_value=conn
    )
    connection_context.__aexit__ = AsyncMock(
        return_value=None
    )

    pool = MagicMock()
    pool.connection.return_value = connection_context

    monkeypatch.setattr(
        embedding_service,
        "get_pool",
        lambda: pool,
    )

    await embedding_service.get_relevant_columns(
        "show customer risk",
        top_k=7,
    )

    cursor.execute.assert_awaited_once()

    sql, params = cursor.execute.await_args.args

    assert "%s::vector" in sql
    assert "LIMIT %s" in sql

    assert params == (
        "[0.1,0.2,0.3]",
        "[0.1,0.2,0.3]",
        7,
    )

    assert "[0.1,0.2,0.3]" not in sql