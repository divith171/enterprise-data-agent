from openai import OpenAI
import os
import time
from services.semantic_inference_service import infer_metric_semantics
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
from services.llm_gateway import generate_response
async def review_sql(question, sql_query, schema, state, reasoning_trace=None):

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

EQUIVALENT SQL RULES:

Do NOT reject SQL merely because an alternative SQL
implementation exists.

If the generated SQL produces the correct analytical result
using an equivalent SQL technique, it MUST be considered valid.

Examples of equivalent implementations include:

- NTILE() vs PERCENT_RANK() vs CUME_DIST()
  when they satisfy the requested analytical intent.

- Different but mathematically equivalent CTE layouts.

- Equivalent window function formulations.

Reject SQL ONLY when the analytical result would differ,
NOT because another SQL style is preferred.

CORRECTIVE REVIEW REQUIREMENTS:

If SQL is invalid, provide precise corrective guidance.

IMPORTANT:

Do NOT recommend improvements to SQL that is already
analytically correct.

Corrective guidance should ONLY be produced when there is
a genuine analytical error affecting the correctness of
the final result.

Do NOT generate corrective guidance for stylistic,
performance, or formatting preferences.

The corrective guidance must:

- identify the exact analytical issue
- identify the expected analytical behavior
- identify the incorrect SQL behavior
- provide a concrete correction recommendation

Examples of corrective guidance:

- incorrect grouping dimension
- missing GROUP BY
- incorrect temporal alignment
- invalid aggregation grain
- incorrect ranking entity
- aggregation performed after join
- temporal comparison using inconsistent periods

The reviewer should produce actionable corrections
that can be directly used for SQL regeneration.


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

  "corrective_guidance": ""

  "final_verdict_reason": ""
}}
"""
    start = time.time()
    content = await generate_response(

    layer="sql_reviewer",

    prompt=prompt
)
    elapsed = round(time.time() - start, 2)
    print("SQL REVIEW TIME:",elapsed,"seconds")
    content = content.strip()
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

        review["elapsed"] = elapsed
        return review

    except Exception as e:

        print("REVIEW PARSE ERROR:", e)

        result = {

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
        result["elapsed"] = elapsed
        return  result