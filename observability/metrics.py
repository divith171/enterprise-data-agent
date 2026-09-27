import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean
from observability.pricing import calculate_cost

LOG_FILE = Path("logs/agent_logs.jsonl")


# =========================================================
# LOG LOADING
# =========================================================

def load_logs():
    """
    Load structured JSONL telemetry events.

    Invalid lines are ignored so a single malformed record
    does not break the observation pipeline.
    """

    if not LOG_FILE.exists():
        return []

    logs = []

    with open(LOG_FILE, "r", encoding="utf-8") as f:

        for line in f:

            line = line.strip()

            if not line:
                continue

            try:
                logs.append(json.loads(line))

            except json.JSONDecodeError:
                continue

    return logs

def filter_logs_by_tenant(logs, tenant_id):
    """
    Return telemetry belonging only to the requested tenant.

    Events without a tenant_id are deliberately excluded from
    tenant-scoped metrics.
    """

    if tenant_id is None:
        return logs

    tenant_id = str(tenant_id)

    return [
        event
        for event in logs
        if event.get("tenant_id") == tenant_id
    ]
# =========================================================
# PERCENTILE
# =========================================================

def percentile(values, percentile_value):
    """
    Calculate percentile using linear interpolation.
    """

    if not values:
        return 0

    values = sorted(values)

    if len(values) == 1:
        return values[0]

    index = (
        percentile_value / 100
    ) * (len(values) - 1)

    lower = math.floor(index)
    upper = math.ceil(index)

    if lower == upper:
        return values[lower]

    weight = index - lower

    return (
        values[lower]
        + (
            values[upper]
            - values[lower]
        )
        * weight
    )


# =========================================================
# REQUEST AGGREGATION
# =========================================================

def aggregate_requests(logs):
    """
    Aggregate ONLY request lifecycle events.

    Valid request events:

        request_started
        request_completed
        request_failed

    Stage events are deliberately ignored here.
    """

    requests = {}

    request_event_types = {
        "request_started",
        "request_completed",
        "request_failed",
        "pipeline_completed"
    }

    for event in logs:

        event_type = event.get("event_type")

        if event_type not in request_event_types:
            continue

        request_id = event.get("request_id")

        if not request_id:
            continue

        if request_id not in requests:

            requests[request_id] = {
                "request_id": request_id,
                "trace_id": event.get("trace_id"),
                "session_id": event.get("session_id"),
                "status": "unknown",
                "latency_seconds": 0,
                "path": event.get("path"),
                "method": event.get("method"),
                "error": None,
                "error_type": None,
                "attempts": 1,
            }

        request = requests[request_id]

        # ---------------------------------------------
        # REQUEST STARTED
        # ---------------------------------------------

        if event_type == "request_started":

            request["path"] = event.get(
                "path",
                request["path"],
            )

            request["method"] = event.get(
                "method",
                request["method"],
            )

        # ---------------------------------------------
        # REQUEST COMPLETED
        # ---------------------------------------------

        elif event_type == "request_completed":

            request["status"] = event.get(
                "status",
                "success",
            )

            request["latency_seconds"] = (
                event.get(
                    "latency_seconds",
                    0,
                )
                or 0
            )

            metadata = event.get("metadata") or {}

            request["attempts"] = metadata.get(
                "attempts",
                request["attempts"],
            )

            request["sql_execution"] = metadata.get(
                "sql_execution",
                request.get("sql_execution"),
            )

            request["sql_rows_returned"] = metadata.get(
                "sql_rows_returned",
                request.get("sql_rows_returned"),
            )
        # ---------------------------------------------
        # PIPELINE COMPLETED
        # ---------------------------------------------

        elif event_type == "pipeline_completed":

            metadata = event.get("metadata") or {}

            request["sql_execution"] = metadata.get(
                "sql_execution",
                request.get("sql_execution"),
            )

            request["sql_rows_returned"] = metadata.get(
                "sql_rows_returned",
                request.get("sql_rows_returned"),
            )

            request["attempts"] = metadata.get(
                "attempts",
                request["attempts"],
            )
        # ---------------------------------------------
        # REQUEST FAILED
        # ---------------------------------------------

        elif event_type == "request_failed":

            request["status"] = "failed"

            request["latency_seconds"] = (
                event.get(
                    "latency_seconds",
                    0,
                )
                or 0
            )

            request["error"] = event.get(
                "error"
            )

            request["error_type"] = event.get(
                "error_type"
            )

    return list(requests.values())

def filter_ai_requests(requests):
    """
    Return only AI agent requests.

    AI agent requests are POST /query requests.
    """

    return [
        request
        for request in requests
        if request.get("path") == "/query"
    ]

def compute_http_request_metrics(logs):
    """
    Compute metrics for all HTTP requests.

    Unlike compute_request_metrics(), this includes
    every HTTP endpoint such as /query, /docs,
    /openapi.json, /health, and /observability/overview.
    """

    requests = aggregate_requests(logs)

    if not requests:
        return {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "success_rate": 0,
            "failure_rate": 0,
            "average_latency_seconds": 0,
            "p50_latency_seconds": 0,
            "p95_latency_seconds": 0,
            "max_latency_seconds": 0,
            "error_types": {},
        }

    total_requests = len(requests)

    successful_requests = sum(
        1
        for request in requests
        if request["status"] == "success"
    )

    failed_requests = sum(
        1
        for request in requests
        if request["status"] == "failed"
    )

    latencies = [
        request["latency_seconds"]
        for request in requests
        if request["latency_seconds"] is not None
    ]

    error_types = defaultdict(int)

    for request in requests:

        if request["status"] != "failed":
            continue

        error_type = (
            request.get("error_type")
            or request.get("error")
            or "unknown"
        )

        error_types[error_type] += 1

    return {
        "total_requests": total_requests,

        "successful_requests": successful_requests,

        "failed_requests": failed_requests,

        "success_rate": (
            successful_requests / total_requests
        ),

        "failure_rate": (
            failed_requests / total_requests
        ),

        "average_latency_seconds": (
            mean(latencies)
            if latencies
            else 0
        ),

        "p50_latency_seconds": percentile(
            latencies,
            50,
        ),

        "p95_latency_seconds": percentile(
            latencies,
            95,
        ),

        "max_latency_seconds": (
            max(latencies)
            if latencies
            else 0
        ),

        "error_types": dict(error_types),
    }



# =========================================================
# RETRY / ATTEMPT METRICS
# =========================================================

def compute_retry_metrics(logs):

    requests = filter_ai_requests(
        aggregate_requests(logs)
    )

    if not requests:

        return {
            "total_requests": 0,
            "first_attempt_successes": 0,
            "requests_retried": 0,
            "total_retries": 0,
            "retry_rate": 0,
            "average_attempts": 0,
            "max_attempts": 0,
        }

    total_requests = len(requests)

    first_attempt_successes = sum(
        1
        for request in requests
        if request.get("attempts", 1) == 1
        and request["status"] == "success"
    )

    requests_retried = sum(
        1
        for request in requests
        if request.get("attempts", 1) > 1
    )

    total_retries = sum(
        max(request.get("attempts", 1) - 1, 0)
        for request in requests
    )

    attempts = [
        request.get("attempts", 1)
        for request in requests
    ]

    return {

        "total_requests": total_requests,

        "first_attempt_successes": (
            first_attempt_successes
        ),

        "requests_retried": (
            requests_retried
        ),

        "total_retries": (
            total_retries
        ),

        "retry_rate": (
            requests_retried
            / total_requests
            if total_requests
            else 0
        ),

        "average_attempts": (
            mean(attempts)
            if attempts
            else 0
        ),

        "max_attempts": (
            max(attempts)
            if attempts
            else 0
        ),
    }


# =========================================================
# ENDPOINT METRICS
# =========================================================

def compute_endpoint_metrics(logs):

    requests = aggregate_requests(logs)

    endpoints = defaultdict(
        lambda: {
            "requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "latencies": [],
        }
    )

    for request in requests:

        path = request.get("path") or "unknown"

        data = endpoints[path]

        data["requests"] += 1

        if request["status"] == "success":
            data["successful_requests"] += 1

        elif request["status"] == "failed":
            data["failed_requests"] += 1

        latency = request.get("latency_seconds")

        if latency is not None:
            data["latencies"].append(
                float(latency)
            )

    metrics = {}

    for path, data in endpoints.items():

        total = data["requests"]
        latencies = data["latencies"]

        metrics[path] = {
            "requests": total,

            "successful_requests": (
                data["successful_requests"]
            ),

            "failed_requests": (
                data["failed_requests"]
            ),

            "success_rate": (
                data["successful_requests"]
                / total
                if total
                else 0
            ),

            "failure_rate": (
                data["failed_requests"]
                / total
                if total
                else 0
            ),

            "average_latency_seconds": (
                mean(latencies)
                if latencies
                else 0
            ),

            "p50_latency_seconds": percentile(
                latencies,
                50,
            ),

            "p95_latency_seconds": percentile(
                latencies,
                95,
            ),

            "max_latency_seconds": (
                max(latencies)
                if latencies
                else 0
            ),
        }

    return metrics
# =========================================================
# STAGE AGGREGATION
# =========================================================

def aggregate_stages(logs):
    """
    Aggregate ONLY completed/failed stage events.

    This produces the detailed engineering-level view.
    """

    stages = defaultdict(
        lambda: {
            "durations": [],
            "success_count": 0,
            "failure_count": 0,
            "groups": set(),
        }
    )

    for event in logs:

        event_type = event.get("event_type")

        if event_type not in (
            "stage_completed",
            "stage_failed",
        ):
            continue

        stage = event.get("stage")

        if not stage:
            continue

        duration = event.get(
            "duration_ms",
            0,
        )

        try:
            duration = float(duration)

        except (
            TypeError,
            ValueError,
        ):
            duration = 0

        data = stages[stage]

        data["durations"].append(duration)

        group = event.get("group")

        if group:
            data["groups"].add(group)

        if event_type == "stage_completed":

            data["success_count"] += 1

        elif event_type == "stage_failed":

            data["failure_count"] += 1

    return stages


# =========================================================
# STAGE METRICS
# =========================================================

def compute_stage_metrics(logs):

    stages = aggregate_stages(logs)

    metrics = {}

    for stage, data in stages.items():

        durations = data["durations"]

        total = (
            data["success_count"]
            + data["failure_count"]
        )

        metrics[stage] = {

            "group": (
                next(iter(data["groups"]))
                if data["groups"]
                else None
            ),

            "executions": total,

            "success_count": (
                data["success_count"]
            ),

            "failure_count": (
                data["failure_count"]
            ),

            "success_rate": (
                data["success_count"]
                / total
                if total
                else 0
            ),

            "average_duration_ms": (
                mean(durations)
                if durations
                else 0
            ),

            "p50_duration_ms": percentile(
                durations,
                50,
            ),

            "p95_duration_ms": percentile(
                durations,
                95,
            ),

            "max_duration_ms": (
                max(durations)
                if durations
                else 0
            ),
        }

    return metrics


# =========================================================
# GROUP METRICS
# =========================================================

def compute_group_metrics(logs):

    stages = aggregate_stages(logs)

    groups = defaultdict(
        lambda: {
            "durations": [],
            "success_count": 0,
            "failure_count": 0,
        }
    )

    for stage, data in stages.items():

        for group in data["groups"]:

            groups[group]["durations"].extend(
                data["durations"]
            )

            groups[group]["success_count"] += (
                data["success_count"]
            )

            groups[group]["failure_count"] += (
                data["failure_count"]
            )

    metrics = {}

    for group, data in groups.items():

        durations = data["durations"]

        total = (
            data["success_count"]
            + data["failure_count"]
        )

        metrics[group] = {

            "stage_executions": total,

            "success_count": (
                data["success_count"]
            ),

            "failure_count": (
                data["failure_count"]
            ),

            "success_rate": (
                data["success_count"]
                / total
                if total
                else 0
            ),

            "average_duration_ms": (
                mean(durations)
                if durations
                else 0
            ),

            "p50_duration_ms": percentile(
                durations,
                50,
            ),

            "p95_duration_ms": percentile(
                durations,
                95,
            ),

        }

    return metrics


# =========================================================
# REQUEST METRICS
# =========================================================

def compute_request_metrics(logs):

    requests = aggregate_requests(logs)
    requests = filter_ai_requests(requests)
    if not requests:

        return {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "success_rate": 0,
            "failure_rate": 0,
            "average_latency_seconds": 0,
            "p50_latency_seconds": 0,
            "p95_latency_seconds": 0,
            "max_latency_seconds": 0,
            "error_types": {},
        }

    total_requests = len(requests)

    successful_requests = sum(
        1
        for request in requests
        if request["status"] == "success"
    )

    failed_requests = sum(
        1
        for request in requests
        if request["status"] == "failed"
    )

    latencies = [
        request["latency_seconds"]
        for request in requests
        if request["latency_seconds"] is not None
    ]

    error_types = defaultdict(int)

    for request in requests:

        if request["status"] != "failed":

            continue

        error_type = (
            request.get("error_type")
            or request.get("error")
            or "unknown"
        )

        error_types[error_type] += 1

    return {

        "total_requests": total_requests,

        "successful_requests": (
            successful_requests
        ),

        "failed_requests": (
            failed_requests
        ),

        "success_rate": (
            successful_requests
            / total_requests
        ),

        "failure_rate": (
            failed_requests
            / total_requests
        ),

        "average_latency_seconds": (
            mean(latencies)
            if latencies
            else 0
        ),

        "p50_latency_seconds": percentile(
            latencies,
            50,
        ),

        "p95_latency_seconds": percentile(
            latencies,
            95,
        ),

        "max_latency_seconds": (
            max(latencies)
            if latencies
            else 0
        ),

        "error_types": dict(
            error_types
        ),
    }

# =========================================================
# SQL EXECUTION / RESULT METRICS
# =========================================================

def compute_sql_execution_metrics(logs):

    requests = filter_ai_requests(
        aggregate_requests(logs)
    )

    execution_times = []
    rows_returned = []

    successful_executions = 0
    failed_executions = 0
    empty_results = 0

    for request in requests:

        execution_time = request.get(
            "sql_execution"
        )

        row_count = request.get(
            "sql_rows_returned"
        )

        if execution_time is not None:

            execution_times.append(
                execution_time
            )

        if row_count is not None:

            rows_returned.append(
                row_count
            )

            if row_count == 0:

                empty_results += 1

        if request["status"] == "success":

            successful_executions += 1

        else:

            failed_executions += 1

    total_executions = (
        successful_executions
        + failed_executions
    )

    return {

        "total_executions": total_executions,

        "successful_executions": (
            successful_executions
        ),

        "failed_executions": (
            failed_executions
        ),

        "success_rate": (
            successful_executions
            / total_executions
            if total_executions
            else 0
        ),

        "average_execution_seconds": (
            mean(execution_times)
            if execution_times
            else 0
        ),

        "p50_execution_seconds": percentile(
            execution_times,
            50,
        ),

        "p95_execution_seconds": percentile(
            execution_times,
            95,
        ),

        "max_execution_seconds": (
            max(execution_times)
            if execution_times
            else 0
        ),

        "average_rows_returned": (
            mean(rows_returned)
            if rows_returned
            else 0
        ),

        "p50_rows_returned": percentile(
            rows_returned,
            50,
        ),

        "max_rows_returned": (
            max(rows_returned)
            if rows_returned
            else 0
        ),

        "empty_results": empty_results,

        "empty_result_rate": (
            empty_results
            / len(rows_returned)
            if rows_returned
            else 0
        ),
    }


# =========================================================
# COMPLETE OBSERVATION MODEL
# =========================================================

def compute_llm_metrics(logs):
    """
    Aggregate LLM provider usage telemetry.
    """

    events = [
        event
        for event in logs
        if event.get("event_type") == "llm_completed"
    ]

    if not events:
        return {
            "total_calls": 0,
            "successful_calls": 0,
            "failed_calls": 0,
            "success_rate": 0,
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_tokens": 0,
            "average_latency_seconds": 0,
            "p50_latency_seconds": 0,
            "p95_latency_seconds": 0,
            "max_latency_seconds": 0,
            "by_provider": {},
            "by_model": {},
            "by_layer": {},
        }

    latencies = [
        float(event.get("latency_seconds", 0) or 0)
        for event in events
    ]

    successful_calls = sum(
        1
        for event in events
        if event.get("status") == "success"
    )

    failed_calls = sum(
        1
        for event in events
        if event.get("status") == "failed"
    )

    def aggregate_by(key):
        result = defaultdict(
            lambda: {
                "calls": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "latencies": [],
            }
        )

        for event in events:
            value = event.get(key) or "unknown"
            data = result[value]

            data["calls"] += 1
            data["input_tokens"] += event.get("input_tokens", 0) or 0
            data["output_tokens"] += event.get("output_tokens", 0) or 0
            data["total_tokens"] += event.get("total_tokens", 0) or 0
            data["estimated_cost"] = data.get("estimated_cost", 0) + calculate_cost(
                    event.get("provider", ""),
                    event.get("model", ""),
                    event.get("input_tokens", 0) or 0,
                    event.get("output_tokens", 0) or 0,
            )
            data["latencies"].append(
                float(event.get("latency_seconds", 0) or 0)
            )

        metrics = {}

        for value, data in result.items():
            durations = data["latencies"]

            metrics[value] = {
                "calls": data["calls"],
                "input_tokens": data["input_tokens"],
                "output_tokens": data["output_tokens"],
                "total_tokens": data["total_tokens"],
                "estimated_cost": round(data.get("estimated_cost", 0), 6),
                "average_latency_seconds": (
                    mean(durations) if durations else 0
                ),
                "p95_latency_seconds": percentile(
                    durations,
                    95,
                ),
            }

        return metrics

    return {
        "total_calls": len(events),
        "successful_calls": successful_calls,
        "failed_calls": failed_calls,
        "success_rate": (
            successful_calls / len(events)
            if events
            else 0
        ),
        "total_input_tokens": sum(
            event.get("input_tokens", 0) or 0
            for event in events
        ),
        "total_output_tokens": sum(
            event.get("output_tokens", 0) or 0
            for event in events
        ),
        "total_tokens": sum(
            event.get("total_tokens", 0) or 0
            for event in events
        ),
        "total_estimated_cost": round(
            sum(
                calculate_cost(
                    event.get("provider", ""),
                    event.get("model", ""),
                    event.get("input_tokens", 0) or 0,
                    event.get("output_tokens", 0) or 0,
                    event.get("cached_tokens", 0) or 0,
                )
                for event in events
            ),
            6,
        ),
        "average_latency_seconds": (
            mean(latencies) if latencies else 0
        ),
        "p50_latency_seconds": percentile(
            latencies,
            50,
        ),
        "p95_latency_seconds": percentile(
            latencies,
            95,
        ),
        "max_latency_seconds": (
            max(latencies) if latencies else 0
        ),
        "by_provider": aggregate_by("provider"),
        "by_model": aggregate_by("model"),
        "by_layer": aggregate_by("layer"),
    }


def compute_metrics(tenant_id=None):

    logs = load_logs()
    logs = filter_logs_by_tenant(
        logs,
        tenant_id,
    )
    return {
    "http": compute_http_request_metrics(logs),

    "endpoints": compute_endpoint_metrics(logs),

    "requests": compute_request_metrics(logs),

    "retries": compute_retry_metrics(logs),

    "sql_execution": compute_sql_execution_metrics(logs),

    "llm": compute_llm_metrics(logs),

    "groups": compute_group_metrics(logs),

    "stages": compute_stage_metrics(logs),
}

# =========================================================
# CLI DISPLAY
# =========================================================

def print_metrics(metrics):

    http = metrics["http"]

    endpoints = metrics["endpoints"]

    requests = metrics["requests"]

    retries = metrics["retries"]

    groups = metrics["groups"]

    stages = metrics["stages"]

    # =========================================================
    # HTTP HEALTH
    # =========================================================

    print()
    print("## HTTP HEALTH")
    print()

    print(
        "Total HTTP Requests:",
        http["total_requests"],
    )

    print(
        "Successful:",
        http["successful_requests"],
    )

    print(
        "Failed:",
        http["failed_requests"],
    )

    print(
        "Success Rate:",
        round(
            http["success_rate"] * 100,
            2,
        ),
        "%",
    )

    print(
        "Average Latency:",
        round(
            http["average_latency_seconds"],
            3,
        ),
        "seconds",
    )

    print(
        "P50 Latency:",
        round(
            http["p50_latency_seconds"],
            3,
        ),
        "seconds",
    )

    print(
        "P95 Latency:",
        round(
            http["p95_latency_seconds"],
            3,
        ),
        "seconds",
    )

    print(
        "Max Latency:",
        round(
            http["max_latency_seconds"],
            3,
        ),
        "seconds",
    )

    # =========================================================
    # HTTP ENDPOINTS
    # =========================================================

    print()
    print("## HTTP ENDPOINTS")
    print()

    for endpoint, data in endpoints.items():

        print(
            f"{endpoint}: "
            f"{data['requests']} requests | "
            f"success "
            f"{round(data['success_rate'] * 100, 2)}% | "
            f"avg "
            f"{round(data['average_latency_seconds'], 3)}s | "
            f"P50 "
            f"{round(data['p50_latency_seconds'], 3)}s | "
            f"P95 "
            f"{round(data['p95_latency_seconds'], 3)}s | "
            f"max "
            f"{round(data['max_latency_seconds'], 3)}s | "
            f"failures "
            f"{data['failed_requests']}"
        )

    # =========================================================
    # AI REQUEST HEALTH
    # =========================================================

    print()
    print("## AI REQUEST HEALTH")
    print()

    print(
        "Total AI Requests:",
        requests["total_requests"],
    )

    print(
        "Successful:",
        requests["successful_requests"],
    )

    print(
        "Failed:",
        requests["failed_requests"],
    )

    print(
        "Success Rate:",
        round(
            requests["success_rate"] * 100,
            2,
        ),
        "%",
    )

    print(
        "Average Latency:",
        round(
            requests["average_latency_seconds"],
            3,
        ),
        "seconds",
    )

    print(
        "P50 Latency:",
        round(
            requests["p50_latency_seconds"],
            3,
        ),
        "seconds",
    )

    print(
        "P95 Latency:",
        round(
            requests["p95_latency_seconds"],
            3,
        ),
        "seconds",
    )

    print(
        "Max Latency:",
        round(
            requests["max_latency_seconds"],
            3,
        ),
        "seconds",
    )
    # =========================================================
    # RETRY / ATTEMPT HEALTH
    # =========================================================

    print()
    print("## RETRY / ATTEMPT HEALTH")
    print()

    print(
        "Total AI Requests:",
        retries["total_requests"],
    )

    print(
        "First-Attempt Successes:",
        retries["first_attempt_successes"],
    )

    print(
        "Requests Retried:",
        retries["requests_retried"],
    )

    print(
        "Total Retries:",
        retries["total_retries"],
    )

    print(
        "Retry Rate:",
        round(
            retries["retry_rate"] * 100,
            2,
        ),
        "%",
    )

    print(
        "Average Attempts:",
        round(
            retries["average_attempts"],
            2,
        ),
    )

    print(
        "Max Attempts:",
        retries["max_attempts"],
    )
    # =========================================================
    # SQL EXECUTION HEALTH
    # =========================================================

    print()
    print("## SQL EXECUTION HEALTH")
    print()

    sql = metrics["sql_execution"]

    print(
        "SQL Executions:",
        sql["total_executions"],
    )

    print(
        "Successful:",
        sql["successful_executions"],
    )

    print(
        "Failed:",
        sql["failed_executions"],
    )

    print(
        "Success Rate:",
        round(
            sql["success_rate"] * 100,
            2,
        ),
        "%",
    )

    print(
        "Average Execution:",
        round(
            sql["average_execution_seconds"],
            3,
        ),
        "seconds",
    )

    print(
        "P50 Execution:",
        round(
            sql["p50_execution_seconds"],
            3,
        ),
        "seconds",
    )

    print(
        "P95 Execution:",
        round(
            sql["p95_execution_seconds"],
            3,
        ),
        "seconds",
    )

    print(
        "Max Execution:",
        round(
            sql["max_execution_seconds"],
            3,
        ),
        "seconds",
    )

    print(
        "Average Rows Returned:",
        round(
            sql["average_rows_returned"],
            2,
        ),
    )

    print(
        "P50 Rows Returned:",
        round(
            sql["p50_rows_returned"],
            2,
        ),
    )

    print(
        "Max Rows Returned:",
        sql["max_rows_returned"],
    )

    print(
        "Empty Results:",
        sql["empty_results"],
    )

    print(
        "Empty Result Rate:",
        round(
            sql["empty_result_rate"] * 100,
            2,
        ),
        "%",
    )

    # =========================================================
    # PIPELINE GROUPS
    # =========================================================

    print()
    print("## PIPELINE GROUPS")
    print()

    for group, data in groups.items():

        print(
            f"{group}: "
            f"{data['stage_executions']} executions | "
            f"avg "
            f"{round(data['average_duration_ms'], 2)} ms | "
            f"P95 "
            f"{round(data['p95_duration_ms'], 2)} ms | "
            f"failures "
            f"{data['failure_count']}"
        )

    # =========================================================
    # PIPELINE STAGES
    # =========================================================

    print()
    print("## PIPELINE STAGES")
    print()

    for stage, data in stages.items():

        print(
            f"{stage}: "
            f"{data['executions']} executions | "
            f"avg "
            f"{round(data['average_duration_ms'], 2)} ms | "
            f"P50 "
            f"{round(data['p50_duration_ms'], 2)} ms | "
            f"P95 "
            f"{round(data['p95_duration_ms'], 2)} ms | "
            f"max "
            f"{round(data['max_duration_ms'], 2)} ms | "
            f"failures "
            f"{data['failure_count']}"
        )

    # =========================================================
    # AI REQUEST ERROR TYPES
    # =========================================================

    print()
    print("## AI REQUEST ERROR TYPES")
    print()

    if requests["error_types"]:

        for error, count in requests[
            "error_types"
        ].items():

            print(
                "-",
                error,
                ":",
                count,
            )

    else:

        print("No AI request errors recorded.")

# =========================================================
# MAIN
# =========================================================

if __name__ == "__main__":

    metrics = compute_metrics()

    print_metrics(metrics)