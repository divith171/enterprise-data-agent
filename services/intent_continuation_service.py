import json
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def classify_intent_continuation(
    previous_query,
    current_input
):

    prompt = f"""
You are an enterprise conversational analytics orchestrator.

Your task is to determine whether the user's latest message is:

1. A NEW analytical request
2. A clarification of the previous request
3. A continuation/refinement of the previous request

PREVIOUS QUERY:
"{previous_query}"

CURRENT USER INPUT:
"{current_input}"

DEFINITIONS:

- clarification:
  adds missing details like:
  - time range
  - threshold
  - metric
  - filter

Examples:
- "last 6 months"
- "greater than 1000"
- "based on revenue"

- continuation:
  extends or modifies the current analysis
  while keeping the same analytical goal.

Examples:
- "group by state"
- "monthly breakdown"
- "for premium customers"

- new_query:
  introduces a fundamentally different analytical goal.

Examples:
- previous: "top customers"
- current: "declining regions"

Return ONLY valid JSON:

{{
  "intent_type":
    "new_query"
    | "clarification"
    | "continuation"
}}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content":
                "You are an expert conversational analytics orchestrator."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    content = response.choices[0].message.content.strip()

    print("INTENT CONTINUATION RAW:", content)

    try:

        content = content.replace(
            "```json", ""
        ).replace(
            "```", ""
        ).strip()

        return json.loads(content)

    except Exception as e:

        print("INTENT CONTINUATION PARSE ERROR:", e)

        return {
            "intent_type": "new_query"
        }