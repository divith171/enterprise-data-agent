"""Public HTTP contract tests; no database, Redis or provider calls."""

from contextlib import nullcontext
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import query
from app.auth import dependencies
from app.api.query_response import QueryResult
from pydantic import ValidationError


BODY = {"message": "Show customers", "session_id": "conversation-1", "data_source_id": "source-1"}
SOURCE = ("source-1", "company-1", "Customer sales", "postgresql", "private-host", 5432,
          "private-db", "private-user", "private-secret")
SUCCESS = {
    "status": "success", "sql": "SELECT name, customer_id FROM customers",
    "columns": ["name", "customer_id"],
    "column_metadata": [
        {"index": 0, "name": "name", "type": "text"},
        {"index": 1, "name": "customer_id", "type": "int4"},
    ],
    "data": [("Alice", 3), ("Bob", 1), ("Charlie", 2)], "truncated": False,
    "orchestration_trace": {"explanation": "Three customers matched.", "model": "private-model"},
}
INTERNALS = {"orchestration_trace", "trace_log", "context", "reasoning_trace",
             "analysis_plan", "execution_plan", "review_result", "state", "attempts"}


@pytest.fixture
def runtime(monkeypatch):
    app = FastAPI()
    app.include_router(query.router)
    app.dependency_overrides[query.get_current_user] = lambda: {"id": "user-1", "company_id": "company-1"}
    allowed = SimpleNamespace(allowed=True, retry_after=25)
    mocks = {
        "consume_rate_limit": AsyncMock(return_value=allowed),
        "get_authorized_data_source": AsyncMock(return_value=SOURCE),
        "session_exists": AsyncMock(return_value=False),
        "session_matches_scope": AsyncMock(return_value=True),
        "create_session": AsyncMock(),
        "get_current_query": AsyncMock(return_value=None),
        "get_context": AsyncMock(return_value={}),
        "set_current_query": AsyncMock(), "set_context": AsyncMock(),
        "classify_intent_continuation": MagicMock(return_value={"intent_type": "new_query"}),
        "parse_user_response": MagicMock(return_value={}),
        "open_customer_pool": AsyncMock(return_value=SimpleNamespace(close=AsyncMock())),
        "clear_customer_pool": MagicMock(),
        "run_sql_agent": AsyncMock(return_value=deepcopy(SUCCESS)),
        "log_security_event": MagicMock(),
    }
    for name, mock in mocks.items():
        monkeypatch.setattr(query, name, mock)
    monkeypatch.setattr(dependencies, "log_security_event", MagicMock())
    telemetry = MagicMock()
    telemetry.pipeline_stage.side_effect = lambda *args, **kwargs: nullcontext()
    monkeypatch.setattr(query, "telemetry", telemetry)
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client, mocks, app


def assert_public(payload):
    assert payload["schema_version"] == "1"
    assert payload["session_id"] == BODY["session_id"]
    def walk(value):
        if isinstance(value, dict):
            assert not INTERNALS.intersection(value)
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)
    walk(payload)


def test_success_three_rows_preserves_order_and_hides_internals_and_source_secrets(runtime):
    client, mocks, _ = runtime
    mocks["run_sql_agent"].return_value.update({key: {"private": "diagnostic"} for key in INTERNALS - {"orchestration_trace"}})
    mocks["run_sql_agent"].return_value["source"] = {"id": "forged", "name": "private-model-source"}
    response = client.post("/query", json=BODY)
    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "schema_version": "1", "outcome": "success", "session_id": "conversation-1",
        "source": {"id": "source-1", "name": "Customer sales"},
        "answer": "Three customers matched.", "sql": SUCCESS["sql"],
        "result": {"columns": SUCCESS["column_metadata"],
                   "rows": [["Alice", 3], ["Bob", 1], ["Charlie", 2]],
                   "returned_row_count": 3, "truncated": False},
    }
    assert_public(payload)
    assert "private-" not in response.text
    mocks["open_customer_pool"].return_value.close.assert_awaited_once()
    mocks["clear_customer_pool"].assert_called_once()


def test_empty_success_keeps_cursor_headers(runtime):
    client, mocks, _ = runtime
    mocks["run_sql_agent"].return_value["data"] = []
    response = client.post("/query", json=BODY)
    assert response.status_code == 200
    payload = response.json()
    assert payload["outcome"] == "success"
    assert payload["answer"] == "No rows matched these criteria."
    assert payload["result"] == {"columns": SUCCESS["column_metadata"], "rows": [],
                                 "returned_row_count": 0, "truncated": False}
    assert_public(payload)


def test_explanation_fallback_remains_success_with_all_rows(runtime):
    client, mocks, _ = runtime
    fallback = "Query executed successfully, but explanation generation failed."
    mocks["run_sql_agent"].return_value["orchestration_trace"]["explanation"] = fallback
    response = client.post("/query", json=BODY)
    assert response.status_code == 200
    payload = response.json()
    assert payload["outcome"] == "success"
    assert payload["answer"] == fallback
    assert payload["result"]["returned_row_count"] == 3
    assert payload["result"]["rows"] == [list(row) for row in SUCCESS["data"]]


@pytest.mark.parametrize(("internal", "clarification"), [
    ({"status": "clarification_needed", "questions": ["Which metric?"], "state": {"private": 1}},
     {"message": None, "questions": ["Which metric?"], "possible_interpretations": []}),
    ({"status": "clarification_needed", "message": "What does declining mean?",
      "possible_interpretations": ["Falling revenue", "Fewer orders", {"private": 1}, None]},
     {"message": "What does declining mean?", "questions": [],
      "possible_interpretations": ["Falling revenue", "Fewer orders"]}),
])
def test_both_clarification_branches(runtime, internal, clarification):
    client, mocks, _ = runtime
    mocks["run_sql_agent"].return_value = internal
    response = client.post("/query", json=BODY)
    assert response.status_code == 200
    payload = response.json()
    assert payload["outcome"] == "clarification_needed"
    assert payload["clarification"] == clarification
    assert_public(payload)


@pytest.mark.parametrize(("internal", "outcome", "error"), [
    ({"status": "unsupported_operation", "error": "private DB error"}, "unsupported",
     {"code": "UNSUPPORTED_OPERATION", "message": "DataKat supports read-only analytical queries only.", "missing_requirements": []}),
    ({"success": False, "reason": "private reviewer feedback", "missing_requirements": ["private model prose"]}, "unsupported",
     {"code": "ANALYSIS_NOT_SUPPORTED", "message": "This analysis is not supported by the available data.", "missing_requirements": []}),
    ({"status": "error", "error": "private DB error", "attempts": 3}, "error",
     {"code": "ANALYSIS_FAILED", "message": "DataKat couldn't complete this analysis."}),
])
def test_unsupported_and_exhausted_error_are_safe(runtime, internal, outcome, error):
    client, mocks, _ = runtime
    mocks["run_sql_agent"].return_value = internal
    response = client.post("/query", json=BODY)
    assert response.status_code == 200
    payload = response.json()
    assert payload["outcome"] == outcome
    assert payload["error"] == error
    assert "private" not in response.text
    assert_public(payload)


@pytest.mark.parametrize("malformation", ["width", "missing_metadata", "index", "unknown_status"])
def test_invalid_agent_result_fails_closed(runtime, malformation):
    client, mocks, _ = runtime
    internal = mocks["run_sql_agent"].return_value
    if malformation == "width":
        internal["data"][0] = ("Alice",)
    elif malformation == "missing_metadata":
        del internal["column_metadata"]
    elif malformation == "index":
        internal["column_metadata"][0]["index"] = 1
    else:
        internal["status"] = "unknown"
    response = client.post("/query", json=BODY)
    assert response.status_code == 500
    assert response.text == "Internal Server Error"
    mocks["open_customer_pool"].return_value.close.assert_awaited_once()


def test_count_must_match_rows():
    with pytest.raises(ValidationError, match="Returned row count"):
        QueryResult(columns=SUCCESS["column_metadata"], rows=SUCCESS["data"], returned_row_count=4, truncated=False)


@pytest.mark.parametrize("failure", ["unauthenticated", "source", "session", "rate", "input", "unexpected"])
def test_http_failures_keep_status_codes(runtime, failure):
    client, mocks, app = runtime
    expected = {"unauthenticated": 401, "source": 403, "session": 403, "rate": 429, "input": 422, "unexpected": 500}
    body = dict(BODY)
    if failure == "unauthenticated":
        app.dependency_overrides.clear()
    elif failure == "source":
        mocks["get_authorized_data_source"].return_value = None
    elif failure == "session":
        mocks["session_exists"].return_value = True
        mocks["session_matches_scope"].return_value = False
    elif failure == "rate":
        mocks["consume_rate_limit"].return_value = SimpleNamespace(allowed=False, retry_after=25)
    elif failure == "input":
        del body["message"]
    else:
        mocks["run_sql_agent"].side_effect = RuntimeError("private provider failure")
    response = client.post("/query", json=body)
    assert response.status_code == expected[failure]
    assert "private" not in response.text
    if failure == "rate":
        assert response.headers["Retry-After"] == "25"
    if failure != "unexpected":
        mocks["run_sql_agent"].assert_not_awaited()
    else:
        mocks["open_customer_pool"].return_value.close.assert_awaited_once()


def test_openapi_documents_discriminated_response(runtime):
    client, _, _ = runtime
    document = client.get("/openapi.json").json()
    schema = document["paths"]["/query"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
    assert schema["discriminator"]["propertyName"] == "outcome"
    assert set(schema["discriminator"]["mapping"]) == {"success", "clarification_needed", "unsupported", "error"}
    assert len(schema["oneOf"]) == 4
    models = document["components"]["schemas"]
    for model in ["QuerySuccess", "QueryClarification", "QueryUnsupported", "QueryError"]:
        assert models[model]["properties"]["schema_version"]["const"] == "1"
        assert models[model]["additionalProperties"] is False
    assert set(models["QuerySuccess"]["required"]) >= {"session_id", "source", "answer", "result", "sql"}
    assert models["QueryResult"]["properties"]["rows"]["type"] == "array"


@pytest.mark.parametrize(("pg_type", "value", "expected"), [
    ("int2", -32768, -32768),
    ("int2", 32767, 32767),
    ("int4", 580, 580),
    ("int4", -2147483648, -2147483648),
    ("int4", 2147483647, 2147483647),
    ("int8", 3, "3"),
    ("int8", 0, "0"),
    ("int8", 9007199254740991, "9007199254740991"),
    ("int8", 9007199254740992, "9007199254740992"),
    ("int8", -9007199254740992, "-9007199254740992"),
    ("int8", 9223372036854775807, "9223372036854775807"),
    ("int8", -9223372036854775808, "-9223372036854775808"),
    ("numeric", Decimal("0.1"), "0.1"),
    ("numeric", Decimal("0.05"), "0.05"),
    ("numeric", Decimal("12345678901234567890.123456789000"), "12345678901234567890.123456789000"),
    ("numeric", Decimal("123.4500"), "123.4500"),
    ("numeric", Decimal("1E-30"), "1E-30"),
    ("numeric", Decimal("1E+30"), "1E+30"),
    ("numeric", Decimal("-0.00"), "-0.00"),
    ("decimal", Decimal("3.00"), "3.00"),
    ("float4", 0.5, 0.5),
    ("float8", -1.25, -1.25),
    ("bool", True, True),
    ("bool", False, False),
    ("text", "123.45", "123.45"),
    ("text", "Δ customer", "Δ customer"),
    ("varchar", "", ""),
    ("bpchar", "A  ", "A  "),
    ("date", date(2024, 2, 29), "2024-02-29"),
    ("timestamp", datetime(2026, 10, 21, 12, 34, 56), "2026-10-21T12:34:56.000000"),
    ("timestamp", datetime(2026, 10, 21, 12, 34, 56, 123456), "2026-10-21T12:34:56.123456"),
    ("timestamptz", datetime(2026, 10, 21, 12, 34, 56, tzinfo=timezone.utc), "2026-10-21T12:34:56.000000Z"),
    ("timestamptz", datetime(2026, 10, 21, 18, 4, 56, tzinfo=timezone(timedelta(hours=5, minutes=30))), "2026-10-21T12:34:56.000000Z"),
    ("timestamptz", datetime(2026, 10, 21, 0, 0, 0, 1, tzinfo=timezone(timedelta(hours=5, minutes=30))), "2026-10-20T18:30:00.000001Z"),
    ("uuid", UUID("ABCDEFAB-1234-5678-1234-ABCDEFABCDEF"), "abcdefab-1234-5678-1234-abcdefabcdef"),
    ("bytea", b"", ""),
    ("bytea", b"\xff\x00", "/wA="),
    ("bytea", bytearray(b"\xff\x00"), "/wA="),
    ("bytea", memoryview(b"\xff\x00"), "/wA="),
])
def test_postgresql_values_have_explicit_http_encoding(runtime, pg_type, value, expected):
    client, mocks, _ = runtime
    internal = mocks["run_sql_agent"].return_value
    internal["column_metadata"] = [{"index": 0, "name": "value", "type": pg_type}]
    internal["data"] = [(value,)]
    response = client.post("/query", json=BODY)
    assert response.status_code == 200
    payload = response.json()
    assert payload["outcome"] == "success"
    actual = payload["result"]["rows"][0][0]
    assert actual == expected
    assert type(actual) is type(expected)
    assert payload["result"]["columns"][0]["type"] == pg_type
    assert internal["data"][0][0] is value


@pytest.mark.parametrize("pg_type", ["int2", "int4", "int8", "numeric", "float8", "bool", "text", "date", "timestamp", "timestamptz", "uuid", "bytea"])
def test_sql_null_is_always_http_null(runtime, pg_type):
    client, mocks, _ = runtime
    internal = mocks["run_sql_agent"].return_value
    internal["column_metadata"] = [{"index": 0, "name": "value", "type": pg_type}]
    internal["data"] = [(None,)]
    response = client.post("/query", json=BODY)
    assert response.status_code == 200
    assert response.json()["result"]["rows"] == [[None]]


@pytest.mark.parametrize("pg_type", ["float4", "float8", "numeric"])
@pytest.mark.parametrize("special", ["NaN", "Infinity", "-Infinity"])
def test_nonfinite_numbers_are_explicit_http_strings(runtime, pg_type, special):
    client, mocks, _ = runtime
    value = Decimal(special) if pg_type == "numeric" else float(special)
    internal = mocks["run_sql_agent"].return_value
    internal["column_metadata"] = [{"index": 0, "name": "value", "type": pg_type}]
    internal["data"] = [(value,)]
    response = client.post("/query", json=BODY)
    assert response.status_code == 200
    assert response.json()["result"]["rows"] == [[special]]
    assert internal["data"][0][0] is value


@pytest.mark.parametrize("pg_type", ["money", "interval", "json", "jsonb", "int4[]", "numeric[]", "unknown", "private_custom_type"])
@pytest.mark.parametrize("rows", [[("private customer value",)], [(None,)], []])
def test_unsupported_types_fail_explicitly_without_leaking_values(runtime, pg_type, rows):
    client, mocks, _ = runtime
    internal = mocks["run_sql_agent"].return_value
    internal["column_metadata"] = [{"index": 0, "name": "value", "type": pg_type}]
    internal["data"] = rows
    response = client.post("/query", json=BODY)
    assert response.status_code == 200
    payload = response.json()
    assert payload["outcome"] == "unsupported"
    assert payload["error"] == {
        "code": "RESULT_TYPE_NOT_SUPPORTED",
        "message": "This result contains a database type DataKat cannot display yet.",
        "missing_requirements": [],
    }
    assert "private" not in response.text
    assert "result" not in payload
    assert_public(payload)


@pytest.mark.parametrize(("pg_type", "value"), [
    ("int4", True), ("int4", "580"), ("int4", 2147483648),
    ("int8", 9223372036854775808), ("numeric", 0.1), ("numeric", "0.1"),
    ("bool", 1), ("text", 123), ("date", datetime(2026, 10, 21)),
    ("timestamp", datetime(2026, 10, 21, tzinfo=timezone.utc)),
    ("timestamptz", datetime(2026, 10, 21)), ("bytea", "private bytes"),
])
def test_incompatible_python_values_are_not_guessed_or_coerced(runtime, pg_type, value):
    client, mocks, _ = runtime
    internal = mocks["run_sql_agent"].return_value
    internal["column_metadata"] = [{"index": 0, "name": "value", "type": pg_type}]
    internal["data"] = [(value,)]
    response = client.post("/query", json=BODY)
    assert response.status_code == 500
    assert response.text == "Internal Server Error"


def test_real_customer_fixture_keeps_integer_scores_and_exact_decimal_rates(runtime):
    client, mocks, _ = runtime
    internal = mocks["run_sql_agent"].return_value
    names = ["name", "credit_score", "delinquency_rate", "risk_grade", "state", "segment"]
    pg_types = ["text", "int4", "numeric", "text", "text", "text"]
    internal["columns"] = names
    internal["column_metadata"] = [
        {"index": index, "name": name, "type": pg_type}
        for index, (name, pg_type) in enumerate(zip(names, pg_types))
    ]
    rows = [
        ("Charlie", 580, Decimal("0.1"), "C", "NY", "Premium"),
        ("Bob", 620, Decimal("0.05"), "B", "TX", "Standard"),
        ("Alice", 700, Decimal("0.01"), "A", "CA", "Premium"),
    ]
    original = deepcopy(rows)
    internal["data"] = rows
    response = client.post("/query", json=BODY)
    assert response.status_code == 200
    payload = response.json()
    assert payload["result"]["columns"] == internal["column_metadata"]
    assert payload["result"]["rows"] == [
        ["Charlie", 580, "0.1", "C", "NY", "Premium"],
        ["Bob", 620, "0.05", "B", "TX", "Standard"],
        ["Alice", 700, "0.01", "A", "CA", "Premium"],
    ]
    assert payload["result"]["returned_row_count"] == 3
    assert rows == original
    assert internal["data"] is rows
    assert all(isinstance(row[2], Decimal) for row in rows)
    assert "private" not in response.text
    assert_public(payload)
