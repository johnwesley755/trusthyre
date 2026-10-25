import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.scrapers.headcount_labs import HeadcountLabsAdapter
from app.models.schemas import ScanQueryConfig

@pytest.mark.asyncio
async def test_headcount_labs_health_no_key():
    with patch("app.scrapers.headcount_labs.settings") as mock_settings:
        mock_settings.HEADCOUNTLABS_API_KEY = None
        adapter = HeadcountLabsAdapter()
        health = await adapter.check_health()
        assert health.status == "AUTH_REQUIRED"
        assert "not configured" in health.error_message

@pytest.mark.asyncio
async def test_headcount_labs_health_with_key_success():
    with patch("app.scrapers.headcount_labs.settings") as mock_settings:
        mock_settings.HEADCOUNTLABS_API_KEY = "test_hl_key"
        adapter = HeadcountLabsAdapter()

        mock_resp = MagicMock()
        mock_resp.status_code = 200

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_client.__aenter__.return_value = mock_client

        with patch("app.scrapers.headcount_labs.create_safe_async_client", return_value=mock_client):
            health = await adapter.check_health()
            assert health.status == "ACTIVE"
            assert health.error_message is None

@pytest.mark.asyncio
async def test_headcount_labs_health_rate_limited():
    with patch("app.scrapers.headcount_labs.settings") as mock_settings:
        mock_settings.HEADCOUNTLABS_API_KEY = "test_hl_key"
        adapter = HeadcountLabsAdapter()

        mock_resp = MagicMock()
        mock_resp.status_code = 429

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_client.__aenter__.return_value = mock_client

        with patch("app.scrapers.headcount_labs.create_safe_async_client", return_value=mock_client):
            health = await adapter.check_health()
            assert health.status == "RATE_LIMITED"

@pytest.mark.asyncio
async def test_headcount_labs_discover_jobs_parses_records():
    with patch("app.scrapers.headcount_labs.settings") as mock_settings:
        mock_settings.HEADCOUNTLABS_API_KEY = "test_hl_key"
        adapter = HeadcountLabsAdapter()

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "jobs": [
                {
                    "job_id": "hl_54321",
                    "title": "Machine Maintenance Technician",
                    "company_name": "LMW Textile Machinery",
                    "location": "Coimbatore, Tamil Nadu",
                    "salary_min": 22000,
                    "salary_max": 28000,
                    "posted_at": "2026-10-21T08:30:00Z",
                    "url": "https://headcountlabs.com/jobs/54321",
                }
            ]
        }

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_client.__aenter__.return_value = mock_client

        with patch("app.scrapers.headcount_labs.create_safe_async_client", return_value=mock_client):
            jobs = await adapter.discover_jobs(ScanQueryConfig(city="Coimbatore"))
            assert len(jobs) == 1
            assert jobs[0].external_id == "hl_54321"
            assert jobs[0].title == "Machine Maintenance Technician"
            assert jobs[0].company_name == "LMW Textile Machinery"
            assert jobs[0].city == "Coimbatore"
            assert jobs[0].salary_min == 22000
            assert jobs[0].date_posted is not None

@pytest.mark.asyncio
async def test_headcount_labs_discover_jobs_parses_nested_value_objects():
    with patch("app.scrapers.headcount_labs.settings") as mock_settings:
        mock_settings.HEADCOUNTLABS_API_KEY = "test_hl_key"
        adapter = HeadcountLabsAdapter()

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "data": [
                {
                    "job_id": "c86dab38-3f5d-4c92-9417-ed92d0a3aeb1",
                    "currentness": "current",
                    "employer_name": {
                        "state": "known",
                        "value": "Jones Lang LaSalle India"
                    },
                    "title": {
                        "state": "known",
                        "value": "STP & WTP Plant Operator"
                    },
                    "description": {
                        "state": "known",
                        "value": "Operate sewage treatment plant and water treatment pumps."
                    },
                    "locations": [
                        {
                            "state": "known",
                            "value": {
                                "city": "Chennai",
                                "region": "Tamil Nadu",
                                "street": "OMR Road"
                            }
                        }
                    ],
                    "postings": [
                        {
                            "application_url": {
                                "state": "known",
                                "value": "https://jll.wd1.myworkdayjobs.com/careers/stp-operator"
                            },
                            "source_posted_at": "2026-10-15T00:00:00.000Z",
                            "pay": {
                                "state": "known",
                                "value": {
                                    "min": 18000,
                                    "max": 25000
                                }
                            }
                        }
                    ]
                }
            ]
        }

        mock_client = AsyncMock()
        mock_client.get.return_value = mock_resp
        mock_client.__aenter__.return_value = mock_client

        with patch("app.scrapers.headcount_labs.create_safe_async_client", return_value=mock_client):
            jobs = await adapter.discover_jobs(ScanQueryConfig(city="Chennai"))
            assert len(jobs) == 1
            assert jobs[0].external_id == "c86dab38-3f5d-4c92-9417-ed92d0a3aeb1"
            assert jobs[0].title == "STP & WTP Plant Operator"
            assert jobs[0].company_name == "Jones Lang LaSalle India"
            assert jobs[0].city == "Chennai"
            assert "OMR Road, Chennai, Tamil Nadu" in jobs[0].location
            assert jobs[0].source_url == "https://jll.wd1.myworkdayjobs.com/careers/stp-operator"
            assert jobs[0].salary_min == 18000
            assert jobs[0].salary_max == 25000

