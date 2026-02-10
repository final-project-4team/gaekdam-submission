#!/usr/bin/env python3
"""
간단 SQS worker PoC:
- SQS 메시지 바디에서 {'job_id':..., 's3_bucket':..., 's3_key':...} 추출
- pipeline.ingest_from_s3 호출
- 성공 시 메시지 삭제, 실패 시 로깅(재시도/Dead-letter 는 infra 단에서)
"""

import os
import json
import time
import logging
import boto3
from app import ingestion

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

AWS_REGION = os.environ.get("AWS_REGION", "ap-northeast-2")
SQS_QUEUE_URL = os.environ.get("SQS_QUEUE_URL")
sqs = boto3.client("sqs", region_name=AWS_REGION)

def handle_message(msg):
    body = msg.get("Body")
    # 메시지가 str(dict) 형식이면 eval/ast.literal_eval 하거나 JSON이면 json.loads
    try:
        payload = json.loads(body)
    except Exception:
        payload = eval(body)  # 주의: 실제 환경에서는 안전한 파싱 필요
    job_id = payload.get("job_id")
    bucket = payload.get("s3_bucket") or os.environ.get("S3_BUCKET")
    key = payload.get("s3_key")
    if not (job_id and bucket and key):
        logger.error("invalid message payload: %s", payload)
        return False

    s3_uri = f"s3://{bucket}/{key}"
    try:
        # 상태 업데이트: processing
        from app.ingestion import job_status
        job_status.set_status(job_id, "processing", detail=f"worker started: {key}", s3_key=key, source="s3")
        ingestion.pipeline.ingest_from_s3(s3_uri, ingestion.pipeline.DEFAULT_INDEX_PATH, ingestion.pipeline.DEFAULT_META_PATH, 1000, 200, job_id)
        job_status.set_status(job_id, "done", detail="ingest complete", s3_key=key, source="s3")
        return True
    except Exception as e:
        logger.exception("failed processing job %s", job_id)
        job_status.set_status(job_id, "failed", detail=str(e), s3_key=key, source="s3")
        return False

def main_loop(poll_interval=5):
    if not SQS_QUEUE_URL:
        raise RuntimeError("SQS_QUEUE_URL not configured")
    while True:
        resp = sqs.receive_message(QueueUrl=SQS_QUEUE_URL, MaxNumberOfMessages=1, WaitTimeSeconds=10)
        msgs = resp.get("Messages", [])
        if not msgs:
            time.sleep(poll_interval)
            continue
        for m in msgs:
            ok = handle_message(m)
            if ok:
                sqs.delete_message(QueueUrl=SQS_QUEUE_URL, ReceiptHandle=m["ReceiptHandle"])

if __name__ == "__main__":
    main_loop()
