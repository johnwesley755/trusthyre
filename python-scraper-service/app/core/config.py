import os
from typing import Optional
from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Inter-Service Authentication
    INTERNAL_SERVICE_SECRET: SecretStr = SecretStr("trusthyre-secure-internal-scraper-key-2026")

    # External Provider API Keys
    HEADCOUNTLABS_API_KEY: Optional[SecretStr] = None

    # PostgreSQL Database URL
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/trusthire"

    # Scraping & Crawler Controls
    MAX_CONCURRENT_REQUESTS_PER_SOURCE: int = 3
    REQUEST_TIMEOUT_SECONDS: int = 12
    CRAWL_MAX_DEPTH: int = 2
    DEFAULT_SCAN_LIMIT: int = 25
    DEFAULT_TARGET_CITY: str = "Chennai"

    # User-Agent for compliant crawling
    USER_AGENT: str = "TrustHyre-JobScraper/2.0 (+https://trusthyre.com/bot; compliance@trusthyre.com)"

    @field_validator("INTERNAL_SERVICE_SECRET")
    @classmethod
    def validate_secret(cls, v: SecretStr, info) -> SecretStr:
        # In non-dev environments, reject default dev secret
        val = v.get_secret_value()
        if os.getenv("ENVIRONMENT") in ["production", "staging"] and (not val or "dev" in val.lower()):
            raise ValueError("A secure, non-default INTERNAL_SERVICE_SECRET must be set in production/staging.")
        return v

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def format_database_url(cls, v: Optional[str]) -> str:
        if not v:
            return "postgresql+asyncpg://postgres:postgres@localhost:5432/trusthire"
        # If passed as standard postgresql://, convert to postgresql+asyncpg:// for SQLAlchemy async engine
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


settings = Settings()
