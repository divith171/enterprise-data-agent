from dataclasses import dataclass

from psycopg.conninfo import make_conninfo
from psycopg_pool import AsyncConnectionPool

from app.config import (
    PRODUCTION_POSTGRES_SSL_MODES,
    settings,
)
from app.security.secrets import (
    SecretResolutionError,
    resolve_database_credentials,
)


@dataclass(frozen=True)
class DataSourceConnectionConfig:
    host: str
    port: int
    database_name: str
    username: str
    secret_ref: str
    ssl_mode: str


def build_connection_config(
    data_source,
) -> DataSourceConnectionConfig:
    return DataSourceConnectionConfig(
        host=data_source[4],
        port=data_source[5],
        database_name=data_source[6],
        username=data_source[7],
        secret_ref=data_source[8],
        ssl_mode=data_source[9],
    )


class CustomerDatabaseConnectionError(Exception):
    pass


async def create_customer_pool(
    data_source,
    *,
    username_override: str | None = None,
    secret_ref_override: str | None = None,
) -> AsyncConnectionPool:
    config = build_connection_config(
        data_source
    )

    ssl_mode = (
        config.ssl_mode
        or ""
    ).strip().lower()

    # ---------------------------------
    # Production TLS enforcement
    # ---------------------------------

    if (
        settings.is_production
        and ssl_mode
        not in PRODUCTION_POSTGRES_SSL_MODES
    ):
        raise CustomerDatabaseConnectionError(
            "Production customer database "
            "connections must use PostgreSQL TLS."
        )

    username = (
        username_override
        or config.username
    )

    secret_ref = (
        secret_ref_override
        or config.secret_ref
    )

    try:
        credentials = (
            resolve_database_credentials(
                secret_ref
            )
        )
    except SecretResolutionError as exc:
        raise CustomerDatabaseConnectionError(
            str(exc)
        ) from exc

    conninfo = make_conninfo(
        host=config.host,
        port=config.port,
        dbname=config.database_name,
        user=username,
        password=credentials["password"],
        sslmode=ssl_mode,
    )

    pool = AsyncConnectionPool(
        conninfo=conninfo,
        min_size=1,
        max_size=5,
        open=False,
    )

    await pool.open()

    return pool