from unittest.mock import patch

from app.config import AppSettings
from observability.logging_policy import (
    sanitize_log_event,
)


def make_settings(
    *,
    app_env: str,
    log_raw_sql: bool,
):
    return AppSettings(
        app_env=app_env,
        cookie_secure=False,
        control_db_host="localhost",
        control_db_port=5432,
        control_db_name="bird_eval",
        control_db_user="eda_user",
        control_db_ssl_mode="prefer",
        redis_host="localhost",
        redis_port=6379,
        redis_ssl=False,
        verbose_debug_logging=True,
        log_raw_sql=log_raw_sql,
    )


def test_development_keeps_detailed_logging():
    event = {
        "question": "How much revenue?",
        "generated_sql": "SELECT revenue FROM sales",
        "metadata": {
            "status": "success",
        },
    }

    with patch(
        "observability.logging_policy.settings",
        make_settings(
            app_env="development",
            log_raw_sql=True,
        ),
    ):
        sanitized = sanitize_log_event(
            event
        )

    assert sanitized == event


def test_production_removes_question_and_sql():
    event = {
        "question": "How much revenue?",
        "generated_sql": "SELECT revenue FROM sales",
        "status": "success",
        "attempts": 1,
    }

    with patch(
        "observability.logging_policy.settings",
        make_settings(
            app_env="production",
            log_raw_sql=False,
        ),
    ):
        sanitized = sanitize_log_event(
            event
        )

    assert "question" not in sanitized
    assert "generated_sql" not in sanitized

    assert sanitized["status"] == "success"
    assert sanitized["attempts"] == 1


def test_production_sanitizes_nested_metadata():
    event = {
        "event_type": "pipeline_completed",
        "metadata": {
            "generated_sql": "SELECT * FROM customers",
            "user_input": "show every customer",
            "rows_returned": 25,
        },
    }

    with patch(
        "observability.logging_policy.settings",
        make_settings(
            app_env="production",
            log_raw_sql=False,
        ),
    ):
        sanitized = sanitize_log_event(
            event
        )

    metadata = sanitized["metadata"]

    assert "generated_sql" not in metadata
    assert "user_input" not in metadata

    assert metadata["rows_returned"] == 25


def test_sql_can_be_disabled_in_development():
    event = {
        "generated_sql": "SELECT 1",
        "status": "success",
    }

    with patch(
        "observability.logging_policy.settings",
        make_settings(
            app_env="development",
            log_raw_sql=False,
        ),
    ):
        sanitized = sanitize_log_event(
            event
        )

    assert "generated_sql" not in sanitized
    assert sanitized["status"] == "success"