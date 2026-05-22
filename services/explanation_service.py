from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def explain_result(question: str, sql: str, result):
    """
    Convert SQL result into natural language explanation
    """

    prompt = f"""
You are a data analyst explaining database query results.

User question:
{question}

SQL query executed:
{sql}

SQL result rows:
{result}

Explain the result clearly in plain English.
Be concise and accurate.
Do not mention SQL syntax in the explanation.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    return response.choices[0].message.content.strip()