import os
from dotenv import load_dotenv
from openai import OpenAI
from services.graph_service import get_relationships
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_sql(user_prompt: str, schema_context: str) -> str:
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

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0
    )

    return response.choices[0].message.content.strip()

def generate_sql_from_state(

    state,
    schema,
    reasoning_trace=None,
    execution_plan=None,
    retry_guidance=""

):

    # ---------------------------------
    # Foreign key relationship grounding
    # ---------------------------------

    relationships = get_relationships()

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

RETRY GUIDANCE:

{retry_guidance}

OUTPUT:

Return ONLY the SQL query.
"""

    print(instruction)

    sql = generate_sql(instruction, schema)

    return sql