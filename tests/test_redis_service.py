from unittest.mock import patch

from services import redis_service


def test_get_redis_client_creates_singleton():
    redis_service._client = None

    fake_client = object()

    with patch(
        "services.redis_service.redis.Redis",
        return_value=fake_client,
    ) as mock_redis:

        first = redis_service.get_redis_client()
        second = redis_service.get_redis_client()

    assert first is fake_client
    assert second is fake_client

    mock_redis.assert_called_once_with(
        host="localhost",
        port=6379,
        ssl=False,
        decode_responses=True,
    )

    redis_service._client = None