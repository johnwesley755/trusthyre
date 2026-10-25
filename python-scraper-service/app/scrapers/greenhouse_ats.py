from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.scrapers.base import BaseSourceAdapter
from app.models.schemas import RawJobRecord, SourceHealthStatus, ScanQueryConfig
from app.utils.http_client import create_safe_async_client
from app.core.logger import logger


GREENHOUSE_FEEDS = [
    {
        "company": "Shadowfax",
        "feed_url": "https://boards-api.greenhouse.io/v1/boards/shadowfax/jobs",
        "industry": "Express Logistics & Last-Mile Delivery",
        "default_city": "Chennai",
    }
]


class GreenhouseATSAdapter(BaseSourceAdapter):
    id = "greenhouse_ats"
    name = "Greenhouse Logistics ATS Feeds"
    is_restricted = False
    compliance_note = (
        "Utilizes standard public Greenhouse job board endpoints. "
        "Strictly authorized for external discovery."
    )

    async def check_health(self) -> SourceHealthStatus:
        status_val = "ACTIVE"
        err_msg = None
        try:
            async with create_safe_async_client(timeout=5) as client:
                res = await client.get(GREENHOUSE_FEEDS[0]["feed_url"])
                if res.status_code != 200:
                    status_val = "DOWN"
                    err_msg = f"HTTP {res.status_code}"
        except Exception as e:
            status_val = "DOWN"
            err_msg = str(e)

        return SourceHealthStatus(
            source_id=self.id,
            name=self.name,
            status=status_val,
            is_restricted=False,
            compliance_note=self.compliance_note,
            last_checked_at=datetime.now(timezone.utc),
            error_message=err_msg,
        )

    async def discover_jobs(self, query: ScanQueryConfig) -> List[RawJobRecord]:
        results: List[RawJobRecord] = []
        limit = query.limit or 25
        target_city = (query.city or "").lower().strip()

        async with create_safe_async_client(timeout=10) as client:
            for feed in GREENHOUSE_FEEDS:
                if len(results) >= limit:
                    break
                try:
                    res = await client.get(feed["feed_url"])
                    if res.status_code != 200:
                        continue

                    data = res.json()
                    jobs_list: List[Dict[str, Any]] = data.get("jobs", [])
                    for j in jobs_list:
                        if len(results) >= limit:
                            break

                        title = j.get("title", "").strip()
                        if not title:
                            continue

                        loc = (j.get("location") or {}).get("name", "") or feed["default_city"]
                        if target_city and target_city not in loc.lower() and target_city != "all":
                            if "india" not in loc.lower() and "remote" not in loc.lower():
                                continue

                        apply_url = j.get("absolute_url") or ""
                        if not apply_url:
                            continue

                        # Parse real posting/update date if provided by Greenhouse
                        posting_date = None
                        updated_at_raw = j.get("updated_at")
                        if updated_at_raw:
                            try:
                                # ISO 8601 string from Greenhouse
                                posting_date = datetime.fromisoformat(updated_at_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                            except Exception:
                                posting_date = None

                        city_raw = loc.split(",")[0].strip() if loc else None

                        results.append(RawJobRecord(
                            title=title,
                            company_name=feed["company"],
                            city=city_raw or None,
                            location=loc or None,
                            category="Logistics & Operations",
                            industry=feed["industry"],
                            source_name=f"{feed['company']} Greenhouse ATS",
                            source_url=apply_url,
                            external_id=str(j.get("id")),
                            date_posted=posting_date,
                        ))
                except Exception as e:
                    logger.warning(f"[{self.id}] Feed error for {feed['company']}: {e}")

        logger.info(f"[{self.id}] Discovered {len(results)} candidate listings.")
        return results

    async def parse_job_detail(self, url: str) -> Optional[RawJobRecord]:
        return None
