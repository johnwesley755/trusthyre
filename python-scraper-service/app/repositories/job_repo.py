from datetime import timedelta
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import Job, utc_now
from app.models.schemas import RawJobRecord
from app.extractors.normalizer import normalize_city
from app.utils.url_helper import canonicalize_url


class JobRepository:

    @classmethod
    async def create_job(cls, db: AsyncSession, raw_job: RawJobRecord, source_hash: str) -> Job:
        """Persists a new external job into the jobs table with source attribution."""
        canon_url = canonicalize_url(raw_job.source_url)
        city_clean = normalize_city(raw_job.city)
        now = utc_now()
        expires_at = now + timedelta(days=30)
        # Keep missing date_posted as None without fabricating now()
        date_posted = raw_job.date_posted.replace(tzinfo=None) if (raw_job.date_posted and raw_job.date_posted.tzinfo) else raw_job.date_posted

        job = Job(
            employer_id="external_aggregator",
            title=raw_job.title.strip(),
            employer_name=raw_job.company_name.strip(),
            description=raw_job.description or "",
            industry=raw_job.industry or "Field Operations & Logistics",
            experience_years_required=raw_job.experience_years or 0,
            budget=raw_job.salary_max or raw_job.salary_min,
            status="PENDING_REVIEW",  # External scraped jobs require review before worker publication
            city=city_clean,
            location=raw_job.location or city_clean,
            is_external=True,
            source_name=raw_job.source_name,
            source_url=canon_url,
            source_hash=source_hash,
            external_id=raw_job.external_id,
            alternate_sources=[{
                "sourceName": raw_job.source_name,
                "sourceUrl": canon_url,
                "dateSeen": now.isoformat(),
            }],
            date_posted=date_posted,
            last_verified_at=now,
            expires_at=expires_at,
        )
        db.add(job)
        await db.flush()
        return job

    @classmethod
    async def get_by_id(cls, db: AsyncSession, job_id: UUID) -> Optional[Job]:
        stmt = select(Job).where(Job.id == job_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @classmethod
    async def list_jobs(
        cls,
        db: AsyncSession,
        status: Optional[str] = None,
        city: Optional[str] = None,
        source: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Job], int]:
        stmt = select(Job).where(Job.is_external == True)
        if status and status != "ALL":
            stmt = stmt.where(Job.status == status)
        if city:
            stmt = stmt.where(func.lower(Job.city) == city.lower().strip())
        if source:
            stmt = stmt.where(Job.source_name.ilike(f"%{source}%"))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = stmt.order_by(desc(Job.created_at)).limit(limit).offset(offset)
        jobs = (await db.execute(stmt)).scalars().all()
        return list(jobs), total

    @classmethod
    async def update_status(cls, db: AsyncSession, job_id: UUID, new_status: str) -> Optional[Job]:
        job = await cls.get_by_id(db, job_id)
        if job:
            job.status = new_status
            job.updated_at = utc_now()
            await db.flush()
        return job
