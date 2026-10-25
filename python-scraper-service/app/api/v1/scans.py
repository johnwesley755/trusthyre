from typing import List
from uuid import UUID
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from app.api.deps import DBSessionDep, AuthSecretDep
from app.models.schemas import ScanQueryConfig, ScanSummaryResponse
from app.repositories.scan_repo import ScanRepository
from app.scrapers.registry import SourceAdapterRegistry
from app.services.discovery import DiscoveryPipeline
from app.tasks.scheduler import execute_background_scan

router = APIRouter(prefix="/scans", tags=["Scans"])


@router.post("", response_model=ScanSummaryResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_scan(
    config: ScanQueryConfig,
    background_tasks: BackgroundTasks,
    db: DBSessionDep,
    _auth: AuthSecretDep,
):
    """
    Creates and initiates a background blue-collar job discovery scan.
    Returns immediately with scan_id for asynchronous polling.
    """
    all_adapters = SourceAdapterRegistry.list_adapters()
    sources_to_run = config.sources or [a.id for a in all_adapters]

    scan = await ScanRepository.create_scan(db, config, sources_to_run)
    await db.commit()

    # Enqueue background execution task
    background_tasks.add_task(execute_background_scan, scan.id, config)

    return scan


@router.get("", response_model=List[ScanSummaryResponse])
async def list_scans(db: DBSessionDep, _auth: AuthSecretDep, limit: int = 20):
    """Retrieves recent job discovery scans."""
    return await ScanRepository.list_scans(db, limit=limit)


@router.get("/{scan_id}", response_model=ScanSummaryResponse)
async def get_scan_details(scan_id: UUID, db: DBSessionDep, _auth: AuthSecretDep):
    """Fetches real-time status and statistics for a specific scan."""
    scan = await ScanRepository.get_scan(db, scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan record '{scan_id}' not found.",
        )
    return scan


@router.post("/{scan_id}/cancel")
async def cancel_scan(scan_id: UUID, db: DBSessionDep, _auth: AuthSecretDep):
    """Cancels an in-progress scan."""
    scan = await ScanRepository.get_scan(db, scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan '{scan_id}' not found.",
        )

    if scan.status != "RUNNING":
        return {"message": f"Scan is already {scan.status}."}

    success = DiscoveryPipeline.cancel_scan(scan_id)
    return {
        "success": success,
        "message": "Cancellation request registered." if success else "Scan could not be cancelled."
    }
