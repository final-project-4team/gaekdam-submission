import os
import json
from fastapi.testclient import TestClient

from app.main import app


def test_presign_persists_job(monkeypatch):
    # ensure env
    os.environ.setdefault("API_KEY", "testkey")
    os.environ.setdefault("S3_BUCKET", "test-bucket")
    os.environ.setdefault("AWS_REGION", "ap-northeast-2")

    client = TestClient(app)

    # import the backend_presign module to monkeypatch its s3 client
    import app.api.v1.backend_presign as bp
    # monkeypatch generate_presigned_url to avoid network
    monkeypatch.setattr(bp.s3_client, "generate_presigned_url", lambda ClientMethod, Params, ExpiresIn: "https://example.com/put")

    auth_header = {"Authorization": f"Bearer {os.environ.get('API_KEY')}"}
    resp = client.post("/api/v1/docs/presign", json={"filename": "doc.pdf", "content_type": "application/pdf"}, headers=auth_header)
    assert resp.status_code == 200
    body = resp.json()
    assert "job_id" in body and "s3_key" in body

    job_id = body["job_id"]

    # Verify job metadata was persisted in job_status
    from app.ingestion import job_status
    status = job_status.get_status(job_id)
    # expected to contain s3_key and pending status
    assert status.get("status") in ("pending", "processing")
    assert status.get("s3_key") or status.get("detail")
