from typing import List
from fastapi import APIRouter, HTTPException, status
from app.api.deps import AuthSecretDep, DBSessionDep
from app.models.schemas import SourceHealthStatus, JobResponse, ScanQueryConfig
from app.scrapers.registry import SourceAdapterRegistry
from app.repositories.scan_repo import ScanRepository
from app.services.discovery import DiscoveryPipeline

router = APIRouter(prefix="/sources", tags=["Sources"])


@router.get("", response_model=List[SourceHealthStatus])
async def list_sources(_auth: AuthSecretDep):
    """Lists all configured source adapters and their operational/compliance status."""
    return await SourceAdapterRegistry.get_all_health()


@router.get("/vernacular-trades")
async def list_vernacular_trades(_auth: AuthSecretDep):
    """Returns supported vernacular trades with English, Tamil, and Hindi titles."""
    from app.extractors.vernacular_mapper import VernacularTradeMapper
    return VernacularTradeMapper.list_supported_trades()


@router.post("/run-discovery", response_model=List[JobResponse])
async def run_sources_discovery(
    config: ScanQueryConfig,
    db: DBSessionDep,
    _auth: AuthSecretDep,
):
    """
    Synchronously executes blue-collar job discovery across configured sources
    and returns discovered jobs directly in the response payload.
    """
    all_adapters = SourceAdapterRegistry.list_adapters()
    sources_to_run = config.sources or [a.id for a in all_adapters]
    scan = await ScanRepository.create_scan(db, config, sources_to_run)
    await db.commit()

    jobs = await DiscoveryPipeline.run_scan(db, scan.id, config)
    return jobs


@router.post("/{source_id}/test", response_model=SourceHealthStatus)
async def test_source(source_id: str, _auth: AuthSecretDep):
    """Triggers an explicit connectivity and compliance test for a specific source adapter."""
    adapter = SourceAdapterRegistry.get_adapter(source_id)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source adapter '{source_id}' not found.",
        )
    return await adapter.check_health()
