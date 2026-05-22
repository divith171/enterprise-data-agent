import json
from openai import OpenAI

client = OpenAI()


def classify_query_type(user_question: str):

    prompt = f"""
You are an expert enterprise analytics assistant.

Classify the user's query into ONE of these categories:

- retrieval
    -> simple listing/filtering queries
    -> no aggregation required

- aggregation
    -> averages, sums, counts, totals

- ranking
    -> top, bottom, highest, lowest

- trend
    -> trends over time, increases, decreases, comparisons over periods

USER QUERY:
"{user_question}"

Return ONLY valid JSON:

{{
    "query_type": "retrieval" | "aggregation" | "ranking" | "trend"
}}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    content = response.choices[0].message.content.strip()

    print("QUERY TYPE RAW:", content)

    try:
        return json.loads(content)
    except Exception:
        return {"query_type": "aggregation"}