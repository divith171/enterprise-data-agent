import os
os.environ.setdefault("OPENAI_API_KEY", "test-key")
from unittest.mock import AsyncMock, patch
import pytest
from services.execution_planner_service import generate_execution_plan
from services.state import QueryState
from observability.context import (
    clear_request_context,
    create_request_context,
    set_request_context,
)

def make_state():
    state = QueryState()
    state.business_interpretation = "Analyze monthly sales by region"
    state.analysis_plan = "Aggregate sales by region and compare months"
    state.trend_definition = "Month-over-month sales growth"
    state.time_granularity = "month"
    return state


@pytest.mark.anyio
async def test_generate_execution_plan_parses_json():
    state = make_state()
    context = create_request_context(session_id="test-session")
    set_request_context(context)
    llm_response = """
    ```json
    {
        "execution_stages": [
            {
                "stage": 1,
                "operation": "aggregate",
                "purpose": "Calculate monthly sales",
                "grain": "region-month",
                "dependencies": []
            }
        ]
    }
    ```
    """
    with patch(
        "services.execution_planner_service.generate_response",
        new=AsyncMock(return_value=llm_response),
    ) as mock_generate_response:
        result = await generate_execution_plan(
            user_question="show monthly sales by region",
            state=state,
            schema="sales(id, region, amount, sale_date)",
            reasoning_trace="Sales should be aggregated by region and month",
            relationship_text="No foreign key relationships",
        )

    mock_generate_response.assert_awaited_once()

    call_kwargs = mock_generate_response.await_args.kwargs

    assert call_kwargs["layer"] == "execution_planner"
    assert "show monthly sales by region" in call_kwargs["prompt"]
    assert "Analyze monthly sales by region" in call_kwargs["prompt"]
    assert "Month-over-month sales growth" in call_kwargs["prompt"]

    assert result["execution_stages"] == [
        {
            "stage": 1,
            "operation": "aggregate",
            "purpose": "Calculate monthly sales",
            "grain": "region-month",
            "dependencies": [],
        }
    ]

    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)
    clear_request_context()


@pytest.mark.anyio
async def test_generate_execution_plan_invalid_json_returns_empty_plan():
    state = make_state()
    context = create_request_context(session_id="test-session")
    set_request_context(context)
    with patch(
        "services.execution_planner_service.generate_response",
        new=AsyncMock(return_value="this is not valid json"),
    ) as mock_generate_response:
        result = await generate_execution_plan(
            user_question="show monthly sales by region",
            state=state,
            schema="sales(id, region, amount, sale_date)",
        )

    mock_generate_response.assert_awaited_once()

    assert result["execution_stages"] == []
    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)
    clear_request_context()