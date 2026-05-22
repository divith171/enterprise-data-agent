import json
from openai import OpenAI
import os
from services.semantic_inference_service import infer_metric_semantics
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_reasoning_trace(
    user_question,
    state,
    schema,
    relationship_text
):
    metric_semantics = infer_metric_semantics(state, schema)
    prompt = f"""
    You are an expert analytical reasoning engine.

    Your task is to reason about the analytical logic
    required to correctly answer the user's question.

    Do NOT generate SQL.

    USER QUESTION:
    {user_question}

    QUERY STATE:
    {state.to_dict()}

    SCHEMA:
    {schema}

    VALID FOREIGN KEY RELATIONSHIPS:
    {relationship_text}

    IMPORTANT:
    Use ONLY valid schema relationships.

    Never invent joins between tables
    unless explicitly supported
    by the schema relationships above.

    METRIC SEMANTICS:
    {metric_semantics}

    Generate structured analytical reasoning describing:

    1. The required analytical decomposition steps
    2. The correct computation sequence
    3. Which aggregations must happen before comparisons
    4. Which calculations depend on previous computations
    5. Temporal alignment requirements
    6. How trends or growth rates must be computed correctly
    7. Conditions necessary for analytical correctness
    8. The logical order in which the analysis must be performed

    Reason carefully about:
    - aggregation order
    - temporal comparison validity
    - window function dependencies
    - previous-period requirements
    - metric derivation sequencing
    - distinguish between reporting period
    and historical data required for computation

    When analytical computations require historical
    context beyond the explicitly requested reporting period,
    reason about the full data requirements necessary
    for analytically correct computation.

    Return STRICT JSON only.

    FORMAT:

    {{
        "reasoning_steps": [],
        "required_operations": [],
        "temporal_requirements": [],
        "comparison_requirements": [],
        "correctness_conditions": []
    }}
    """

    response = client.chat.completions.create(

        model="gpt-4o-mini",

        messages=[
            {
                "role": "system",
                "content":
                "You are an expert analytical reasoning engine."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0

    )

    content = response.choices[0].message.content.strip()

    print("REASONING TRACE RAW:", content)

    try:

        content = content.replace(
            "```json", ""
        ).replace(
            "```", ""
        ).strip()

        return json.loads(content)

    except Exception as e:

        print("REASONING TRACE PARSE ERROR:", e)

        return {
            "reasoning_steps": [],
            "required_operations": [],
            "temporal_requirements": [],
            "comparison_requirements": [],
            "correctness_conditions": []
        }