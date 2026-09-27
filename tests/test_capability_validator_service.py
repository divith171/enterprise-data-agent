import os

os.environ.setdefault("OPENAI_API_KEY", "test-key")

from unittest.mock import AsyncMock, patch

import pytest

from services.capability_validator_service import validate_analytical_capability
from services.state import QueryState


def make_state():
    state = QueryState()
    state.metric = "sales"
    state.business_interpretation = "Analyze sales by region"
    state.analysis_plan = "Aggregate sales by region"
    state.time_granularity = "month"
    return state


@pytest.mark.anyio
async def test_validate_analytical_capability_parses_json():
    state = make_state()

    llm_response = """
    ```json
    {
        "feasible": true,
        "reason": "Historical sales data and temporal columns are available.",
        "missing_requirements": []
    }
    ```
    """

    schema = {
        "sales": ["id", "region", "amount", "sale_date"]
    }

    with patch(
        "services.capability_validator_service.generate_response",
        new=AsyncMock(return_value=llm_response),
    ) as mock_generate_response:

        result = await validate_analytical_capability(
            user_question="show monthly sales growth by region",
            state=state,
            schema=schema,
        )

    mock_generate_response.assert_awaited_once()

    call_kwargs = mock_generate_response.await_args.kwargs

    assert call_kwargs["layer"] == "capability_validator"
    assert "show monthly sales growth by region" in call_kwargs["prompt"]
    assert "Analyze sales by region" in call_kwargs["prompt"]
    assert "Aggregate sales by region" in call_kwargs["prompt"]
    assert "sales" in call_kwargs["prompt"]
    assert "sale_date" in call_kwargs["prompt"]

    assert result["feasible"] is True
    assert result["reason"] == (
        "Historical sales data and temporal columns are available."
    )
    assert result["missing_requirements"] == []

    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)


@pytest.mark.anyio
async def test_validate_analytical_capability_invalid_json_returns_fallback():
    state = make_state()

    schema = {
        "sales": ["id", "region", "amount", "sale_date"]
    }

    with patch(
        "services.capability_validator_service.generate_response",
        new=AsyncMock(return_value="this is not valid json"),
    ) as mock_generate_response:

        result = await validate_analytical_capability(
            user_question="show monthly sales growth by region",
            state=state,
            schema=schema,
        )

    mock_generate_response.assert_awaited_once()

    assert result["feasible"] is False
    assert (
    result["reason"]
    == "Capability validation failed; analysis was not executed."
)
    assert result["missing_requirements"] == []

    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)