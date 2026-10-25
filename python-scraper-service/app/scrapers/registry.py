from typing import List, Optional, Dict
from app.scrapers.base import BaseSourceAdapter
from app.scrapers.jobspy_adapter import JobSpyNaukriAdapter, JobSpyIndeedAdapter
from app.scrapers.workindia_direct import WorkIndiaDirectAdapter
from app.scrapers.apna_direct import ApnaDirectAdapter
from app.scrapers.headcount_labs import HeadcountLabsAdapter
from app.scrapers.lever_ats import LeverATSAdapter
from app.scrapers.greenhouse_ats import GreenhouseATSAdapter
from app.scrapers.schema_org import SchemaOrgAdapter
from app.scrapers.workindia import WorkIndiaAdapter
from app.scrapers.apna import ApnaAdapter
from app.scrapers.naukri import NaukriAdapter
from app.models.schemas import SourceHealthStatus


class SourceAdapterRegistry:
    _adapters: Dict[str, BaseSourceAdapter] = {}

    @classmethod
    def initialize(cls):
        adapters = [
            JobSpyNaukriAdapter(),
            JobSpyIndeedAdapter(),
            WorkIndiaDirectAdapter(),
            ApnaDirectAdapter(),
            HeadcountLabsAdapter(),
            LeverATSAdapter(),
            GreenhouseATSAdapter(),
            SchemaOrgAdapter(),
        ]
        cls._adapters = {a.id: a for a in adapters}
        # Provide backward-compatibility aliases
        cls._adapters["naukri"] = cls._adapters["jobspy_naukri"]
        cls._adapters["indeed"] = cls._adapters["jobspy_indeed"]
        cls._adapters["workindia_direct"] = cls._adapters["workindia"]
        cls._adapters["apna_direct"] = cls._adapters["apna"]

    @classmethod
    def get_adapter(cls, source_id: str) -> Optional[BaseSourceAdapter]:
        if not cls._adapters:
            cls.initialize()
        return cls._adapters.get(source_id)

    @classmethod
    def list_adapters(cls) -> List[BaseSourceAdapter]:
        if not cls._adapters:
            cls.initialize()
        return list({a.id: a for a in cls._adapters.values()}.values())

    @classmethod
    async def get_all_health(cls) -> List[SourceHealthStatus]:
        import asyncio
        from datetime import datetime, timezone

        adapters = cls.list_adapters()

        async def safe_check(a: BaseSourceAdapter) -> SourceHealthStatus:
            try:
                return await asyncio.wait_for(a.check_health(), timeout=3.0)
            except Exception as e:
                return SourceHealthStatus(
                    source_id=a.id,
                    name=a.name,
                    status="RESTRICTED" if a.is_restricted else "DOWN",
                    is_restricted=a.is_restricted,
                    compliance_note=a.compliance_note,
                    last_checked_at=datetime.now(timezone.utc),
                    error_message=str(e),
                )

        return await asyncio.gather(*(safe_check(a) for a in adapters))
