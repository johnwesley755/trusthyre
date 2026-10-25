import uuid
from datetime import datetime, timezone
from typing import Optional, List, Any
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    Numeric,
    JSON,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utc_now() -> datetime:
    """Returns a naive UTC datetime compatible with PostgreSQL TIMESTAMP WITHOUT TIME ZONE in asyncpg."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employer_id = Column(String(255), nullable=False, default="external_aggregator")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    industry = Column(String(100), nullable=True)
    experience_years_required = Column(Integer, nullable=True, default=0)
    budget = Column(Numeric(10, 2), nullable=True)
    status = Column(String(50), nullable=False, default="OPEN")
    location = Column(String(255), nullable=True)
    city = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    employer_name = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    is_external = Column(Boolean, default=True)
    source_name = Column(String(100), nullable=True)
    source_url = Column(Text, nullable=True)
    source_hash = Column(String(64), nullable=True, index=True)
    external_id = Column(String(255), nullable=True)
    alternate_sources = Column(JSONB, nullable=True, default=list)
    date_posted = Column(DateTime, nullable=True)
    last_verified_at = Column(DateTime, default=utc_now)

    __table_args__ = (
        Index("idx_jobs_source_hash_lookup", "source_hash"),
        Index("idx_jobs_external_status_lookup", "is_external", "status"),
        Index("idx_jobs_source_external_id_lookup", "source_name", "external_id"),
    )


class ScraperScan(Base):
    __tablename__ = "scraper_scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String(50), nullable=False, default="RUNNING")  # RUNNING, COMPLETED, FAILED, CANCELLED
    sources_scanned = Column(JSONB, nullable=False, default=list)
    query_params = Column(JSONB, nullable=False, default=dict)
    total_found = Column(Integer, default=0)
    valid_count = Column(Integer, default=0)
    duplicate_count = Column(Integer, default=0)
    rejected_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    source_stats = Column(JSONB, nullable=False, default=dict)
    started_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)

    logs = relationship("ScraperScanLog", back_populates="scan", cascade="all, delete-orphan")


class ScraperScanLog(Base):
    __tablename__ = "scraper_scan_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scraper_scans.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(String(100), nullable=False)
    level = Column(String(20), nullable=False, default="INFO")
    message = Column(Text, nullable=False)
    raw_payload = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    scan = relationship("ScraperScan", back_populates="logs")
