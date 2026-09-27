from dataclasses import dataclass
import hashlib

from services.redis_service import get_redis_client


_RATE_LIMIT_SCRIPT = """
local count = redis.call('INCR', KEYS[1])

if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end

local ttl = redis.call('TTL', KEYS[1])

return {count, ttl}
"""


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    limit: int
    used: int
    remaining: int
    retry_after: int


def _build_rate_limit_key(
    scope: str,
    identifier: str,
) -> str:
    normalized_identifier = identifier.strip().lower()

    identifier_hash = hashlib.sha256(
        normalized_identifier.encode("utf-8")
    ).hexdigest()

    return f"rate_limit:{scope}:{identifier_hash}"


async def consume_rate_limit(
    scope: str,
    identifier: str,
    *,
    limit: int,
    window_seconds: int,
) -> RateLimitDecision:

    if not scope:
        raise ValueError("RATE_LIMIT_SCOPE_REQUIRED")

    if not identifier:
        raise ValueError("RATE_LIMIT_IDENTIFIER_REQUIRED")

    if limit <= 0:
        raise ValueError("RATE_LIMIT_LIMIT_INVALID")

    if window_seconds <= 0:
        raise ValueError("RATE_LIMIT_WINDOW_INVALID")

    redis_client = get_redis_client()

    key = _build_rate_limit_key(
        scope,
        identifier,
    )

    count, ttl = await redis_client.eval(
        _RATE_LIMIT_SCRIPT,
        1,
        key,
        window_seconds,
    )

    count = int(count)
    ttl = max(int(ttl), 0)

    return RateLimitDecision(
        allowed=count <= limit,
        limit=limit,
        used=count,
        remaining=max(limit - count, 0),
        retry_after=ttl,
    )


async def clear_rate_limit(
    scope: str,
    identifier: str,
):
    redis_client = get_redis_client()

    key = _build_rate_limit_key(
        scope,
        identifier,
    )

    await redis_client.delete(key)