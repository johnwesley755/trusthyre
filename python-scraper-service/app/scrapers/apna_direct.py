import asyncio
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup
import httpx
from app.scrapers.base import BaseSourceAdapter
from app.models.schemas import RawJobRecord, SourceHealthStatus, ScanQueryConfig
from app.extractors.vernacular_mapper import VernacularTradeMapper
from app.core.logger import logger

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ta;q=0.8,hi;q=0.7",
}


class ApnaDirectAdapter(BaseSourceAdapter):
    id = "apna"
    name = "Apna.co Direct (JSON-LD)"
    is_restricted = False
    compliance_note = (
        "Parses public Schema.org JobPosting JSON-LD published by Apna.co "
        "for search engine indexing. Free, zero-spend direct integration."
    )

    async def check_health(self) -> SourceHealthStatus:
        test_url = "https://apna.co/jobs/jobs-in-chennai"
        try:
            async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, timeout=8.0) as client:
                resp = await client.get(test_url)
                if resp.status_code == 200:
                    return SourceHealthStatus(
                        source_id=self.id,
                        name=self.name,
                        status="ACTIVE",
                        is_restricted=False,
                        compliance_note=self.compliance_note,
                        last_checked_at=datetime.now(timezone.utc),
                    )
                return SourceHealthStatus(
                    source_id=self.id,
                    name=self.name,
                    status="UNAVAILABLE",
                    is_restricted=False,
                    compliance_note=self.compliance_note,
                    last_checked_at=datetime.now(timezone.utc),
                    error_message=f"Apna returned HTTP {resp.status_code}",
                )
        except Exception as e:
            return SourceHealthStatus(
                source_id=self.id,
                name=self.name,
                status="DOWN",
                is_restricted=False,
                compliance_note=self.compliance_note,
                last_checked_at=datetime.now(timezone.utc),
                error_message=str(e),
            )

    async def discover_jobs(self, query: ScanQueryConfig) -> List[RawJobRecord]:
        city = (query.city or "Chennai").strip().lower()
        expanded_keywords = VernacularTradeMapper.expand_query(query.query)
        search_kw = expanded_keywords[0] if expanded_keywords else (query.query or "")
        limit = min(query.limit or 20, 25)

        target_url = f"https://apna.co/jobs/jobs-in-{city}"
        if search_kw:
            target_url += f"?search={search_kw}"

        logger.info(f"[{self.id}] Fetching Apna listings from {target_url}")

        job_urls: List[str] = []
        try:
            async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, timeout=12.0) as client:
                resp = await client.get(target_url)
                if resp.status_code != 200:
                    logger.warning(f"[{self.id}] Failed to load Apna listings: HTTP {resp.status_code}")
                    return []

                soup = BeautifulSoup(resp.text, "lxml")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if "/job/" in href:
                        full_url = href if href.startswith("http") else f"https://apna.co{href}"
                        if full_url not in job_urls:
                            job_urls.append(full_url)

                job_urls = job_urls[:limit]
                logger.info(f"[{self.id}] Found {len(job_urls)} job URLs on Apna.")

                sem = asyncio.Semaphore(4)

                async def _fetch_and_parse(u: str) -> Optional[RawJobRecord]:
                    async with sem:
                        try:
                            detail_resp = await client.get(u, timeout=10.0)
                            if detail_resp.status_code != 200:
                                return None
                            return self._parse_detail_html(detail_resp.text, u, query.city or "Chennai")
                        except Exception as parse_ex:
                            logger.debug(f"[{self.id}] Error fetching {u}: {parse_ex}")
                            return None

                results = await asyncio.gather(*[_fetch_and_parse(u) for u in job_urls])
                records = [r for r in results if r is not None]
                logger.info(f"[{self.id}] Successfully extracted {len(records)} jobs from Apna.")
                return records

        except Exception as ex:
            logger.error(f"[{self.id}] Discovery failed: {ex}")
            return []

    def _parse_detail_html(self, html: str, url: str, default_city: str) -> Optional[RawJobRecord]:
        soup = BeautifulSoup(html, "lxml")

        # 1. Parse Schema.org JobPosting
        for s in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(s.string)
                if isinstance(data, dict) and data.get("@type") == "JobPosting":
                    title = data.get("title")
                    hiring_org = data.get("hiringOrganization", {})
                    company = hiring_org.get("name") if isinstance(hiring_org, dict) else str(hiring_org)

                    if not title or not company:
                        continue

                    # Location
                    loc_obj = data.get("jobLocation", {})
                    loc_str = default_city
                    if isinstance(loc_obj, dict):
                        addr = loc_obj.get("address", {})
                        if isinstance(addr, dict):
                            locality = addr.get("addressLocality")
                            region = addr.get("addressRegion")
                            loc_str = locality or region or default_city

                    # Salary
                    base_sal = data.get("baseSalary", {})
                    s_min, s_max = None, None
                    if isinstance(base_sal, dict):
                        val = base_sal.get("value", {})
                        if isinstance(val, dict):
                            s_min = float(val["minValue"]) if val.get("minValue") is not None else None
                            s_max = float(val["maxValue"]) if val.get("maxValue") is not None else None

                    # Date Posted
                    date_posted = None
                    dp_raw = data.get("datePosted")
                    if dp_raw:
                        try:
                            date_posted = datetime.fromisoformat(dp_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                        except Exception:
                            date_posted = None

                    category = VernacularTradeMapper.get_category_for_trade(title)
                    desc = data.get("description", "")[:2000]

                    return RawJobRecord(
                        title=title.strip(),
                        company_name=company.strip(),
                        city=default_city,
                        location=loc_str,
                        category=category,
                        description=desc,
                        salary_min=s_min,
                        salary_max=s_max,
                        salary_period="MONTHLY",
                        salary_currency="INR",
                        source_name=self.name,
                        source_url=url,
                        date_posted=date_posted,
                    )
            except Exception:
                continue

        return None

    async def parse_job_detail(self, url: str) -> Optional[RawJobRecord]:
        try:
            async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return self._parse_detail_html(res.text, url, "Chennai")
        except Exception:
            pass
        return None
