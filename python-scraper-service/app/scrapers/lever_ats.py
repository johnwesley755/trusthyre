from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.scrapers.base import BaseSourceAdapter
from app.models.schemas import RawJobRecord, SourceHealthStatus, ScanQueryConfig
from app.utils.http_client import create_safe_async_client
from app.core.logger import logger


# Curated verified public ATS feeds with Indian operations & logistics
VERIFIED_FEEDS = [
    {
        "company": "Porter",
        "feed_url": "https://api.lever.co/v0/postings/porter?mode=json",
        "industry": "Logistics & Delivery",
        "default_city": "Chennai",
    },
    {
        "company": "Meesho",
        "feed_url": "https://api.lever.co/v0/postings/meesho?mode=json",
        "industry": "E-Commerce & Warehouse Operations",
        "default_city": "Bengaluru",
    },
]


class LeverATSAdapter(BaseSourceAdapter):
    id = "lever_ats"
    name = "Lever Enterprise ATS Feeds"
    is_restricted = False
    compliance_note = (
        "Reads public, unauthenticated ATS JSON endpoints provided by verified enterprise employers. "
        "No bot mitigation bypass or CAPTCHA circumvention involved."
    )

    async def check_health(self) -> SourceHealthStatus:
        err_msg = None
        status_val = "ACTIVE"
        try:
            async with create_safe_async_client(timeout=5) as client:
                res = await client.get(VERIFIED_FEEDS[0]["feed_url"], timeout=6.0)
                if res.status_code != 200:
                    status_val = "DOWN"
                    err_msg = f"HTTP {res.status_code} received from endpoint."
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
            for feed in VERIFIED_FEEDS:
                if len(results) >= limit:
                    break
                try:
                    res = await client.get(feed["feed_url"])
                    if res.status_code != 200:
                        continue

                    postings: List[Dict[str, Any]] = res.json()
                    for p in postings:
                        if len(results) >= limit:
                            break

                        title = p.get("text", "").strip()
                        if not title:
                            continue

                        cats = p.get("categories", {}) or {}
                        location_val = cats.get("location", "") or feed["default_city"]
                        team_val = cats.get("team", "") or feed["industry"]

                        # Check city filter if specified
                        if target_city and target_city not in location_val.lower() and target_city != "all":
                            # Allow if job is open pan-India or remote
                            if "remote" not in location_val.lower() and "india" not in location_val.lower():
                                continue

                        # Parse posting date
                        date_posted = None
                        created_at_ms = p.get("createdAt")
                        if created_at_ms:
                            try:
                                date_posted = datetime.fromtimestamp(created_at_ms / 1000.0)
                            except Exception:
                                pass

                        apply_url = p.get("applyUrl") or p.get("hostedUrl") or ""
                        if not apply_url:
                            continue

                        desc = p.get("descriptionPlain") or ""

                        city_val = location_val.split(",")[0].strip() if location_val else None

                        results.append(RawJobRecord(
                            title=title,
                            company_name=feed["company"],
                            city=city_val or None,
                            location=location_val or None,
                            category=team_val,
                            industry=feed["industry"],
                            description=desc[:1500] if desc else None,
                            source_name=f"{feed['company']} Lever ATS",
                            source_url=apply_url,
                            external_id=p.get("id"),
                            date_posted=date_posted,
                        ))
                except Exception as e:
                    logger.warning(f"[{self.id}] Feed error for {feed['company']}: {e}")

        logger.info(f"[{self.id}] Discovered {len(results)} candidate listings.")
        return results

    async def parse_job_detail(self, url: str) -> Optional[RawJobRecord]:
        return None
