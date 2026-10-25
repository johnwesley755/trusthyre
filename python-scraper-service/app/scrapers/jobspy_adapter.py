import asyncio
from datetime import datetime, timezone, date
from typing import Optional, List, Dict, Any
import pandas as pd
from app.scrapers.base import BaseSourceAdapter
from app.models.schemas import RawJobRecord, SourceHealthStatus, ScanQueryConfig
from app.extractors.vernacular_mapper import VernacularTradeMapper
from app.core.logger import logger


class BaseJobSpyAdapter(BaseSourceAdapter):
    site_name: str = "naukri"

    async def check_health(self) -> SourceHealthStatus:
        try:
            import jobspy
            return SourceHealthStatus(
                source_id=self.id,
                name=self.name,
                status="ACTIVE",
                is_restricted=False,
                compliance_note=self.compliance_note,
                last_checked_at=datetime.now(timezone.utc),
            )
        except ImportError as e:
            return SourceHealthStatus(
                source_id=self.id,
                name=self.name,
                status="UNAVAILABLE",
                is_restricted=False,
                compliance_note=self.compliance_note,
                last_checked_at=datetime.now(timezone.utc),
                error_message=f"python-jobspy library missing: {e}",
            )

    async def discover_jobs(self, query: ScanQueryConfig) -> List[RawJobRecord]:
        from jobspy import scrape_jobs

        search_city = query.city or "Chennai"
        expanded_keywords = VernacularTradeMapper.expand_query(query.query)
        primary_keyword = expanded_keywords[0] if expanded_keywords else "Delivery Partner"
        if primary_keyword.lower() in ["associate", "delivery", "operations", "general"]:
            primary_keyword = "Delivery Partner"
        limit = min(query.limit or 20, 25)

        logger.info(f"[{self.id}] Starting JobSpy discovery for site='{self.site_name}', term='{primary_keyword}', city='{search_city}', limit={limit}")

        def _do_scrape():
            try:
                kwargs: Dict[str, Any] = {
                    "site_name": [self.site_name],
                    "search_term": primary_keyword,
                    "location": search_city,
                    "results_wanted": limit,
                    "is_remote": False,
                }
                if self.site_name == "indeed":
                    kwargs["country_indeed"] = "India"

                return scrape_jobs(**kwargs)
            except Exception as ex:
                logger.warning(f"[{self.id}] JobSpy scrape execution exception: {ex}")
                return pd.DataFrame()

        df: pd.DataFrame = await asyncio.to_thread(_do_scrape)
        if df.empty:
            logger.info(f"[{self.id}] JobSpy returned 0 records for '{primary_keyword}' in {search_city}")
            return []

        records: List[RawJobRecord] = []
        for _, row in df.iterrows():
            try:
                title = str(row.get("title", "")).strip()
                company = str(row.get("company", "")).strip()
                job_url = str(row.get("job_url_direct") or row.get("job_url") or "").strip()

                if not title or not company or not job_url:
                    continue

                location = str(row.get("location") or search_city).strip()
                description = str(row.get("description") or "")[:2000] if row.get("description") else None

                salary_min = float(row["min_amount"]) if pd.notna(row.get("min_amount")) else None
                salary_max = float(row["max_amount"]) if pd.notna(row.get("max_amount")) else None

                salary_period = "MONTHLY"
                interval = str(row.get("interval") or "").lower()
                if "year" in interval:
                    salary_period = "YEARLY"
                elif "hour" in interval:
                    salary_period = "HOURLY"
                elif "week" in interval:
                    salary_period = "WEEKLY"

                # Date parsing
                posted_dt = None
                date_val = row.get("date_posted")
                if pd.notna(date_val):
                    if isinstance(date_val, (datetime, date)):
                        posted_dt = datetime.combine(date_val, datetime.min.time()) if isinstance(date_val, date) and not isinstance(date_val, datetime) else date_val
                    elif isinstance(date_val, str):
                        try:
                            posted_dt = datetime.fromisoformat(date_val.replace("Z", "+00:00")).replace(tzinfo=None)
                        except Exception:
                            posted_dt = None

                category = VernacularTradeMapper.get_category_for_trade(title)
                ext_id = str(row.get("id")) if pd.notna(row.get("id")) else None

                records.append(
                    RawJobRecord(
                        title=title,
                        company_name=company,
                        city=search_city,
                        location=location,
                        category=category,
                        description=description,
                        salary_min=salary_min,
                        salary_max=salary_max,
                        salary_period=salary_period,
                        salary_currency="INR",
                        source_name=self.name,
                        source_url=job_url,
                        external_id=ext_id,
                        date_posted=posted_dt,
                    )
                )
            except Exception as row_err:
                logger.debug(f"[{self.id}] Failed parsing row: {row_err}")
                continue

        logger.info(f"[{self.id}] Parsed {len(records)} valid raw jobs from JobSpy.")
        return records

    async def parse_job_detail(self, url: str) -> Optional[RawJobRecord]:
        return None


class JobSpyNaukriAdapter(BaseJobSpyAdapter):
    id = "jobspy_naukri"
    name = "Naukri.com (JobSpy Engine)"
    site_name = "naukri"
    is_restricted = False
    compliance_note = "Discovers job listings on Naukri India using open-source JobSpy scraper engine."


class JobSpyIndeedAdapter(BaseJobSpyAdapter):
    id = "jobspy_indeed"
    name = "Indeed India (JobSpy Engine)"
    site_name = "indeed"
    is_restricted = False
    compliance_note = "Discovers job listings on Indeed India using open-source JobSpy scraper engine."
