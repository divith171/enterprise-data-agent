import time
import logging

from starlette.middleware.base import BaseHTTPMiddleware

from observability.context import (
    create_request_context,
    set_request_context,
    clear_request_context,
)

from observability.logger import log_event
from observability.constants import (
    EventTypes,
    Status,
)


logger = logging.getLogger("enterprise_data_agent")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Creates and manages the RequestContext for every HTTP request.

    Responsibilities:
    - Create request_id / trace_id
    - Capture session_id
    - Emit request_started
    - Emit request_completed
    - Emit request_failed
    - Clean up request-scoped context
    """

    async def dispatch(self, request, call_next):

        # ---------------------------------------------------------
        # Extract session ID
        # ---------------------------------------------------------

        session_id = None

        try:
            body = await request.json()

            if isinstance(body, dict):
                session_id = body.get("session_id")

        except Exception:
            # Ignore requests without JSON bodies
            pass

        # ---------------------------------------------------------
        # Create request context
        # ---------------------------------------------------------

        context = create_request_context(
            session_id=session_id
        )

        set_request_context(context)

        start_time = time.perf_counter()

        # ---------------------------------------------------------
        # Request started
        # ---------------------------------------------------------

        log_event(
            {
                "event_type": EventTypes.REQUEST_STARTED,
                "request_id": context.request_id,
                "trace_id": context.trace_id,
                "session_id": context.session_id,
                "timestamp": time.time(),
                "path": request.url.path,
                "method": request.method,
            }
        )

        try:

            # -----------------------------------------------------
            # Execute request
            # -----------------------------------------------------

            response = await call_next(request)

            latency = round(
                time.perf_counter() - start_time,
                3,
            )

            # -----------------------------------------------------
            # Request completed
            # -----------------------------------------------------

            log_event(
                {
                    "event_type": EventTypes.REQUEST_COMPLETED,
                    "request_id": context.request_id,
                    "trace_id": context.trace_id,
                    "session_id": context.session_id,
                    "timestamp": time.time(),
                    "status": (
                        Status.SUCCESS
                        if response.status_code < 400
                        else Status.FAILED
                    ),
                    "status_code": response.status_code,
                    "latency_seconds": latency,
                    "path": request.url.path,
                    "method": request.method,
                }
            )

            return response

        except Exception as exc:

            latency = round(
                time.perf_counter() - start_time,
                3,
            )

            # -----------------------------------------------------
            # Request failed
            # -----------------------------------------------------

            log_event(
                {
                    "event_type": EventTypes.REQUEST_FAILED,
                    "request_id": context.request_id,
                    "trace_id": context.trace_id,
                    "session_id": context.session_id,
                    "timestamp": time.time(),
                    "status": Status.FAILED,
                    "latency_seconds": latency,
                    "path": request.url.path,
                    "method": request.method,
                    "error_code": "UNHANDLED_REQUEST_EXCEPTION",
                    "error_type": type(exc).__name__,
                }
            )

            logger.error(
                "Unhandled request exception",
                extra={
                    "request_id": context.request_id,
                    "trace_id": context.trace_id,
                    "error_type": type(exc).__name__,
                },
            )

            raise

        finally:

            # -----------------------------------------------------
            # Always clear request context
            # -----------------------------------------------------

            clear_request_context()