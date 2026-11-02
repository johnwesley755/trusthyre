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


class ApnaDirectAdapter(BaseSourceAdapter):
    id = "apna"
    name = "Apna.co Direct (JSON-LD & Next.js)"
    is_restricted = False
    compliance_note = (
        "Parses public Schema.org JobPosting JSON-LD and Next.js hydration payload "
        "published by Apna.co for search indexing. Zero-spend direct integration."
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
                logger.info(f"[{self.id}] Discovered {len(job_urls)} job URLs on Apna. Hydrating full JDs...")

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
                logger.info(f"[{self.id}] Successfully hydrated {len(records)} full JDs from Apna.")
                return records

        except Exception as ex:
            logger.error(f"[{self.id}] Discovery failed: {ex}")
            return []

    def _parse_next_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extracts Apna's __NEXT_DATA__ state object."""
        script = soup.find("script", id="__NEXT_DATA__")
        if script and script.string:
            try:
                data = json.loads(script.string)
                page_props = data.get("props", {}).get("pageProps", {})
                return page_props.get("jobDetails", {}) or page_props.get("job", {}) or {}
            except Exception:
                pass
        return {}

    def _parse_detail_html(self, html_doc: str, url: str, default_city: str) -> Optional[RawJobRecord]:
        soup = BeautifulSoup(html_doc, "lxml")
        next_job = self._parse_next_data(soup)

        title = None
        company = None
        loc_str = default_city
        s_min, s_max, s_raw = None, None, None
        date_posted = None
        raw_desc = ""
        requirements: List[str] = []
        skills: List[str] = []
        shifts_text = ""
        benefits: List[str] = []
        extra_specs: Dict[str, Any] = {}

        # 1. Inspect Next.js jobDetails payload if available
        if next_job:
            title = next_job.get("title")
            comp_obj = next_job.get("company", {})
            company = comp_obj.get("name") if isinstance(comp_obj, dict) else next_job.get("company_name")
            raw_desc = next_job.get("description") or next_job.get("job_description") or ""

            # Requirements & Specs
            if next_job.get("min_education"):
                extra_specs["Education"] = next_job.get("min_education")
            if next_job.get("experience_required"):
                extra_specs["Experience"] = next_job.get("experience_required")
            if next_job.get("gender_preference"):
                extra_specs["Gender Preference"] = next_job.get("gender_preference")
            if next_job.get("english_fluency"):
                extra_specs["English Level"] = next_job.get("english_fluency")
            if next_job.get("working_days"):
                shifts_text = f"Working Days: {next_job.get('working_days')}"
            if next_job.get("shift_type"):
                shifts_text = f"{shifts_text} | Shift: {next_job.get('shift_type')}".strip(" |")

            for req in next_job.get("requirements", []) or []:
                if isinstance(req, str):
                    requirements.append(req)
                elif isinstance(req, dict) and req.get("text"):
                    requirements.append(req["text"])

            skills.extend([s.get("name", s) if isinstance(s, dict) else s for s in next_job.get("skills", []) or []])
            for b in next_job.get("perks", []) or next_job.get("benefits", []) or []:
                benefits.append(str(b))

            # Salary from Next.js payload
            salary_data = next_job.get("salary", {}) or {}
            if isinstance(salary_data, dict):
                s_min = float(salary_data["min"]) if salary_data.get("min") is not None else None
                s_max = float(salary_data["max"]) if salary_data.get("max") is not None else None

        # 2. Parse Schema.org JSON-LD
        for s in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(s.string)
                if isinstance(data, dict) and data.get("@type") == "JobPosting":
                    if not title:
                        title = data.get("title")
                    if not company:
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
                    if isinstance(base_sal, dict) and not s_min:
                        val = base_sal.get("value", {})
                        if isinstance(val, dict):
                            s_min = float(val["minValue"]) if val.get("minValue") is not None else None
                            s_max = float(val["maxValue"]) if val.get("maxValue") is not None else None

                    dp_raw = data.get("datePosted")
                    if dp_raw and not date_posted:
                        try:
                            date_posted = datetime.fromisoformat(dp_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                        except Exception:
                            date_posted = None

                    if not raw_desc:
                        raw_desc = data.get("description", "")
                    break
            except Exception:
                continue

        # 3. DOM Fallbacks for Title & Company
        if not title:
            h1 = soup.find('h1')
            if h1:
                title = h1.get_text(strip=True)
        if not company:
            for c_elem in soup.find_all(['h2', 'span', 'p']):
                text = c_elem.get_text(strip=True)
                if text and len(text) < 50 and any(kw in text.lower() for kw in ['private limited', 'logistics', 'services', 'enterprises']):
                    company = text
                    break

        if not title:
            return None

        # 4. Fallback DOM extraction for Job Description & Highlights
        if not raw_desc:
            desc_el = soup.select_one("div[data-testid='job-description'], .job-description, #job-description, article")
            if desc_el:
                raw_desc = desc_el.decode_contents()

        # Highlights & Perks from DOM
        for pill in soup.select("span[class*='Pill'], div[class*='highlight'], div[class*='badge']"):
            p_text = pill.get_text(strip=True)
            if p_text and len(p_text) < 40:
                if any(k in p_text.lower() for k in ['shift', 'hours', 'day']):
                    if not shifts_text:
                        shifts_text = p_text
                elif any(k in p_text.lower() for k in ['bonus', 'pf', 'esi', 'allowance', 'payout']):
                    benefits.append(p_text)
                elif any(k in p_text.lower() for k in ['experience', 'pass', 'english', 'license']):
                    requirements.append(p_text)

        # Salary formatting
        if s_min and s_max:
            s_raw = f"₹{int(s_min):,} - ₹{int(s_max):,} monthly"
        elif s_max:
            s_raw = f"Up to ₹{int(s_max):,} monthly"

        # Synthesize Complete Markdown JD
        final_jd = synthesize_rich_jd(
            title=title.strip(),
            raw_description=raw_desc,
            company=(company or "Reputed Employer").strip(),
            location=loc_str,
            salary_text=s_raw,
            requirements=requirements,
            skills=skills,
            shifts_and_hours=shifts_text,
            benefits=benefits,
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
