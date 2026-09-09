import os
os.environ.setdefault("OPENAI_API_KEY", "test-key")
from unittest.mock import AsyncMock, patch
import pytest
from observability.context import (
    clear_request_context,
    create_request_context,
    set_request_context,
)
from services.reasoning_service import generate_reasoning_trace
from services.state import QueryState


def make_state():
    state = QueryState()
    state.metric = "sales"
    state.business_interpretation = "Analyze sales by region"
    state.analysis_plan = "Aggregate sales by region and compare periods"
    state.trend_definition = "Month-over-month sales growth"
    state.time_granularity = "month"
    return state


@pytest.mark.anyio
async def test_generate_reasoning_trace_parses_json():
    state = make_state()

    llm_response = """
    ```json
    {
        "reasoning_steps": [
            "Aggregate sales by region and month",
            "Align the comparison periods",
            "Calculate month-over-month growth"
        ],
        "required_operations": [
            "aggregation",
            "temporal_alignment",
            "growth_calculation"
        ],
        "temporal_requirements": [
            "previous_month_required"
        ],
        "comparison_requirements": [
            "compare_current_month_to_previous_month"
        ],
        "correctness_conditions": [
            "aggregate_before_comparison"
        ]
    }
    ```
    """

    expected_metric_semantics = {
        "metric_name": "sales",
        "default_aggregation": "SUM",
        "grain": None,
        "likely_time_column": "sale_date",
        "temporal_semantics": "calendar_period_comparison",
        "aggregation_constraints": [],
        "join_risk": None,
    }

    schema = {
        "sales": ["id", "region", "amount", "sale_date"]
    }

    context = create_request_context(session_id="test-session")
    set_request_context(context)

    try:
        with patch(
            "services.reasoning_service.infer_metric_semantics",
            return_value=expected_metric_semantics,
        ) as mock_infer_metric_semantics, patch(
            "services.reasoning_service.generate_response",
            new=AsyncMock(return_value=llm_response),
        ) as mock_generate_response:

            result = await generate_reasoning_trace(
                user_question="show monthly sales growth by region",
                state=state,
                schema=schema,
                relationship_text="No foreign key relationships",
            )

        mock_infer_metric_semantics.assert_called_once_with(
            state,
            schema,
        )

        mock_generate_response.assert_awaited_once()

        call_kwargs = mock_generate_response.await_args.kwargs

        assert call_kwargs["layer"] == "reasoning"
        assert "show monthly sales growth by region" in call_kwargs["prompt"]
        assert "Analyze sales by region" in call_kwargs["prompt"]
        assert "Aggregate sales by region and compare periods" in call_kwargs["prompt"]
        assert "sales" in call_kwargs["prompt"]

        assert result["reasoning_steps"] == [
            "Aggregate sales by region and month",
            "Align the comparison periods",
            "Calculate month-over-month growth",
        ]

        assert result["required_operations"] == [
            "aggregation",
            "temporal_alignment",
            "growth_calculation",
        ]

        assert result["temporal_requirements"] == [
            "previous_month_required"
        ]

        assert result["comparison_requirements"] == [
            "compare_current_month_to_previous_month"
        ]

        assert result["correctness_conditions"] == [
            "aggregate_before_comparison"
        ]

        assert "elapsed" in result
        assert isinstance(result["elapsed"], float)

    finally:
        clear_request_context()


@pytest.mark.anyio
async def test_generate_reasoning_trace_invalid_json_returns_empty_result():
    state = make_state()
    schema = {
        "sales": ["id", "region", "amount", "sale_date"]
    }

    context = create_request_context(session_id="test-session")
    set_request_context(context)

    try:
        with patch(
            "services.reasoning_service.generate_response",
            new=AsyncMock(return_value="this is not valid json"),
        ) as mock_generate_response:

            result = await generate_reasoning_trace(
                user_question="show monthly sales growth by region",
                state=state,
                schema=schema,
                relationship_text="No foreign key relationships",
            )

        mock_generate_response.assert_awaited_once()

        assert result["reasoning_steps"] == []
        assert result["required_operations"] == []
        assert result["temporal_requirements"] == []
        assert result["comparison_requirements"] == []
        assert result["correctness_conditions"] == []
        assert "elapsed" in result
        assert isinstance(result["elapsed"], float)

    finally:
        clear_request_context()