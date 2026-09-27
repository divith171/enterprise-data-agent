from fastapi.testclient import TestClient

from app.main import app
from app.auth.dependencies import get_current_user
from app.api.routes import observability


client = TestClient(
    app,
    raise_server_exceptions=True,
)


def test_observability_requires_authentication():
    response = client.get(
        "/observability/overview"
    )

    assert response.status_code == 401

    assert response.json() == {
        "detail": "AUTHENTICATION_REQUIRED"
    }


def test_observability_uses_authenticated_tenant(
    monkeypatch,
):
    captured = {}

    async def fake_current_user():
        return {
            "id": "user-a",
            "company_id": "company-a",
            "email": "a@example.com",
            "role": "admin",
        }

    def fake_compute_metrics(
        tenant_id=None,
    ):
        captured["tenant_id"] = tenant_id

        return {
            "http": {},
            "endpoints": {},
            "requests": {},
            "retries": {},
            "sql_execution": {},
            "llm": {},
            "groups": {},
            "stages": {},
        }

    app.dependency_overrides[
        get_current_user
    ] = fake_current_user

    monkeypatch.setattr(
        observability,
        "compute_metrics",
        fake_compute_metrics,
    )

    try:
        response = client.get(
            "/observability/overview"
        )

        assert response.status_code == 200

        assert captured["tenant_id"] == (
            "company-a"
        )

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

    finally:
        app.dependency_overrides.clear()