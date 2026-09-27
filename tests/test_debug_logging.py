from unittest.mock import patch

from app.config import AppSettings
from observability.debug import debug_print


def make_settings(
    *,
    verbose_debug_logging: bool,
):
    return AppSettings(
        app_env=(
            "development"
            if verbose_debug_logging
            else "production"
        ),
        cookie_secure=False,
        control_db_host="localhost",
        control_db_port=5432,
        control_db_name="bird_eval",
        control_db_user="eda_user",
        control_db_ssl_mode="prefer",
        redis_host="localhost",
        redis_port=6379,
        redis_ssl=False,
        verbose_debug_logging=verbose_debug_logging,
        log_raw_sql=verbose_debug_logging,
    )


def test_debug_print_outputs_in_development():
    with patch(
        "observability.debug.settings",
        make_settings(
            verbose_debug_logging=True,
        ),
    ), patch(
        "builtins.print",
    ) as mock_print:

        debug_print(
            "Generated SQL:",
            "SELECT 1",
        )

    mock_print.assert_called_once_with(
        "Generated SQL:",
        "SELECT 1",
    )


def test_debug_print_is_silent_in_production():
    with patch(
        "observability.debug.settings",
        make_settings(
            verbose_debug_logging=False,
        ),
    ), patch(
        "builtins.print",
    ) as mock_print:

        debug_print(
            "SECRET DEBUG DATA"
        )

    mock_print.assert_not_called()