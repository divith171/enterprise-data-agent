from db.connection import get_connection


def get_schema():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
    """)

    rows = cursor.fetchall()

    schema = {}

    for table, column in rows:
        if table not in schema:
            schema[table] = []
        schema[table].append(column)

    cursor.close()
    conn.close()

    return schema

def get_schema_with_types():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public';
    """)

    rows = cursor.fetchall()

    schema = {}

    for table, col, dtype in rows:
        if table not in schema:
            schema[table] = []
        schema[table].append((col, dtype))

    cursor.close()
    conn.close()

    return schema