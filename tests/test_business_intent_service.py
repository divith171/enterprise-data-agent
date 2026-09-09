import os

os.environ.setdefault("OPENAI_API_KEY", "test-key")

from unittest.mock import AsyncMock, patch

import pytest

from services.business_intent_service import resolve_business_intent
from services.state import QueryState


def make_state():
    state = QueryState()
    state.metric = "sales"
    state.entity = "region"
    state.business_interpretation = "Analyze sales by region"
    state.analysis_plan = "Aggregate sales by region"
    state.time_granularity = "month"
    return state


@pytest.mark.anyio
async def test_resolve_business_intent_returns_business_interpretation():
    state = make_state()

    llm_response = """
    ```json
    {
        "intent_type": "business_interpretation",
        "business_interpretation": "Analyze monthly sales performance by region.",
        "analytical_hint": "Aggregate sales by region and month.",
        "analytical_definition": "Compare total sales across regions for each month.",
        "trend_definition": "month_over_month",
        "confidence": "high"
    }
    ```
    """

    schema = {
        "sales": ["id", "region", "amount", "sale_date"]
    }

    metadata_context = (
        "amount: monetary sales amount; "
        "sale_date: date of sale; "
        "region: sales region"
    )

    with patch(
        "services.business_intent_service.generate_response",
        new=AsyncMock(return_value=llm_response),
    ) as mock_generate_response:

        result = await resolve_business_intent(
            user_question="show monthly sales performance by region",
            state=state,
            schema=schema,
            metadata_context=metadata_context,
        )

    mock_generate_response.assert_awaited_once()

    call_kwargs = mock_generate_response.await_args.kwargs

    assert call_kwargs["layer"] == "business_intent"
    assert "show monthly sales performance by region" in call_kwargs["prompt"]
    assert "Analyze sales by region" in call_kwargs["prompt"]
    assert "sales" in call_kwargs["prompt"]
    assert "sale_date" in call_kwargs["prompt"]
    assert metadata_context in call_kwargs["prompt"]

    assert result["intent_type"] == "business_interpretation"
    assert result["business_interpretation"] == (
        "Analyze monthly sales performance by region."
    )
    assert result["analytical_hint"] == (
        "Aggregate sales by region and month."
    )
    assert result["analytical_definition"] == (
        "Compare total sales across regions for each month."
    )
    assert result["trend_definition"] == "month_over_month"
    assert result["confidence"] == "high"

    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)


@pytest.mark.anyio
async def test_resolve_business_intent_returns_clarification():
    state = make_state()

    llm_response = """
    ```json
    {
        "intent_type": "clarification",
        "clarification_message": "What metric should define healthy customers?",
        "possible_interpretations": [
            "customers with high sales",
            "customers with low outstanding balance"
        ],
        "confidence": "low"
    }
    ```
    """

    schema = {
        "customers": ["id", "name", "sales", "outstanding_balance"]
    }

    metadata_context = (
        "sales: customer sales amount; "
        "outstanding_balance: unpaid customer balance"
    )

    with patch(
        "services.business_intent_service.generate_response",
        new=AsyncMock(return_value=llm_response),
    ) as mock_generate_response:

        result = await resolve_business_intent(
            user_question="show healthy customers",
            state=state,
            schema=schema,
            metadata_context=metadata_context,
        )

    mock_generate_response.assert_awaited_once()

    call_kwargs = mock_generate_response.await_args.kwargs

    assert call_kwargs["layer"] == "business_intent"
    assert "show healthy customers" in call_kwargs["prompt"]
    assert "DO NOT guess" in call_kwargs["prompt"]
    assert "Ambiguous business semantics MUST trigger clarification" in (
        call_kwargs["prompt"]
    )

    assert result["intent_type"] == "clarification"
    assert result["clarification_message"] == (
        "What metric should define healthy customers?"
    )
    assert result["possible_interpretations"] == [
        "customers with high sales",
        "customers with low outstanding balance",
    ]
    assert result["confidence"] == "low"

    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)


@pytest.mark.anyio
async def test_resolve_business_intent_invalid_json_returns_clarification():
    state = make_state()

    schema = {
        "sales": ["id", "region", "amount", "sale_date"]
    }

    with patch(
        "services.business_intent_service.generate_response",
        new=AsyncMock(return_value="this is not valid json"),
    ) as mock_generate_response:

        result = await resolve_business_intent(
            user_question="show monthly sales by region",
            state=state,
            schema=schema,
            metadata_context="",
        )

    mock_generate_response.assert_awaited_once()

    assert result["intent_type"] == "clarification"
    assert result["clarification_message"] == (
        "Unable to confidently interpret the request. "
        "Please clarify the intended business meaning."
    )
    assert result["possible_interpretations"] == []
    assert result["confidence"] == "low"

    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)