MODEL_PRICING = {
    "OpenAI:gpt-4.1": {
        "input_per_1m": 2.00,
        "cached_input_per_1m": 0.50,
        "output_per_1m": 8.00,
    },
    "OpenAI:gpt-4.1-mini": {
        "input_per_1m": 0.40,
        "cached_input_per_1m": 0.10,
        "output_per_1m": 1.60,
    },
    "Anthropic:claude-opus-4-8": {
        "input_per_1m": 5.00,
        "cached_input_per_1m": 0.50,
        "output_per_1m": 25.00,
    },
}


def calculate_cost(
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cached_tokens: int = 0,
) -> float:
    pricing = MODEL_PRICING[f"{provider}:{model}"]

    regular_input_tokens = max(input_tokens - cached_tokens, 0)

    input_cost = (
        regular_input_tokens / 1_000_000
    ) * pricing["input_per_1m"]

    cached_input_cost = (
        cached_tokens / 1_000_000
    ) * pricing["cached_input_per_1m"]

    output_cost = (
        output_tokens / 1_000_000
    ) * pricing["output_per_1m"]

    return round(input_cost + cached_input_cost + output_cost, 6)