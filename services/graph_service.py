from db.connection import get_pool
from services.schema_service import get_schema

relationship_cache = None


async def get_relationships():
    global relationship_cache

    print("GET_RELATIONSHIPS CALLED")

    if relationship_cache is not None:
        print("USING CACHED RELATIONSHIPS")
        return relationship_cache

    print("LOADING RELATIONSHIPS FROM DATABASE")

    async with get_pool().connection() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute("""
                SELECT
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table,
                    ccu.column_name AS foreign_column
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY';
            """)

            rows = await cursor.fetchall()

    relationship_cache = rows

    return relationship_cache


async def build_graph():
    relationships = await get_relationships()
    schema = await get_schema()

    graph = {}

    # ---------------------------
    # 1. Foreign Key relationships (HIGH confidence)
    # ---------------------------
    for table, column, foreign_table, foreign_column in relationships:
        graph.setdefault(table, set()).add(foreign_table)
        graph.setdefault(foreign_table, set()).add(table)

    # ---------------------------
    # 2. Fallback: column-based inference (MEDIUM confidence)
    # ---------------------------
    tables = list(schema.keys())

    for i in range(len(tables)):
        for j in range(i + 1, len(tables)):
            t1, t2 = tables[i], tables[j]

            cols1 = set(schema[t1])
            cols2 = set(schema[t2])

            common_cols = cols1 & cols2

            for col in common_cols:
                # Only use strong signals
                if col.endswith("_id") and col != "id":
                    graph.setdefault(t1, set()).add(t2)
                    graph.setdefault(t2, set()).add(t1)

    # Convert sets → lists
    graph = {k: list(v) for k, v in graph.items()}

    return graph


async def build_relationship_text():
    relationships = await get_relationships()

    return "\n".join(
        [
            f"{table}.{column} = {foreign_table}.{foreign_column}"
            for table, column, foreign_table, foreign_column in relationships
        ]
    )