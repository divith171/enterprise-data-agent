from unittest.mock import patch

from observability.context import (
    clear_request_context,
    create_request_context,
    set_request_context,
)
from observability.telemetry import telemetry


def test_request_completed_emits_sql_telemetry():
    context = create_request_context(session_id="test-session")
    set_request_context(context)

    try:
        with patch("observability.telemetry.log_event") as mock_log:
            telemetry.request_completed(
                metadata={
                    "status": "success",
                    "attempts": 1,
                    "total_pipeline_time": 1.25,
                    "generated_sql": "SELECT * FROM users",
                    "sql_execution": 0.42,
                    "sql_rows_returned": 2,
                }
            )

        mock_log.assert_called_once()

        event = mock_log.call_args.args[0]

        assert event["event_type"] == "pipeline_completed"
        assert event["status"] == "success"
        assert event["request_id"] == context.request_id
        assert event["trace_id"] == context.trace_id
        assert event["session_id"] == "test-session"

        assert event["metadata"]["sql_execution"] == 0.42
        assert event["metadata"]["sql_rows_returned"] == 2
        assert event["metadata"]["generated_sql"] == "SELECT * FROM users"

    finally:
        clear_request_context()
