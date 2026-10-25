from datetime import datetime, timezone
from typing import Optional, List
from app.scrapers.base import BaseSourceAdapter
from app.models.schemas import RawJobRecord, SourceHealthStatus, ScanQueryConfig
from app.utils.http_client import create_safe_async_client
from app.core.logger import logger


class ApnaAdapter(BaseSourceAdapter):
    id = "apna"
    name = "Apna.co Verified Gateway"
    is_restricted = True
    compliance_note = (
        "Direct web scraping of Apna listings is prohibited by Apna Terms of Service and Cloudflare WAF. "
        "Ingestion requires official Apna Recruiter / Enterprise API integration."
    )

    async def check_health(self) -> SourceHealthStatus:
        return SourceHealthStatus(
            source_id=self.id,
            name=self.name,
            status="PERMISSION_REQUIRED",
            is_restricted=True,
            compliance_note=self.compliance_note,
            last_checked_at=datetime.now(timezone.utc),
            error_message="Direct scraping blocked by Cloudflare WAF. Requires official Enterprise API integration.",
        )

    async def discover_jobs(self, query: ScanQueryConfig) -> List[RawJobRecord]:
        logger.info(f"[{self.id}] Automated scan skipped: portal is marked RESTRICTED.")
        return []

    async def parse_job_detail(self, url: str) -> Optional[RawJobRecord]:
        raise PermissionError(f"{self.name} blocks direct parsing. Use authorized partner feed.")
