from services.state import QueryState


def test_query_state_has_expected_defaults():
    state = QueryState()

    assert state.entity is None
    assert state.metric is None
    assert state.aggregation is None
    assert state.filters == []
    assert state.group_by is None
    assert state.limit is None
    assert state.time is None
    assert state.time_granularity is None
    assert state.comparison is None
    assert state.threshold is None
    assert state.trend_definition is None
    assert state.query_type is None
    assert state.analysis_type is None
    assert state.business_interpretation is None
    assert state.analysis_plan is None


def test_query_state_to_dict_serializes_all_fields():
    state = QueryState()

    state.entity = "customers"
    state.metric = "revenue"
    state.aggregation = "SUM"
    state.filters = ["region = west"]
    state.group_by = "region"
    state.limit = 10
    state.time = "last year"
    state.time_granularity = "month"
    state.comparison = ">"
    state.threshold = 1000
    state.trend_definition = "monthly revenue trend"
    state.query_type = "trend"
    state.analysis_type = "temporal_comparison"
    state.business_interpretation = "Analyze monthly revenue by region"
    state.analysis_plan = {"steps": ["aggregate", "compare"]}

    result = state.to_dict()

    assert result == {
        "entity": "customers",
        "metric": "revenue",
        "aggregation": "SUM",
        "filters": ["region = west"],
        "group_by": "region",
        "limit": 10,
        "time": "last year",
        "time_granularity": "month",
        "comparison": ">",
        "threshold": 1000,
        "trend_definition": "monthly revenue trend",
        "query_type": "trend",
        "analysis_type": "temporal_comparison",
        "business_interpretation": "Analyze monthly revenue by region",
        "analysis_plan": {"steps": ["aggregate", "compare"]},
    }