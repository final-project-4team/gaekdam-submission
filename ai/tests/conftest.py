import sys, os
# 프로젝트 루트를 PYTHONPATH에 추가
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# 테스트/CI에서 필요한 기본 환경변수 설정
# pytest가 conftest.py를 먼저 로드하니까 여기서 기본값을 넣어 import-time validation 에러를 방지합니다.
os.environ.setdefault("API_KEY", "testkey")
os.environ.setdefault("OPEN_API_KEY", "test-open")
os.environ.setdefault("S3_BUCKET", "test-bucket")
os.environ.setdefault("SQS_QUEUE_URL", "https://example.com/queue")
os.environ.setdefault("AWS_REGION", "ap-northeast-2")