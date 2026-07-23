import json
import os
from services.llm_gateway import generate_response
from dotenv import load_dotenv
from openai import OpenAI
import time
load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


async def generate_execution_plan(
    user_question,
    state,
    schema,
    reasoning_trace=None,
    relationship_text=None
):

    prompt = f"""
You are an expert analytical execution planner.

Your task is to convert the analytical intent
into a structured execution plan for SQL generation.

DO NOT generate SQL.

USER QUESTION:
{user_question}

BUSINESS INTERPRETATION:
{state.business_interpretation}

ANALYSIS PLAN:
{state.analysis_plan}

TREND DEFINITION:
{state.trend_definition}

TIME GRANULARITY:
{state.time_granularity}

DATABASE SCHEMA:
{schema}

VALID FOREIGN KEY RELATIONSHIPS:
{relationship_text}

IMPORTANT:
Use ONLY valid schema relationships.

Never invent joins between tables
unless explicitly supported
by the schema relationships above.

REASONING TRACE:
{reasoning_trace}

Your task:

Break the analysis into explicit execution stages.

Focus on:
- aggregation stages
- temporal comparison stages
- growth calculation stages
- join stages
- filtering stages
- ordering stages

IMPORTANT:
- Separate aggregation from comparison
- Separate metric computation from final filtering
- Preserve analytical correctness
- Avoid aggregation inflation
- Avoid grain corruption
- Avoid mixing incompatible temporal semantics

Return STRICT JSON ONLY.

FORMAT:

{{
    "execution_stages": [

        {{
            "stage": 1,
            "operation": "",
            "purpose": "",
            "grain": "",
            "dependencies": []
        }}

    ]
}}
"""
    start = time.time()
    content = await generate_response(

    layer="execution_planner",

    prompt=prompt
    )
    print(
    "EXECUTION PLAN TIME:",
    round(time.time() - start, 2),
    "seconds"
    )
    print("EXECUTION PLAN RAW:", content)

    try:

        content = content.replace(
            "```json", ""
        ).replace(
            "```", ""
        ).strip()

        return json.loads(content)

    except Exception as e:

        print("EXECUTION PLAN PARSE ERROR:", e)

        return {
            "execution_stages": []
        }