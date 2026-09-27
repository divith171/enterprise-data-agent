import redis.asyncio as redis

from app.config import settings


_client = None


def get_redis_client():
    global _client

    if _client is None:
        _client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            ssl=settings.redis_ssl,
            decode_responses=True,
        )

    return _client