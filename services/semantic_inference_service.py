def infer_metric_semantics(state, schema):

    metric = state.metric

    metric_semantics = {

        "metric_name": metric,

        "default_aggregation": None,

        "grain": None,

        "likely_time_column": None,

        "temporal_semantics": None,

        "aggregation_constraints": [],

        "join_risk": None
    }

    metric_lower = str(metric).lower()

    # aggregation inference
    if any(
        keyword in metric_lower
        for keyword in [
            "amount",
            "total",
            "revenue",
            "payment",
            "sales",
            "cost"
        ]
    ):

        metric_semantics["default_aggregation"] = "SUM"

    elif any(
        keyword in metric_lower
        for keyword in [
            "count",
            "number"
        ]
    ):

        metric_semantics["default_aggregation"] = "COUNT"

    # grain inference
    if "payment" in metric_lower:

        metric_semantics["grain"] = "payment"

    elif "loan" in metric_lower:

        metric_semantics["grain"] = "loan"

    # time column inference
    for table, columns in schema.items():

        for column in columns:

            column_lower = column.lower()

            if any(
                keyword in column_lower
                for keyword in [
                    "date",
                    "time",
                    "created",
                    "start"
                ]
            ):

                metric_semantics["likely_time_column"] = column

                break

    # temporal semantics inference
    if state.trend_definition:

        metric_semantics["temporal_semantics"] = (
            "calendar_period_comparison"
        )

    # aggregation constraints
    if (
        metric_semantics["grain"]
        in ["loan", "payment"]
    ):

        metric_semantics[
            "aggregation_constraints"
        ].append(
            "aggregate_before_joining_different_grains"
        )

    # join risk inference
    if metric_semantics["grain"]:

        metric_semantics["join_risk"] = (
            "possible_row_multiplication"
        )

    return metric_semantics