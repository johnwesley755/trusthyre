# TrustHyre Blue-Collar Job Scraping Microservice

Production-grade async Python microservice built with **FastAPI**, **SQLAlchemy 2.0 (asyncpg)**, and **Pydantic v2** dedicated exclusively to job discovery, extraction, quality validation, 3-tier deduplication, and administrative curation for **blue-collar roles**.

## Features

- **Strict Blue-Collar Classifier**: Automated inclusion of genuine frontline & trade roles (delivery, driving, warehouse, security, housekeeping, plumbing, electrical, construction, maintenance) and strict rejection of white-collar vacancies.
- **Enterprise Security (OWASP & CodeQL Compliant)**:
  - SSRF protection validating DNS resolution against private, loopback, and link-local IP blocks with redirect re-validation.
  - Constant-time secret comparison (`secrets.compare_digest`) for internal authentication.
  - 100% parameterized queries via SQLAlchemy 2.0 asyncpg.
  - Safe HTML parsing using `lxml` with zero recursive regex or entity double-unescaping risks.
- **Honest Source Adapters**:
  - Live authorized feeds: Lever ATS (Porter, Meesho, etc.), Greenhouse ATS, and Schema.org JSON-LD metadata.
  - Protected portals (WorkIndia, Apna, Naukri): Real status checks reporting `RESTRICTED` compliance status rather than attempting WAF bypass or fabricating jobs.
- **3-Tier Deduplication**:
  1. Provider + External ID
  2. Canonical URL
  3. SHA-256 deterministic fingerprint (`normalize(company):normalize(title):city:salaryBracket`)
  - Duplicate sightings are merged into `alternate_sources` JSON array instead of creating duplicates.

## Setup & Running Locally

1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables in `.env`:
   ```env
   HOST=0.0.0.0
   PORT=8000
   INTERNAL_SERVICE_SECRET=trusthire_scraper_dev_secret_2026
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/trusthire
   ```

4. Run the microservice:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

5. Open Swagger Documentation:
   - Interactive UI: `http://localhost:8000/docs`
   - Health Status: `http://localhost:8000/api/v1/health`

## Running Tests

```bash
pytest tests/
```
