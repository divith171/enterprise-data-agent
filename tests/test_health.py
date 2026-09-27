from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.main import app


client = TestClient(
    app,
    raise_server_exceptions=True,
)


def fake_current_user():
    return {
        "id": "test-user",
        "company_id": "test-company",
        "email": "test@example.com",
        "role": "analyst",
    }


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy"
    }


def test_root():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Enterprise Data Agent is running"
    }


def test_query_requires_message_and_session_id():
    app.dependency_overrides[
        get_current_user
    ] = fake_current_user

    try:
        response = client.post(
            "/query",
            json={},
        )

        assert response.status_code == 422

    finally:
        app.dependency_overrides.clear()


def test_query_requires_session_id():
    app.dependency_overrides[
        get_current_user
    ] = fake_current_user

    try:
        response = client.post(
            "/query",
            json={
                "message": "show me sales"
            },
        )

        assert response.status_code == 422

    finally:
        app.dependency_overrides.clear()


def test_query_requires_message():
    app.dependency_overrides[
        get_current_user
    ] = fake_current_user

    try:
        response = client.post(
            "/query",
            json={
                "session_id": "test-session"
            },
        )

        assert response.status_code == 422

    finally:
        app.dependency_overrides.clear()