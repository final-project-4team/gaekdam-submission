from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os


class Settings(BaseSettings):
    """
    공통 설정
    - 로컬: .env 사용
    - 운영(ECS): Secrets Manager / env 주입만 사용
    """

    # === 보안 / 인증 ===
    API_KEY: str = Field(..., env="API_KEY")               # 운영 필수
    INTERNAL_AI_KEY: str = Field("", env="INTERNAL_AI_KEY")

    # === CORS / 네트워크 ===
    ALLOWED_ORIGINS: str = Field(
        "http://localhost:3000,https://gaekdam.cloud", env="ALLOWED_ORIGINS"
    )
    INTERNAL_AI_BASE: str = Field(
        "https://gaekdam.cloud/api/v1", env="INTERNAL_AI_BASE"
    )

    # === 외부 API ===
    OPEN_API_KEY: str = Field(..., env="OPEN_API_KEY")     # 운영 필수
    OPEN_MODEL: str = Field("gpt-4o-mini", env="OPEN_MODEL")
    SERPAPI_API_KEY: str = Field("", env="SERPAPI_API_KEY")
    WEB_SEARCH_PROVIDER: str = Field("", env="WEB_SEARCH_PROVIDER")

    # === 실행 환경 ===
    DEBUG: bool = Field(False, env="DEBUG")

    # === 외부 저장소 / 인프라 설정 ===
    # 테스트/로컬/프로덕션에서 사용되는 S3/SQS, 로깅 및 업로드 관련 환경변수
    S3_BUCKET: str = Field("", env="S3_BUCKET")
    AWS_REGION: str = Field("", env="AWS_REGION")
    AWS_ACCESS_KEY_ID: str = Field("", env="AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: str = Field("", env="AWS_SECRET_ACCESS_KEY")
    SQS_QUEUE_URL: str = Field("", env="SQS_QUEUE_URL")

    # === 운영 / 인덱싱 관련 설정 ===
    LOG_LEVEL: str = Field("INFO", env="LOG_LEVEL")
    PRESIGN_EXPIRES: int = Field(600, env="PRESIGN_EXPIRES")
    MAX_UPLOAD_MB: int = Field(50, env="MAX_UPLOAD_MB")

    # === 프론트엔드 / 개발 편의 설정 ===
    VITE_API_AI: str = Field("https://gaekdam.cloud/api/v1", env="VITE_API_AI")

    # # === DB (현재 RAG-only runtime에서는 미사용) ===
    # DB_USER: str = Field("", env="DB_USER")
    # DB_PASS: str = Field("", env="DB_PASS")
    # DB_HOST: str = Field("127.0.0.1", env="DB_HOST")
    # DB_PORT: int = Field(3306, env="DB_PORT")
    # DB_NAME: str = Field("", env="DB_NAME")
    # DATABASE_URL: str = Field("", env="DATABASE_URL")

    class Config:
        # 로컬에서만 .env 허용
        env_file = ".env" if os.getenv("ENV", "local") == "local" else None
        env_file_encoding = "utf-8"

    # === Helper ===
    @property
    def allowed_origins_list(self) -> List[str]:
        return [
            o.strip()
            for o in (self.ALLOWED_ORIGINS or "").split(",")
            if o.strip()
        ]

    # @property
    # def database_url(self) -> str:
    #     if self.DATABASE_URL:
    #         return self.DATABASE_URL
    #     return (
    #         f"mysql+asyncmy://{self.DB_USER}:{self.DB_PASS}"
    #         f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    #     )


# 모듈 전역 설정 인스턴스
settings = Settings()
