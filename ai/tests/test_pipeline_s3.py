import os
import json
from pathlib import Path
from app.ingestion import pipeline


def test_ingest_from_s3_calls_ingest_single_file(monkeypatch, tmp_path):
    # prepare a fake local temp file that download_to_temp should "return"
    temp_file = tmp_path / "sample.txt"
    temp_file.write_bytes(b"hello world")

    # monkeypatch parse_s3_uri and download_to_temp to avoid real S3 calls
    monkeypatch.setattr(pipeline.s3_client, "parse_s3_uri", lambda uri: ("bucket-name", "uploads/job_x_sample.txt"))
    monkeypatch.setattr(pipeline.s3_client, "download_to_temp", lambda bucket, key: str(temp_file))

    called = {}

    def fake_ingest_single_file(path, index_path, meta_path, chunk_size, overlap, job_id):
        # record that ingest_single_file was called with the expected local path
        called["path"] = path
        called["job_id"] = job_id

    # monkeypatch the heavy ingest_single_file to avoid actual model work
    monkeypatch.setattr(pipeline, "ingest_single_file", fake_ingest_single_file)

    # call ingest_from_s3 and assert that it invoked ingest_single_file with the temp file path
    pipeline.ingest_from_s3("s3://bucket-name/uploads/job_x_sample.txt", pipeline.DEFAULT_INDEX_PATH, pipeline.DEFAULT_META_PATH, 1000, 200, "job-123")

    assert called.get("path") == str(temp_file)
    assert called.get("job_id") == "job-123"
