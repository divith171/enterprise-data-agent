from openai import AsyncOpenAI
import os
import time
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def explain_result(question: str, sql: str, result):
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
    start = time.time()
    print("ENTERED explain_result()")
    print("CLIENT TYPE:", type(client))
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    print("OPENAI CALL FINISHED")
    print(type(response))

    elapsed = round(time.time() - start, 2)

    return {
        "explanation": response.choices[0].message.content.strip(),
        "elapsed": elapsed
    }