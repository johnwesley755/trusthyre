import pytest
from app.scrapers.workindia import WorkIndiaAdapter
from app.scrapers.apna import ApnaAdapter
from app.scrapers.naukri import NaukriAdapter
from app.scrapers.lever_ats import LeverATSAdapter
from app.scrapers.headcount_labs import HeadcountLabsAdapter
from app.models.schemas import ScanQueryConfig

@pytest.mark.asyncio
async def test_workindia_reports_restricted():
    adapter = WorkIndiaAdapter()
    health = await adapter.check_health()
    assert health.is_restricted is True
    assert health.status == "PERMISSION_REQUIRED"
    # Automated discover returns 0 to prevent unauthorized crawling
    jobs = await adapter.discover_jobs(ScanQueryConfig(city="Chennai"))
    assert len(jobs) == 0

@pytest.mark.asyncio
async def test_apna_reports_restricted():
    adapter = ApnaAdapter()
    health = await adapter.check_health()
    assert health.is_restricted is True
    assert health.status == "PERMISSION_REQUIRED"

@pytest.mark.asyncio
async def test_naukri_reports_restricted():
    adapter = NaukriAdapter()
    health = await adapter.check_health()
    assert health.is_restricted is True
    assert health.status == "PERMISSION_REQUIRED"

@pytest.mark.asyncio
async def test_lever_ats_health():
    adapter = LeverATSAdapter()
    health = await adapter.check_health()
    assert health.is_restricted is False
    assert health.status in ("ACTIVE", "DOWN")


@pytest.mark.asyncio
async def test_headcount_labs_reports_auth_required_without_key():
    adapter = HeadcountLabsAdapter()
    health = await adapter.check_health()
    assert health.source_id == "headcount_labs"
    assert health.status in ("AUTH_REQUIRED", "ACTIVE")

