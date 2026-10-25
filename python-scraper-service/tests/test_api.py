import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("ok", "UP", "DEGRADED")
    assert "service" in data

@pytest.mark.asyncio
async def test_sources_listing(async_client: AsyncClient):
    response = await async_client.get("/api/v1/sources")
    assert response.status_code == 200
    sources = response.json()
    assert isinstance(sources, list)
    assert len(sources) >= 5
    source_ids = [s["id"] for s in sources]
    assert "lever_ats" in source_ids
    assert "workindia" in source_ids

@pytest.mark.asyncio
async def test_unauthorized_access():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Request without X-Internal-Secret header should be 401
        response = await client.get("/api/v1/sources")
        assert response.status_code == 401
