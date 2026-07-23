import sqlite3
import psycopg2


# --------------------------------------------------
# POSTGRES CONFIG
# --------------------------------------------------

PG_CONFIG = {

    "host": "localhost",
    "port": 5432,
    "database": "bird_eval",

    "user": "eda_user",
    "password": "eda_pass"
}


# --------------------------------------------------
# SQLITE DATABASE PATH
# --------------------------------------------------

SQLITE_PATH = (

    "evaluation/bird/dev_20240627/"
    "dev_databases/dev_databases/"
    "financial/financial.sqlite"
)


# --------------------------------------------------
# CONNECT TO SQLITE
# --------------------------------------------------

sqlite_conn = sqlite3.connect(SQLITE_PATH)

sqlite_cursor = sqlite_conn.cursor()


# --------------------------------------------------
# CONNECT TO POSTGRES
# --------------------------------------------------

pg_conn = psycopg2.connect(**PG_CONFIG)

pg_cursor = pg_conn.cursor()


# --------------------------------------------------
# GET SQLITE TABLES
# --------------------------------------------------

sqlite_cursor.execute("""

SELECT name
FROM sqlite_master
WHERE type='table';

""")

tables = sqlite_cursor.fetchall()

print("\nFOUND TABLES:")
print(tables)


# --------------------------------------------------
# PROCESS EACH TABLE
# --------------------------------------------------

for table in tables:

    table_name = table[0]

    print("\n" + "=" * 80)
    print(f"PROCESSING TABLE: {table_name}")
    print("=" * 80)

    # --------------------------------------------------
    # GET SQLITE COLUMN INFO
    # --------------------------------------------------

    sqlite_cursor.execute(

        f"PRAGMA table_info({table_name});"

    )

    columns = sqlite_cursor.fetchall()

    column_defs = []

    column_names = []

    for column in columns:

        col_name = column[1]

        sqlite_type = column[2].upper()

        # --------------------------------------------------
        # SQLITE → POSTGRES TYPE MAPPING
        # --------------------------------------------------

        if "INT" in sqlite_type:

            pg_type = "INTEGER"

        elif "REAL" in sqlite_type \
             or "FLOA" in sqlite_type \
             or "DOUB" in sqlite_type:

            pg_type = "FLOAT"

        elif "CHAR" in sqlite_type \
             or "TEXT" in sqlite_type:

            pg_type = "TEXT"

        elif "DATE" in sqlite_type:

            pg_type = "TEXT"

        else:

            pg_type = "TEXT"

        column_defs.append(

            f"{col_name} {pg_type}"

        )

        column_names.append(col_name)

    print("\nCOLUMN DEFINITIONS:")
    print(column_defs)

    # --------------------------------------------------
    # DROP EXISTING TABLE
    # --------------------------------------------------

    drop_sql = f"""

    DROP TABLE IF EXISTS {table_name} CASCADE;

    """

    pg_cursor.execute(drop_sql)

    pg_conn.commit()

    print(f"DROPPED OLD TABLE: {table_name}")

    # --------------------------------------------------
    # CREATE TABLE
    # --------------------------------------------------

    create_sql = f"""

    CREATE TABLE {table_name} (

        {', '.join(column_defs)}

    );

    """

    print("\nCREATE SQL:")
    print(create_sql)

    pg_cursor.execute(create_sql)

    pg_conn.commit()

    print(f"CREATED TABLE: {table_name}")

    # --------------------------------------------------
    # LOAD SQLITE DATA
    # --------------------------------------------------

    sqlite_cursor.execute(

        f"SELECT * FROM {table_name};"

    )

    rows = sqlite_cursor.fetchall()

    print(f"\nTOTAL ROWS FOUND: {len(rows)}")

    if len(rows) == 0:

        continue

    placeholders = ", ".join(

        ["%s"] * len(column_names)

    )

    insert_sql = f"""

    INSERT INTO {table_name}

    ({', '.join(column_names)})

    VALUES ({placeholders})

    """

    # --------------------------------------------------
    # INSERT ROWS
    # --------------------------------------------------

    inserted = 0

    for row in rows:

        try:

            pg_cursor.execute(insert_sql, row)

            inserted += 1

        except Exception as e:

            print("\nROW INSERT ERROR:")
            print(e)

            pg_conn.rollback()

    pg_conn.commit()

    print(f"INSERTED ROWS: {inserted}")


# --------------------------------------------------
# CLOSE CONNECTIONS
# --------------------------------------------------

sqlite_conn.close()

pg_conn.close()

print("\nDONE LOADING BIRD FINANCIAL DATASET INTO POSTGRES.")