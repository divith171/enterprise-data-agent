import json
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def interpret_continuation(
    previous_query,
    continuation_input
):

    prompt = f"""
You are an enterprise analytical continuation interpreter.

Your task is to interpret how a continuation message
modifies an existing analytical query.

PREVIOUS QUERY:
"{previous_query}"

CONTINUATION MESSAGE:
"{continuation_input}"

Determine whether the continuation introduces:

- grouping
- filtering
- metric refinement
- time granularity
- ranking refinement
- segmentation
- other analytical modifications

Return ONLY valid JSON:

{{
  "refined_query":
    "fully integrated analytical query",

  "group_by": null or "column",

  "time_granularity": null or "day/month/quarter/year",

  "filter_condition": null or "description",

  "metric_refinement": null or "description"
}}

Examples:

PREVIOUS:
monthly payment totals

CONTINUATION:
grouped by state

OUTPUT:
{{
  "refined_query":
    "monthly payment totals grouped by state",

  "group_by": "state",

  "time_granularity": null,

  "filter_condition": null,

  "metric_refinement": null
}}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content":
                "You are an expert enterprise analytical continuation interpreter."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    content = response.choices[0].message.content.strip()

    print("CONTINUATION RAW:", content)

    try:

        content = content.replace(
            "```json", ""
        ).replace(
            "```", ""
        ).strip()

        return json.loads(content)

    except Exception as e:

        print("CONTINUATION PARSE ERROR:", e)

        return {
            "refined_query":
            previous_query + " " + continuation_input,

            "group_by": None,

            "time_granularity": None,

            "filter_condition": None,

            "metric_refinement": None
        }