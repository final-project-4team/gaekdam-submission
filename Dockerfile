# ------------------------------------------------------------
# micromamba 기반 베이스 이미지
# - 가볍고 빠른 conda 환경 구성용
# - OS는 Linux (호스트 OS: Mac/Windows와 무관)
# ------------------------------------------------------------
FROM mambaorg/micromamba:1.5.8


# ------------------------------------------------------------
# root 권한으로 시스템 패키지 설치
# ------------------------------------------------------------
USER root

# ------------------------------------------------------------
# OS 레벨 의존성 설치
# - tesseract-ocr    : OCR 기능 사용 시 필요
# - poppler-utils    : PDF → 텍스트 변환 등 문서 처리용
# - curl             : 네트워크 테스트 및 유틸
# - 설치 후 apt 캐시 제거로 이미지 사이즈 최소화
# ------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*


# ------------------------------------------------------------
# 컨테이너 내부 작업 디렉토리 설정
# 모든 이후 작업은 /app 기준으로 수행
# ------------------------------------------------------------
WORKDIR /app


# ------------------------------------------------------------
# Python 패키지 의존성 파일 먼저 복사
# → Docker 레이어 캐시 활용 (requirements가 안 바뀌면 재빌드 빠름)
# ------------------------------------------------------------
COPY requirements.txt /app/requirements.txt


# ------------------------------------------------------------
# conda 기반 핵심 런타임 설치
# - python 3.11
# - pytorch (CPU 전용)
# - faiss-cpu : 벡터 검색(RAG)용
# - mkl / llvm-openmp : 수치 연산 성능 및 스레딩 안정성
# ------------------------------------------------------------
RUN micromamba install -y -n base -c pytorch -c conda-forge \
    python=3.11 \
    pytorch=2.2.* \
    cpuonly \
    faiss-cpu \
    mkl \
    llvm-openmp \
    && micromamba clean -a


# ------------------------------------------------------------
# pip 기반 Python 라이브러리 설치
# - micromamba run 으로 conda env(base) 확실히 사용
# - --no-cache-dir 로 이미지 용량 최소화
# ------------------------------------------------------------
RUN micromamba run -n base pip install --no-cache-dir -r /app/requirements.txt


# ------------------------------------------------------------
# 실제 애플리케이션 소스 코드 복사
# (FastAPI, 서비스 로직, 설정 파일 등)
# ------------------------------------------------------------
COPY . /app


# ------------------------------------------------------------
# HuggingFace / SentenceTransformer 캐시 경로 고정
# - 모델 파일을 컨테이너 내부에 안정적으로 저장
# - 런타임 중 네트워크 의존성 제거 목적
# ------------------------------------------------------------
ENV PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.hf \
    TRANSFORMERS_CACHE=/app/.hf/transformers \
    SENTENCE_TRANSFORMERS_HOME=/app/.hf/sentence-transformers


# ------------------------------------------------------------
# 모델 캐시 디렉토리 사전 생성
# - 일부 환경에서 자동 생성 실패/권한 문제 방지
# ------------------------------------------------------------
RUN mkdir -p /app/.hf/transformers /app/.hf/sentence-transformers


# ------------------------------------------------------------
# SentenceTransformer 모델을 빌드 시점에 미리 다운로드
# - 런타임 시 HuggingFace 접속 불필요
# - 동료 PC / 회사망 환경에서도 동일하게 동작하도록 보장
# ------------------------------------------------------------
RUN micromamba run -n base python - <<'PY'
from sentence_transformers import SentenceTransformer
SentenceTransformer("all-MiniLM-L6-v2")
print("Model cached OK")
PY


# ------------------------------------------------------------
# 컨테이너 외부에 노출할 포트
# (FastAPI 서버가 사용하는 포트)
# ------------------------------------------------------------
EXPOSE 9000


# ------------------------------------------------------------
# 컨테이너 실행 시 FastAPI 서버 시작
# - uvicorn 사용
# - 0.0.0.0 : 외부 접근 허용
# ------------------------------------------------------------
CMD ["micromamba", "run", "-n", "base", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
