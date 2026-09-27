from dataclasses import dataclass
from os import environ
from typing import Mapping

from dotenv import load_dotenv


load_dotenv()


TRUE_VALUES = {
    "1",
    "true",
    "yes",
    "on",
}

FALSE_VALUES = {
    "0",
    "false",
    "no",
    "off",
}

PRODUCTION_POSTGRES_SSL_MODES = {
    "require",
    "verify-ca",
    "verify-full",
}


def _get_bool(
    env: Mapping[str, str],
    name: str,
    default: bool,
) -> bool:
    value = env.get(name)

    if value is None:
        return default

    normalized = value.strip().lower()

    if normalized in TRUE_VALUES:
        return True

    if normalized in FALSE_VALUES:
        return False

    raise ValueError(
        f"Invalid boolean value for {name}"
    )


def _get_int(
    env: Mapping[str, str],
    name: str,
    default: int,
) -> int:
    value = env.get(name)

    if value is None:
        return default

    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(
            f"Invalid integer value for {name}"
        ) from exc


@dataclass(frozen=True)
class AppSettings:
    app_env: str

    cookie_secure: bool

    control_db_host: str
    control_db_port: int
    control_db_name: str
    control_db_user: str
    control_db_ssl_mode: str

    redis_host: str
    redis_port: int
    redis_ssl: bool

    verbose_debug_logging: bool
    log_raw_sql: bool

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


def load_settings(
    env: Mapping[str, str] | None = None,
) -> AppSettings:
    source = environ if env is None else env

    app_env = source.get(
        "APP_ENV",
        "development",
    ).strip().lower()

    if app_env not in {
        "development",
        "test",
        "production",
    }:
        raise ValueError(
            "APP_ENV must be development, test, or production"
        )

    is_production = app_env == "production"

    cookie_secure = _get_bool(
        source,
        "COOKIE_SECURE",
        is_production,
    )

    control_db_host = source.get(
        "CONTROL_DB_HOST",
        "127.0.0.1",
    )

    control_db_port = _get_int(
        source,
        "CONTROL_DB_PORT",
        5432,
    )

    control_db_name = source.get(
        "CONTROL_DB_NAME",
        "bird_eval",
    )

    control_db_user = source.get(
        "CONTROL_DB_USER",
        "eda_user",
    )

    control_db_ssl_mode = source.get(
        "CONTROL_DB_SSL_MODE",
        (
            "require"
            if is_production
            else "prefer"
        ),
    ).strip().lower()

    redis_host = source.get(
        "REDIS_HOST",
        "localhost",
    )

    redis_port = _get_int(
        source,
        "REDIS_PORT",
        6379,
    )

    redis_ssl = _get_bool(
        source,
        "REDIS_SSL",
        is_production,
    )

    verbose_debug_logging = _get_bool(
        source,
        "VERBOSE_DEBUG_LOGGING",
        not is_production,
    )

    log_raw_sql = _get_bool(
        source,
        "LOG_RAW_SQL",
        not is_production,
    )

    # ---------------------------------
    # Production security enforcement
    # ---------------------------------

    if is_production:
        if (
            control_db_ssl_mode
            not in PRODUCTION_POSTGRES_SSL_MODES
        ):
            raise ValueError(
                "Production control database connections "
                "must use PostgreSQL TLS."
            )

        if not redis_ssl:
            raise ValueError(
                "Production Redis connections "
                "must use TLS."
            )

    return AppSettings(
        app_env=app_env,

        cookie_secure=cookie_secure,

        control_db_host=control_db_host,
        control_db_port=control_db_port,
        control_db_name=control_db_name,
        control_db_user=control_db_user,
        control_db_ssl_mode=control_db_ssl_mode,

        redis_host=redis_host,
        redis_port=redis_port,
        redis_ssl=redis_ssl,

        verbose_debug_logging=verbose_debug_logging,
        log_raw_sql=log_raw_sql,
    )


settings = load_settings()