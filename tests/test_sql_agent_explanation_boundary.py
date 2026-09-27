import os
from contextlib import nullcontext
from unittest.mock import AsyncMock, MagicMock

import pytest


# Test-only key.
# No real OpenAI call will occur.
os.environ.setdefault(
    "OPENAI_API_KEY",
    "test-openai-key",
)

import agents.sql_agent as sql_agent
import services.business_intent_service as business_intent_service


@pytest.mark.asyncio
async def test_sql_agent_routes_database_result_through_explanation_guard(
    monkeypatch,
):
    # ---------------------------------------------------------
    # Arrange
    # ---------------------------------------------------------

    user_question = "What is total revenue?"

    database_columns = [
        "total_revenue",
    ]

    database_rows = [
        (115000,),
    ]

    protected_context = {
        "safe_to_send": True,
        "mode": "bounded_result",
        "llm_context": {
            "row_count": 1,
            "columns": [
                "total_revenue",
            ],
            "rows": [
                [115000],
            ],
        },
        "metadata": {
            "rows_returned": 1,
            "rows_sent": 1,
            "columns_returned": 1,
            "columns_sent": 1,
            "removed_columns": [],
        },
    }

    # ---------------------------------------------------------
    # Disable execution planner for focused boundary test
    # ---------------------------------------------------------

    monkeypatch.setattr(
        sql_agent,
        "TEST_SKIP_EXECUTION_PLANNER",
        True,
    )

    # ---------------------------------------------------------
    # Telemetry isolation
    # ---------------------------------------------------------

    fake_telemetry = MagicMock()

    fake_telemetry.pipeline_stage.side_effect = (
        lambda *args, **kwargs: nullcontext()
    )

    monkeypatch.setattr(
        sql_agent,
        "telemetry",
        fake_telemetry,
    )

    monkeypatch.setattr(
        sql_agent,
        "TelemetryStageContext",
        lambda *args, **kwargs: nullcontext(),
    )

    # ---------------------------------------------------------
    # Schema / retrieval
    # ---------------------------------------------------------

    monkeypatch.setattr(
        sql_agent,
        "get_schema",
        AsyncMock(
            return_value={
                "sales": [
                    "revenue",
                ]
            }
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "get_schema_with_types",
        AsyncMock(
            return_value={
                "sales": {
                    "revenue": "numeric",
                }
            }
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "build_relationship_text",
        AsyncMock(
            return_value=""
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "get_relevant_columns",
        AsyncMock(
            return_value=[
                (
                    "sales",
                    "revenue",
                    "Revenue amount",
                    0.1,
                )
            ]
        ),
    )

    # ---------------------------------------------------------
    # Intent / concept processing
    # ---------------------------------------------------------

    monkeypatch.setattr(
        sql_agent,
        "expand_concepts",
        MagicMock(
            return_value=[]
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "extract_intent",
        MagicMock(
            return_value={
                "entity": "sales",
            }
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "classify_query_type",
        MagicMock(
            return_value={
                "query_type": "aggregation",
            }
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "map_concepts_to_columns",
        MagicMock(
            return_value=[
                (
                    "revenue",
                    "revenue",
                )
            ]
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "map_entity_to_table",
        AsyncMock(
            return_value="sales"
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "build_graph",
        AsyncMock(
            return_value={
                "sales": [],
            }
        ),
    )

    # ---------------------------------------------------------
    # Business intent
    # ---------------------------------------------------------

    monkeypatch.setattr(
        business_intent_service,
        "resolve_business_intent",
        AsyncMock(
            return_value={
                "elapsed": 0.0,
                "intent_type": "analysis",
                "business_interpretation": (
                    "Calculate total revenue."
                ),
                "trend_definition": None,
            }
        ),
    )

    # ---------------------------------------------------------
    # Analysis layers
    # ---------------------------------------------------------

    monkeypatch.setattr(
        sql_agent,
        "generate_analysis_plan",
        AsyncMock(
            return_value={
                "elapsed": 0.0,
                "analysis_type": "aggregation",
                "time_granularity": None,
                "analysis_plan": (
                    "Aggregate revenue."
                ),
            }
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "generate_reasoning_trace",
        AsyncMock(
            return_value={
                "elapsed": 0.0,
            }
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "validate_analytical_capability",
        AsyncMock(
            return_value={
                "elapsed": 0.0,
                "feasible": True,
            }
        ),
    )

    # ---------------------------------------------------------
    # SQL generation / review
    # ---------------------------------------------------------

    generated_sql = (
        "SELECT SUM(revenue) "
        "AS total_revenue FROM sales"
    )

    monkeypatch.setattr(
        sql_agent,
        "generate_sql_from_state",
        AsyncMock(
            return_value={
                "elapsed": 0.0,
                "sql": generated_sql,
            }
        ),
    )

    monkeypatch.setattr(
        sql_agent,
        "validate_query",
        MagicMock(),
    )

    monkeypatch.setattr(
        sql_agent,
        "review_sql",
        AsyncMock(
            return_value={
                "elapsed": 0.0,
                "valid": True,
            }
        ),
    )

    # ---------------------------------------------------------
    # Database execution
    # ---------------------------------------------------------

    run_query_mock = AsyncMock(
        return_value={
            "status": "success",
            "columns": database_columns,
            "data": database_rows,
        }
    )

    monkeypatch.setattr(
        sql_agent,
        "run_query",
        run_query_mock,
    )

    # ---------------------------------------------------------
    # A7.9 data-egress boundary
    # ---------------------------------------------------------

    context_builder_mock = MagicMock(
        return_value=protected_context,
    )

    monkeypatch.setattr(
        sql_agent,
        "build_explanation_context",
        context_builder_mock,
    )

    explanation_mock = AsyncMock(
        return_value={
            "explanation": (
                "Total revenue is 115000."
            ),
            "elapsed": 0.0,
            "explanation_mode": (
                "bounded_result"
            ),
        }
    )

    monkeypatch.setattr(
        sql_agent,
        "explain_result",
        explanation_mock,
    )

    # ---------------------------------------------------------
    # Act
    # ---------------------------------------------------------

    result = await sql_agent.run_sql_agent(
        user_question
    )

    # ---------------------------------------------------------
    # Assert database execution
    # ---------------------------------------------------------

    run_query_mock.assert_awaited_once_with(
        generated_sql
    )

    # ---------------------------------------------------------
    # Assert database result enters egress guard
    # ---------------------------------------------------------

    context_builder_mock.assert_called_once_with(
        columns=database_columns,
        rows=database_rows,
    )

    # ---------------------------------------------------------
    # Assert ONLY protected context reaches explanation
    # ---------------------------------------------------------

    explanation_mock.assert_awaited_once_with(
        user_question,
        protected_context,
    )

    explanation_call = (
        explanation_mock.await_args
    )

    assert database_rows not in (
        explanation_call.args
    )

    assert generated_sql not in (
        explanation_call.args
    )

    # ---------------------------------------------------------
    # Full authorized result still remains available
    # ---------------------------------------------------------

    assert result["status"] == "success"

    assert result["data"] == database_rows