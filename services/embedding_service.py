from observability.debug import debug_print
from openai import OpenAI
import os
from dotenv import load_dotenv
from db.connection import get_pool
from services.schema_service import get_schema
import time
import ast

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def get_embedding(text: str):
    start = time.time()

    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )

    debug_print(
        "EMBEDDING:",
        text,
        "| TIME:",
        round(time.time() - start, 3),
        "sec"
    )

    return response.data[0].embedding


async def store_column_embeddings():
    schema = await get_schema()

    async with get_pool().connection() as conn:
        async with conn.cursor() as cursor:

            def format_column(col):
                return col.replace("_", " ")

            for table, columns in schema.items():
                for col in columns:

                    clean = format_column(col)

                    description = f"""
Column: {clean}
Table: {table}

Meaning:
- Represents {clean} in the {table} dataset
- Used for analytics and filtering

Examples:
- Used in queries about {clean}
"""

                    embedding = get_embedding(description)

                    await cursor.execute(
                        """
                        INSERT INTO schema_embeddings
                        (table_name, column_name, description, embedding)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (table, col, description, embedding)
                    )

            await conn.commit()

    debug_print("Column-level embeddings stored!")
    debug_print("DEBUG DESCRIPTION:", description)


async def store_table_embeddings():

    schema = await get_schema()

    async with get_pool().connection() as conn:
        async with conn.cursor() as cursor:

            await cursor.execute(
                "TRUNCATE TABLE table_embeddings"
            )

            for table in schema.keys():

                embedding = get_embedding(table)

                await cursor.execute(
                    """
                    INSERT INTO table_embeddings
                    (table_name, embedding)
                    VALUES (%s, %s)
                    """,
                    (
                        table,
                        embedding
                    )
                )

                debug_print(f"Embedded table: {table}")

            await conn.commit()

    debug_print("Table embeddings stored!")


async def get_relevant_columns(user_question: str, top_k=5):

    question_embedding = get_embedding(user_question)
    embedding_str = "[" + ",".join(map(str, question_embedding)) + "]"

    async with get_pool().connection() as conn:
        async with conn.cursor() as cursor:

            await cursor.execute(
                """
                SELECT
                    table_name,
                    column_name,
                    description,
                    (embedding <-> %s::vector) AS distance
                FROM schema_embeddings
                WHERE column_name IS NOT NULL
                ORDER BY embedding <-> %s::vector
                LIMIT %s;
                """,
                    (
            embedding_str,
            embedding_str,
            top_k,
                )
            )

            results = await cursor.fetchall()

    return results


async def get_table_embeddings():

    async with get_pool().connection() as conn:
        async with conn.cursor() as cursor:

            await cursor.execute("""
                SELECT table_name, embedding
                FROM table_embeddings
            """)

            rows = await cursor.fetchall()

    cleaned_rows = []

    for table, embedding in rows:

        if isinstance(embedding, str):
            embedding = ast.literal_eval(embedding)

        cleaned_rows.append(
            (table, embedding)
        )

    return cleaned_rows
