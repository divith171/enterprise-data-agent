from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Optional
import time
import uuid


@dataclass
class RequestContext:
    """
    Stores request-scoped information for observability.
    """

    request_id: str
    trace_id: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None
    request_start_time: float = field(default_factory=time.time)
    current_stage: Optional[str] = None
    metadata: dict = field(default_factory=dict)


# Context variable for the current request
_request_context: ContextVar[Optional[RequestContext]] = ContextVar(
    "request_context",
    default=None
)


def create_request_context(session_id: Optional[str] = None) -> RequestContext:
    """
    Create a new request context.
    """

    return RequestContext(
        request_id=str(uuid.uuid4()),
        trace_id=str(uuid.uuid4()),
        session_id=session_id,
    )


def set_request_context(context: RequestContext):
    """
    Store the request context for the current request.
    """

    _request_context.set(context)


def get_request_context() -> Optional[RequestContext]:
    """
    Retrieve the current request context.
    """

    return _request_context.get()


def clear_request_context():
    """
    Clear the current request context.
    """

    _request_context.set(None)