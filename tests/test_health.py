from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=True)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_root():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Enterprise Data Agent is running"}

def test_query_requires_message_and_session_id():
    response = client.post("/query", json={})

    assert response.status_code == 422

def test_query_requires_session_id():
    response = client.post(
        "/query",
        json={"message": "show me sales"}
    )

    assert response.status_code == 422

def test_query_requires_message():
    response = client.post(
        "/query",
        json={"session_id": "test-session"}
    )

    assert response.status_code == 422
