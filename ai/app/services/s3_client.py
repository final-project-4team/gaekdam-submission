# app/services/s3_client.py
"""
S3 헬퍼 (간단한 다운로드)
- download_to_temp(bucket, key) -> 임시파일 경로 반환
"""

import boto3
import tempfile
import os
from urllib.parse import urlparse
from typing import Tuple

AWS_REGION = os.environ.get("AWS_REGION", "ap-northeast-2")
_s3_client = boto3.client("s3", region_name=AWS_REGION)

def download_to_temp(bucket: str, key: str) -> str:
    """S3 객체를 임시파일로 다운로드 하고 로컬 경로를 반환."""
    tf = tempfile.NamedTemporaryFile(delete=False)
    temp_path = tf.name
    tf.close()
    _s3_client.download_file(bucket, key, temp_path)
    return temp_path

def parse_s3_uri(s3_uri: str) -> Tuple[str, str]:
    """s3://bucket/key -> (bucket, key)"""
    p = urlparse(s3_uri)
    if p.scheme != "s3":
        raise ValueError("Not an s3 uri")
    bucket = p.netloc
    key = p.path.lstrip("/")
    return bucket, key