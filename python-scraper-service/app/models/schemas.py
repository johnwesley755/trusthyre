from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, HttpUrl, ConfigDict


class AlternateSourceRecord(BaseModel):
    sourceName: str
    sourceUrl: str
    dateSeen: str


class RawJobRecord(BaseModel):
    title: str = Field(..., min_length=2)
    company_name: str = Field(..., min_length=2)
    company_website: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_period: Optional[str] = "MONTHLY"
    salary_currency: Optional[str] = "INR"
    experience_years: Optional[int] = 0
    source_name: str
    source_url: str
    external_id: Optional[str] = None
    date_posted: Optional[datetime] = None


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    employer_name: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    budget: Optional[float] = None
    status: str
    is_external: bool
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_hash: Optional[str] = None
    external_id: Optional[str] = None
    alternate_sources: Optional[List[Dict[str, Any]]] = None
    date_posted: Optional[datetime] = None
    last_verified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class ScanQueryConfig(BaseModel):
    query: Optional[str] = None
    city: Optional[str] = "Chennai"
    category: Optional[str] = None
    sources: Optional[List[str]] = None
    limit: Optional[int] = Field(25, ge=1, le=100)


class SourceHealthStatus(BaseModel):
    source_id: str
    id: Optional[str] = None
    name: str
    status: str  # ACTIVE, SUPPORTED, TESTING, PERMISSION_REQUIRED, AUTH_REQUIRED, RATE_LIMITED, NO_RESULTS, UNAVAILABLE, DOWN, FAILED
    is_restricted: bool
    compliance_note: str
    last_checked_at: datetime
    error_message: Optional[str] = None

    def __init__(self, **data: Any):
        if "source_id" in data and "id" not in data:
            data["id"] = data["source_id"]
        elif "id" in data and "source_id" not in data:
            data["source_id"] = data["id"]
        super().__init__(**data)


class ScanSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    total_found: int
    valid_count: int
    duplicate_count: int
    rejected_count: int
    error_count: int
    sources_scanned: List[str]
    source_stats: Dict[str, Any]
    started_at: datetime
    completed_at: Optional[datetime] = None


class JobModerationRequest(BaseModel):
    reason: Optional[str] = "Admin review moderation"
