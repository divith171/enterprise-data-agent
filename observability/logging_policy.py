from typing import Any, Dict

from app.config import settings


PRODUCTION_SENSITIVE_KEYS = {
    "question",
    "user_input",
    "raw_question",
    "prompt",
    "raw_prompt",
    "metadata_context",
}

SQL_KEYS = {
    "sql",
    "generated_sql",
    "raw_sql",
}


def sanitize_log_value(
    value: Any,
) -> Any:
    if isinstance(value, dict):
        return sanitize_log_event(value)

    if isinstance(value, list):
        return [
            sanitize_log_value(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return [
            sanitize_log_value(item)
            for item in value
        ]

    return value


def sanitize_log_event(
    event: Dict[str, Any],
) -> Dict[str, Any]:
    sanitized = {}

    for key, value in event.items():
        normalized_key = str(key).lower()

        if (
            settings.is_production
            and normalized_key
            in PRODUCTION_SENSITIVE_KEYS
        ):
            continue

        if (
            normalized_key in SQL_KEYS
            and (
                settings.is_production
                or not settings.log_raw_sql
            )
        ):
            continue

        sanitized[key] = sanitize_log_value(
            value
        )

    return sanitized