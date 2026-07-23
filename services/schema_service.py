from db.connection import get_pool


async def get_schema():
    async with get_pool().connection() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                SELECT table_name, column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name NOT IN (
                      'schema_embeddings',
                      'schema_embeddings_backup',
                      'table_embeddings'
                  )
                ORDER BY table_name, ordinal_position;
            """)

            rows = await cursor.fetchall()

    schema = {}

    for table, column in rows:
        if table not in schema:
            schema[table] = []
        schema[table].append(column)

    return schema


async def get_schema_with_types():
    async with get_pool().connection() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                SELECT table_name, column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public';
            """)

            rows = await cursor.fetchall()

    schema = {}

    for table, col, dtype in rows:
        if table not in schema:
            schema[table] = []
        schema[table].append((col, dtype))

    return schema