from observability.debug import debug_print
import os
from dotenv import load_dotenv
from openai import OpenAI
from services.graph_service import get_relationships
load_dotenv()
import time
from services.llm_gateway import generate_response

async def generate_sql(user_prompt: str, schema_context: str) -> str:
    system_prompt = f"""
You are a senior PostgreSQL expert.

Convert user questions into valid PostgreSQL SELECT queries.

STRICT RULES:
- Only generate SELECT queries.
- get all relevent column values like name whenever customers are mentioned
- Do NOT generate INSERT, UPDATE, DELETE, DROP.
- Use ONLY the tables and columns provided in the schema.
- Return ONLY the SQL query.
- No explanations.
- No markdown.
- No backticks.

Database Schema:
{schema_context}
"""
    start = time.time()
    content = await generate_response(

        layer="sql_generation",

        prompt=f"""
    SYSTEM:
    {system_prompt}

    USER:
    {user_prompt}
    """
    )
    elapsed = round(time.time() - start, 2)

    debug_print(
    "SQL GENERATION TIME:",
    elapsed,
    "seconds"
    )
    result = {
    "sql": content.strip(),
    "elapsed": elapsed
}

    return result
async def generate_sql_from_state(

    state,
    schema,
    reasoning_trace=None,
    execution_plan=None,
    retry_guidance=""

):

    # ---------------------------------
    # Foreign key relationship grounding
    # ---------------------------------

    relationships = await get_relationships()

    relationship_text = "\n".join([

        f"{table}.{column} = "
        f"{foreign_table}.{foreign_column}"

        for table, column,
        foreign_table, foreign_column
        in relationships
    ])

    # ---------------------------------
    # Structured SQL generation prompt
    # ---------------------------------

    instruction = f"""
You are a senior PostgreSQL query generator.

Generate a PostgreSQL SQL SELECT query
that correctly answers the business question.

STRUCTURED STATE:

- Entity: {state.entity}

- Metric: {state.metric}

- Query type: {state.query_type}

- Time context: {state.time}

- Time granularity: {state.time_granularity}

- Comparison operator: {state.comparison}

- Threshold: {state.threshold}

- Trend definition: {state.trend_definition}

BUSINESS INTERPRETATION:

{state.business_interpretation}

REASONING TRACE:

{reasoning_trace}

EXECUTION PLAN:

{execution_plan}

EXECUTION PRIORITY RULES:

When multiple guidance sources are available,
follow them in this order of priority:

1. Database Schema
2. Reviewer Guidance (during retries)
3. Execution Plan
4. Business Interpretation
5. Reasoning Trace

If two guidance sources disagree,
follow the higher-priority source.

Do NOT allow lower-priority reasoning
to override reviewer corrections.

DATABASE SCHEMA:

{schema}

VALID FOREIGN KEY RELATIONSHIPS:

{relationship_text}

SQL REQUIREMENTS:

- Use ONLY tables and columns
  present in the schema

- Use ONLY valid foreign key joins

- NEVER invent joins

- Follow the execution plan carefully

- Preserve logical execution stages

- Use CTEs for:
  - aggregation
  - temporal comparison
  - trend analysis
  - ranking workflows

- Aggregate metrics BEFORE:
  - temporal comparison
  - growth comparison
  - ranking comparison

- Avoid row multiplication
  during aggregation

- Ensure temporal comparisons use:
  - aligned periods
  - consistent granularity

- Use window functions when required
  for:
  - sequential trends
  - year-over-year comparison
  - ranking
  - growth analysis

- Ensure final output granularity
  matches the business question

- Prefer modular analytical SQL
  over deeply nested subqueries

- Avoid unnecessary joins

- Do NOT hallucinate:
  - tables
  - columns
  - relationships

- CRITICAL:
  The FINAL SQL must fully preserve
  the analytical structure defined
  in the execution plan.

- NEVER simplify or collapse
  analytical dimensions specified
  in the execution plan.

- If the execution plan defines:
  - grouping
  - segmentation
  - categorization
  - ranking dimensions
  those dimensions MUST appear
  in the final SQL.

- Preserve the intended analytical grain
  throughout SQL generation.

- The final SQL must faithfully implement:
  - aggregation strategy
  - grouping strategy
  - comparison strategy
  defined in the execution plan.

- NEVER reduce multi-dimensional analysis
  into a single aggregate unless explicitly requested.

CRITICAL SQL CORRECTION REQUIREMENTS:

The previous SQL attempt was reviewed and rejected.

Reviewer feedback is considered AUTHORITATIVE.

You MUST treat every item in the reviewer guidance as a mandatory correction,
not as a suggestion.

Reviewer Guidance:

{retry_guidance}

You MUST explicitly modify the generated SQL so that every reviewer issue
has been resolved.

Do NOT regenerate the previous SQL with superficial edits.

If the reviewer recommends:

- a different window function
- a different aggregation strategy
- a different grouping dimension
- a different ranking method
- a different temporal comparison

you MUST adopt that recommendation unless it contradicts the schema.

Failure to implement the reviewer guidance means the regenerated SQL is invalid.
You MUST:
- preserve the requested analytical grain
- preserve the required grouping dimension
- correct all reviewer-identified issues
- avoid regenerating the same analytical mistake

Do NOT repeat previously rejected SQL patterns.

OUTPUT:

Return ONLY the SQL query.
"""

    debug_print(instruction)

    result = await generate_sql(instruction, schema)

    return result
