from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=True)


def test_observability_overview_contract():
    response = client.get("/observability/overview")

    assert response.status_code == 200

    data = response.json()

    assert set(data) == {
        "http",
        "endpoints",
        "requests",
        "retries",
        "sql_execution",
        "llm",
        "groups",
        "stages",
    }

    assert isinstance(data["http"], dict)
    assert isinstance(data["endpoints"], dict)
    assert isinstance(data["requests"], dict)
    assert isinstance(data["retries"], dict)
    assert isinstance(data["sql_execution"], dict)
    assert isinstance(data["llm"], dict)
    assert isinstance(data["groups"], dict)
    assert isinstance(data["stages"], dict)
