import os
import time
import asyncio
from observability.context import get_request_context
from observability.logger import log_event
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

async def _anthropic_chat(model: str, prompt: str, layer: str):
    start_time = time.time()

    response = await _execute_with_retry(
        operation=lambda: anthropic_client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        ),
        provider="Anthropic",
        model=model
    )

    latency = round(time.time() - start_time, 3)
    context = get_request_context()
    usage = response.usage

    log_event({
        "event_type": "llm_completed",
        "request_id": context.request_id if context else None,
        "trace_id": context.trace_id if context else None,
        "session_id": context.session_id if context else None,
        "provider": "Anthropic",
        "model": model,
        "layer": layer,
        "latency_seconds": latency,
        "input_tokens": usage.input_tokens,
        "output_tokens": usage.output_tokens,
        "total_tokens": usage.input_tokens + usage.output_tokens,
        "cached_tokens": usage.cache_read_input_tokens or 0,
        "cache_creation_input_tokens": usage.cache_creation_input_tokens or 0,
        "reasoning_tokens": None,
        "estimated_cost": None,
        "status": "success",
    })

    return response


async def _openai_chat(model: str, messages: list, layer: str):
    start_time = time.time()

    response = await _execute_with_retry(
        operation=lambda: openai_client.chat.completions.create(
            model=model,
            messages=messages
        ),
        provider="OpenAI",
        model=model
    )

    latency = round(time.time() - start_time, 3)
    context = get_request_context()
    usage = response.usage

    completion_details = usage.completion_tokens_details
    prompt_details = usage.prompt_tokens_details

    log_event({
        "event_type": "llm_completed",
        "request_id": context.request_id if context else None,
        "trace_id": context.trace_id if context else None,
        "session_id": context.session_id if context else None,
        "provider": "OpenAI",
        "model": model,
        "layer": layer,
        "latency_seconds": latency,
        "input_tokens": usage.prompt_tokens,
        "output_tokens": usage.completion_tokens,
        "total_tokens": usage.total_tokens,
        "cached_tokens": (
            prompt_details.cached_tokens
            if prompt_details and prompt_details.cached_tokens is not None
            else 0
        ),
        "reasoning_tokens": (
            completion_details.reasoning_tokens
            if completion_details and completion_details.reasoning_tokens is not None
            else 0
        ),
        "estimated_cost": None,
        "status": "success",
    })

    return response


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
            prompt=prompt,
            layer=layer
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
            messages=messages,
            layer=layer
        )

        print(
            f"LLM CALL TIME ({layer}):",
            round(time.time() - start_llm, 2),
            "seconds"
        )

        return response.choices[0].message.content