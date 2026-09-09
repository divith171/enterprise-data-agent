from types import SimpleNamespace

from services.semantic_inference_service import infer_metric_semantics


def make_state(metric, trend_definition=None):
    return SimpleNamespace(
        metric=metric,
        trend_definition=trend_definition,
    )


def test_infers_sum_for_revenue_metric():
    state = make_state("revenue")
    schema = {"sales": ["id", "amount", "sale_date"]}

    result = infer_metric_semantics(state, schema)

    assert result["metric_name"] == "revenue"
    assert result["default_aggregation"] == "SUM"


def test_infers_count_for_count_metric():
    state = make_state("count")
    schema = {"sales": ["id", "sale_date"]}

    result = infer_metric_semantics(state, schema)

    assert result["default_aggregation"] == "COUNT"


def test_infers_payment_grain_and_join_risk():
    state = make_state("payment amount")
    schema = {"payments": ["payment_id", "amount", "payment_date"]}

    result = infer_metric_semantics(state, schema)

    assert result["grain"] == "payment"
    assert result["aggregation_constraints"] == [
        "aggregate_before_joining_different_grains"
    ]
    assert result["join_risk"] == "possible_row_multiplication"


def test_infers_loan_grain_and_join_risk():
    state = make_state("loan amount")
    schema = {"loans": ["loan_id", "amount", "start_date"]}

    result = infer_metric_semantics(state, schema)

    assert result["grain"] == "loan"
    assert result["join_risk"] == "possible_row_multiplication"


def test_infers_likely_time_column():
    state = make_state("sales")
    schema = {
        "customers": ["customer_id", "name"],
        "sales": ["sale_id", "amount", "sale_date"],
    }

    result = infer_metric_semantics(state, schema)

    assert result["likely_time_column"] == "sale_date"


def test_infers_temporal_semantics_when_trend_exists():
    state = make_state(
        "sales",
        trend_definition="compare monthly sales",
    )
    schema = {"sales": ["id", "amount", "sale_date"]}

    result = infer_metric_semantics(state, schema)

    assert result["temporal_semantics"] == "calendar_period_comparison"


def test_defaults_to_none_for_unknown_metric():
    state = make_state("customer satisfaction")
    schema = {"customers": ["customer_id", "name"]}

    result = infer_metric_semantics(state, schema)

    assert result == {
        "metric_name": "customer satisfaction",
        "default_aggregation": None,
        "grain": None,
        "likely_time_column": None,
        "temporal_semantics": None,
        "aggregation_constraints": [],
        "join_risk": None,
    }