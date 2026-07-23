import json

from services.redis_service import get_redis_client


SESSION_TTL = 60 * 60  # 1 hour


async def create_session(session_id, initial_data=None):
    if initial_data is None:
        initial_data = {}

    redis_client = get_redis_client()

    await redis_client.set(
        session_id,
        json.dumps(initial_data),
        ex=SESSION_TTL
    )


async def _get_session(session_id):
    redis_client = get_redis_client()

    data = await redis_client.get(session_id)

    if data is None:
        return None

    return json.loads(data)


async def _update_session(session_id, data):
    redis_client = get_redis_client()

    await redis_client.set(
        session_id,
        json.dumps(data),
        ex=SESSION_TTL
    )


async def delete_session(session_id):
    redis_client = get_redis_client()

    await redis_client.delete(session_id)


async def session_exists(session_id):
    redis_client = get_redis_client()

    return await redis_client.exists(session_id) == 1


async def get_current_query(session_id):
    session = await _get_session(session_id)

    if session is None:
        return None

    return session["current_query"]


async def get_context(session_id):
    session = await _get_session(session_id)

    if session is None:
        return None

    return session["context"]


async def set_current_query(session_id, current_query):
    session = await _get_session(session_id)

    if session is None:
        return

    session["current_query"] = current_query

    await _update_session(session_id, session)


async def set_context(session_id, context):
    session = await _get_session(session_id)

    if session is None:
        return

    session["context"] = context

    await _update_session(session_id, session)