import asyncio
import os
import selectors
from decimal import Decimal

from psycopg.conninfo import conninfo_to_dict
from psycopg_pool import AsyncConnectionPool

import tools.sql_tool as sql_tool


def test_real_postgres_sql_executor(monkeypatch):
    dsn = os.environ.get("DATAKAT_PG_INTEGRATION_DSN")
    assert dsn, "Explicit disposable test database DSN required"

    params = conninfo_to_dict(dsn)

    # Safety: never run against the existing development database.
    assert params.get("host") == "127.0.0.1"
    assert str(params.get("port")) == "55432"
    assert params.get("dbname") == "datakat_test"
    assert params.get("user") == "datakat_reader_test"

    async def exercise():
        pool = AsyncConnectionPool(
            conninfo=dsn,
            min_size=1,
            max_size=1,
            timeout=5,
            open=False,
        )

        async with pool:
            # Verify the actual database identity and security defaults.
            async with pool.connection() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute(
                        "SELECT current_database(), current_user, "
                        "current_setting('statement_timeout'), "
                        "current_setting('transaction_read_only')"
                    )
                    db, user, timeout, read_only = await cursor.fetchone()

                    assert db == "datakat_test"
                    assert user == "datakat_reader_test"
                    assert timeout == "2s"
                    assert read_only == "on"

            # Use the actual DataKat executor.
            monkeypatch.setattr(sql_tool, "get_pool", lambda: pool)

            result = await sql_tool.run_query(
                "SELECT region, SUM(amount) AS total "
                "FROM public.datakat_test_orders "
                "GROUP BY region ORDER BY region"
            )

            assert result["status"] == "success", result
            assert result["columns"] == ["region", "total"]
            assert result["data"] == [
                ("North", Decimal("176.00")),
                ("South", Decimal("50.00")),
            ]
            assert result["column_metadata"] == [
                {"index": 0, "name": "region", "type": "text"},
                {"index": 1, "name": "total", "type": "numeric"},
            ]

    asyncio.run(
        exercise(),
        loop_factory=lambda: asyncio.SelectorEventLoop(
            selectors.SelectSelector()
        ),
    )
