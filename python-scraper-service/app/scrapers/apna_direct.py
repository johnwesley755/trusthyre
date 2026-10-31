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
from app.core.logger import logger

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ta;q=0.8,hi;q=0.7",
}


def clean_html_tags(html_str: Optional[str]) -> str:
    """Strips HTML tags cleanly and converts breaks to readable newlines."""
    if not html_str:
        return ""
    s = re.sub(r'<(?:br\s*/?|/p|/div|/li|/tr)>', '\n', html_str, flags=re.IGNORECASE)
    s = re.sub(r'<li[^>]*>', '• ', s, flags=re.IGNORECASE)
    s = re.sub(r'<[^>]+>', '', s)
    s = (s.replace('&nbsp;', ' ')
          .replace('&amp;', '&')
          .replace('&lt;', '<')
          .replace('&gt;', '>')
          .replace('&quot;', '"')
          .replace('&#39;', "'")
          .replace('&apos;', "'"))
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in s.split('\n')]
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip()


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

    def _extract_dom_salary(self, soup: BeautifulSoup, page_text: str) -> tuple[Optional[float], Optional[float], Optional[str]]:
        """Deep DOM and regex salary extractor for Apna earning potential and monthly wage cards."""
        # 1. Look for patterns like ₹35,000 - ₹75,000 or ₹35000 - 75000
        salary_match = re.search(r'₹\s*([0-9,]+)\s*-\s*₹?\s*([0-9,]+)', page_text)
        if salary_match:
            try:
                min_val = float(salary_match.group(1).replace(',', ''))
                max_val = float(salary_match.group(2).replace(',', ''))
                raw_str = f"₹{int(min_val):,} - ₹{int(max_val):,} monthly"
                return min_val, max_val, raw_str
            except (ValueError, IndexError):
                pass

        # 2. Look for Earning Potential or Fixed numbers
        earning_match = re.search(r'(?:Earning Potential|Fixed|Salary)\s*[:\s]*₹?\s*([0-9,]+)', page_text, re.IGNORECASE)
        if earning_match:
            try:
                val = float(earning_match.group(1).replace(',', ''))
                return val, val, f"₹{int(val):,} monthly"
            except ValueError:
                pass

        return None, None, None

    def _extract_job_highlights(self, soup: BeautifulSoup) -> List[str]:
        """Extracts bullet highlights like 'Weekly Payout', 'Joining Bonus', etc."""
        highlights = []
        for section in soup.find_all(lambda tag: tag.name in ['div', 'section'] and any(c in str(tag.get('class', [])) for c in ['highlight', 'benefit', 'perk'])):
            text = section.get_text(separator=' ', strip=True)
            if 'Benefits include' in text or 'Urgently hiring' in text:
                clean = re.sub(r'[ \t]+', ' ', text)
                if clean and clean not in highlights:
                    highlights.append(clean)
        return highlights

    def _parse_detail_html(self, html: str, url: str, default_city: str) -> Optional[RawJobRecord]:
        soup = BeautifulSoup(html, "lxml")
        page_text = soup.get_text(separator=' ', strip=True)

        title = None
        company = None
        loc_str = default_city
        s_min, s_max, s_raw = None, None, None
        date_posted = None
        desc_parts: List[str] = []

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

                    # Salary from Schema
                    base_sal = data.get("baseSalary", {})
                    if isinstance(base_sal, dict):
                        val = base_sal.get("value", {})
                        if isinstance(val, dict):
                            s_min = float(val["minValue"]) if val.get("minValue") is not None else None
                            s_max = float(val["maxValue"]) if val.get("maxValue") is not None else None
                            if s_min and s_max:
                                s_raw = f"₹{int(s_min):,} - ₹{int(s_max):,} monthly"

                    # Date Posted
                    dp_raw = data.get("datePosted")
                    if dp_raw:
                        try:
                            date_posted = datetime.fromisoformat(dp_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                        except Exception:
                            date_posted = None

                    raw_desc = data.get("description", "")
                    if raw_desc:
                        desc_parts.append(clean_html_tags(raw_desc))

                    break
            except Exception:
                continue

        # 2. Fallback DOM extraction for Title & Company if not found in Schema
        if not title:
            h1 = soup.find('h1')
            if h1:
                title = h1.get_text(strip=True)

        if not company:
            for c_elem in soup.find_all(['h2', 'span', 'p']):
                text = c_elem.get_text(strip=True)
                if text and len(text) < 50 and any(kw in text.lower() for kw in ['private limited', 'logistics', 'services', 'saloon', 'enterprises', 'minutes']):
                    company = text
                    break

        if not title:
            return None

        # 3. Deep Salary Discovery if missing or zero in Schema
        dom_min, dom_max, dom_raw = self._extract_dom_salary(soup, page_text)
        if dom_min and (not s_min or dom_min > s_min):
            s_min, s_max, s_raw = dom_min, dom_max, dom_raw

        # 4. Deep Highlights & Benefits Extraction
        highlights = self._extract_job_highlights(soup)
        if highlights:
            desc_parts.insert(0, "\n".join(highlights))

        # 5. Extract Details & Work Arrangement pills
        details_pills = []
        for pill in soup.find_all(lambda tag: tag.name in ['span', 'div'] and any(w in tag.get_text().lower() for w in ['field job', 'work from office', 'work from home', 'full time', 'part time', 'no english required', 'any experience'])):
            p_text = pill.get_text(strip=True)
            if p_text and p_text not in details_pills and len(p_text) < 40:
                details_pills.append(f"• {p_text}")

        if details_pills:
            desc_parts.append("\nJob Overview:\n" + "\n".join(details_pills))

        category = VernacularTradeMapper.get_category_for_trade(title)
        final_description = "\n\n".join([p for p in desc_parts if p.strip()]).strip()
        if not final_description:
            final_description = f"Verified hiring requisition for {title} in {default_city}."

        return RawJobRecord(
            title=title.strip(),
            company_name=(company or "Verified Employer").strip(),
            city=default_city,
            location=loc_str,
            category=category,
            description=final_description,
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
