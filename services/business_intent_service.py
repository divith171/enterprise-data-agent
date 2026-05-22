from openai import OpenAI
import json

client = OpenAI()


def resolve_business_intent(user_question, state, schema):

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

DATABASE SCHEMA:
{schema}

YOUR TASK:

Interpret the business meaning behind the request
ONLY when the meaning is sufficiently clear.

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

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content":
                "You are an expert enterprise business analyst."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    content = response.choices[0].message.content.strip()

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

            return {

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

        # --------------------------------
        # BUSINESS INTERPRETATION RESPONSE
        # --------------------------------

        return {

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

    except Exception as e:

        print(
            "BUSINESS INTENT PARSE ERROR:",
            e
        )

        return {

            "intent_type":
                "clarification",

            "clarification_message":
                "Unable to confidently interpret the request. Please clarify the intended business meaning.",

            "possible_interpretations":
                [],

            "confidence":
                "low"
        }