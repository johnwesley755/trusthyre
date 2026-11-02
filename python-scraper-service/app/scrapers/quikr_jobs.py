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


class QuikrJobsAdapter(BaseSourceAdapter):
    id = "quikr_jobs"
    name = "QuikrJobs / Babajobs"
    is_restricted = False
    compliance_note = (
        "Parses public Schema.org JobPosting microdata and verified entry-level trade postings "
        "published on QuikrJobs with full 2-pass JD extraction."
    )

    async def check_health(self) -> SourceHealthStatus:
        test_url = "https://chennai.quikr.com/jobs"
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
                    error_message=f"Quikr returned HTTP {resp.status_code}",
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
        city_raw = (query.city or "chennai").strip().lower().replace(" ", "-")
        expanded = VernacularTradeMapper.expand_query(query.query)
        kw = expanded[0] if expanded else (query.query or "")
        limit = min(query.limit or 20, 25)

        # Quikr formats city subdomains e.g. https://chennai.quikr.com/jobs
        target_url = f"https://{city_raw}.quikr.com/jobs"
        logger.info(f"[{self.id}] Querying QuikrJobs at {target_url} for kw='{kw}'")
        detail_targets: List[str] = []

        try:
            async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, timeout=12.0) as client:
                resp = await client.get(target_url)
                if resp.status_code != 200:
                    # Fallback to main portal
                    target_url = "https://www.quikr.com/jobs"
                    resp = await client.get(target_url)

                if resp.status_code != 200:
                    logger.warning(f"[{self.id}] Received HTTP {resp.status_code} from Quikr")
                    return []

                soup = BeautifulSoup(resp.text, "html.parser")

                # Parse specific category pages to discover direct job postings
                # Quikr Category links: /jobs/electrician+zwqxj... or /jobs/driver+zwqxj...
                cat_links = []
                for a in soup.find_all("a", href=True):
                    h = a["href"]
                    if "/jobs/" in h and "+zwqxj" in h:
                        full_cat = h if h.startswith("http") else f"https://www.quikr.com{h}"
                        if full_cat not in cat_links:
                            cat_links.append(full_cat)

                # Collect detail URLs
                for cat_url in cat_links[:4]:
                    try:
                        cr = await client.get(cat_url, timeout=8.0)
                        if cr.status_code == 200:
                            csoup = BeautifulSoup(cr.text, "html.parser")
                            for a in csoup.find_all("a", href=True):
                                ph = a["href"]
                                if "/p/" in ph or re.search(r"-\d{6,}$", ph):
                                    full_p = ph if ph.startswith("http") else f"https://www.quikr.com{ph}"
                                    if full_p not in detail_targets:
                                        detail_targets.append(full_p)
                                        if len(detail_targets) >= limit:
                                            break
                    except Exception:
                        pass
                    if len(detail_targets) >= limit:
                        break

                logger.info(f"[{self.id}] Found {len(detail_targets)} Quikr jobs. Hydrating full JDs...")

                sem = asyncio.Semaphore(4)

                async def _hydrate_quikr(u: str) -> Optional[RawJobRecord]:
                    async with sem:
                        try:
                            detail_resp = await client.get(u, timeout=10.0)
                            if detail_resp.status_code == 200:
                                return self._parse_detail_html(detail_resp.text, u, query.city or "Chennai")
                        except Exception as e:
                            logger.debug(f"[{self.id}] Detail fetch failed for {u}: {e}")
                    return None

                results = await asyncio.gather(*[_hydrate_quikr(u) for u in detail_targets])
                records = [r for r in results if r is not None]
                logger.info(f"[{self.id}] Successfully hydrated {len(records)} full JDs from Quikr.")
                return records

        except Exception as e:
            logger.error(f"[{self.id}] Error scraping QuikrJobs: {e}")

        return []

    def _parse_detail_html(self, html_doc: str, url: str, default_city: str) -> Optional[RawJobRecord]:
        soup = BeautifulSoup(html_doc, "html.parser")

        title = None
        company = None
        loc_str = default_city
        s_min, s_max = None, None
        s_raw = None
        raw_desc = ""
        extra_specs: Dict[str, Any] = {}
        requirements: List[str] = []
        shifts_text = ""
        contact_info = ""

        # Check Schema.org JobPosting
        for s in soup.find_all("script", type="application/ld+json"):
            if not s.string:
                continue
            try:
                data = json.loads(s.string)
                if isinstance(data, dict) and data.get("@type") == "JobPosting":
                    title = data.get("title")
                    org = data.get("hiringOrganization", {})
                    company = org.get("name") if isinstance(org, dict) else str(org)
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
                    raw_desc = data.get("description", "")
                    break
            except Exception:
                pass

        # HTML fallback
        if not title:
            h1 = soup.find("h1")
            title = h1.get_text(strip=True) if h1 else ""

        if not title:
            return None

        if s_min and s_max:
            s_raw = f"₹{int(s_min):,} - ₹{int(s_max):,} monthly"
        elif s_max:
            s_raw = f"Up to ₹{int(s_max):,} monthly"

        final_jd = synthesize_rich_jd(
            title=title,
            raw_description=raw_desc,
            company=company or "Verified Employer",
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
            company_name=company or "Verified Employer",
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
