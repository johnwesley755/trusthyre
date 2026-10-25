from typing import List
from fastapi import APIRouter, HTTPException, status
from app.api.deps import AuthSecretDep
from app.models.schemas import SourceHealthStatus
from app.scrapers.registry import SourceAdapterRegistry

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
