from observability import metrics


def test_compute_metrics_isolates_tenants(
    monkeypatch,
):
    logs = [
        {
            "event_type": "request_completed",
            "request_id": "request-a",
            "tenant_id": "company-a",
            "path": "/query",
            "method": "POST",
            "status": "success",
            "latency_seconds": 1.0,
        },
        {
            "event_type": "request_completed",
            "request_id": "request-b",
            "tenant_id": "company-b",
            "path": "/query",
            "method": "POST",
            "status": "success",
            "latency_seconds": 9.0,
        },
        {
            "event_type": "request_completed",
            "request_id": "old-request",
            "path": "/query",
            "method": "POST",
            "status": "success",
            "latency_seconds": 20.0,
        },
        {
            "event_type": "llm_completed",
            "tenant_id": "company-a",
            "provider": "OpenAI",
            "model": "test-model",
            "layer": "sql_generation",
            "status": "success",
            "latency_seconds": 2.0,
            "input_tokens": 10,
            "output_tokens": 5,
            "total_tokens": 15,
        },
        {
            "event_type": "llm_completed",
            "tenant_id": "company-b",
            "provider": "OpenAI",
            "model": "test-model",
            "layer": "sql_generation",
            "status": "success",
            "latency_seconds": 4.0,
            "input_tokens": 100,
            "output_tokens": 50,
            "total_tokens": 150,
        },
    ]

    monkeypatch.setattr(
        metrics,
        "load_logs",
        lambda: logs,
    )

    monkeypatch.setattr(
        metrics,
        "calculate_cost",
        lambda *args, **kwargs: 0,
    )

    result = metrics.compute_metrics(
        tenant_id="company-a"
    )

    assert result["requests"]["total_requests"] == 1
    assert result["http"]["total_requests"] == 1

    assert result["llm"]["total_calls"] == 1
    assert result["llm"]["total_input_tokens"] == 10
    assert result["llm"]["total_output_tokens"] == 5

    assert result["endpoints"]["/query"]["requests"] == 1