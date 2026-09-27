from contextvars import ContextVar

from psycopg.conninfo import make_conninfo
from psycopg_pool import AsyncConnectionPool

from app.config import settings
from app.security.database import create_customer_pool
from app.security.secrets import resolve_database_credentials


_control_db_credentials = resolve_database_credentials(
    "EDA_CONTROL_DB_PASSWORD"
)


pool = AsyncConnectionPool(
    conninfo=make_conninfo(
        host=settings.control_db_host,
        port=settings.control_db_port,
        dbname=settings.control_db_name,
        user=settings.control_db_user,
        password=_control_db_credentials["password"],
        sslmode=settings.control_db_ssl_mode,
    ),
    min_size=2,
    max_size=10,
    open=False,
)


_customer_pool: ContextVar[
    AsyncConnectionPool | None
] = ContextVar(
    "customer_pool",
    default=None,
)


_customer_data_source_id: ContextVar[
    str | None
] = ContextVar(
    "customer_data_source_id",
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


def get_current_data_source_id():
    return _customer_data_source_id.get()


async def open_customer_pool(
    data_source,
    *,
    username_override: str | None = None,
    secret_ref_override: str | None = None,
):
    customer_pool = await create_customer_pool(
        data_source,
        username_override=username_override,
        secret_ref_override=secret_ref_override,
    )

    _customer_pool.set(customer_pool)

    _customer_data_source_id.set(
        str(data_source[0])
    )

    return customer_pool


def clear_customer_pool():
    _customer_pool.set(None)
    _customer_data_source_id.set(None)