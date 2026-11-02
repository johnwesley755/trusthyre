import asyncio
import json
import re
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bs4 import BeautifulSoup
import httpx
from app.scrapers.base import BaseSourceAdapter
from app.models.schemas import RawJobRecord, SourceHealthStatus, ScanQueryConfig
from app.extractors.vernacular_mapper import VernacularTradeMapper
from app.scrapers.jd_synthesizer import synthesize_rich_jd, clean_html_to_text
from app.core.logger import logger

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ta;q=0.8,hi;q=0.7",
}


class WorkIndiaDirectAdapter(BaseSourceAdapter):
    id = "workindia"
    name = "WorkIndia Direct (JSON-LD & Full JD)"
    is_restricted = False
    compliance_note = (
        "Parses public Schema.org ItemList and JobPosting JSON-LD feeds with deep detail hydration "
        "published by WorkIndia. Zero API tokens or paid proxies required."
    )

    async def check_health(self) -> SourceHealthStatus:
        test_url = "https://www.workindia.in/jobs-in-chennai/"
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
                    error_message=f"WorkIndia returned HTTP {resp.status_code}",
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

        target_url = f"https://www.workindia.in/jobs-in-{city}/"
        if search_kw:
            target_url += f"?search={search_kw}"

        logger.info(f"[{self.id}] Fetching WorkIndia listings from {target_url}")

        job_urls: List[str] = []
        try:
            async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, timeout=12.0) as client:
                resp = await client.get(target_url)
                if resp.status_code != 200:
                    logger.warning(f"[{self.id}] Failed to load listings page: HTTP {resp.status_code}")
                    return []

                soup = BeautifulSoup(resp.text, "lxml")
                # 1. Check Schema.org ItemList JSON-LD
                for s in soup.find_all("script", type="application/ld+json"):
                    try:
                        data = json.loads(s.string)
                        if isinstance(data, dict) and data.get("@type") == "ItemList":
                            for item in data.get("itemListElement", []):
                                u = item.get("url")
                                if u and u not in job_urls:
                                    job_urls.append(u)
                    except Exception:
                        continue

                # 2. Fallback to HTML anchor tags matching /jobs/
                if not job_urls:
                    for a in soup.find_all("a", href=True):
                        href = a["href"]
                        if "/jobs/" in href and href.rstrip("/") != f"https://www.workindia.in/jobs-in-{city}":
                            full_url = href if href.startswith("http") else f"https://www.workindia.in{href}"
                            if full_url not in job_urls:
                                job_urls.append(full_url)

                job_urls = job_urls[:limit]
                logger.info(f"[{self.id}] Discovered {len(job_urls)} job URLs on WorkIndia. Hydrating complete JDs...")

                # 3. Concurrently parse details with semaphore
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
                logger.info(f"[{self.id}] Successfully hydrated {len(records)} full JDs from WorkIndia.")
                return records

        except Exception as ex:
            logger.error(f"[{self.id}] Discovery failed: {ex}")
            return []

    def _parse_detail_html(self, html_doc: str, url: str, default_city: str) -> Optional[RawJobRecord]:
        soup = BeautifulSoup(html_doc, "lxml")

        title = None
        company = None
        loc_str = default_city
        s_min, s_max = None, None
        s_raw = None
        date_posted = None
        raw_desc = ""
        extra_specs: Dict[str, Any] = {}
        requirements: List[str] = []
        shifts_text = ""
        contact_info = ""

        # 1. Parse Schema.org JobPosting
        for s in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(s.string)
                if isinstance(data, dict) and data.get("@type") == "JobPosting":
                    title = data.get("title")
                    hiring_org = data.get("hiringOrganization", {})
                    company = hiring_org.get("name") if isinstance(hiring_org, dict) else str(hiring_org)

                    # Location
                    loc_obj = data.get("jobLocation", {})
                    if isinstance(loc_obj, dict):
                        addr = loc_obj.get("address", {})
                        if isinstance(addr, dict):
                            locality = addr.get("addressLocality")
                            region = addr.get("addressRegion")
                            loc_str = locality or region or default_city

                    # Salary
                    base_sal = data.get("baseSalary", {})
                    if isinstance(base_sal, dict):
                        val = base_sal.get("value", {})
                        if isinstance(val, dict):
                            s_min = float(val["minValue"]) if val.get("minValue") is not None else None
                            s_max = float(val["maxValue"]) if val.get("maxValue") is not None else None

                    dp_raw = data.get("datePosted")
                    if dp_raw:
                        try:
                            date_posted = datetime.fromisoformat(dp_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                        except Exception:
                            date_posted = None

                    raw_desc = data.get("description", "")
                    break
            except Exception:
                continue

        # 2. Extract Key Specifications from WorkIndia UI Table/Grid
        for row in soup.select("div[class*='JobDetail'], div[class*='specItem'], table tr, div[class*='detail-row']"):
            row_text = row.get_text(separator=' ', strip=True)
            if ":" in row_text:
                parts = row_text.split(":", 1)
                k = parts[0].strip()
                v = parts[1].strip()
                if len(k) < 30 and len(v) < 150:
                    if any(term in k.lower() for term in ["education", "experience", "gender", "english", "skills"]):
                        extra_specs[k] = v
                    elif any(term in k.lower() for term in ["timing", "shift", "work hour"]):
                        shifts_text = f"{k}: {v}"
                    elif any(term in k.lower() for term in ["address", "interview", "contact"]):
                        contact_info = f"{k}: {v}"

        # 3. DOM Fallbacks for Title & Description
        if not title:
            h1 = soup.find('h1')
            if h1:
                title = h1.get_text(strip=True)

        if not raw_desc:
            desc_el = soup.select_one(".JobDescription_jobDesc__... , div[class*='job-desc'], div[class*='description'], article")
            if desc_el:
                raw_desc = desc_el.decode_contents()

        if not title:
            return None

        if s_min and s_max:
            s_raw = f"₹{int(s_min):,} - ₹{int(s_max):,} monthly"
        elif s_max:
            s_raw = f"Up to ₹{int(s_max):,} monthly"

        # Synthesize Complete Markdown JD
        final_jd = synthesize_rich_jd(
            title=title.strip(),
            raw_description=raw_desc,
            company=(company or "Verified Employer").strip(),
            location=loc_str,
            salary_text=s_raw,
            requirements=requirements,
            shifts_and_hours=shifts_text,
            contact_or_venue=contact_info,
            extra_specs=extra_specs,
        )

        category = VernacularTradeMapper.get_category_for_trade(title)

        return RawJobRecord(
            title=title.strip(),
            company_name=(company or "Verified Employer").strip(),
            city=default_city,
            location=loc_str,
            category=category,
            description=final_jd,
            salary_min=s_min,
            salary_max=s_max,
            salary_raw=s_raw,
            salary_period="MONTHLY",
            salary_currency="INR",
            source_name=self.name,
            source_url=url,
            date_posted=date_posted,
        )

    async def parse_job_detail(self, url: str) -> Optional[RawJobRecord]:
        try:
            async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return self._parse_detail_html(res.text, url, "Chennai")
        except Exception:
            pass
        return None
