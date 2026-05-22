from openai import OpenAI
import os
from services.semantic_inference_service import infer_metric_semantics
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def review_sql(question, sql_query, schema, state, reasoning_trace=None):

    metric_semantics = infer_metric_semantics(
        state,
        schema
    )

    prompt = f"""
You are a senior PostgreSQL analytical reviewer.

Your task is to evaluate whether the generated SQL
correctly answers the user's question.

USER QUESTION:
{question}

STRUCTURED STATE:
{state.to_dict()}

BUSINESS INTERPRETATION:
{state.business_interpretation}

REASONING TRACE:
{reasoning_trace}

DATABASE SCHEMA:
{schema}

METRIC SEMANTICS:
{metric_semantics}

GENERATED SQL:
{sql_query}

Evaluate the SQL independently across:

- analytical correctness
- temporal correctness
- semantic alignment
- implementation quality
- analytical grain correctness

IMPORTANT REVIEW RULES:

- The SQL must correctly answer
  the user's question

- Use ONLY valid schema tables
  and columns

- Only SELECT queries are allowed

- Aggregations must be mathematically valid

- Temporal comparisons must use:
  - aligned periods
  - valid previous-period comparisons
  - consistent granularity

- Growth/trend analysis must:
  - compare valid temporal periods
  - aggregate metrics BEFORE comparison
  - avoid comparing raw transactional rows

- Joins must NOT inflate metrics
  through row multiplication

- Metrics from different grains
  must be aggregated separately
  before joining

- The final output grain MUST match
  the business question

- Reject SQL returning lower-level
  granularity than requested

- Ensure ranking logic matches
  the requested entity grain

- Avoid unnecessary joins

- Do NOT reject analytically correct
  SQL solely because alternative
  SQL structures exist

- Prefer correctness over stylistic preference

Return your answer in JSON format:

{{
  "valid": true/false,

  "analytical_correctness": {{
    "valid": true/false,
    "reason": ""
  }},

  "temporal_correctness": {{
    "valid": true/false,
    "reason": ""
  }},

  "semantic_alignment": {{
    "valid": true/false,
    "reason": ""
  }},

  "implementation_quality": {{
    "valid": true/false,
    "reason": ""
  }},

  "analytical_grain_correctness": {{
    "valid": true/false,
    "reason": ""
  }},

  "final_verdict_reason": ""
}}
"""

    response = client.chat.completions.create(

        model="gpt-4o-mini",

        messages=[

            {
                "role": "system",
                "content":
                "You are an expert PostgreSQL reviewer."
            },

            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0
    )

    content = response.choices[0].message.content.strip()

    print("REVIEW RAW:", content)

    import json

    try:

        content = content.replace(
            "```json",
            ""
        ).replace(
            "```",
            ""
        ).strip()

        review = json.loads(content)

        review["valid"] = (

            review["analytical_correctness"]["valid"]

            and review["temporal_correctness"]["valid"]

            and review["semantic_alignment"]["valid"]

            and review["implementation_quality"]["valid"]

            and review["analytical_grain_correctness"]["valid"]
        )

        return review

    except Exception as e:

        print("REVIEW PARSE ERROR:", e)

        return {

            "valid": False,

            "analytical_correctness": {
                "valid": False,
                "reason": "Reviewer parsing failure"
            },

            "temporal_correctness": {
                "valid": False,
                "reason": "Reviewer parsing failure"
            },

            "semantic_alignment": {
                "valid": False,
                "reason": "Reviewer parsing failure"
            },

            "implementation_quality": {
                "valid": False,
                "reason": "Reviewer parsing failure"
            },

            "analytical_grain_correctness": {
                "valid": False,
                "reason": "Reviewer parsing failure"
            },

            "final_verdict_reason":
            "Reviewer returned invalid JSON"
        }