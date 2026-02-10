import os
from fastapi.testclient import TestClient
from app.main import app


def test_upload_and_status(tmp_path, monkeypatch):
    # ensure API key for middleware
    os.environ.setdefault("API_KEY", "testkey")

    client = TestClient(app)

    # create a fake pdf file
    fname = "sample.txt"
    file_content = b"hello world"

    auth_header = {"Authorization": f"Bearer {os.environ.get('API_KEY')}"}
    resp = client.post("/api/v1/docs/upload", files={"file": (fname, file_content, "text/plain")}, headers=auth_header)
    assert resp.status_code == 200
    body = resp.json()
    assert "job_id" in body
    job_id = body["job_id"]

    # request status (include auth header to pass middleware)
    resp2 = client.get(f"/api/v1/docs/status/{job_id}", headers=auth_header)
    # status endpoint may return pending; ensure 200 or 404 handled
    assert resp2.status_code in (200, 404)
