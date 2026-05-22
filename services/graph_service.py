from db.connection import get_connection
from services.schema_service import get_schema


def get_relationships():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
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

    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    return rows


def build_graph():
    relationships = get_relationships()
    schema = get_schema()

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

    # Convert sets → lists (clean output)
    graph = {k: list(v) for k, v in graph.items()}

    return graph

def build_relationship_text():

    relationships = get_relationships()

    return "\n".join([

        f"{table}.{column} = "
        f"{foreign_table}.{foreign_column}"

        for table, column,
        foreign_table, foreign_column
        in relationships
    ])