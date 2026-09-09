import os

os.environ.setdefault("OPENAI_API_KEY", "test-key")

from unittest.mock import AsyncMock, patch

import pytest

from services.sql_reviewer import review_sql
from services.state import QueryState


def make_state():
    state = QueryState()
    state.metric = "sales"
    state.entity = "region"
    state.business_interpretation = "Analyze sales by region"
    state.analysis_plan = "Aggregate sales by region"
    state.time_granularity = "month"
    return state


def make_review(
    analytical=True,
    temporal=True,
    semantic=True,
    implementation=True,
    grain=True,
):
    return f"""
    ```json
    {{
        "valid": false,
        "analytical_correctness": {{
            "valid": {str(analytical).lower()},
            "reason": "Analytical review"
        }},
        "temporal_correctness": {{
            "valid": {str(temporal).lower()},
            "reason": "Temporal review"
        }},
        "semantic_alignment": {{
            "valid": {str(semantic).lower()},
            "reason": "Semantic review"
        }},
        "implementation_quality": {{
            "valid": {str(implementation).lower()},
            "reason": "Implementation review"
        }},
        "analytical_grain_correctness": {{
            "valid": {str(grain).lower()},
            "reason": "Grain review"
        }},
        "corrective_guidance": "",
        "final_verdict_reason": "Review completed"
    }}
    ```
    """


@pytest.mark.anyio
async def test_review_sql_returns_valid_when_all_dimensions_are_valid():
    state = make_state()

    with patch(
        "services.sql_reviewer.generate_response",
        new=AsyncMock(return_value=make_review()),
    ) as mock_generate_response:

        result = await review_sql(
            question="show monthly sales by region",
            sql_query=(
                "SELECT region, DATE_TRUNC('month', sale_date), "
                "SUM(amount) FROM sales GROUP BY region, "
                "DATE_TRUNC('month', sale_date)"
            ),
            schema={
                "sales": ["id", "region", "amount", "sale_date"]
            },
            state=state,
            reasoning_trace="Aggregate sales by region and month.",
        )

    mock_generate_response.assert_awaited_once()

    call_kwargs = mock_generate_response.await_args.kwargs

    assert call_kwargs["layer"] == "sql_reviewer"
    assert "show monthly sales by region" in call_kwargs["prompt"]
    assert "Analyze sales by region" in call_kwargs["prompt"]
    assert "sales" in call_kwargs["prompt"]
    assert "SELECT region" in call_kwargs["prompt"]

    assert result["valid"] is True
    assert result["analytical_correctness"]["valid"] is True
    assert result["temporal_correctness"]["valid"] is True
    assert result["semantic_alignment"]["valid"] is True
    assert result["implementation_quality"]["valid"] is True
    assert result["analytical_grain_correctness"]["valid"] is True
    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)


@pytest.mark.anyio
async def test_review_sql_rejects_when_one_dimension_is_invalid():
    state = make_state()

    with patch(
        "services.sql_reviewer.generate_response",
        new=AsyncMock(
            return_value=make_review(
                analytical=True,
                temporal=False,
                semantic=True,
                implementation=True,
                grain=True,
            )
        ),
    ):

        result = await review_sql(
            question="show monthly sales growth by region",
            sql_query="SELECT region, SUM(amount) FROM sales GROUP BY region",
            schema={
                "sales": ["id", "region", "amount", "sale_date"]
            },
            state=state,
            reasoning_trace="Compare monthly sales growth.",
        )

    assert result["temporal_correctness"]["valid"] is False
    assert result["valid"] is False
    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)


@pytest.mark.anyio
async def test_review_sql_invalid_json_returns_safe_rejection():
    state = make_state()

    with patch(
        "services.sql_reviewer.generate_response",
        new=AsyncMock(return_value="this is not valid json"),
    ) as mock_generate_response:

        result = await review_sql(
            question="show monthly sales by region",
            sql_query="SELECT region, SUM(amount) FROM sales GROUP BY region",
            schema={
                "sales": ["id", "region", "amount", "sale_date"]
            },
            state=state,
            reasoning_trace=None,
        )

    mock_generate_response.assert_awaited_once()

    assert result["valid"] is False

    assert result["analytical_correctness"]["valid"] is False
    assert result["temporal_correctness"]["valid"] is False
    assert result["semantic_alignment"]["valid"] is False
    assert result["implementation_quality"]["valid"] is False
    assert result["analytical_grain_correctness"]["valid"] is False

    assert result["final_verdict_reason"] == (
        "Reviewer returned invalid JSON"
    )

    assert "elapsed" in result
    assert isinstance(result["elapsed"], float)