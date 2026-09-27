from observability.debug import debug_print
import json
from openai import OpenAI
from services.llm_gateway import generate_response
client = OpenAI()
import time

async def generate_analysis_plan(user_question, state, schema,relationship_text):

    prompt = f"""
You are a senior PostgreSQL analytical planner.

Your responsibility is to produce a concise,
SQL-oriented analytical execution plan.

USER QUESTION:
{user_question}

CURRENT STATE:
{state.to_dict()}

DATABASE SCHEMA:
{schema}

VALID FOREIGN KEY RELATIONSHIPS:
{relationship_text}

IMPORTANT:
Use ONLY valid schema relationships.

Never invent joins between tables
unless explicitly supported
by the schema relationships above.

IMPORTANT RULES:

- Focus ONLY on analytical decomposition
  required for SQL generation.

- Do NOT restate the business question.

- Do NOT generate business philosophy,
  exploratory philosophy,
  or implementation philosophy.

- Keep reasoning concise, structured,
  and execution-oriented.

ANALYTICAL OBJECTIVES:

Determine:

- grouping requirements
- aggregation requirements
- temporal comparison requirements
- trend analysis requirements
- ranking requirements
- comparison logic

IMPORTANT TREND RULES:

If the request involves:
- growth
- decline
- acceleration
- decrease
- increase
- year-over-year comparison
- consecutive trends

then the plan MUST:

- explicitly require temporal comparison
- define aligned comparison periods
- require aggregation before comparison
- support sequential or window-based analysis

IMPORTANT SQL GUIDANCE:

Prefer analytical SQL structures such as:

- grouped aggregation
- CTE decomposition
- window functions
- temporal comparison logic
- ranking logic

Avoid:
- arbitrary threshold assumptions
- unsupported business classifications
- unnecessary filtering logic

Return ONLY valid JSON.

JSON FORMAT:

{{
    "analysis_type": "...",
    "grouping_strategy": "...",
    "aggregation_strategy": "...",
    "comparison_strategy": "...",
    "time_granularity": "...",
    "trend_requirements": "...",
    "ranking_requirements": "...",
    "analysis_plan": "concise SQL-oriented analytical execution plan"
}}
"""
    debug_print("ANALYTICAL PLANNER FILE LOADED")
    start = time.time()
    content = await generate_response(

    layer="analysis_planner",

    prompt=prompt
    )

    elapsed = round(time.time() - start, 2)

    debug_print( "ANALYSIS PLAN TIME:", elapsed, "seconds")

    debug_print("ANALYSIS PLAN RAW:", content)

    try:

        content = content.replace(
            "```json", ""
        ).replace(
            "```", ""
        ).strip()

        result = json.loads(content)

        result["elapsed"] = elapsed

        return result

    except Exception as e:

        debug_print("ANALYSIS PLAN PARSE ERROR:", e)

        result = {
            
            "analysis_type": None,

            "grouping_strategy": None,

            "aggregation_strategy": None,

            "comparison_strategy": None,

            "time_granularity": None,

            "trend_requirements": None,

            "ranking_requirements": None,

            "analysis_plan": None
        }
        result["elapsed"] = elapsed
        return result
