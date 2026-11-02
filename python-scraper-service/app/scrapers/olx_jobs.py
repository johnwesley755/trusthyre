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


class OLXJobsAdapter(BaseSourceAdapter):
    id = "olx_jobs"
    name = "OLX Jobs India"
    is_restricted = False
    compliance_note = (
        "Parses public Schema.org JobPosting microdata and structured Next.js classifieds "
        "published on OLX India for direct local blue-collar hiring."
    )

    async def check_health(self) -> SourceHealthStatus:
        test_url = "https://www.olx.in/jobs_c4"
        try:
            async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, timeout=4.0) as client:
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
                    error_message=f"OLX returned HTTP {resp.status_code}",
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
        city = (query.city or "chennai").strip().lower().replace(" ", "-")
        expanded = VernacularTradeMapper.expand_query(query.query)
        kw = expanded[0] if expanded else (query.query or "")
        limit = min(query.limit or 20, 25)

        target_url = f"https://www.olx.in/{city}/jobs_c4"
        if kw:
            target_url += f"/q-{kw.replace(' ', '-')}"

        logger.info(f"[{self.id}] Querying OLX Jobs at {target_url}")
        detail_targets: List[Dict[str, Any]] = []

        try:
            async with httpx.AsyncClient(headers=BROWSER_HEADERS, follow_redirects=True, timeout=4.0) as client:
                resp = await client.get(target_url)
                if resp.status_code != 200:
                    logger.warning(f"[{self.id}] Received HTTP {resp.status_code} from OLX")
                    return []

                soup = BeautifulSoup(resp.text, "html.parser")

                # Strategy 1: Look for Next.js hydration data __NEXT_DATA__
                next_data_script = soup.find("script", id="__NEXT_DATA__")
                if next_data_script and next_data_script.string:
                    try:
                        payload = json.loads(next_data_script.string)
                        ads = (payload.get("props", {})
                                      .get("pageProps", {})
                                      .get("data", {})
                                      .get("ads", []))
                        if isinstance(ads, list):
                            for ad in ads:
                                ad_id = str(ad.get("id", ""))
                                url = f"https://www.olx.in/item/job-iid-{ad_id}" if ad_id else ""
                                detail_targets.append({
                                    "url": url,
                                    "initial_ad": ad,
                                })
                                if len(detail_targets) >= limit:
                                    break
                    except Exception as e:
                        logger.debug(f"[{self.id}] Next.js payload parsing notice: {e}")

                # Strategy 2: Look for Schema.org JSON-LD scripts
                if not detail_targets:
                    for script in soup.find_all("script", type="application/ld+json"):
                        if not script.string:
                            continue
                        try:
                            data = json.loads(script.string)
                            items = []
                            if isinstance(data, list):
                                items = data
                            elif isinstance(data, dict):
                                if data.get("@type") == "JobPosting":
                                    items = [data]
                                elif "itemListElement" in data:
                                    items = [el.get("item", el) for el in data["itemListElement"] if isinstance(el, dict)]

                            for item in items:
                                if isinstance(item, dict) and item.get("@type") == "JobPosting":
                                    u = item.get("url")
                                    if u:
                                        detail_targets.append({"url": u, "initial_item": item})
                                        if len(detail_targets) >= limit:
                                            break
                        except Exception:
                            pass

                # Strategy 3: Fallback DOM links
                if not detail_targets:
                    for a in soup.find_all("a", href=True):
                        href = a["href"]
                        if "/item/" in href:
                            full_url = href if href.startswith("http") else f"https://www.olx.in{href}"
                            detail_targets.append({"url": full_url})
                            if len(detail_targets) >= limit:
                                break

                logger.info(f"[{self.id}] Discovered {len(detail_targets)} OLX listings. Hydrating full JDs...")

                sem = asyncio.Semaphore(4)

                async def _hydrate_ad(target: Dict[str, Any]) -> Optional[RawJobRecord]:
                    u = target.get("url")
                    initial_ad = target.get("initial_ad")
                    initial_item = target.get("initial_item")

                    # If we already have the full ad object from Next.js payload with comprehensive description:
                    if initial_ad and len(initial_ad.get("description", "")) > 150:
                        return self._build_record_from_ad(initial_ad, u or "https://www.olx.in/jobs", query.city or "Chennai")

                    if not u:
                        return None

                    async with sem:
                        try:
                            detail_resp = await client.get(u, timeout=10.0)
                            if detail_resp.status_code == 200:
                                return self._parse_detail_html(detail_resp.text, u, query.city or "Chennai")
                        except Exception as e:
                            logger.debug(f"[{self.id}] Detail fetch failed for {u}: {e}")

                    if initial_ad:
                        return self._build_record_from_ad(initial_ad, u, query.city or "Chennai")
                    if initial_item:
                        return self._build_record_from_json_ld(initial_item, query.city or "Chennai")
                    return None

                results = await asyncio.gather(*[_hydrate_ad(t) for t in detail_targets])
                records = [r for r in results if r is not None]
                logger.info(f"[{self.id}] Successfully hydrated {len(records)} full JDs from OLX.")
                return records

        except Exception as e:
            logger.error(f"[{self.id}] Error scraping OLX: {e}")

        return []

    def _build_record_from_ad(self, ad: Dict[str, Any], url: str, default_city: str) -> Optional[RawJobRecord]:
        try:
            title = str(ad.get("title", "")).strip()
            if not title:
                return None

            desc = ad.get("description", "")
            price_info = ad.get("price", {})
            sal_max = None
            if isinstance(price_info, dict):
                raw_amt = price_info.get("value", {}).get("raw")
                if raw_amt and isinstance(raw_amt, (int, float)):
                    sal_max = float(raw_amt)

            loc_info = ad.get("locations_resolved", {})
            city = loc_info.get("ADMIN_LEVEL_3_name") or loc_info.get("SUBLOCALITY_LEVEL_1_name") or default_city

            extra_specs: Dict[str, Any] = {}
            for param in ad.get("parameters", []):
                k = param.get("key_name") or param.get("key")
                v = param.get("value_name") or param.get("value")
                if k and v:
                    extra_specs[str(k).replace("_", " ").title()] = str(v)

            s_raw = f"Up to ₹{int(sal_max):,} monthly" if sal_max else None

            final_jd = synthesize_rich_jd(
                title=title,
                raw_description=desc,
                company="Direct Employer (OLX Verified)",
                location=f"{city}, India",
                salary_text=s_raw,
                extra_specs=extra_specs,
            )

            ad_id = str(ad.get("id", ""))
            return RawJobRecord(
                title=title,
                company_name="Direct Employer (OLX)",
                city=city,
                location=f"{city}, India",
                category=VernacularTradeMapper.get_category_for_trade(title),
                industry="Local Classifieds",
                description=final_jd,
                salary_min=None,
                salary_max=sal_max,
                salary_raw=s_raw,
                salary_period="MONTHLY",
                salary_currency="INR",
                source_name=self.name,
                source_url=url,
                external_id=f"olx_{ad_id}" if ad_id else None,
            )
        except Exception:
            return None

    def _parse_detail_html(self, html_doc: str, url: str, default_city: str) -> Optional[RawJobRecord]:
        soup = BeautifulSoup(html_doc, "html.parser")
        
        # Check __NEXT_DATA__ on detail page
        next_script = soup.find("script", id="__NEXT_DATA__")
        if next_script and next_script.string:
            try:
                payload = json.loads(next_script.string)
                ad_data = payload.get("props", {}).get("pageProps", {}).get("data", {})
                if ad_data:
                    rec = self._build_record_from_ad(ad_data, url, default_city)
                    if rec:
                        return rec
            except Exception:
                pass

        # Fallback to DOM parsing
        title_el = soup.find("h1")
        title = title_el.get_text(strip=True) if title_el else ""
        if not title:
            return None

        desc_el = soup.select_one("div[data-aut-id='itemDescriptionContent'], .item-description, article")
        raw_desc = desc_el.decode_contents() if desc_el else ""

        extra_specs = {}
        for param_el in soup.select("div[data-aut-id='itemParams'] div, div[class*='parameter']"):
            p_text = param_el.get_text(separator=': ', strip=True)
            if ":" in p_text:
                parts = p_text.split(":", 1)
                extra_specs[parts[0].strip()] = parts[1].strip()

        final_jd = synthesize_rich_jd(
            title=title,
            raw_description=raw_desc,
            company="Direct Employer (OLX)",
            location=default_city,
            extra_specs=extra_specs,
        )

        return RawJobRecord(
            title=title,
            company_name="Direct Employer (OLX)",
            city=default_city,
            location=f"{default_city}, India",
            category=VernacularTradeMapper.get_category_for_trade(title),
            industry="Local Classifieds",
            description=final_jd,
            source_name=self.name,
            source_url=url,
        )

    def _build_record_from_json_ld(self, item: Dict[str, Any], default_city: str) -> Optional[RawJobRecord]:
        title = str(item.get("title", "")).strip()
        if not title:
            return None
        desc = clean_html_to_text(item.get("description", ""))
        url = item.get("url") or "https://www.olx.in/jobs"
        return RawJobRecord(
            title=title,
            company_name="Direct Employer (OLX)",
            city=default_city,
            location=f"{default_city}, India",
            category=VernacularTradeMapper.get_category_for_trade(title),
            description=synthesize_rich_jd(title, desc, company="Direct Employer (OLX)", location=default_city),
            source_name=self.name,
            source_url=url,
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
