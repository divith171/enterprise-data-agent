import pytest

from app.config import load_settings


def test_development_defaults_are_local_and_debug_friendly():
    settings = load_settings({})

    assert settings.app_env == "development"
    assert settings.is_production is False

    assert settings.cookie_secure is False

    assert settings.control_db_host == "127.0.0.1"
    assert settings.control_db_port == 5432
    assert settings.control_db_name == "bird_eval"
    assert settings.control_db_user == "eda_user"
    assert settings.control_db_ssl_mode == "prefer"

    assert settings.redis_host == "localhost"
    assert settings.redis_port == 6379
    assert settings.redis_ssl is False

    assert settings.verbose_debug_logging is True
    assert settings.log_raw_sql is True


def test_production_defaults_are_security_hardened():
    settings = load_settings(
        {
            "APP_ENV": "production",
        }
    )

    assert settings.app_env == "production"
    assert settings.is_production is True

    assert settings.cookie_secure is True
    assert settings.control_db_ssl_mode == "require"
    assert settings.redis_ssl is True

    assert settings.verbose_debug_logging is False
    assert settings.log_raw_sql is False


def test_environment_values_can_override_defaults():
    settings = load_settings(
        {
            "APP_ENV": "production",
            "CONTROL_DB_HOST": "prod-db.internal",
            "CONTROL_DB_PORT": "6432",
            "CONTROL_DB_NAME": "enterprise_data_agent",
            "CONTROL_DB_USER": "eda_platform",
            "CONTROL_DB_SSL_MODE": "verify-full",
            "REDIS_HOST": "prod-redis.internal",
            "REDIS_PORT": "6380",
            "REDIS_SSL": "true",
        }
    )

    assert (
        settings.control_db_host
        == "prod-db.internal"
    )

    assert settings.control_db_port == 6432

    assert (
        settings.control_db_name
        == "enterprise_data_agent"
    )

    assert (
        settings.control_db_user
        == "eda_platform"
    )

    assert (
        settings.control_db_ssl_mode
        == "verify-full"
    )

    assert (
        settings.redis_host
        == "prod-redis.internal"
    )

    assert settings.redis_port == 6380
    assert settings.redis_ssl is True


def test_invalid_app_environment_fails_closed():
    with pytest.raises(
        ValueError,
        match="APP_ENV",
    ):
        load_settings(
            {
                "APP_ENV": "something-random",
            }
        )


def test_invalid_boolean_configuration_is_rejected():
    with pytest.raises(
        ValueError,
        match="COOKIE_SECURE",
    ):
        load_settings(
            {
                "COOKIE_SECURE": "maybe",
            }
        )


def test_invalid_port_configuration_is_rejected():
    with pytest.raises(
        ValueError,
        match="REDIS_PORT",
    ):
        load_settings(
            {
                "REDIS_PORT": "not-a-number",
            }
        )

def test_production_rejects_insecure_control_db_ssl():
    try:
        load_settings(
            {
                "APP_ENV": "production",
                "CONTROL_DB_SSL_MODE": "disable",
            }
        )
    except ValueError as exc:
        assert (
            "must use PostgreSQL TLS"
            in str(exc)
        )
    else:
        raise AssertionError(
            "Production accepted insecure PostgreSQL SSL mode"
        )


def test_production_rejects_redis_without_tls():
    try:
        load_settings(
            {
                "APP_ENV": "production",
                "REDIS_SSL": "false",
            }
        )
    except ValueError as exc:
        assert (
            "must use TLS"
            in str(exc)
        )
    else:
        raise AssertionError(
            "Production accepted Redis without TLS"
        )


def test_production_accepts_strong_postgres_tls():
    settings = load_settings(
        {
            "APP_ENV": "production",
            "CONTROL_DB_SSL_MODE": "verify-full",
            "REDIS_SSL": "true",
        }
    )

    assert (
        settings.control_db_ssl_mode
        == "verify-full"
    )

    assert settings.redis_ssl is True