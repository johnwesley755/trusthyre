import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.scrapers.jobspy_adapter import JobSpyNaukriAdapter, JobSpyIndeedAdapter
from app.scrapers.workindia_direct import WorkIndiaDirectAdapter
from app.scrapers.apna_direct import ApnaDirectAdapter
from app.models.schemas import ScanQueryConfig
import pandas as pd


@pytest.mark.asyncio
async def test_jobspy_naukri_health():
    with patch.dict("sys.modules", {"jobspy": MagicMock()}):
        adapter = JobSpyNaukriAdapter()
        health = await adapter.check_health()
        assert health.status == "ACTIVE"
        assert health.is_restricted is False


@pytest.mark.asyncio
async def test_jobspy_indeed_health():
    with patch.dict("sys.modules", {"jobspy": MagicMock()}):
        adapter = JobSpyIndeedAdapter()
        health = await adapter.check_health()
        assert health.status == "ACTIVE"
        assert health.is_restricted is False


@pytest.mark.asyncio
async def test_jobspy_discover_jobs_mapping():
    adapter = JobSpyNaukriAdapter()
    mock_df = pd.DataFrame([
        {
            "title": "Delivery Executive",
            "company": "FastLogistics Pvt Ltd",
            "location": "Chennai, Tamil Nadu",
            "job_url_direct": "https://www.naukri.com/job-listings-12345",
            "description": "Delivery partner needed for Chennai North.",
            "min_amount": 15000,
            "max_amount": 25000,
            "interval": "monthly",
            "id": "nk-12345",
        }
    ])

    with patch.dict("sys.modules", {"jobspy": MagicMock()}):
        with patch("asyncio.to_thread", new_callable=AsyncMock) as mock_thread:
            mock_thread.return_value = mock_df
            records = await adapter.discover_jobs(ScanQueryConfig(query="Driver", city="Chennai", limit=10))

        assert len(records) == 1
        job = records[0]
        assert job.title == "Delivery Executive"
        assert job.company_name == "FastLogistics Pvt Ltd"
        assert job.city == "Chennai"
        assert job.salary_min == 15000
        assert job.salary_max == 25000
        assert job.salary_period == "MONTHLY"
        assert job.category == "Logistics & Delivery"


@pytest.mark.asyncio
async def test_workindia_parse_detail_html():
    adapter = WorkIndiaDirectAdapter()
    sample_html = """
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Delivery Boy / Driver",
          "hiringOrganization": {
            "@type": "Organization",
            "name": "QuickMart Express"
          },
          "baseSalary": {
            "@type": "MonetaryAmount",
            "currency": "INR",
            "value": {
              "@type": "QuantitativeValue",
              "minValue": 14000,
              "maxValue": 22000,
              "unitText": "MONTH"
            }
          },
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Guindy, Chennai"
            }
          },
          "datePosted": "2026-10-24T10:00:00Z",
          "description": "Immediate joining for delivery boys in Chennai."
        }
        </script>
      </head>
      <body></body>
    </html>
    """
    job = adapter._parse_detail_html(sample_html, "https://workindia.in/jobs/123", "Chennai")
    assert job is not None
    assert job.title == "Delivery Boy / Driver"
    assert job.company_name == "QuickMart Express"
    assert job.city == "Chennai"
    assert job.location == "Guindy, Chennai"
    assert job.salary_min == 14000
    assert job.salary_max == 22000
    assert job.category == "Logistics & Delivery"


@pytest.mark.asyncio
async def test_apna_parse_detail_html():
    adapter = ApnaDirectAdapter()
    sample_html = """
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Industrial Electrician",
          "hiringOrganization": {
            "@type": "Organization",
            "name": "Apex Engineering"
          },
          "baseSalary": {
            "@type": "MonetaryAmount",
            "currency": "INR",
            "value": {
              "@type": "QuantitativeValue",
              "minValue": 18000,
              "maxValue": 28000,
              "unitText": "MONTH"
            }
          },
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Coimbatore"
            }
          },
          "datePosted": "2026-10-23T12:00:00Z",
          "description": "ITI Electrician required for panel wiring."
        }
        </script>
      </head>
      <body></body>
    </html>
    """
    job = adapter._parse_detail_html(sample_html, "https://apna.co/job/coimbatore/123", "Coimbatore")
    assert job is not None
    assert job.title == "Industrial Electrician"
    assert job.company_name == "Apex Engineering"
    assert job.city == "Coimbatore"
    assert job.salary_min == 18000
    assert job.salary_max == 28000
    assert job.category == "Skilled Trades & ITI"
