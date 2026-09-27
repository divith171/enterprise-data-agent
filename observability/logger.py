import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from observability.logging_policy import (
    sanitize_log_event,
)
from observability.context import (
    create_request_context,
    get_request_context,
    set_request_context,
)


BASE_DIR = Path(__file__).resolve().parent.parent

LOG_FILE = BASE_DIR / "logs" / "agent_logs.jsonl"


def log_event(event: Dict[str, Any]):
    """
    Write a structured telemetry event to the JSONL log.

    Development keeps detailed diagnostics.

    Production removes raw user content and raw SQL
    before anything is persisted.
    """

    context = get_request_context()

    event = dict(event)

    if context is not None:
        if context.user_id is not None:
            event["user_id"] = context.user_id

        if context.tenant_id is not None:
            event["tenant_id"] = context.tenant_id

    event = sanitize_log_event(event)

    LOG_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        LOG_FILE,
        "a",
        encoding="utf-8",
    ) as f:
        f.write(
            json.dumps(
                event,
                default=str,
                ensure_ascii=False,
            )
            + "\n"
        )


def start_request(
    question: str,
    session_id: Optional[str] = None,
):
    """
    Initialize request logging and establish the
    request-scoped observability context.

    The RequestContext is the source of truth for:
        - request_id
        - trace_id
        - session_id
    """

    context = get_request_context()

    # If middleware has already created the context,
    # reuse it instead of generating another request identity.
    if context is None:
        context = create_request_context(
            session_id=session_id
        )
        set_request_context(context)

    # If a session_id was supplied and the existing
    # context does not have one, attach it.
    elif session_id is not None and context.session_id is None:
        context.session_id = session_id

    start_time = time.time()

    # Emit the request-started event.
    log_event(
        {
            "event_type": "request_started",
            "request_id": context.request_id,
            "trace_id": context.trace_id,
            "session_id": context.session_id,
            "timestamp": time.time(),
            "question": question,
        }
    )

    return {
        "request_id": context.request_id,
        "trace_id": context.trace_id,
        "session_id": context.session_id,
        "question": question,
        "start_time": start_time,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "timings": {},
    }


def finalize_request(
    log_data: Dict[str, Any],
    sql: Optional[str],
    result: Dict[str, Any],
    attempts: int,
):
    """
    Finalize request logging.

    Writes the high-level request completion event while
    preserving the existing log_data structure used by
    the SQL agent.
    """

    context = get_request_context()

    latency = time.time() - log_data["start_time"]

    request_id = (
        context.request_id
        if context is not None
        else log_data.get("request_id")
    )

    trace_id = (
        context.trace_id
        if context is not None
        else log_data.get("trace_id")
    )

    session_id = (
        context.session_id
        if context is not None
        else log_data.get("session_id")
    )

    status = result.get("status")

    if status == "success":
        event_type = "request_completed"
    else:
        event_type = "request_failed"

    log_event(
        {
            "event_type": event_type,
            "request_id": request_id,
            "trace_id": trace_id,
            "session_id": session_id,
            "timings": log_data.get("timings", {}),
            "timestamp": time.time(),
            "question": log_data.get("question"),
            "generated_sql": sql,
            "attempts": attempts,
            "latency_seconds": round(latency, 3),
            "status": status,
        }
    )