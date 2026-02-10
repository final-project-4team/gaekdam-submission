# app/api/v1/backend_presign.py
# 설명: S3 presign URL 생성과 업로드 완료 알림(notify) 엔드포인트 (PoC)
# - presign: 클라이언트에 S3 PUT presigned URL과 job_id, s3_key 반환
# - notify_upload: 클라이언트가 S3 업로드 완료 후 호출하면 SQS에 메시지를 전송
# 한글 주석 포함, 간단한 API_KEY 기반 인증(PoC)

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import os
import boto3
from uuid import uuid4
import logging
from typing import Optional
from app.ingestion import job_status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/docs")

# 환경변수
S3_BUCKET = os.environ.get("S3_BUCKET")
SQS_QUEUE_URL = os.environ.get("SQS_QUEUE_URL")
AWS_REGION = os.environ.get("AWS_REGION")
# PoC 용 단순 API 키(프로덕션에서는 다른 인증 방식 권장)
API_KEY = os.environ.get("API_KEY")

# boto3 클라이언트
s3_client = boto3.client("s3", region_name=AWS_REGION)
sqs_client = boto3.client("sqs", region_name=AWS_REGION)

# 요청/응답 모델
class PresignRequest(BaseModel):
    filename: str
    content_type: Optional[str] = "application/pdf"

class PresignResponse(BaseModel):
    url: str
    job_id: str
    s3_key: str
    expires_in: int

class NotifyRequest(BaseModel):
    job_id: str
    s3_key: str

# 간단한 의존성: Authorization: Bearer <API_KEY> 헤더 검사
async def require_api_key(request: Request):
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not API_KEY:
        # if no API_KEY configured, allow (development convenience)
        return True
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth.split(" ", 1)[1].strip()
    if token != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return True

@router.post("/presign", response_model=PresignResponse)
def presign(req: PresignRequest, _=Depends(require_api_key)):
    """
    presign 엔드포인트 (POST /api/v1/docs/presign)
    - 클라이언트가 업로드할 파일명/콘텐츠타입을 전송하면 presigned PUT URL을 반환
    - job_id를 생성하고, 안전한 S3 key를 함께 반환
    - S3 버킷 환경변수(S3_BUCKET)가 필요
    """
    if not S3_BUCKET:
        logger.error("S3_BUCKET not configured")
        raise HTTPException(status_code=500, detail="S3_BUCKET not configured")

    job_id = str(uuid4())
    # 안전한 키 생성: uploads/<job_id>_<basename>
    safe_name = os.path.basename(req.filename)
    s3_key = f"uploads/{job_id}_{safe_name}"

    # presigned URL 생성 (PUT)
    expires = 600  # 초 단위 만료시간, 필요시 조정
    try:
        params = {"Bucket": S3_BUCKET, "Key": s3_key, "ContentType": req.content_type}
        url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params=params,
            ExpiresIn=expires,
        )
    except Exception as e:
        logger.exception("Failed to generate presigned URL: %s", e)
        raise HTTPException(status_code=500, detail="Failed to generate presigned URL")

    # presigned URL 생성 성공 후: job 메타를 저장(pending)
    try:
        job_status.set_status(job_id, "pending", detail=s3_key)
    except Exception:
        logger.exception("Failed to persist job metadata")

    return PresignResponse(url=url, job_id=job_id, s3_key=s3_key, expires_in=expires)


@router.post("/notify_upload")
def notify_upload(req: NotifyRequest, _=Depends(require_api_key)):
    """
    notify_upload 엔드포인트 (POST /api/v1/docs/notify_upload)
    - 클라이언트가 presigned PUT을 완료한 뒤 호출하면 SQS에 메시지를 전송
    - 또는 S3 이벤트를 SQS로 직접 연결하면 클라이언트 notify를 생략할 수 있음
    """
    if not SQS_QUEUE_URL:
        logger.error("SQS_QUEUE_URL not configured")
        raise HTTPException(status_code=500, detail="SQS_QUEUE_URL not configured")

    body = {
        "job_id": req.job_id,
        "s3_bucket": S3_BUCKET,
        "s3_key": req.s3_key,
    }

    try:
        resp = sqs_client.send_message(QueueUrl=SQS_QUEUE_URL, MessageBody=str(body))
        return {"ok": True, "sqs_message_id": resp.get("MessageId")}
    except Exception as e:
        logger.exception("Failed to send SQS message: %s", e)
        raise HTTPException(status_code=500, detail="Failed to enqueue job")
