from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, List
from app.models.schemas import RawJobRecord, SourceHealthStatus, ScanQueryConfig


class BaseSourceAdapter(ABC):
    id: str = "base"
    name: str = "Base Source Adapter"
    is_restricted: bool = False
    compliance_note: str = ""

    @abstractmethod
    async def check_health(self) -> SourceHealthStatus:
        """Checks connectivity and honest authorization status for this portal."""
        pass

    @abstractmethod
    async def discover_jobs(self, query: ScanQueryConfig) -> List[RawJobRecord]:
        """Discovers candidate job listings matching the query parameters."""
        pass

    @abstractmethod
    async def parse_job_detail(self, url: str) -> Optional[RawJobRecord]:
        """Extracts structured fields from an individual job URL."""
        pass
