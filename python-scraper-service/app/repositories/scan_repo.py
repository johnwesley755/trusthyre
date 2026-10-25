from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import ScraperScan, ScraperScanLog, utc_now
from app.models.schemas import ScanQueryConfig


class ScanRepository:

    @classmethod
    async def create_scan(cls, db: AsyncSession, config: ScanQueryConfig, sources: List[str]) -> ScraperScan:
        scan = ScraperScan(
            status="RUNNING",
            sources_scanned=sources,
            query_params=config.model_dump(),
            total_found=0,
            valid_count=0,
            duplicate_count=0,
            rejected_count=0,
            error_count=0,
            source_stats={},
            started_at=utc_now(),
        )
        db.add(scan)
        await db.flush()
        return scan

    @classmethod
    async def get_scan(cls, db: AsyncSession, scan_id: UUID) -> Optional[ScraperScan]:
        stmt = select(ScraperScan).where(ScraperScan.id == scan_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @classmethod
    async def list_scans(cls, db: AsyncSession, limit: int = 20) -> List[ScraperScan]:
        stmt = select(ScraperScan).order_by(desc(ScraperScan.started_at)).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @classmethod
    async def log_event(
        cls,
        db: AsyncSession,
        scan_id: UUID,
        source_id: str,
        message: str,
        level: str = "INFO",
        raw_payload: Optional[Dict[str, Any]] = None,
    ):
        log_entry = ScraperScanLog(
            scan_id=scan_id,
            source_id=source_id,
            level=level,
            message=message,
            raw_payload=raw_payload,
            created_at=utc_now(),
        )
        db.add(log_entry)
        await db.flush()

    @classmethod
    async def complete_scan(
        cls,
        db: AsyncSession,
        scan_id: UUID,
        status: str,
        total_found: int,
        valid_count: int,
        duplicate_count: int,
        rejected_count: int,
        error_count: int,
        source_stats: Dict[str, Any],
    ):
        scan = await cls.get_scan(db, scan_id)
        if scan:
            scan.status = status
            scan.total_found = total_found
            scan.valid_count = valid_count
            scan.duplicate_count = duplicate_count
            scan.rejected_count = rejected_count
            scan.error_count = error_count
            scan.source_stats = source_stats
            scan.completed_at = utc_now()
            await db.flush()
