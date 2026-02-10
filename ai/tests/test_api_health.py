from fastapi.testclient import TestClient
from app.main import app


def test_health_ok():
    client = TestClient(app)
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, dict)
    # basic shape expectation
    assert body.get("status") in ("ok", "healthy", None) or "service" in body
