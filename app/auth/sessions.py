import json
import secrets
from datetime import datetime, timedelta, timezone

from services.redis_service import get_redis_client


AUTH_SESSION_PREFIX = "auth:session:"
IDLE_TIMEOUT = timedelta(minutes=30)
ABSOLUTE_TIMEOUT = timedelta(days=7)


def generate_session_id() -> str:
    return secrets.token_urlsafe(32)


async def create_auth_session(user_id: str) -> str:
    session_id = generate_session_id()
    now = datetime.now(timezone.utc)

    session = {
        "user_id": user_id,
        "created_at": now.isoformat(),
        "last_seen_at": now.isoformat(),
        "expires_at": (now + ABSOLUTE_TIMEOUT).isoformat(),
    }

    redis_client = get_redis_client()

    await redis_client.set(
        f"{AUTH_SESSION_PREFIX}{session_id}",
        json.dumps(session),
        ex=int(ABSOLUTE_TIMEOUT.total_seconds()),
    )

    return session_id
async def get_auth_session(session_id: str):
    redis_client = get_redis_client()

    data = await redis_client.get(
        f"{AUTH_SESSION_PREFIX}{session_id}"
    )

    if data is None:
        return None

    session = json.loads(data)
    now = datetime.now(timezone.utc)

    expires_at = datetime.fromisoformat(session["expires_at"])
    last_seen_at = datetime.fromisoformat(session["last_seen_at"])

    if now >= expires_at:
        await redis_client.delete(
            f"{AUTH_SESSION_PREFIX}{session_id}"
        )
        return None

    if now - last_seen_at >= IDLE_TIMEOUT:
        await redis_client.delete(
            f"{AUTH_SESSION_PREFIX}{session_id}"
        )
        return None

    session["last_seen_at"] = now.isoformat()

    remaining_lifetime = expires_at - now

    await redis_client.set(
        f"{AUTH_SESSION_PREFIX}{session_id}",
        json.dumps(session),
        ex=max(1, int(remaining_lifetime.total_seconds())),
    )

    return session

async def delete_auth_session(session_id: str) -> None:
    redis_client = get_redis_client()

    await redis_client.delete(
        f"{AUTH_SESSION_PREFIX}{session_id}"
    )