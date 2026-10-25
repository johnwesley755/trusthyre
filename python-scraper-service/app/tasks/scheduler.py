import asyncio
from uuid import UUID
from app.core.database import AsyncSessionLocal
from app.models.schemas import ScanQueryConfig
from app.services.discovery import DiscoveryPipeline
from app.core.logger import logger

scan_lock = asyncio.Lock()


async def execute_background_scan(scan_id: UUID, config: ScanQueryConfig):
    """
    Background worker task executing discovery with an independent database session.
    """
    async with scan_lock:
        logger.info(f"[BackgroundWorker] Acquired lock for scan {scan_id}")
        async with AsyncSessionLocal() as session:
            try:
                await DiscoveryPipeline.run_scan(session, scan_id, config)
            except Exception as e:
                logger.error(f"[BackgroundWorker] Unhandled exception in scan {scan_id}: {e}")
            finally:
                logger.info(f"[BackgroundWorker] Released lock for scan {scan_id}")
