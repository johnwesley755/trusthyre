import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from app.scrapers.base import BaseSourceAdapter
from app.models.schemas import RawJobRecord, SourceHealthStatus, ScanQueryConfig
from app.core.config import settings
from app.utils.http_client import create_safe_async_client
from app.core.logger import logger


def _extract_val(field: Any) -> Optional[str]:
    """Helper to safely extract string values from Headcount Labs objects or direct primitives."""
    if isinstance(field, dict):
        val = field.get("value")
        return str(val).strip() if val is not None else None
    if isinstance(field, str):
        return field.strip() if field.strip() else None
    return None


class HeadcountLabsAdapter(BaseSourceAdapter):
    id: str = "headcount_labs"
    name: str = "Headcount Labs Jobs API"
    is_restricted: bool = False
    compliance_note: str = (
        "Official developer API indexing multi-ATS enterprise job postings (Greenhouse, Lever, "
        "Workday, iCIMS). Programmatic access governed by Headcount Labs developer keys."
    )

    @property
    def api_key(self) -> Optional[str]:
        if settings.HEADCOUNTLABS_API_KEY:
            if hasattr(settings.HEADCOUNTLABS_API_KEY, "get_secret_value"):
                return settings.HEADCOUNTLABS_API_KEY.get_secret_value()
            return str(settings.HEADCOUNTLABS_API_KEY)
        return None

    async def check_health(self) -> SourceHealthStatus:
        key = self.api_key
        if not key:
            return SourceHealthStatus(
                source_id=self.id,
                name=self.name,
                status="AUTH_REQUIRED",
                is_restricted=False,
                compliance_note=self.compliance_note,
                last_checked_at=datetime.now(timezone.utc),
                error_message="HEADCOUNTLABS_API_KEY environment variable is not configured.",
            )

        status_val = "ACTIVE"
        err_msg = None
        try:
            async with create_safe_async_client(timeout=10) as client:
                res = await client.get(
                    "https://api.headcountlabs.com/v1/jobs",
                    params={"limit": 1, "country": "IN"},
                    headers={"Authorization": f"Bearer {key}"},
                )
                if res.status_code == 401 or res.status_code == 403:
                    status_val = "AUTH_REQUIRED"
                    err_msg = "Invalid or expired Headcount Labs API key."
                elif res.status_code == 429:
                    status_val = "RATE_LIMITED"
                    err_msg = "Rate limit reached on Headcount Labs API."
                elif res.status_code != 200:
                    status_val = "DOWN"
                    err_msg = f"Headcount Labs API returned HTTP {res.status_code}"
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
        key = self.api_key
        if not key:
            logger.info(f"[{self.id}] Discovery skipped: HEADCOUNTLABS_API_KEY not configured.")
            return []

        results: List[RawJobRecord] = []
        limit = min(query.limit or 25, 50)
        params: Dict[str, Any] = {
            "country": "IN",
            "currentness": "current",
            "limit": limit,
        }
        if query.city and query.city.lower() != "all":
            params["city"] = query.city
        if query.query:
            params["q"] = query.query

        try:
            async with create_safe_async_client(timeout=25) as client:
                res = await client.get(
                    "https://api.headcountlabs.com/v1/jobs",
                    params=params,
                    headers={"Authorization": f"Bearer {key}"},
                )

                # If specific city query timed out or returned error, fallback to country broad feed
                if res.status_code != 200 and params.get("city"):
                    logger.warning(
                        f"[{self.id}] Targeted city query returned HTTP {res.status_code}. Retrying with broader country feed..."
                    )
                    fallback_params: Dict[str, Any] = {
                        "country": "IN",
                        "currentness": "current",
                        "limit": max(limit * 2, 50),
                    }
                    if query.query:
                        fallback_params["q"] = query.query
                    res = await client.get(
                        "https://api.headcountlabs.com/v1/jobs",
                        params=fallback_params,
                        headers={"Authorization": f"Bearer {key}"},
                    )

                if res.status_code != 200:
                    logger.warning(f"[{self.id}] Request failed with HTTP {res.status_code}: {res.text[:200]}")
                    return []

                data = res.json()
                items = data.get("jobs") or data.get("data") or (data if isinstance(data, list) else [])
                for item in items:
                    # 1. Title Extraction
                    title = _extract_val(item.get("title")) or item.get("job_title") or ""

                    # 2. Company / Employer Extraction
                    comp = (
                        _extract_val(item.get("employer_name"))
                        or _extract_val(item.get("company_name"))
                        or _extract_val(item.get("company"))
                        or ""
                    )

                    # 3. Postings & URL Extraction
                    postings = item.get("postings") or []
                    apply_url = ""
                    source_posted_at = None
                    sal_min, sal_max = None, None

                    if postings and isinstance(postings, list):
                        p0 = postings[0]
                        apply_url = (
                            _extract_val(p0.get("application_url"))
                            or _extract_val(p0.get("posting_url"))
                            or ""
                        )
                        source_posted_at = p0.get("source_posted_at") or p0.get("first_seen_at")

                        pay = p0.get("pay") or {}
                        pay_val = pay.get("value") if isinstance(pay, dict) else pay
                        if isinstance(pay_val, dict):
                            sal_min = pay_val.get("min") or pay_val.get("minimum")
                            sal_max = pay_val.get("max") or pay_val.get("maximum")

                    if not apply_url:
                        apply_url = (
                            _extract_val(item.get("url"))
                            or _extract_val(item.get("apply_url"))
                            or _extract_val(item.get("job_url"))
                            or ""
                        )

                    if not title or not comp or not apply_url:
                        continue

                    # 4. Location Extraction
                    city_extracted = None
                    location_val = None

                    locations = item.get("locations") or []
                    if locations and isinstance(locations, list):
                        for loc in locations:
                            loc_data = loc.get("value") if isinstance(loc, dict) else loc
                            if isinstance(loc_data, dict):
                                c = loc_data.get("city")
                                reg = loc_data.get("region")
                                st = loc_data.get("street")
                                parts = [p for p in (st, c, reg) if p]
                                if c and not city_extracted:
                                    city_extracted = c
                                if parts and not location_val:
                                    location_val = ", ".join(parts)

                    if not location_val:
                        if postings and isinstance(postings, list):
                            ploc = postings[0].get("location")
                            ploc_val = ploc.get("value") if isinstance(ploc, dict) else ploc
                            if isinstance(ploc_val, dict):
                                city_extracted = city_extracted or ploc_val.get("city")
                                location_val = ploc_val.get("streetAddress") or ploc_val.get("city")

                    if not location_val and not city_extracted:
                        location_val = _extract_val(item.get("location")) or _extract_val(item.get("city"))
                        city_extracted = location_val.split(",")[0].strip() if location_val else None

                    # Filter for city if target specified
                    if query.city and query.city.lower() != "all":
                        matched_city = False
                        target = query.city.lower()
                        if city_extracted and target in city_extracted.lower():
                            matched_city = True
                        elif location_val and target in location_val.lower():
                            matched_city = True

                        if not matched_city:
                            continue

                    # 5. Date Posted
                    date_posted = None
                    raw_date = (
                        source_posted_at
                        or item.get("job_first_seen_at")
                        or item.get("posted_at")
                        or item.get("first_fetch_time")
                        or item.get("date_posted")
                    )
                    if raw_date:
                        try:
                            date_posted = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00")).replace(tzinfo=None)
                        except Exception:
                            date_posted = None

                    desc = _extract_val(item.get("description")) or item.get("description") or ""

                    results.append(RawJobRecord(
                        title=title.strip(),
                        company_name=comp.strip(),
                        city=city_extracted,
                        location=location_val or city_extracted,
                        category=item.get("category") or "Operations & Logistics",
                        industry=item.get("industry") or "Supply Chain & Services",
                        description=desc[:1500] if desc else None,
                        salary_min=sal_min or item.get("salary_min"),
                        salary_max=sal_max or item.get("salary_max"),
                        source_name="Headcount Labs Jobs API",
                        source_url=apply_url,
                        external_id=str(item.get("job_id") or item.get("id") or ""),
                        date_posted=date_posted,
                    ))
        except Exception as e:
            logger.error(f"[{self.id}] Discovery exception: {e}")

        logger.info(f"[{self.id}] Discovered {len(results)} candidate listings.")
        return results

    async def parse_job_detail(self, url: str) -> Optional[RawJobRecord]:
        return None
