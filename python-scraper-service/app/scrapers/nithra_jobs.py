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
    "Accept-Language": "ta,en-US;q=0.9,en;q=0.8",
}


class NithraJobsAdapter(BaseSourceAdapter):
    id = "nithra_jobs"
    name = "Nithra Jobs (Tamil Nadu Regional)"
    is_restricted = False
    compliance_note = (
        "Parses publicly listed regional blue-collar and trade vacancies across "
        "Tamil Nadu districts (Chennai, Coimbatore, Madurai, Trichy, Salem, Tiruppur) with full JD hydration."
    )

    async def check_health(self) -> SourceHealthStatus:
        test_url = "https://nithrajobs.com"
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
                    error_message=f"Nithra returned HTTP {resp.status_code}",
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
        city = (query.city or "Chennai").strip()
        expanded = VernacularTradeMapper.expand_query(query.query)
        kw = expanded[0] if expanded else (query.query or "")
        limit = min(query.limit or 20, 25)

        target_url = "https://nithrajobs.com/private-jobs"
        logger.info(f"[{self.id}] Querying Nithra Jobs ({city}, kw: {kw}) at {target_url}")
        job_links: List[str] = []

        try:
            async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, timeout=12.0) as client:
                resp = await client.get(target_url)
                if resp.status_code != 200:
                    logger.warning(f"[{self.id}] Received HTTP {resp.status_code} from Nithra")
                    return []

                soup = BeautifulSoup(resp.text, "html.parser")

                # Parse Job card elements from HTML DOM to get detail URLs
                # Nithra links follow pattern like: /some-role-jobs-from-company-in-location/333-1060548
                for a in soup.find_all("a", href=True):
                    href = a["href"].strip()
                    if "/333-" in href or (re.search(r"-\d{6,}$", href) and "job" in href.lower()):
                        full_url = href if href.startswith("http") else f"https://nithrajobs.com/{href.lstrip('/')}"
                        if full_url not in job_links:
                            job_links.append(full_url)
                            if len(job_links) >= limit:
                                break

                logger.info(f"[{self.id}] Discovered {len(job_links)} job URLs on Nithra. Hydrating complete JDs...")

                sem = asyncio.Semaphore(4)

                async def _fetch_and_parse(u: str) -> Optional[RawJobRecord]:
                    async with sem:
                        try:
                            detail_resp = await client.get(u, timeout=10.0)
                            if detail_resp.status_code != 200:
                                return None
                            return self._parse_detail_html(detail_resp.text, u, city)
                        except Exception as parse_ex:
                            logger.debug(f"[{self.id}] Error fetching {u}: {parse_ex}")
                            return None

                results = await asyncio.gather(*[_fetch_and_parse(u) for u in job_links])
                records = [r for r in results if r is not None]
                logger.info(f"[{self.id}] Successfully hydrated {len(records)} full JDs from Nithra Jobs.")
                return records

        except Exception as e:
            logger.error(f"[{self.id}] Discovery error: {e}")
            return []

    def _parse_detail_html(self, html_doc: str, url: str, default_city: str) -> Optional[RawJobRecord]:
        soup = BeautifulSoup(html_doc, "html.parser")

        # Title
        h1 = soup.find("h1")
        title = h1.get_text(strip=True) if h1 else ""
        title = re.sub(r"^Hiring\s+", "", title, flags=re.I).strip()
        if not title:
            return None

        company = "Verified Local Business"
        loc_str = default_city
        s_min, s_max = None, None
        s_raw = None
        extra_specs: Dict[str, Any] = {}
        requirements: List[str] = []
        shifts_text = ""
        contact_info = ""

        # Check Schema.org
        for script in soup.find_all("script", type="application/ld+json"):
            if not script.string:
                continue
            try:
                data = json.loads(script.string)
                if isinstance(data, dict) and data.get("@type") == "JobPosting":
                    if data.get("title"):
                        title = data["title"]
                    org = data.get("hiringOrganization", {})
                    if isinstance(org, dict) and org.get("name"):
                        company = org["name"]
                    elif isinstance(org, str) and org.strip():
                        company = org.strip()
                    loc_obj = data.get("jobLocation", {})
                    if isinstance(loc_obj, dict):
                        addr = loc_obj.get("address", {})
                        if isinstance(addr, dict):
                            loc_str = addr.get("addressLocality") or addr.get("addressRegion") or default_city
                    sal = data.get("baseSalary", {})
                    if isinstance(sal, dict):
                        val = sal.get("value", {})
                        if isinstance(val, dict):
                            s_min = float(val.get("minValue") or 0) or None
                            s_max = float(val.get("maxValue") or 0) or None
            except Exception:
                pass

        # Parse text rows / specs
        for el in soup.find_all(["div", "li", "tr", "p"]):
            text = el.get_text(separator=" ", strip=True)
            if ":" in text and len(text) < 180:
                parts = text.split(":", 1)
                k = parts[0].strip().lower()
                v = parts[1].strip()
                if "company" in k:
                    company = v
                elif "location" in k or "district" in k or "place" in k:
                    loc_str = v
                elif "salary" in k or "pay" in k:
                    s_raw = v
                    nums = [float(n) for n in re.findall(r"\d+", v.replace(",", ""))]
                    if len(nums) >= 2:
                        s_min, s_max = min(nums[:2]), max(nums[:2])
                    elif len(nums) == 1:
                        s_max = nums[0]
                elif "qualification" in k or "education" in k:
                    extra_specs["Education"] = v
                elif "experience" in k:
                    extra_specs["Experience"] = v
                elif "gender" in k:
                    extra_specs["Gender"] = v
                elif "timing" in k or "shift" in k:
                    shifts_text = v

        # Parse description body
        desc_container = soup.select_one(".job-desc, .description, div[class*='detail'], article")
        raw_desc = desc_container.get_text(separator="\n", strip=True) if desc_container else ""

        final_jd = synthesize_rich_jd(
            title=title,
            raw_description=raw_desc,
            company=company,
            location=loc_str,
            salary_text=s_raw,
            requirements=requirements,
            shifts_and_hours=shifts_text,
            contact_or_venue=contact_info,
            extra_specs=extra_specs,
        )

        category = VernacularTradeMapper.get_category_for_trade(title)

        return RawJobRecord(
            title=title,
            company_name=company,
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
            date_posted=datetime.now(timezone.utc),
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
