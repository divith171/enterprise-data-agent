from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from services.llm_service import generate_sql, generate_sql_from_state


@pytest.mark.asyncio
async def test_generate_sql_returns_sql_and_elapsed():
    with patch(
        "services.llm_service.generate_response",
        new=AsyncMock(
            return_value="  SELECT SUM(amount) FROM sales  "
        ),
    ) as mock_generate:
        result = await generate_sql(
            "total sales",
            "sales(id, amount, sale_date)",
        )

    assert result["sql"] == "SELECT SUM(amount) FROM sales"
    assert isinstance(result["elapsed"], float)
    assert result["elapsed"] >= 0

    mock_generate.assert_awaited_once()

    call_kwargs = mock_generate.await_args.kwargs

    assert call_kwargs["layer"] == "sql_generation"
    assert "total sales" in call_kwargs["prompt"]
    assert "sales(id, amount, sale_date)" in call_kwargs["prompt"]


@pytest.mark.asyncio
async def test_generate_sql_from_state_includes_relationships():
    state = SimpleNamespace(
        entity="customer",
        metric="revenue",
        query_type="aggregation",
        time="last 30 days",
        time_granularity="month",
        comparison=None,
        threshold=None,
        trend_definition=None,
        business_interpretation="Calculate customer revenue.",
    )

    relationships = [
        (
            "orders",
            "customer_id",
            "customers",
            "customer_id",
        )
    ]

    expected_result = {
        "sql": "SELECT ...",
        "elapsed": 0.1,
    }

    with (
        patch(
            "services.llm_service.get_relationships",
            new=AsyncMock(return_value=relationships),
        ) as mock_relationships,
        patch(
            "services.llm_service.generate_sql",
            new=AsyncMock(return_value=expected_result),
        ) as mock_generate_sql,
    ):
        result = await generate_sql_from_state(
            state,
            {
                "orders": ["order_id", "customer_id", "amount"],
                "customers": ["customer_id", "name"],
            },
            reasoning_trace="Revenue reasoning",
            execution_plan="Aggregate revenue by customer",
        )

    assert result == expected_result
    mock_relationships.assert_awaited_once()
    mock_generate_sql.assert_awaited_once()

    prompt = mock_generate_sql.await_args.args[0]
    schema = mock_generate_sql.await_args.args[1]

    assert "customer_id" in prompt
    assert "orders.customer_id = customers.customer_id" in prompt
    assert "Revenue reasoning" in prompt
    assert "Aggregate revenue by customer" in prompt

    assert "orders" in schema
    assert "customers" in schema


@pytest.mark.asyncio
async def test_generate_sql_from_state_includes_retry_guidance():
    state = SimpleNamespace(
        entity="sales",
        metric="revenue",
        query_type="trend",
        time="last year",
        time_granularity="month",
        comparison=None,
        threshold=None,
        trend_definition="monthly revenue trend",
        business_interpretation="Analyze monthly revenue.",
    )

    with (
        patch(
            "services.llm_service.get_relationships",
            new=AsyncMock(return_value=[]),
        ),
        patch(
            "services.llm_service.generate_sql",
            new=AsyncMock(return_value={
                "sql": "SELECT ...",
                "elapsed": 0.1,
            }),
        ) as mock_generate_sql,
    ):
        await generate_sql_from_state(
            state,
            {"sales": ["id", "revenue", "sale_date"]},
            retry_guidance="Use a window function for month-over-month growth.",
        )

    prompt = mock_generate_sql.await_args.args[0]

    assert "Use a window function for month-over-month growth." in prompt
    assert "Reviewer Guidance" in prompt
    assert "AUTHORITATIVE" in prompt