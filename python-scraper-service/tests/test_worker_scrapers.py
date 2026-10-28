import pytest
from src.worker import (
    is_blue_collar_job,
    extract_json_ld_jobs,
    normalize_city,
    calculate_job_hash,
)

def test_is_blue_collar_job():
    assert is_blue_collar_job("Delivery Boy", "Looking for delivery rider in Chennai", None) is True
    assert is_blue_collar_job("Warehouse Associate", "Packing and loading materials", None) is True
    assert is_blue_collar_job("Electrician", "Wiring and maintenance", "electrician") is True
    assert is_blue_collar_job("Plumber", "Pipe repair", "plumber") is True
    assert is_blue_collar_job("Senior Software Engineer", "React and Node.js developer", None) is False
    assert is_blue_collar_job("Product Manager", "Lead roadmap for payments", None) is False
    assert is_blue_collar_job("HR Director", "Human resources strategy", None) is False

def test_normalize_city():
    assert normalize_city("Chennai, Tamil Nadu") == "Chennai"
    assert normalize_city("chennai") == "Chennai"
    assert normalize_city("Bengaluru / Bangalore") == "Bengaluru"
    assert normalize_city("Coimbatore South") == "Coimbatore"
    assert normalize_city(None) == "Chennai"

def test_extract_json_ld_jobs():
    sample_html = """
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Delivery Executive",
          "hiringOrganization": {
            "@type": "Organization",
            "name": "QuickDelivery Logistics"
          },
          "baseSalary": {
            "@type": "MonetaryAmount",
            "value": {
              "minValue": 18000,
              "maxValue": 24000
            }
          },
          "jobLocation": {
            "@type": "Place",
            "address": {
              "addressLocality": "Chennai"
            }
          },
          "description": "Urgent requirement for field delivery partners."
        }
        </script>
      </head>
      <body></body>
    </html>
    """
    records = extract_json_ld_jobs(sample_html, "https://example.com/job/1", "Test Source", "Chennai")
    assert len(records) == 1
    job = records[0]
    assert job["title"] == "Delivery Executive"
    assert job["employer_name"] == "QuickDelivery Logistics"
    assert job["city"] == "Chennai"
    assert job["budget"] == 24000
    assert job["is_external"] is True

def test_calculate_job_hash():
    h1 = calculate_job_hash("Porter", "Driver", "Chennai", "p-123")
    h2 = calculate_job_hash("Porter", "Driver", "Chennai", "p-123")
    h3 = calculate_job_hash("Porter", "Driver", "Bengaluru", "p-123")
    assert h1 == h2
    assert h1 != h3

@pytest.mark.asyncio
async def test_execute_live_discovery():
    from src.worker import execute_live_discovery
    jobs = await execute_live_discovery(query="Driver", city="Chennai", limit=10)
    assert len(jobs) > 0
    assert jobs[0]["is_external"] is True
    assert jobs[0]["status"] == "PENDING_REVIEW"
    assert jobs[0]["city"] == "Chennai"

