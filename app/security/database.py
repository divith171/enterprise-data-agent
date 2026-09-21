from dataclasses import dataclass

from psycopg_pool import AsyncConnectionPool

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


def build_connection_config(data_source) -> DataSourceConnectionConfig:
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
) -> AsyncConnectionPool:
    config = build_connection_config(data_source)

    try:
        credentials = resolve_database_credentials(config.secret_ref)
    except SecretResolutionError as exc:
        raise CustomerDatabaseConnectionError(str(exc)) from exc

    conninfo = (
        f"host={config.host} "
        f"port={config.port} "
        f"dbname={config.database_name} "
        f"user={config.username} "
        f"password={credentials['password']} "
        f"sslmode={config.ssl_mode}"
    )

    pool = AsyncConnectionPool(
        conninfo=conninfo,
        min_size=1,
        max_size=5,
        open=False,
    )

    await pool.open()

    return pool