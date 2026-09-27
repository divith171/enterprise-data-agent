from types import SimpleNamespace

import pytest

from app.security import database
from db import connection


@pytest.mark.asyncio
async def test_customer_data_source_context_is_set_and_cleared(
    monkeypatch,
):
    fake_pool = object()

    data_source = (
        "data-source-123",
        "company-123",
    )

    async def fake_create_customer_pool(
        data_source,
        *,
        username_override=None,
        secret_ref_override=None,
    ):
        return fake_pool

    monkeypatch.setattr(
        connection,
        "create_customer_pool",
        fake_create_customer_pool,
    )

    result = await connection.open_customer_pool(
        data_source
    )

    assert result is fake_pool

    assert connection.get_pool() is fake_pool

    assert (
        connection.get_current_data_source_id()
        == "data-source-123"
    )

    connection.clear_customer_pool()

    assert (
        connection.get_current_data_source_id()
        is None
    )


@pytest.mark.asyncio
async def test_production_rejects_customer_database_without_tls(
    monkeypatch,
):
    data_source = (
        "data-source-123",
        "company-123",
        "Customer Database",
        True,
        "db.example.com",
        5432,
        "customer_db",
        "readonly_user",
        "CUSTOMER_DB_PASSWORD",
        "disable",
    )

    monkeypatch.setattr(
        database,
        "settings",
        SimpleNamespace(
            is_production=True,
        ),
    )

    with pytest.raises(
        database.CustomerDatabaseConnectionError,
        match="must use PostgreSQL TLS",
    ):
        await database.create_customer_pool(
            data_source
        )


@pytest.mark.asyncio
async def test_production_accepts_customer_database_with_strong_tls(
    monkeypatch,
):
    data_source = (
        "data-source-123",
        "company-123",
        "Customer Database",
        True,
        "db.example.com",
        5432,
        "customer_db",
        "readonly_user",
        "CUSTOMER_DB_PASSWORD",
        "verify-full",
    )

    monkeypatch.setattr(
        database,
        "settings",
        SimpleNamespace(
            is_production=True,
        ),
    )

    monkeypatch.setattr(
        database,
        "resolve_database_credentials",
        lambda secret_ref: {
            "password": "test-password"
        },
    )

    class FakePool:
        def __init__(
            self,
            conninfo,
            min_size,
            max_size,
            open,
        ):
            self.conninfo = conninfo
            self.min_size = min_size
            self.max_size = max_size
            self.open_on_create = open
            self.opened = False

        async def open(self):
            self.opened = True

    monkeypatch.setattr(
        database,
        "AsyncConnectionPool",
        FakePool,
    )

    pool = await database.create_customer_pool(
        data_source
    )

    assert pool.opened is True

    assert (
        "sslmode=verify-full"
        in pool.conninfo
    )


@pytest.mark.asyncio
async def test_development_allows_customer_database_without_tls(
    monkeypatch,
):
    data_source = (
        "data-source-123",
        "company-123",
        "Customer Database",
        True,
        "localhost",
        5432,
        "customer_db",
        "readonly_user",
        "CUSTOMER_DB_PASSWORD",
        "disable",
    )

    monkeypatch.setattr(
        database,
        "settings",
        SimpleNamespace(
            is_production=False,
        ),
    )

    monkeypatch.setattr(
        database,
        "resolve_database_credentials",
        lambda secret_ref: {
            "password": "test-password"
        },
    )

    class FakePool:
        def __init__(
            self,
            conninfo,
            min_size,
            max_size,
            open,
        ):
            self.conninfo = conninfo
            self.opened = False

        async def open(self):
            self.opened = True

    monkeypatch.setattr(
        database,
        "AsyncConnectionPool",
        FakePool,
    )

    pool = await database.create_customer_pool(
        data_source
    )

    assert pool.opened is True

    assert (
        "sslmode=disable"
        in pool.conninfo
    )