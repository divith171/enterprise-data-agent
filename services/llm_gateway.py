import os
import time
import asyncio

from openai import (
    AsyncOpenAI,
    RateLimitError,
    APITimeoutError,
    APIConnectionError
)

from anthropic import (
    AsyncAnthropic,
    RateLimitError as AnthropicRateLimitError,
    APITimeoutError as AnthropicTimeoutError,
    APIConnectionError as AnthropicConnectionError
)

# ---------------------------------
# CLIENTS
# ---------------------------------

anthropic_client = AsyncAnthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

openai_client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

# ---------------------------------
# RETRY CONFIGURATION
# ---------------------------------

MAX_RETRIES = 3
INITIAL_BACKOFF = 0.2
BACKOFF_MULTIPLIER = 2

# ---------------------------------
# GATEWAY EXCEPTIONS
# ---------------------------------

class LLMGatewayError(Exception):
    def __init__(
        self,
        provider: str,
        model: str,
        message: str
    ):
        self.provider = provider
        self.model = model
        self.message = message

        super().__init__(message)


# ---------------------------------
# GENERIC RETRY EXECUTOR
# ---------------------------------

async def _execute_with_retry(
    operation,
    provider: str,
    model: str
):
    backoff = INITIAL_BACKOFF

    for attempt in range(1, MAX_RETRIES + 1):

        try:
            return await operation()

        except (
            RateLimitError,
            APITimeoutError,
            APIConnectionError,
            AnthropicRateLimitError,
            AnthropicTimeoutError,
            AnthropicConnectionError,
        ) as e:

            print(
                f"[{provider}] "
                f"Attempt {attempt}/{MAX_RETRIES} failed "
                f"({type(e).__name__})"
            )

            if attempt == MAX_RETRIES:
                print(f"[{provider}] Maximum retries reached.")

                raise LLMGatewayError(
                    provider=provider,
                    model=model,
                    message=str(e)
                ) from e

            print(
                f"[{provider}] Retrying in {backoff:.1f} seconds..."
            )

            await asyncio.sleep(backoff)

            backoff *= BACKOFF_MULTIPLIER

# ---------------------------------
# MODEL ROUTING
# ---------------------------------

MODEL_ROUTING = {
    # ---------------------------------
    # HEAVY SEMANTIC REASONING
    # ---------------------------------

    "business_intent":
        "claude-opus-4-8",

    # ---------------------------------
    # STRUCTURED REASONING
    # ---------------------------------

    "reasoning":
        "gpt-4.1",

    "analysis_planner":
        "gpt-4.1-mini",

    "execution_planner":
        "gpt-4.1-mini",

    # ---------------------------------
    # VALIDATION
    # ---------------------------------

    "capability_validator":
        "gpt-4.1-mini",

    # ---------------------------------
    # SQL PIPELINE
    # ---------------------------------

    "sql_generation":
        "gpt-4.1",

    "sql_reviewer":
        "gpt-4.1"
}


# ---------------------------------
# PROVIDER HELPERS
# ---------------------------------

async def _anthropic_chat(
    model: str,
    prompt: str
):
    return await _execute_with_retry(
        operation=lambda: anthropic_client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        ),
        provider="Anthropic",
        model=model
    )


async def _openai_chat(
    model: str,
    messages: list
):
    return await _execute_with_retry(
        operation=lambda: openai_client.chat.completions.create(
            model=model,
            messages=messages
        ),
        provider="OpenAI",
        model=model
    )


# ---------------------------------
# MAIN GATEWAY
# ---------------------------------

async def generate_response(
    layer,
    prompt,
    system_prompt=None
):

    model = MODEL_ROUTING[layer]

    # ---------------------------------
    # ANTHROPIC
    # ---------------------------------

    if model.startswith("claude-opus-4-8"):

        print(f"MODEL USED: {model}")
        print(f"LAYER: {layer}")
        print(f"PROMPT CHARS: {len(prompt)}")

        start_llm = time.time()

        response = await _anthropic_chat(
            model=model,
            prompt=prompt
        )

        print(
            f"LLM CALL TIME ({layer}):",
            round(time.time() - start_llm, 2),
            "seconds"
        )

        return response.content[0].text

    # ---------------------------------
    # OPENAI
    # ---------------------------------

    else:

        print(f"MODEL USED: {model}")
        print(f"LAYER: {layer}")
        print(f"PROMPT CHARS: {len(prompt)}")

        start_llm = time.time()

        messages = []

        if system_prompt:
            messages.append({
                "role": "system",
                "content": system_prompt
            })

        messages.append({
            "role": "user",
            "content": prompt
        })

        response = await _openai_chat(
            model=model,
            messages=messages
        )

        print(
            f"LLM CALL TIME ({layer}):",
            round(time.time() - start_llm, 2),
            "seconds"
        )

        return response.choices[0].message.content