from openai import OpenAI
import json
from services.llm_gateway import generate_response
client = OpenAI()
import time
import inspect
async def resolve_business_intent(user_question, state, schema,metadata_context=""):

    prompt = f"""
You are a senior enterprise business analyst.

Your role is to interpret business-oriented analytical language
and provide semantic guidance BEFORE SQL generation.

IMPORTANT:
- You are NOT generating SQL
- You are NOT enforcing query logic
- You are ONLY providing business interpretation guidance
- The SQL generation system will make final technical decisions

USER QUESTION:
{user_question}

CURRENT INTERPRETED STATE:
{state.to_dict()}

IMPORTANT STATE RESOLUTION RULES:

- If the CURRENT INTERPRETED STATE already contains a resolved metric,
  entity, comparison operator, threshold, or filters,
  treat those as semantically grounded unless there is strong contradiction.

- Do NOT reopen clarification for fields that were already resolved upstream.

- Prefer continuity with previously resolved analytical meaning.

- Clarification should only occur when the CURRENT STATE is still genuinely ambiguous.

DATABASE SCHEMA:
{schema}

RETRIEVED COLUMN METADATA:
{metadata_context}

YOUR TASK:

Interpret the business meaning behind the request
ONLY when the meaning is sufficiently clear.

CRITICAL METADATA GROUNDING RULES:

- The retrieved column metadata contains business descriptions
  and semantic meanings for columns.

- Prefer metadata descriptions over assumptions based on
  column names.

- If metadata contradicts an inferred interpretation,
  trust the metadata.

- If the user references a business concept that cannot be
  supported by the retrieved metadata, do NOT guess.

- Instead request clarification or indicate uncertainty

IMPORTANT:

Some business language is inherently ambiguous
and MUST NOT be interpreted automatically.

Examples of ambiguous qualitative business language:
- healthy customers
- risky segments
- stable behavior
- suspicious activity
- valuable customers
- strong regions
- weak performance

Examples of contradictory ranking semantics:
- top lowest customers
- highest minimum payment
- lowest highest balance

When ambiguity exists:

- DO NOT guess
- DO NOT choose arbitrary metrics
- DO NOT hallucinate business meaning

Instead:

- identify the ambiguity explicitly
- explain what clarification is needed
- provide possible interpretation options

IMPORTANT:

Conflicting ranking semantics must also trigger clarification.

If clarification is required,
return:

{{
  "intent_type": "clarification",

  "clarification_message":
  "specific clarification question",

  "possible_interpretations": [
    "..."
  ],

  "confidence": "low"
}}

Otherwise return:

{{
  "intent_type": "business_interpretation",

  "business_interpretation":
  "short business interpretation",

  "analytical_hint":
  "possible analytical direction",

  "analytical_definition":
  "explicit analytical interpretation",

  "trend_definition":
  "year_over_year | month_over_month | rolling_trend | none",

  "confidence":
  "high | medium | low"
}}

RULES:

- Do NOT generate SQL
- Do NOT force exact query structure
- Do NOT invent schema fields
- Do NOT hallucinate undefined metrics
- Ambiguous business semantics MUST trigger clarification
- Contradictory ranking semantics MUST trigger clarification
- Keep interpretations business-oriented
- Keep hints advisory
"""
    start = time.time()
    print("\nBUSINESS INTENT METADATA:")
    print(metadata_context)
    print("resolve_business_intent file:", __file__)
    print("generate_response object:", generate_response)
    print("is coroutine:", inspect.iscoroutinefunction(generate_response))
    content = await generate_response(

    layer="business_intent",

    prompt=prompt,

    )
    print(type(content))
    print(content)
    elapsed = round(time.time() - start, 2)
    print(
    "BUSINESS INTENT TIME:",
   elapsed,
    "seconds"
    )
    print("BUSINESS INTENT RAW:", content)

    try:

        content = content.replace(
            "```json", ""
        ).replace(
            "```", ""
        ).strip()

        parsed = json.loads(content)

        intent_type = parsed.get(
            "intent_type",
            "business_interpretation"
        )

        # --------------------------------
        # CLARIFICATION RESPONSE
        # --------------------------------

        if intent_type == "clarification":

            result = {

                "intent_type":
                    "clarification",

                "clarification_message":
                    parsed.get(
                        "clarification_message"
                    ),

                "possible_interpretations":
                    parsed.get(
                        "possible_interpretations",
                        []
                    ),

                "confidence":
                    parsed.get(
                        "confidence",
                        "low"
                    )
            }
            result["elapsed"] = elapsed
            return result
        # --------------------------------
        # BUSINESS INTERPRETATION RESPONSE
        # --------------------------------

        result1= {

            "intent_type":
                "business_interpretation",

            "business_interpretation":
                parsed.get(
                    "business_interpretation"
                ),

            "analytical_hint":
                parsed.get(
                    "analytical_hint"
                ),

            "analytical_definition":
                parsed.get(
                    "analytical_definition"
                ),

            "trend_definition":
                parsed.get(
                    "trend_definition"
                ),

            "confidence":
                parsed.get(
                    "confidence"
                )
        }
        result1["elapsed"] = elapsed
        print("RETURNING RESULT1:", result1)
        return result1
        

    except Exception as e:

        print(
            "BUSINESS INTENT PARSE ERROR:",
            e
        )

        result2 = {

            "intent_type":
                "clarification",

            "clarification_message":
                "Unable to confidently interpret the request. Please clarify the intended business meaning.",

            "possible_interpretations":
                [],

            "confidence":
                "low"
        }
        result2["elapsed"] = elapsed
        return result2