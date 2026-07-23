import redis.asyncio as redis

_client = None


def get_redis_client():
    global _client

    if _client is None:
        _client = redis.Redis(
            host="localhost",
            port=6379,
            decode_responses=True
        )

    return _client