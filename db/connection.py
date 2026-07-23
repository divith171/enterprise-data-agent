from psycopg_pool import AsyncConnectionPool

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


async def open_pool():
    await pool.open()


async def close_pool():
    await pool.close()


def get_pool():
    return pool