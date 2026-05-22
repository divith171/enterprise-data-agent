from openai import OpenAI
import os
from dotenv import load_dotenv
from db.connection import get_connection
from services.schema_service import get_schema

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def get_embedding(text: str):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding



def store_column_embeddings():
    schema = get_schema()

    conn = get_connection()
    cursor = conn.cursor()

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

            cursor.execute(
                """
                INSERT INTO schema_embeddings (table_name, column_name, description, embedding)
                VALUES (%s, %s, %s, %s)
                """,
                (table, col, description, embedding)
            )

    conn.commit()
    cursor.close()
    conn.close()

    print("Column-level embeddings stored!")
    print("DEBUG DESCRIPTION:", description)
    

def get_relevant_columns(user_question: str, top_k=5):
    question_embedding = get_embedding(user_question)
    embedding_str = "[" + ",".join(map(str, question_embedding)) + "]"

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        f"""
        SELECT table_name, column_name, (embedding <-> '{embedding_str}'::vector) AS distance
        FROM schema_embeddings
        WHERE column_name IS NOT NULL
        ORDER BY embedding <-> '{embedding_str}'::vector
        LIMIT {top_k};
        """
    )

    results = cursor.fetchall()

    cursor.close()
    conn.close()

    return results