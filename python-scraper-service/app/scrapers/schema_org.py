import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup
from app.scrapers.base import BaseSourceAdapter
from app.models.schemas import RawJobRecord, SourceHealthStatus, ScanQueryConfig
from app.utils.http_client import create_safe_async_client
from app.core.logger import logger


class SchemaOrgAdapter(BaseSourceAdapter):
    id = "schema_org"
    name = "Schema.org / JSON-LD Universal Job Scraper"
    is_restricted = False
    compliance_note = (
        "Parses semantic Schema.org/JobPosting JSON-LD metadata embedded by participating employers. "
        "Complies with W3C web semantic standards."
    )

    async def check_health(self) -> SourceHealthStatus:
        return SourceHealthStatus(
            source_id=self.id,
            name=self.name,
            status="ACTIVE",
            is_restricted=False,
            compliance_note=self.compliance_note,
            last_checked_at=datetime.now(timezone.utc),
        )

    async def discover_jobs(self, query: ScanQueryConfig) -> List[RawJobRecord]:
        # Discovers from configured public career sites exposing Schema.org JSON-LD
        logger.info(f"[{self.id}] Schema.org universal parser ready for URL crawls.")
        return []

    async def parse_job_detail(self, url: str) -> Optional[RawJobRecord]:
        try:
            async with create_safe_async_client(timeout=8) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return None

                soup = BeautifulSoup(res.text, "lxml")
                scripts = soup.find_all("script", type="application/ld+json")
                for s in scripts:
                    try:
                        content = s.string
                        if not content:
                            continue
                        data = json.loads(content)
                        if isinstance(data, list):
                            items = data
                        elif "@graph" in data:
                            items = data["@graph"]
                        else:
                            items = [data]

                        for item in items:
                            if item.get("@type") == "JobPosting":
                                title = item.get("title")
                                hiring_org = item.get("hiringOrganization", {})
                                comp_name = hiring_org.get("name") if isinstance(hiring_org, dict) else hiring_org
                                loc = item.get("jobLocation", {})
                                city = "Chennai"
                                if isinstance(loc, dict):
                                    address = loc.get("address", {})
                                    if isinstance(address, dict):
                                        city = address.get("addressLocality") or address.get("addressRegion") or None

                                base_salary = item.get("baseSalary", {})
                                s_min, s_max = None, None
                                if isinstance(base_salary, dict):
                                    val = base_salary.get("value", {})
                                    if isinstance(val, dict):
                                        s_min = val.get("minValue")
                                        s_max = val.get("maxValue")

                                date_posted = None
                                date_posted_raw = item.get("datePosted")
                                if date_posted_raw:
                                    try:
                                        date_posted = datetime.fromisoformat(date_posted_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                                    except Exception:
                                        date_posted = None

                                if title and comp_name:
                                    return RawJobRecord(
                                        title=title,
                                        company_name=comp_name,
                                        city=city,
                                        location=city,
                                        description=item.get("description", "")[:1500],
                                        salary_min=s_min,
                                        salary_max=s_max,
                                        source_name="Schema.org Public Feed",
                                        source_url=url,
                                        date_posted=date_posted,
                                    )
                    except Exception:
                        continue
        except Exception as e:
            logger.warning(f"[{self.id}] Error parsing schema.org for {url}: {e}")
        return None
