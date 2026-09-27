from unittest.mock import AsyncMock, patch

import pytest

from services.session_service import session_matches_scope


@pytest.mark.asyncio
async def test_session_scope_matches_all_identifiers():
    session = {
        "user_id": "user-a",
        "company_id": "company-a",
        "data_source_id": "data-source-a",
    }

    with patch(
        "services.session_service._get_session",
        new=AsyncMock(return_value=session),
    ):
        result = await session_matches_scope(
            "session-1",
            "user-a",
            "company-a",
            "data-source-a",
        )

    assert result is True


@pytest.mark.asyncio
async def test_session_scope_rejects_different_user():
    session = {
        "user_id": "user-a",
        "company_id": "company-a",
        "data_source_id": "data-source-a",
    }

    with patch(
        "services.session_service._get_session",
        new=AsyncMock(return_value=session),
    ):
        result = await session_matches_scope(
            "session-1",
            "user-b",
            "company-a",
            "data-source-a",
        )

    assert result is False


@pytest.mark.asyncio
async def test_session_scope_rejects_different_company():
    session = {
        "user_id": "user-a",
        "company_id": "company-a",
        "data_source_id": "data-source-a",
    }

    with patch(
        "services.session_service._get_session",
        new=AsyncMock(return_value=session),
    ):
        result = await session_matches_scope(
            "session-1",
            "user-a",
            "company-b",
            "data-source-a",
        )

    assert result is False


@pytest.mark.asyncio
async def test_session_scope_rejects_different_data_source():
    session = {
        "user_id": "user-a",
        "company_id": "company-a",
        "data_source_id": "data-source-a",
    }

    with patch(
        "services.session_service._get_session",
        new=AsyncMock(return_value=session),
    ):
        result = await session_matches_scope(
            "session-1",
            "user-a",
            "company-a",
            "data-source-b",
        )

    assert result is False


@pytest.mark.asyncio
async def test_session_scope_rejects_missing_session():
    with patch(
        "services.session_service._get_session",
        new=AsyncMock(return_value=None),
    ):
        result = await session_matches_scope(
            "missing-session",
            "user-a",
            "company-a",
            "data-source-a",
        )

    assert result is False