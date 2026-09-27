from unittest.mock import AsyncMock

import pytest

from services import rate_limit_service


@pytest.mark.asyncio
async def test_rate_limit_allows_request_under_limit(monkeypatch):
    fake_redis = AsyncMock()
    fake_redis.eval.return_value = [1, 300]

    monkeypatch.setattr(
        rate_limit_service,
        "get_redis_client",
        lambda: fake_redis,
    )

    decision = await rate_limit_service.consume_rate_limit(
        "login_email",
        "user@example.com",
        limit=5,
        window_seconds=300,
    )

    assert decision.allowed is True
    assert decision.used == 1
    assert decision.remaining == 4
    assert decision.retry_after == 300


@pytest.mark.asyncio
async def test_rate_limit_allows_last_request_at_limit(monkeypatch):
    fake_redis = AsyncMock()
    fake_redis.eval.return_value = [5, 240]

    monkeypatch.setattr(
        rate_limit_service,
        "get_redis_client",
        lambda: fake_redis,
    )

    decision = await rate_limit_service.consume_rate_limit(
        "login_email",
        "user@example.com",
        limit=5,
        window_seconds=300,
    )

    assert decision.allowed is True
    assert decision.used == 5
    assert decision.remaining == 0


@pytest.mark.asyncio
async def test_rate_limit_blocks_request_over_limit(monkeypatch):
    fake_redis = AsyncMock()
    fake_redis.eval.return_value = [6, 220]

    monkeypatch.setattr(
        rate_limit_service,
        "get_redis_client",
        lambda: fake_redis,
    )

    decision = await rate_limit_service.consume_rate_limit(
        "login_email",
        "user@example.com",
        limit=5,
        window_seconds=300,
    )

    assert decision.allowed is False
    assert decision.used == 6
    assert decision.remaining == 0
    assert decision.retry_after == 220


@pytest.mark.asyncio
async def test_rate_limit_key_does_not_store_raw_identifier(monkeypatch):
    fake_redis = AsyncMock()
    fake_redis.eval.return_value = [1, 300]

    monkeypatch.setattr(
        rate_limit_service,
        "get_redis_client",
        lambda: fake_redis,
    )

    email = "sensitive@example.com"

    await rate_limit_service.consume_rate_limit(
        "login_email",
        email,
        limit=5,
        window_seconds=300,
    )

    call_args = fake_redis.eval.await_args.args

    redis_key = call_args[2]

    assert email not in redis_key
    assert redis_key.startswith("rate_limit:login_email:")


@pytest.mark.asyncio
async def test_clear_rate_limit_deletes_bucket(monkeypatch):
    fake_redis = AsyncMock()

    monkeypatch.setattr(
        rate_limit_service,
        "get_redis_client",
        lambda: fake_redis,
    )

    await rate_limit_service.clear_rate_limit(
        "login_email",
        "user@example.com",
    )

    fake_redis.delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_rate_limit_rejects_invalid_configuration():
    with pytest.raises(ValueError):
        await rate_limit_service.consume_rate_limit(
            "query_user",
            "user-123",
            limit=0,
            window_seconds=60,
        )