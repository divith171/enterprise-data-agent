"""Customer DTOs and the sole adapter from internal SQL-agent outcomes."""

from base64 import b64encode
from datetime import date, datetime, timezone
from decimal import Decimal
from math import isfinite, isnan
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictStr, model_validator


class QueryDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")


class QuerySource(QueryDTO):
    id: StrictStr
    name: StrictStr


class QueryColumn(QueryDTO):
    index: int = Field(ge=0, strict=True)
    name: StrictStr
    type: StrictStr


class QueryResult(QueryDTO):
    columns: list[QueryColumn]
    rows: list[list[Any]] = Field(description=(
        "Positional cells encoded by cursor PostgreSQL type: int2/int4 numbers; "
        "int8 and exact numeric strings; finite float numbers; non-finite numeric "
        "strings NaN/Infinity/-Infinity; booleans; text; ISO dates/timestamps "
        "(timestamptz UTC Z); UUID strings; Base64 bytea; null."
    ))
    returned_row_count: int = Field(ge=0, strict=True)
    truncated: bool = Field(strict=True)

    @model_validator(mode="after")
    def validate_shape(self):
        if [column.index for column in self.columns] != list(range(len(self.columns))):
            raise ValueError("Column indices must preserve cursor order")
        if any(len(row) != len(self.columns) for row in self.rows):
            raise ValueError("Row width must match column metadata")
        if self.returned_row_count != len(self.rows):
            raise ValueError("Returned row count must match rows")
        return self


class QueryEnvelope(QueryDTO):
    schema_version: Literal["1"] = "1"
    session_id: StrictStr


class QuerySuccess(QueryEnvelope):
    outcome: Literal["success"] = "success"
    source: QuerySource
    answer: StrictStr
    result: QueryResult
    sql: StrictStr


class QueryClarificationDetails(QueryDTO):
    message: StrictStr | None = None
    questions: list[StrictStr] = Field(default_factory=list)
    possible_interpretations: list[StrictStr] = Field(default_factory=list)


class QueryClarification(QueryEnvelope):
    outcome: Literal["clarification_needed"] = "clarification_needed"
    clarification: QueryClarificationDetails


class QueryUnsupportedDetails(QueryDTO):
    code: Literal["UNSUPPORTED_OPERATION", "ANALYSIS_NOT_SUPPORTED", "RESULT_TYPE_NOT_SUPPORTED"]
    message: StrictStr
    missing_requirements: list[StrictStr] = Field(default_factory=list)


class QueryUnsupported(QueryEnvelope):
    outcome: Literal["unsupported"] = "unsupported"
    error: QueryUnsupportedDetails


class QueryErrorDetails(QueryDTO):
    code: Literal["ANALYSIS_FAILED"] = "ANALYSIS_FAILED"
    message: Literal["DataKat couldn't complete this analysis."] = (
        "DataKat couldn't complete this analysis."
    )


class QueryError(QueryEnvelope):
    outcome: Literal["error"] = "error"
    error: QueryErrorDetails = Field(default_factory=QueryErrorDetails)


QueryResponse = Annotated[
    QuerySuccess | QueryClarification | QueryUnsupported | QueryError,
    Field(discriminator="outcome"),
]


class UnsupportedResultType(ValueError):
    """No public codec exists for a cursor-reported PostgreSQL type."""


_RESULT_TYPES = frozenset({
    "int2", "int4", "int8", "numeric", "decimal", "float4", "float8",
    "bool", "text", "varchar", "bpchar", "date", "timestamp", "timestamptz",
    "uuid", "bytea",
})


def _serialize_value(value: Any, pg_type: str) -> Any:
    """Encode an already-decoded value without modifying database rows.

    Types come exclusively from cursor metadata. Incompatible Python values
    fail closed instead of being guessed or converted through float/string.
    """
    if value is None:
        return None
    if pg_type in {"int2", "int4", "int8"} and type(value) is int:
        bits = {"int2": 16, "int4": 32, "int8": 64}[pg_type]
        if -(2 ** (bits - 1)) <= value < 2 ** (bits - 1):
            return str(value) if pg_type == "int8" else value
    elif pg_type in {"numeric", "decimal"} and isinstance(value, Decimal):
        if value.is_nan():
            return "NaN"
        if value.is_infinite():
            return "-Infinity" if value.is_signed() else "Infinity"
        return str(value)
    elif pg_type in {"float4", "float8"} and type(value) is float:
        if isfinite(value):
            return value
        return "NaN" if isnan(value) else ("Infinity" if value > 0 else "-Infinity")
    elif pg_type == "bool" and type(value) is bool:
        return value
    elif pg_type in {"text", "varchar", "bpchar"} and isinstance(value, str):
        return value
    elif pg_type == "date" and type(value) is date:
        return value.isoformat()
    elif pg_type == "timestamp" and isinstance(value, datetime):
        if value.utcoffset() is None:
            return value.isoformat(timespec="microseconds")
    elif pg_type == "timestamptz" and isinstance(value, datetime):
        if value.utcoffset() is not None:
            return value.astimezone(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")
    elif pg_type == "uuid" and isinstance(value, UUID):
        return str(value)
    elif pg_type == "bytea" and isinstance(value, (bytes, bytearray, memoryview)):
        return b64encode(value).decode("ascii")
    raise ValueError("Database value does not match its result column type")


def _serialize_result(result: QueryResult) -> QueryResult:
    # Validate types even for empty/all-null columns. Deferred types must not
    # accidentally become supported according to the current row contents.
    if any(column.type not in _RESULT_TYPES for column in result.columns):
        raise UnsupportedResultType("Unsupported database result type")
    return QueryResult(
        columns=result.columns,
        rows=[
            [_serialize_value(value, column.type) for value, column in zip(row, result.columns)]
            for row in result.rows
        ],
        returned_row_count=result.returned_row_count,
        truncated=result.truncated,
    )


def _strings(value: Any) -> list[str]:
    # Never stringify nested model/debug objects into customer-facing text.
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str) and item.strip()]


def build_query_response(
    agent_result: dict, *, session_id: str, data_source: tuple
) -> QueryResponse:
    """Allowlist fields; malformed successes fail closed as server errors.

    HTTP exceptions are deliberately handled by the route/framework, not here.
    Internal traces remain internal; only the existing explanation is promoted.
    """
    status = agent_result.get("status")
    if status == "success":
        rows = agent_result["data"]
        # Shape validation precedes positional mapping, so zip cannot silently
        # drop surplus cells. Neither validation nor encoding mutates raw rows.
        result = QueryResult(
            columns=agent_result["column_metadata"],
            rows=rows,
            returned_row_count=len(rows),
            truncated=agent_result["truncated"],
        )
        try:
            result = _serialize_result(result)
        except UnsupportedResultType:
            return QueryUnsupported(
                session_id=session_id,
                error=QueryUnsupportedDetails(
                    code="RESULT_TYPE_NOT_SUPPORTED",
                    message="This result contains a database type DataKat cannot display yet.",
                ),
            )
        explanation = agent_result.get("orchestration_trace", {}).get("explanation")
        answer = (
            explanation if isinstance(explanation, str) and explanation.strip()
            else "Query executed successfully, but explanation generation failed."
        )
        return QuerySuccess(
            session_id=session_id,
            source=QuerySource(id=str(data_source[0]), name=data_source[2]),
            answer=answer if rows else "No rows matched these criteria.",
            result=result,
            sql=agent_result["sql"],
        )
    if status == "clarification_needed":
        message = agent_result.get("message")
        return QueryClarification(
            session_id=session_id,
            clarification=QueryClarificationDetails(
                message=message if isinstance(message, str) else None,
                questions=_strings(agent_result.get("questions")),
                possible_interpretations=_strings(agent_result.get("possible_interpretations")),
            ),
        )
    if status == "unsupported_operation" or (
        status is None and agent_result.get("success") is False
    ):
        forbidden = status == "unsupported_operation"
        return QueryUnsupported(
            session_id=session_id,
            error=QueryUnsupportedDetails(
                code="UNSUPPORTED_OPERATION" if forbidden else "ANALYSIS_NOT_SUPPORTED",
                message=(
                    "DataKat supports read-only analytical queries only."
                    if forbidden else "This analysis is not supported by the available data."
                ),
                # Capability requirements are untrusted model prose, with no safe
                # vocabulary yet. Do not expose them until explicitly normalized.
                missing_requirements=[],
            ),
        )
    if status == "error":
        return QueryError(session_id=session_id)
    raise ValueError("Unknown internal analysis outcome")
