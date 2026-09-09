import os

os.environ.setdefault("OPENAI_API_KEY", "test-key")

from unittest.mock import AsyncMock, patch

import pytest

from services.analytical_planner_service import generate_analysis_plan
from services.state import QueryState


def make_state():
    state = QueryState()
    state.metric = "sales"
    state.business_interpretation = "Analyze sales by region"
    state.analysis_plan = "Aggregate sales by region"
    state.time_granularity = "month"
    return state


@pytest.mark.anyio
async def test_generate_analysis_plan_parses_json():
    state = make_state()

    llm_response = """
    ```json
    {
        "analysis_type": "trend_analysis",
        "grouping_strategy": "group by region and month",
        "aggregation_strategy": "SUM sales",
        "comparison_strategy": "compare each month with previous month",
        "time_granularity": "month",
        "trend_requirements": "require aligned monthly comparison",
        "ranking_requirements": "rank regions by sales growth",
        "analysis_plan": "Aggregate sales by region and month, align comparison periods, then calculate month-over-month growth."
    }
    ```
    """

    schema = {
        "sales": ["id", "region", "amount", "sale_date"]
    }

    relationship_text = "No foreign key relationships"

    with patch(
        "services.analytical_planner_service.generate_response",
        new=AsyncMock(return_value=llm_response),
    ) as mock_generate_response:

        result = await generate_analysis_plan(
            user_question="show monthly sales growth by region",
            state=state,
            schema=schema,
            relationship_text=relationship_text,
        )

    mock_generate_response.assert_awaited_once()

    call_kwargs = mock_generate_response.await_args.kwargs

    assert call_kwargs["layer"] == "analysis_planner"
    assert "show monthly sales growth by region" in call_kwargs["prompt"]
    assert "Analyze sales by region" in call_kwargs["prompt"]
    assert "Aggregate sales by region" in call_kwargs["prompt"]
    assert "sales" in call_kwargs["prompt"]
    assert "No foreign key relationships" in call_kwargs["prompt"]

    assert result["analysis_type"] == "trend_analysis"
    assert result["grouping_strategy"] == "group by region and month"
    assert result["aggregation_strategy"] == "SUM sales"
    assert result["comparison_strategy"] == (
        "compare each month with previous month"
    )
    assert result["time_granularity"] == "month"
    assert result["trend_requirements"] == (
        "require aligned monthly comparison"
    )
    assert result["ranking_requirements"] == (
        "rank regions by sales growth"
    )
    assert result["analysis_plan"] == (
        "Aggregate sales by region and month, align comparison periods, "
        "then calculate month-over-month growth."
    )

    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)


@pytest.mark.anyio
async def test_generate_analysis_plan_invalid_json_returns_empty_result():
    state = make_state()

    schema = {
        "sales": ["id", "region", "amount", "sale_date"]
    }

    relationship_text = "No foreign key relationships"

    with patch(
        "services.analytical_planner_service.generate_response",
        new=AsyncMock(return_value="this is not valid json"),
    ) as mock_generate_response:

        result = await generate_analysis_plan(
            user_question="show monthly sales growth by region",
            state=state,
            schema=schema,
            relationship_text=relationship_text,
        )

    mock_generate_response.assert_awaited_once()

    assert result["analysis_type"] is None
    assert result["grouping_strategy"] is None
    assert result["aggregation_strategy"] is None
    assert result["comparison_strategy"] is None
    assert result["time_granularity"] is None
    assert result["trend_requirements"] is None
    assert result["ranking_requirements"] is None
    assert result["analysis_plan"] is None

    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)