import hashlib
from typing import Optional, Tuple
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import Job, utc_now
from app.models.schemas import RawJobRecord
from app.extractors.normalizer import (
    normalize_company,
    normalize_title,
    normalize_city,
    get_salary_bracket,
)
from app.utils.url_helper import canonicalize_url


class DeduplicationService:

    @classmethod
    def compute_source_hash(cls, job: RawJobRecord) -> str:
        """
        Computes SHA-256 deterministic identity hash for cross-portal deduplication.
        Payload: normalize_company:normalize_title:city:salary_bracket
        """
        comp = normalize_company(job.company_name)
        title = normalize_title(job.title)
        city = (normalize_city(job.city) or "").lower()
        bracket = get_salary_bracket(job.salary_min, job.salary_max)

        payload = f"{comp}:{title}:{city}:{bracket}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @classmethod
    async def check_duplicate(
        cls, db: AsyncSession, job: RawJobRecord
    ) -> Tuple[bool, Optional[Job], str]:
        """
        Executes strict 3-tier deduplication check against the database:
        Tier 1: Source Name + External Listing ID (exact provider match)
        Tier 2: Canonical Listing URL match
        Tier 3: Deterministic SHA-256 normalized content fingerprint
        """
        source_hash = cls.compute_source_hash(job)
        canon_url = canonicalize_url(job.source_url)

        # Tier 1: Exact provider ID + external listing ID
        if job.external_id and job.external_id.strip():
            tier1_stmt = (
                select(Job)
                .where(
                    and_(
                        Job.source_name == job.source_name,
                        Job.external_id == job.external_id.strip(),
                    )
                )
                .where(Job.status.in_(["OPEN", "PENDING_REVIEW", "EXPIRED"]))
                .limit(1)
            )
            result = await db.execute(tier1_stmt)
            match = result.scalar_one_or_none()
            if match:
                return True, match, source_hash

        # Tier 2 & Tier 3: Canonical URL or SHA-256 fingerprint
        filters = [Job.source_hash == source_hash]
        if canon_url:
            filters.append(Job.source_url == canon_url)

        stmt = (
            select(Job)
            .where(or_(*filters))
            .where(Job.status.in_(["OPEN", "PENDING_REVIEW", "EXPIRED"]))
            .limit(1)
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            return True, existing, source_hash

        return False, None, source_hash

    @classmethod
    async def merge_alternate_source(cls, db: AsyncSession, existing_job: Job, new_job: RawJobRecord):
        """
        Merges new portal sighting into alternate_sources without creating duplicate job.
        Updates last_verified_at.
        """
        current_sources = existing_job.alternate_sources or []
        if not isinstance(current_sources, list):
            current_sources = []

        now = utc_now()
        canon_new_url = canonicalize_url(new_job.source_url)
        already_present = any(
            s.get("sourceUrl") == canon_new_url or s.get("sourceName", "").lower() == new_job.source_name.lower()
            for s in current_sources
        )

        if not already_present:
            current_sources.append({
                "sourceName": new_job.source_name,
                "sourceUrl": canon_new_url,
                "dateSeen": now.isoformat(),
            })
            existing_job.alternate_sources = current_sources

        existing_job.last_verified_at = now
        await db.flush()
