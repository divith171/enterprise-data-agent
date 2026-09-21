from contextvars import ContextVar

from psycopg_pool import AsyncConnectionPool

from app.security.database import create_customer_pool


pool = AsyncConnectionPool(

    conninfo=(

        "host=localhost "

        "port=5432 "

        "dbname=bird_eval "

        "user=eda_user "

        "password=eda_pass"

    ),

    min_size=2,

    max_size=10,

    open=False,

)


_customer_pool: ContextVar[AsyncConnectionPool | None] = ContextVar(
    "customer_pool",
    default=None,
)


async def open_pool():
    await pool.open()


async def close_pool():
    await pool.close()


def get_pool():
    customer_pool = _customer_pool.get()

    if customer_pool is not None:
        return customer_pool

    return pool


async def open_customer_pool(data_source):
    customer_pool = await create_customer_pool(data_source)

    _customer_pool.set(customer_pool)

    return customer_pool


def clear_customer_pool():
    _customer_pool.set(None)