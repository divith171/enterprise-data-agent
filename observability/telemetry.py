from __future__ import annotations

import time
from typing import Any, Dict, Optional

from observability.logger import log_event
from observability.context import get_request_context
from observability.constants import (
    EventTypes,
    Status,
)
from observability.registry import registry


class TelemetryStageContext:
    """
    Represents a single pipeline stage execution.

    Automatically emits:
    - stage_started
    - stage_completed
    - stage_failed
    """

    def __init__(
        self,
        stage: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.stage = stage
        self.stage_info = registry.get_stage(stage)

        self.metadata = metadata or {}

        self.start_time = None
        self.duration_ms = None

        self.status = Status.RUNNING

    def __enter__(self):
        self.start_time = time.perf_counter()

        context = get_request_context()

        if context is None:
            raise RuntimeError(
                "TelemetryStageContext requires an active RequestContext"
            )

        context.current_stage = self.stage

        log_event(
            {
                "event_type": EventTypes.STAGE_STARTED,
                "stage": self.stage,
                "request_id": context.request_id,
                "group": self.stage_info.group,
                "trace_id": context.trace_id,
                "session_id": context.session_id,
                "timestamp": time.time(),
            }
        )

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.duration_ms = round(
            (time.perf_counter() - self.start_time) * 1000,
            2,
        )

        context = get_request_context()

        if context is None:
            return False

        if exc_type is None:
            self.status = Status.SUCCESS
            event_type = EventTypes.STAGE_COMPLETED
        else:
            self.status = Status.FAILED
            event_type = EventTypes.STAGE_FAILED

        log_event(
            {
                "event_type": event_type,
                "stage": self.stage,
                "status": self.status,
                "duration_ms": self.duration_ms,
                "group": self.stage_info.group,
                "request_id": context.request_id,
                "trace_id": context.trace_id,
                "session_id": context.session_id,
                "timestamp": time.time(),
                "metadata": self.metadata,
            }
        )

        context.current_stage = None

        return False

    def add_metadata(self, **kwargs):
        self.metadata.update(kwargs)


class Telemetry:
    """
    Public API for the AI Operations Platform telemetry.

    Responsibilities:
    - pipeline stage telemetry
    - agent-level outcome telemetry

    HTTP request lifecycle remains owned by middleware.
    """

    def pipeline_stage(
        self,
        stage: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TelemetryStageContext:

        return TelemetryStageContext(
            stage=stage,
            metadata=metadata,
        )

    def request_completed(
        self,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """
        Record successful completion of the AI agent pipeline.

        This does NOT represent the HTTP lifecycle.
        The middleware owns HTTP request completion.
        """

        self._request_event(
            event_type=EventTypes.PIPELINE_COMPLETED,
            status=Status.SUCCESS,
            metadata=metadata,
        )

    def request_failed(
        self,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """
        Record failed completion of the AI agent pipeline.

        This does NOT represent the HTTP lifecycle.
        The middleware owns HTTP request failure.
        """

        self._request_event(
            event_type=EventTypes.PIPELINE_FAILED,
            status=Status.FAILED,
            metadata=metadata,
        )

    def _request_event(
        self,
        event_type: str,
        status: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        context = get_request_context()

        if context is None:
            raise RuntimeError(
                "Telemetry request events require an active RequestContext"
            )

        duration_ms = round(
            (time.time() - context.request_start_time) * 1000,
            2,
        )

        log_event(
            {
                "event_type": event_type,
                "status": status,
                "request_id": context.request_id,
                "trace_id": context.trace_id,
                "session_id": context.session_id,
                "timestamp": time.time(),
                "duration_ms": duration_ms,
                "metadata": metadata or {},
            }
        )


# Global telemetry instance

telemetry = Telemetry()