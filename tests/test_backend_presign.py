import os
from fastapi.testclient import TestClient
from unittest import mock
import boto3
from botocore.stub import Stubber

from app.main import app


def test_presign_and_notify(monkeypatch):
    os.environ.setdefault("API_KEY", "testkey")
    os.environ.setdefault("S3_BUCKET", "test-bucket")
    os.environ.setdefault("SQS_QUEUE_URL", "https://example.com/queue")
    os.environ.setdefault("AWS_REGION", "ap-northeast-2")

    client = TestClient(app)

    # stub boto3 clients used in backend_presign module
    import app.api.v1.backend_presign as bp

    # create a stub for s3 client
    s3 = boto3.client("s3", region_name="ap-northeast-2")
    stub_s3 = Stubber(s3)
    # monkeypatch the module clients
    monkeypatch.setattr(bp, "s3_client", s3)
    monkeypatch.setattr(bp, "sqs_client", boto3.client("sqs", region_name="ap-northeast-2"))

    # ensure generate_presigned_url doesn't call network or fail - return a dummy URL
    monkeypatch.setattr(bp.s3_client, "generate_presigned_url", lambda ClientMethod, Params, ExpiresIn: "https://example.com/put")

    # Call presign
    auth_header = f"Bearer {os.environ.get('API_KEY')}"
    resp = client.post("/api/v1/docs/presign", json={"filename": "a.pdf", "content_type": "application/pdf"}, headers={"Authorization": auth_header})
    assert resp.status_code == 200
    body = resp.json()
    assert "url" in body and "job_id" in body and "s3_key" in body

    # Call notify_upload - monkeypatch sqs_client.send_message to return a fake response
    monkeypatch.setattr(bp.sqs_client, "send_message", lambda QueueUrl, MessageBody: {"MessageId": "msg-1"})
    resp2 = client.post("/api/v1/docs/notify_upload", json={"job_id": "1", "s3_key": "k"}, headers={"Authorization": auth_header})
    assert resp2.status_code == 200
    b2 = resp2.json()
    assert b2.get("ok") is True
