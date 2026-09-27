from observability.debug import debug_print
import time

from db.connection import get_pool, get_current_data_source_id
from services.schema_service import get_schema


RELATIONSHIP_CACHE_TTL_SECONDS = 300

# Cache relationships separately for each data source.
#
# Example:
# {
#     "data-source-a": {
#         "relationships": [...],
#         "loaded_at": 12345.67,
#     },
#     "data-source-b": {
#         "relationships": [...],
#         "loaded_at": 12350.12,
#     },
# }
relationship_cache = {}


def invalidate_relationship_cache(data_source_id=None):
    if data_source_id is None:
        relationship_cache.clear()
        return

    relationship_cache.pop(
        str(data_source_id),
        None,
    )


async def get_relationships():
    data_source_id = get_current_data_source_id()

    debug_print("GET_RELATIONSHIPS CALLED")

    # ---------------------------------
    # Check this data source's cache
    # ---------------------------------
    if data_source_id is not None:
        cache_key = str(data_source_id)

        cache_entry = relationship_cache.get(
            cache_key
        )

        if cache_entry is not None:
            cache_age = (
                time.monotonic()
                - cache_entry["loaded_at"]
            )

            if cache_age < RELATIONSHIP_CACHE_TTL_SECONDS:
                debug_print(
                    "USING CACHED RELATIONSHIPS"
                )
                return cache_entry["relationships"]

            # Cache expired
            relationship_cache.pop(
                cache_key,
                None,
            )

    debug_print("LOADING RELATIONSHIPS FROM DATABASE")

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

    # ---------------------------------
    # Cache only when we know which
    # customer data source this belongs to
    # ---------------------------------
    if data_source_id is not None:
        relationship_cache[
            str(data_source_id)
        ] = {
            "relationships": rows,
            "loaded_at": time.monotonic(),
        }

    return rows


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
