import json
import os
import time

from openai import AsyncOpenAI


client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


async def explain_result(
    question: str,
    protected_context: dict,
):
    """
    Generate a natural-language explanation using only
    the approved explanation context.

    Raw unrestricted database results must never be
    passed directly to this service.
    """

    # ---------------------------------------------------------
    # Fail closed when the egress guard blocks the result
    # ---------------------------------------------------------

    if not protected_context.get(
        "safe_to_send",
        False,
    ):
        return {
            "explanation": (
                "The query executed successfully, but "
                "the result contains fields that are not "
                "sent to the external explanation model. "
                "The full authorized result remains "
                "available in the data output."
            ),
            "elapsed": 0,
            "explanation_mode": "blocked",
        }

    explanation_mode = protected_context.get(
        "mode",
        "unknown",
    )

    llm_context = protected_context.get(
        "llm_context",
        {},
    )

    serialized_context = json.dumps(
        llm_context,
        default=str,
        ensure_ascii=False,
    )

    # ---------------------------------------------------------
    # Build approved explanation prompt
    # ---------------------------------------------------------

    prompt = f"""
You are a data analyst explaining an analytical result.

USER QUESTION:
{question}

APPROVED ANALYTICAL CONTEXT:
{serialized_context}

EXPLANATION RULES:

- Use ONLY the analytical context provided above.
- Do not invent values, trends, drivers, or causes.
- Do not claim causation unless the provided evidence
  explicitly supports a causal conclusion.
- When explaining changes, use language such as:
  "the data indicates",
  "the largest contributor was",
  or "the decline was associated with"
  when appropriate.
- If the context contains only result metadata because
  the full dataset was too large or unsuitable for
  external transmission, do not pretend that you saw
  the full underlying rows.
- Explain the available result clearly in plain English.
- Be concise and accurate.
"""

    start = time.time()

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        temperature=0,
    )

    elapsed = round(
        time.time() - start,
        2,
    )

    return {
        "explanation": (
            response
            .choices[0]
            .message
            .content
            .strip()
        ),
        "elapsed": elapsed,
        "explanation_mode": explanation_mode,
    }