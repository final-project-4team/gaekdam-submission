from fastapi import FastAPI, Request, HTTPException, status
from app.api.v1 import chat, ingest, health, docs, backend_presign
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import chat, ingest, health
from app.config import settings
from fastapi.responses import JSONResponse
import logging
import os

# === 실행 환경 ===
ENV = os.getenv("ENV", "local")

# === 로깅 설정 ===
level_name = os.getenv("LOG_LEVEL", "INFO").upper()
level = getattr(logging, level_name, logging.INFO)
logging.basicConfig(
    level=level,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logging.getLogger("uvicorn").setLevel(level)
logging.getLogger("uvicorn.error").setLevel(level)
logging.getLogger("uvicorn.access").setLevel(level)

# === FastAPI 앱 ===
app = FastAPI(title="gaekdam-ai-bot")

# === CORS ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === API Key 인증 ===
API_KEY = settings.API_KEY


@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    # CORS preflight 허용
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path

    # 인증 예외 경로
    if (
        path.startswith("/api/v1/health")
        or path.startswith("/docs")
        or path.startswith("/openapi.json")
        or path.startswith("/redoc")
    ):
        return await call_next(request)

    # 브라우저 요청은 Origin 기준 통과 (운영 정석)
    origin = request.headers.get("origin")
    if origin in settings.allowed_origins_list:
        return await call_next(request)

    # API_KEY 미설정 (운영)
    if not API_KEY:
        return JSONResponse(
            status_code=500,
            content={"detail": "API_KEY not configured"},
        )

    # 헤더에서 키 추출
    key = request.headers.get("x-api-key") or request.headers.get("authorization")
    if key:
        key = key.strip()
        if key.lower().startswith("bearer "):
            key = key.split(None, 1)[1].strip()

    if not key or key != API_KEY:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or missing API Key"},
        )

    return await call_next(request)


# === Router ===
app.include_router(health.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(ingest.router, prefix="/api/v1")
app.include_router(docs.router)
# backend_presign.py exposes /api/v1/docs/presign and /api/v1/docs/notify_upload
app.include_router(backend_presign.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "gaekdam-ai-bot"}
