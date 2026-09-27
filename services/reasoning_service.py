from observability.debug import debug_print
import json
import time
from openai import OpenAI
import os
from services.semantic_inference_service import infer_metric_semantics
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
from services.llm_gateway import generate_response
async def generate_reasoning_trace(
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

    IMPORTANT GROUNDING RULES:

The QUERY STATE, BUSINESS INTERPRETATION, ANALYSIS PLAN and
METRIC SEMANTICS have already resolved the business meaning.

Your role is NOT to reinterpret business metrics.

Your role is ONLY to reason about the computational steps
required to correctly implement those already-resolved metrics.

DO NOT:

- replace resolved metrics
- derive alternative metrics
- reinterpret business terminology
- substitute schema columns
- invent mathematically equivalent metrics

If the QUERY STATE or METRIC SEMANTICS specify a metric
(e.g. AVG(loan.payments)),
you MUST preserve it throughout your reasoning.

Reason ONLY about:

- aggregation order
- dependency order
- temporal alignment
- ranking logic
- analytical correctness

Never change the analytical definition supplied upstream.

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
    start = time.time()
    content = await generate_response(

    layer="reasoning",

    prompt=prompt
    )
    elapsed = round(time.time() - start, 2)
    debug_print("REASONING TIME:", elapsed, "seconds")
    debug_print("REASONING TRACE RAW:", content)

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

        debug_print("REASONING TRACE PARSE ERROR:", e)

        result =  {
            "reasoning_steps": [],
            "required_operations": [],
            "temporal_requirements": [],
            "comparison_requirements": [],
            "correctness_conditions": []
        }
        result["elapsed"] = elapsed
        return result
