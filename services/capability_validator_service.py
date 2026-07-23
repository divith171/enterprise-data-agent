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


async def validate_analytical_capability(
    user_question,
    state,
    schema
):

    prompt = f"""
You are an enterprise analytical governance validator.

Your job is to determine whether the user's requested
analysis is realistically feasible using ONLY the available
database schema and standard SQL analytical capabilities.

USER QUESTION:
{user_question}

STRUCTURED STATE:
{state.to_dict()}

DATABASE SCHEMA:
{schema}

IMPORTANT:

You are NOT generating SQL.

You are ONLY determining whether the requested analysis
can realistically be performed using:

- available tables
- available columns
- historical data
- standard SQL analytical operations

Evaluate carefully.

Examples of NON-FEASIBLE analyses:

- prediction without historical labels
- forecasting without temporal history
- sentiment analysis without text data
- fraud detection without fraud indicators
- anomaly detection without behavioral baselines
- risk scoring without risk variables

HIGH-RISK GOVERNANCE RULES:

The following analytical domains require STRICT evidence
in the schema and must NOT be inferred loosely:

1. Fraud detection
Requires:
- fraud labels
- fraud indicators
- suspicious activity signals
- anomaly evidence
- investigation outcomes

Financial risk metrics like:
- credit_score
- delinquency_rate
- risk_grade

are NOT sufficient evidence of fraud.

2. Prediction / forecasting
Requires:
- historical temporal patterns
- labeled outcomes
- predictive targets
- sufficient historical depth

3. Sentiment analysis
Requires:
- text feedback
- reviews
- survey responses
- NLP-compatible text data

4. Anomaly detection
Requires:
- behavioral baselines
- longitudinal activity history
- anomaly criteria

5. Causal claims
Requires:
- causal evidence
- interventions
- experimental structure

IMPORTANT:
Do NOT reinterpret loosely related fields
as evidence for these domains.

If required evidence is missing,
mark the request as NOT FEASIBLE.
Examples of FEASIBLE analyses:

- aggregations
- rankings
- comparisons
- trend analysis ONLY when:
  - valid temporal columns exist
  - historical observations exist
  - the metric itself has temporal tracking
- historical summaries
- grouped metrics
- customer segmentation using existing columns

TEMPORAL GOVERNANCE RULES:

Trend analysis requires:
- temporal columns
- historical observations
- aligned reporting periods
- metric history over time

Do NOT invent reporting periods.

Do NOT assume columns like:
- reporting_period
- snapshot_date
- month
- quarter
exist unless explicitly present
in the schema.

A timestamp from another table
does NOT imply historical tracking
for the target metric.

Example:
If delinquency_rate exists but
no temporal tracking exists for it,
then delinquency trend analysis
is NOT feasible.

Return ONLY valid JSON:

{{
  "feasible": true/false,

  "reason": "short explanation",

  "missing_requirements": [
    "..."
  ]
}}
"""
    start = time.time()
    content = await generate_response(

    layer="capability_validator",

    prompt=prompt
    )
    elapsed = round(time.time() - start, 2)

    print(
    "CAPABILITY VALIDATOR TIME:",
    elapsed,
    "seconds"
    )
    content = content.strip()

    print("CAPABILITY VALIDATOR RAW:", content)

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

        print("CAPABILITY VALIDATOR PARSE ERROR:", e)

        result ={
            "feasible": True,
            "reason": "Validator fallback",
            "missing_requirements": []
        }
        result["elapsed"] = elapsed
        return result