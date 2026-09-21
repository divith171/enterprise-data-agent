import asyncio
from uuid import UUID

from app.auth.repository import get_data_source_by_id
from db.connection import (
    clear_customer_pool,
    open_customer_pool,
    open_pool,
)
from services.embedding_service import store_table_embeddings


DATA_SOURCE_ID = UUID(
    "2964b38d-b20c-4faf-a957-5c3c7fab9fac"
)


async def main():
    await open_pool()

    data_source = await get_data_source_by_id(DATA_SOURCE_ID)

    if data_source is None:
        raise RuntimeError("Data source not found")

    customer_pool = await open_customer_pool(data_source)

    try:
        await store_table_embeddings()
    finally:
        clear_customer_pool()
        await customer_pool.close()


asyncio.run(
    main(),
    loop_factory=asyncio.SelectorEventLoop,
)