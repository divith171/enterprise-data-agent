from unittest.mock import patch

import pytest

from services import session_service


class FakeRedis:
    def __init__(self):
        self.data = {}

    async def set(self, key, value, ex=None):
        self.data[key] = value
        self.last_ttl = ex

    async def get(self, key):
        return self.data.get(key)

    async def delete(self, key):
        self.data.pop(key, None)

    async def exists(self, key):
        return 1 if key in self.data else 0


@pytest.mark.anyio
async def test_create_session_and_retrieve_data():
    redis_client = FakeRedis()

    with patch(
        "services.session_service.get_redis_client",
        return_value=redis_client,
    ):
        await session_service.create_session(
            "session-1",
            {
                "current_query": "show sales",
                "context": {"region": "west"},
            },
        )

        assert await session_service.session_exists("session-1")

        assert await session_service.get_current_query("session-1") == "show sales"

        assert await session_service.get_context("session-1") == {
            "region": "west"
        }

        assert redis_client.last_ttl == session_service.SESSION_TTL


@pytest.mark.anyio
async def test_set_current_query_updates_existing_session():
    redis_client = FakeRedis()

    with patch(
        "services.session_service.get_redis_client",
        return_value=redis_client,
    ):
        await session_service.create_session(
            "session-1",
            {
                "current_query": "old query",
                "context": {"region": "west"},
            },
        )

        await session_service.set_current_query(
            "session-1",
            "new query",
        )

        assert await session_service.get_current_query("session-1") == "new query"

        assert await session_service.get_context("session-1") == {
            "region": "west"
        }


@pytest.mark.anyio
async def test_set_context_updates_existing_session():
    redis_client = FakeRedis()

    with patch(
        "services.session_service.get_redis_client",
        return_value=redis_client,
    ):
        await session_service.create_session(
            "session-1",
            {
                "current_query": "show sales",
                "context": {},
            },
        )

        new_context = {
            "group_by": "region",
            "time_range": "last month",
        }

        await session_service.set_context(
            "session-1",
            new_context,
        )

        assert await session_service.get_current_query("session-1") == "show sales"

        assert await session_service.get_context("session-1") == new_context


@pytest.mark.anyio
async def test_delete_session_removes_session():
    redis_client = FakeRedis()

    with patch(
        "services.session_service.get_redis_client",
        return_value=redis_client,
    ):
        await session_service.create_session(
            "session-1",
            {
                "current_query": "show sales",
                "context": {},
            },
        )

        assert await session_service.session_exists("session-1")

        await session_service.delete_session("session-1")

        assert not await session_service.session_exists("session-1")
        assert await session_service.get_current_query("session-1") is None
        assert await session_service.get_context("session-1") is None


@pytest.mark.anyio
async def test_missing_session_updates_are_noops():
    redis_client = FakeRedis()

    with patch(
        "services.session_service.get_redis_client",
        return_value=redis_client,
    ):
        await session_service.set_current_query(
            "missing-session",
            "query",
        )

        await session_service.set_context(
            "missing-session",
            {"region": "west"},
        )

        assert not await session_service.session_exists("missing-session")
