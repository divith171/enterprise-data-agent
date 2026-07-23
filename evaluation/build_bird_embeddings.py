import os
import sys
import pandas as pd

sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )
)

from db.connection import get_connection
from services.embedding_service import get_embedding

CSV_DIR = r"C:\Users\Divith\enterprise_data_agent\evaluation\bird\dev_20240627\dev_databases\dev_databases\financial\database_description"

print("\nBUILDING BIRD SCHEMA EMBEDDINGS...\n")

conn = get_connection()
cursor = conn.cursor()

cursor.execute("TRUNCATE TABLE schema_embeddings")

for file in os.listdir(CSV_DIR):

    if not file.endswith(".csv"):
        continue

    table_name = file.replace(".csv", "")

    csv_path = os.path.join(CSV_DIR, file)

    df = pd.read_csv(csv_path)
    if table_name == "account":
        print(df.columns.tolist())
        print(df[df["original_column_name"] == "frequency"].to_dict("records"))

    for _, row in df.iterrows():

        original_column = str(row.get("original_column_name", "")).strip()

        if not original_column or original_column == "nan":
            continue

        business_name = str(
            row.get("column_name", "")
        ).strip()

        description = str(
            row.get("column_description", "")
        ).strip()

        data_format = str(
            row.get("data_format", "")
        ).strip()

        value_description = row.get("value_description", "")

        if pd.isna(value_description) or not str(value_description).strip():

            extra_description = row.get("Unnamed: 5", "")

            if not pd.isna(extra_description):
                value_description = str(extra_description).strip()
            else:
                value_description = ""

        else:
            value_description = str(value_description).strip()

        text = f"""
Table: {table_name}

Column: {original_column}

Business Name:
{business_name}

Description:
{description}

Data Type:
{data_format}

Value Meanings:
{value_description}
"""

        embedding = get_embedding(text)

        cursor.execute(
            """
            INSERT INTO schema_embeddings
            (table_name, column_name, description, embedding)
            VALUES (%s, %s, %s, %s)
            """,
            (
                table_name,
                original_column.lower(),
                text,
                embedding
            )
        )

        print(
            f"Embedded {table_name}.{original_column}"
        )

conn.commit()
cursor.close()
conn.close()

print("\nDONE.")