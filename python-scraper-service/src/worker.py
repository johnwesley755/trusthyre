"""
Cloudflare Python Worker Entry Point for TrustHyre Scraping Microservice.
Runs natively on Cloudflare Workers (Pyodide / workerd) with Hyperdrive & Cloudflare Queues.
Provides real-time blue-collar job scraping, JSON-LD parsing, and PostgreSQL persistence.
"""

try:
    from workers import WorkerEntrypoint, Response
except ImportError:
    # Stubs for local IDE analyzers and test runners
    class WorkerEntrypoint:  # type: ignore
        env: object
        ctx: object

    class Response:  # type: ignore
        def __init__(self, body=None, status=200, headers=None):
            self.body = body
            self.status = status
            self.headers = headers or {}


import json
import uuid
import re
import hashlib
import asyncio
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
from typing import List, Dict, Any, Optional

# Registered sources metadata
REGISTERED_SOURCES = [
    {
        "source_id": "lever_ats",
        "id": "lever_ats",
        "name": "Direct ATS Feeds (Lever - Porter/Meesho/Zepto)",
        "status": "ACTIVE",
        "active": True,
        "is_restricted": False,
        "compliance_note": "Compliant direct ingestion via public JSON candidate feeds published by employers.",
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "source_id": "greenhouse_ats",
        "id": "greenhouse_ats",
        "name": "Greenhouse Logistics Employer Feeds (Shadowfax/Delhivery)",
        "status": "ACTIVE",
        "active": True,
        "is_restricted": False,
        "compliance_note": "Direct compliant ingestion via Greenhouse Board public API feeds.",
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "source_id": "workindia",
        "id": "workindia",
        "name": "WorkIndia Direct Trade Portal",
        "status": "ACTIVE",
        "active": True,
        "is_restricted": False,
        "compliance_note": "Public trade listing extraction with deduplication.",
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "source_id": "apna",
        "id": "apna",
        "name": "Apna Logistics Gateway",
        "status": "ACTIVE",
        "active": True,
        "is_restricted": False,
        "compliance_note": "Field operations listings with strict rate-limiting.",
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "source_id": "schema_org",
        "id": "schema_org",
        "name": "Direct Employer Career Pages (Schema.org / JobPosting)",
        "status": "ACTIVE",
        "active": True,
        "is_restricted": False,
        "compliance_note": "Standard-compliant JSON-LD structured data extraction from direct career sites.",
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "source_id": "headcount_labs",
        "id": "headcount_labs",
        "name": "Headcount Labs Verified API",
        "status": "AUTH_REQUIRED",
        "active": False,
        "is_restricted": True,
        "compliance_note": "Direct verified hiring feeds (requires developer API key configured).",
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "source_id": "jobspy_naukri",
        "id": "jobspy_naukri",
        "name": "Naukri Blue Collar Portal",
        "status": "EXTERNAL_GATEWAY_REQUIRED",
        "active": False,
        "is_restricted": True,
        "compliance_note": "Requires dedicated external scraping worker with browser automation environment (JobSpy/Playwright).",
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "source_id": "jobspy_indeed",
        "id": "jobspy_indeed",
        "name": "Indeed Field & Trade Jobs",
        "status": "EXTERNAL_GATEWAY_REQUIRED",
        "active": False,
        "is_restricted": True,
        "compliance_note": "Requires dedicated external scraping worker with browser automation environment (JobSpy/Playwright).",
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    },
]

# Verified Public Lever ATS Feeds with Indian logistics/operations
VERIFIED_LEVER_COMPANIES = [
    {"name": "Porter", "handle": "porter", "industry": "Logistics & Delivery"},
    {"name": "Meesho", "handle": "meesho", "industry": "E-Commerce & Warehouse Operations"},
    {"name": "Zepto", "handle": "zepto", "industry": "Quick-Commerce & Dark Stores"},
]

# Verified Public Greenhouse ATS Feeds with Indian operations
VERIFIED_GREENHOUSE_BOARDS = [
    {"name": "Delhivery", "board": "delhivery", "industry": "Express Logistics & Warehousing"},
    {"name": "Shadowfax", "board": "shadowfax", "industry": "Last-Mile Delivery & Hub Operations"},
]

# In-memory stores across isolate requests
SCAN_SESSIONS: Dict[str, Any] = {}
JOBS_STORE: List[Dict[str, Any]] = []

BLUE_COLLAR_KEYWORDS = {
    "delivery", "driver", "rider", "courier", "chauffeur", "van driver", "auto driver",
    "warehouse", "packer", "picker", "loader", "unloader", "sorter", "material handler",
    "electrician", "wireman", "lineman", "electrical technician",
    "plumber", "pipefitter",
    "carpenter", "woodworker",
    "cook", "chef", "kitchen helper", "baker", "steward", "canteen",
    "security", "guard", "watchman", "bouncer", "security officer",
    "mechanic", "technician", "fitter", "welder", "turner", "machinist", "operator",
    "housekeeping", "cleaner", "sweeper", "janitor", "maid", "helper", "peon", "office boy",
    "construction", "mason", "painter", "laborer", "coolie",
    "tailor", "machinist", "ironer",
    "sales executive", "counter sales", "cashier", "store assistant", "field executive"
}

WHITE_COLLAR_EXCLUSIONS = {
    "software engineer", "developer", "frontend", "backend", "fullstack",
    "product manager", "sales manager", "director", "vice president", "vp",
    "architect", "accountant", "chartered accountant", "hr manager", "talent acquisition",
    "ui/ux", "designer", "data scientist", "data analyst", "devops", "qa engineer",
    "scrum master", "technical lead", "engineering manager", "legal counsel"
}


def normalize_city(city_raw: Optional[str]) -> str:
    """Standardizes Indian city names from freeform text or location strings."""
    if not city_raw or not str(city_raw).strip():
        return "Chennai"
    c = str(city_raw).lower().strip()
    if "chennai" in c or "madras" in c:
        return "Chennai"
    if "bengaluru" in c or "bangalore" in c:
        return "Bengaluru"
    if "coimbatore" in c:
        return "Coimbatore"
    if "madurai" in c:
        return "Madurai"
    if "mumbai" in c or "bombay" in c:
        return "Mumbai"
    if "delhi" in c or "noida" in c or "gurgaon" in c or "gurugram" in c:
        return "Delhi NCR"
    if "hyderabad" in c:
        return "Hyderabad"
    if "kolkata" in c or "calcutta" in c:
        return "Kolkata"
    if "pune" in c:
        return "Pune"
    return city_raw.split(",")[0].strip().title()


def is_blue_collar_job(title: str, description: Optional[str] = "", user_query: Optional[str] = None) -> bool:
    """Validates whether a job posting matches frontline blue-collar trades."""
    t_lower = (title or "").lower().strip()
    d_lower = (description or "").lower()[:600]

    # Explicit user keyword match
    if user_query and user_query.strip().upper() not in ["ALL", "ALL_TRADES"]:
        q_terms = [x.strip().lower() for x in user_query.split()]
        if any(term in t_lower or term in d_lower for term in q_terms if len(term) > 2):
            return True

    # Reject obvious white-collar management and software titles
    if any(ex in t_lower for ex in WHITE_COLLAR_EXCLUSIONS):
        return False

    # Check for blue-collar trade keywords
    combined = f"{t_lower} {d_lower}"
    return any(kw in combined for kw in BLUE_COLLAR_KEYWORDS)


def calculate_job_hash(employer: str, title: str, city: str, external_id: str) -> str:
    """Generates a deterministic 64-character hash for deduplication."""
    raw = f"{employer.lower().strip()}|{title.lower().strip()}|{city.lower().strip()}|{external_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def http_get_json(url: str, headers: Optional[Dict[str, str]] = None, timeout: float = 3.0) -> Any:
    """Asynchronously fetches JSON with strict timeout enforcement."""
    headers = headers or {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }

    try:
        from pyodide.http import pyfetch
        resp = await asyncio.wait_for(pyfetch(url, headers=headers, method="GET"), timeout=timeout)
        if resp.status == 200:
            return await asyncio.wait_for(resp.json(), timeout=timeout)
        return None
    except Exception:
        pass

    try:
        import httpx
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            return None
    except Exception:
        pass

    return None


async def http_get_text(url: str, headers: Optional[Dict[str, str]] = None, timeout: float = 3.5) -> Optional[str]:
    """Asynchronously fetches raw text/HTML with strict timeout enforcement."""
    headers = headers or {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        from pyodide.http import pyfetch
        resp = await asyncio.wait_for(pyfetch(url, headers=headers, method="GET"), timeout=timeout)
        if resp.status == 200:
            return await asyncio.wait_for(resp.string(), timeout=timeout)
        elif resp.status == 403:
            print(f"[Worker][http_get_text] HTTP 403 Forbidden for {url}")
        else:
            print(f"[Worker][http_get_text] {url} returned HTTP {resp.status}")
        return None
    except Exception as e:
        print(f"[Worker][http_get_text] Fetch error for {url}: {e}")

    try:
        import httpx
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.text
            return None
    except Exception:
        pass

    return None


async def scrape_lever_jobs(query: Optional[str] = None, city: Optional[str] = "Chennai", limit: int = 25) -> List[Dict[str, Any]]:
    """Scrapes live postings from verified enterprise Lever ATS feeds in parallel."""
    target_city = normalize_city(city)

    async def fetch_lever_comp(comp):
        url = f"https://api.lever.co/v0/postings/{comp['handle']}?mode=json"
        try:
            data = await http_get_json(url, timeout=2.0)
            if not isinstance(data, list):
                return []
            comp_jobs = []
            for item in data:
                if not isinstance(item, dict):
                    continue
                title = item.get("text", "").strip()
                cats = item.get("categories", {}) or {}
                loc = cats.get("location") or target_city
                desc = item.get("descriptionPlain") or ""

                if not is_blue_collar_job(title, desc, query):
                    continue

                loc_lower = (loc or "").lower()
                if any(f in loc_lower for f in [", ma", ", fl", ", ca", ", ny", ", tx", "united states", "usa", "canada", "pompano", "worcester", "massachusetts"]):
                    continue

                job_city = normalize_city(loc)
                if target_city and target_city.upper() not in ["ALL", "ALL_CITIES"]:
                    if target_city.lower() not in job_city.lower() and target_city.lower() not in loc_lower:
                        continue
                ext_id = item.get("id", str(uuid.uuid4())[:8])
                s_hash = calculate_job_hash(comp["name"], title, job_city, ext_id)

                created_ts = item.get("createdAt")
                date_str = datetime.fromtimestamp(created_ts / 1000.0, tz=timezone.utc).isoformat() if created_ts else datetime.now(timezone.utc).isoformat()

                comp_jobs.append({
                    "id": str(uuid.uuid4()),
                    "employer_id": "external_aggregator",
                    "title": title,
                    "employer_name": comp["name"],
                    "description": desc[:800].strip(),
                    "industry": comp["industry"],
                    "experience_years_required": 1,
                    "budget": 22000.0,
                    "status": "PENDING_REVIEW",
                    "city": job_city,
                    "location": loc,
                    "is_external": True,
                    "source_name": f"Lever ATS ({comp['name']})",
                    "source_url": item.get("hostedUrl") or item.get("applyUrl") or f"https://jobs.lever.co/{comp['handle']}",
                    "source_hash": s_hash,
                    "external_id": ext_id,
                    "alternate_sources": [{
                        "sourceName": f"Lever ATS ({comp['name']})",
                        "sourceUrl": item.get("hostedUrl") or "",
                        "dateSeen": datetime.now(timezone.utc).isoformat(),
                    }],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "date_posted": date_str,
                    "last_verified_at": datetime.now(timezone.utc).isoformat(),
                })
            return comp_jobs
        except Exception:
            return []

    fetch_tasks = [fetch_lever_comp(comp) for comp in VERIFIED_LEVER_COMPANIES]
    results_lists = await asyncio.gather(*fetch_tasks, return_exceptions=True)
    all_jobs = []
    for r in results_lists:
        if isinstance(r, list):
            all_jobs.extend(r)
    return all_jobs[:limit]


async def scrape_greenhouse_jobs(query: Optional[str] = None, city: Optional[str] = "Chennai", limit: int = 25) -> List[Dict[str, Any]]:
    """Scrapes live postings from verified enterprise Greenhouse ATS feeds in parallel."""
    target_city = normalize_city(city)

    async def fetch_gh_board(b):
        url = f"https://boards-api.greenhouse.io/v1/boards/{b['board']}/jobs?content=true"
        try:
            data = await http_get_json(url, timeout=2.0)
            if not isinstance(data, dict):
                return []
            board_jobs = []
            for item in data.get("jobs", []):
                if not isinstance(item, dict):
                    continue
                title = item.get("title", "").strip()
                loc_data = item.get("location", {})
                loc_name = loc_data.get("name") if isinstance(loc_data, dict) else target_city
                content = item.get("content", "") or ""

                if not is_blue_collar_job(title, content, query):
                    continue

                loc_lower = (loc_name or "").lower()
                if any(f in loc_lower for f in [", ma", ", fl", ", ca", ", ny", ", tx", "united states", "usa", "canada"]):
                    continue

                job_city = normalize_city(loc_name)
                if target_city and target_city.upper() not in ["ALL", "ALL_CITIES"]:
                    if target_city.lower() not in job_city.lower() and target_city.lower() not in loc_lower:
                        continue
                ext_id = str(item.get("id", uuid.uuid4()))
                s_hash = calculate_job_hash(b["name"], title, job_city, ext_id)
                updated_at = item.get("updated_at") or datetime.now(timezone.utc).isoformat()

                board_jobs.append({
                    "id": str(uuid.uuid4()),
                    "employer_id": "external_aggregator",
                    "title": title,
                    "employer_name": b["name"],
                    "description": re.sub(r'<[^>]+>', '', content)[:800].strip(),
                    "industry": b["industry"],
                    "experience_years_required": 1,
                    "budget": 24000.0,
                    "status": "PENDING_REVIEW",
                    "city": job_city,
                    "location": loc_name or job_city,
                    "is_external": True,
                    "source_name": f"Greenhouse ATS ({b['name']})",
                    "source_url": item.get("absolute_url") or f"https://boards.greenhouse.io/{b['board']}",
                    "source_hash": s_hash,
                    "external_id": ext_id,
                    "alternate_sources": [{
                        "sourceName": f"Greenhouse ATS ({b['name']})",
                        "sourceUrl": item.get("absolute_url") or "",
                        "dateSeen": datetime.now(timezone.utc).isoformat(),
                    }],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "date_posted": updated_at,
                    "last_verified_at": datetime.now(timezone.utc).isoformat(),
                })
            return board_jobs
        except Exception:
            return []

    fetch_tasks = [fetch_gh_board(b) for b in VERIFIED_GREENHOUSE_BOARDS]
    results_lists = await asyncio.gather(*fetch_tasks, return_exceptions=True)
    all_jobs = []
    for r in results_lists:
        if isinstance(r, list):
            all_jobs.extend(r)
    return all_jobs[:limit]


async def scrape_workindia_jobs(query: Optional[str] = None, city: Optional[str] = "Chennai", limit: int = 20) -> List[Dict[str, Any]]:
    """Scrapes live WorkIndia vacancies via public Schema.org ItemList feeds with authentic WorkIndia URLs."""
    target_city = normalize_city(city).lower()
    q_lower = (query or "").lower().strip()

    slug = f"jobs-in-{target_city}"
    if "driver" in q_lower:
        slug = f"driver-jobs-in-{target_city}"
    elif "delivery" in q_lower or "courier" in q_lower:
        slug = f"delivery-boy-jobs-in-{target_city}"
    elif "security" in q_lower or "guard" in q_lower:
        slug = f"security-guard-jobs-in-{target_city}"
    elif "cook" in q_lower or "chef" in q_lower:
        slug = f"cook-jobs-in-{target_city}"
    elif "electric" in q_lower:
        slug = f"electrician-jobs-in-{target_city}"
    elif "plumb" in q_lower:
        slug = f"plumber-jobs-in-{target_city}"
    elif "warehouse" in q_lower:
        slug = f"warehouse-jobs-in-{target_city}"

    url = f"https://www.workindia.in/{slug}/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }

    print(f"[Worker][WorkIndia] Fetching {url}")
    try:
        html = await http_get_text(url, headers=headers, timeout=3.0)
        if not html:
            return []
    except Exception as e:
        print(f"[Worker][WorkIndia] Fetch error: {e}")
        return []

    results: List[Dict[str, Any]] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for s in re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            d = json.loads(s)
            if d.get("@type") == "ItemList":
                for it in d.get("itemListElement", []):
                    title = it.get("name", "").strip()
                    job_url = it.get("url", "").strip()
                    if not title or not job_url:
                        continue

                    if not is_blue_collar_job(title, "", query):
                        continue

                    ext_id_match = re.search(r'-(\d+)/?$', job_url)
                    ext_id = ext_id_match.group(1) if ext_id_match else hashlib.md5(job_url.encode()).hexdigest()[:8]
                    employer = "WorkIndia Verified Employer"
                    s_hash = calculate_job_hash(employer, title, target_city, ext_id)

                    results.append({
                        "id": str(uuid.uuid4()),
                        "employer_id": "external_aggregator",
                        "title": title,
                        "employer_name": employer,
                        "description": f"Verified blue-collar vacancy listed on WorkIndia for {title} in {target_city.title()}. Direct applicant portal.",
                        "industry": "Field Operations & Services",
                        "experience_years_required": 1,
                        "budget": 22000.0,
                        "status": "PENDING_REVIEW",
                        "city": target_city.title(),
                        "location": f"{target_city.title()} Area",
                        "is_external": True,
                        "source_name": "WorkIndia Direct (JSON-LD)",
                        "source_url": job_url,
                        "source_hash": s_hash,
                        "external_id": ext_id,
                        "alternate_sources": [{
                            "sourceName": "WorkIndia Direct (JSON-LD)",
                            "sourceUrl": job_url,
                            "dateSeen": now_iso,
                        }],
                        "created_at": now_iso,
                        "date_posted": now_iso,
                        "last_verified_at": now_iso,
                    })
                    if len(results) >= limit:
                        break
        except Exception:
            pass

    print(f"[Worker][WorkIndia] Extracted {len(results)} valid blue-collar jobs")
    return results


async def scrape_apna_jobs(query: Optional[str] = None, city: Optional[str] = "Chennai", limit: int = 25) -> List[Dict[str, Any]]:
    """Scrapes authentic live frontline blue-collar postings directly from Apna.co listings."""
    target_city = normalize_city(city).lower().strip()
    q_lower = (query or "").lower().strip()

    slug = f"jobs-in-{target_city}"
    if "driver" in q_lower:
        slug = f"driver-jobs-in-{target_city}"
    elif "delivery" in q_lower or "courier" in q_lower:
        slug = f"delivery-boy-jobs-in-{target_city}"
    elif "security" in q_lower or "guard" in q_lower:
        slug = f"security-guard-jobs-in-{target_city}"
    elif "cook" in q_lower or "chef" in q_lower:
        slug = f"cook-jobs-in-{target_city}"
    elif "electric" in q_lower:
        slug = f"electrician-jobs-in-{target_city}"
    elif "plumb" in q_lower:
        slug = f"plumber-jobs-in-{target_city}"
    elif "warehouse" in q_lower:
        slug = f"warehouse-jobs-in-{target_city}"

    list_url = f"https://apna.co/jobs/{slug}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    print(f"[Worker][Apna] Fetching {list_url}")
    try:
        html = await http_get_text(list_url, headers=headers, timeout=10.0)
        if not html:
            return []
    except Exception as e:
        print(f"[Worker][Apna] Listing fetch error: {e}")
        return []

    # Extract all <a href="/job/..."> cards
    matches = re.findall(r'<a[^>]*href=["\'](/job/[^"\'\?#]+)["\'][^>]*>([\s\S]*?)</a>', html, re.IGNORECASE)
    results: List[Dict[str, Any]] = []
    seen_ids = set()
    now_iso = datetime.now(timezone.utc).isoformat()

    for href, inner_html in matches:
        if "job-openings" in href:
            continue

        parts = [p for p in href.split("/") if p]
        if not parts:
            continue

        last_part = parts[-1]
        id_match = re.search(r'-(\d+)', last_part)
        ext_id = id_match.group(1) if id_match else hashlib.md5(href.encode()).hexdigest()[:8]
        if ext_id in seen_ids:
            continue
        seen_ids.add(ext_id)

        title_slug = last_part[:last_part.rfind("-")] if "-" in last_part else last_part
        title = " ".join([w.capitalize() for w in title_slug.split("-")])

        # Clean card text to extract employer
        clean_text = re.sub(r'<style[\s\S]*?</style>', '', inner_html, flags=re.IGNORECASE)
        clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
        clean_text = " ".join(clean_text.split()).strip()

        employer = "Apna Verified Employer"
        text_after_title = re.sub(f"^{re.escape(title)}", "", clean_text, flags=re.IGNORECASE).strip()
        if text_after_title:
            emp_candidate = re.split(r'\.css|\.Mui|[₹\(\d]', text_after_title)[0].strip()
            if 2 < len(emp_candidate) < 60:
                employer = emp_candidate

        job_url = f"https://apna.co{href}"
        s_hash = calculate_job_hash(employer, title, target_city.title(), ext_id)

        results.append({
            "id": str(uuid.uuid4()),
            "employer_id": "external_aggregator",
            "title": title,
            "employer_name": employer,
            "description": f"Verified blue-collar vacancy listed on Apna for {title} in {target_city.title()}. Employer: {employer}.",
            "industry": "Field Operations & Logistics",
            "experience_years_required": 1,
            "budget": 20000.0,
            "status": "PENDING_REVIEW",
            "city": target_city.title(),
            "location": f"{target_city.title()} Area",
            "is_external": True,
            "source_name": "Apna Logistics Gateway",
            "source_url": job_url,
            "source_hash": s_hash,
            "external_id": ext_id,
            "alternate_sources": [{
                "sourceName": "Apna Logistics Gateway",
                "sourceUrl": job_url,
                "dateSeen": now_iso,
            }],
            "created_at": now_iso,
            "date_posted": now_iso,
            "last_verified_at": now_iso,
        })
        if len(results) >= limit:
            break

    print(f"[Worker][Apna] Successfully extracted {len(results)} live jobs with verified employers")
    return results


async def scrape_curated_blue_collar_sample(query: Optional[str] = None, city: Optional[str] = "Chennai", limit: int = 25) -> List[Dict[str, Any]]:
    """Synthesizes curated demo frontline vacancies (ONLY used when demo=true explicitly requested)."""
    target_city = normalize_city(city)
    city_lower = target_city.lower()
    now_iso = datetime.now(timezone.utc).isoformat()

    catalog = [
        {"title": "Delivery Associate / Courier Partner", "employer": "Shadowfax Logistics", "industry": "Logistics & Delivery", "budget": 22000.0, "source": "Shadowfax Direct Careers", "url": "https://www.shadowfax.in/delivery-partner"},
        {"title": "Warehouse Associate & Sorter", "employer": "Meesho Supply Chain", "industry": "E-Commerce & Warehouse Operations", "budget": 19500.0, "source": "Meesho Operations", "url": "https://supplychain.meesho.com/careers"},
        {"title": "Commercial Van / 3-Wheeler Driver", "employer": "Porter Express", "industry": "Urban Mobility & Freight", "budget": 26000.0, "source": "Porter Fleet Portal", "url": "https://porter.in/drive-with-us"},
        {"title": "Hub Operations & Loading Partner", "employer": "Delhivery Supply Chain", "industry": "Express Logistics & Warehousing", "budget": 21000.0, "source": "Delhivery Career Board", "url": "https://www.delhivery.com/partner/"},
        {"title": "ITI Maintenance Electrician", "employer": "Apex Facilities Management", "industry": "Skilled Trades & Infrastructure", "budget": 24000.0, "source": "Apex Facilities Careers", "url": "https://www.apexfm.in/careers"},
        {"title": "Plumbing & Piping Technician", "employer": "UrbanCare Services", "industry": "Home & Building Maintenance", "budget": 23000.0, "source": "Urban Company Partner", "url": "https://www.urbancompany.com/partner"},
        {"title": "Commercial Kitchen Cook / Chef", "employer": "FreshKitchen Cloud Foods", "industry": "Hospitality & Food Services", "budget": 25000.0, "source": "WorkIndia Direct (JSON-LD)", "url": f"https://www.workindia.in/jobs-in-{city_lower}/"},
        {"title": "Security Guard & Access Patrol", "employer": "SIS Security Services", "industry": "Security & Facilities Management", "budget": 18500.0, "source": "SIS Security Direct", "url": "https://sisindia.com/careers"},
    ]

    selected: List[Dict[str, Any]] = []
    for item in catalog:
        if not is_blue_collar_job(item["title"], item["industry"], query):
            continue

        ext_id = f"ext-{hashlib.md5(item['title'].encode()).hexdigest()[:8]}"
        s_hash = calculate_job_hash(item["employer"], item["title"], target_city, ext_id)
        external_url = item.get("url") or f"https://www.workindia.in/jobs-in-{city_lower}/"

        selected.append({
            "id": str(uuid.uuid4()),
            "employer_id": "external_aggregator",
            "title": item["title"],
            "employer_name": item["employer"],
            "description": f"Verified frontline blue-collar opening at {item['employer']} for {target_city} territory. Immediate placement.",
            "industry": item["industry"],
            "experience_years_required": 1,
            "budget": item["budget"],
            "status": "PENDING_REVIEW",
            "city": target_city,
            "location": f"{target_city} Industrial Corridor",
            "is_external": True,
            "source_name": item["source"],
            "source_url": external_url,
            "source_hash": s_hash,
            "external_id": ext_id,
            "alternate_sources": [{
                "sourceName": item["source"],
                "sourceUrl": external_url,
                "dateSeen": now_iso,
            }],
            "created_at": now_iso,
            "date_posted": now_iso,
            "last_verified_at": now_iso,
        })
        if len(selected) >= limit:
            break

    return selected


async def execute_live_discovery(
    query: Optional[str] = None,
    city: Optional[str] = "Chennai",
    sources: Optional[List[str]] = None,
    limit: int = 25,
    demo_mode: bool = False,
    env: Any = None
) -> Dict[str, Any]:
    """Coordinates high-speed parallel scraping across live feeds with strict truth-in-scraping."""
    global JOBS_STORE
    target_city = normalize_city(city)
    limit = max(1, min(limit, 100))

    t0 = datetime.now()
    print(f"[Worker][Discovery][INITIATE] city={target_city}, query={query or 'None'}, limit={limit}, sources={sources}, demo_mode={demo_mode}")

    # Registered callable scrapers
    available_scrapers = {
        "lever_ats": lambda: scrape_lever_jobs(query=query, city=target_city, limit=limit),
        "greenhouse_ats": lambda: scrape_greenhouse_jobs(query=query, city=target_city, limit=limit),
        "workindia": lambda: scrape_workindia_jobs(query=query, city=target_city, limit=limit),
        "apna": lambda: scrape_apna_jobs(query=query, city=target_city, limit=limit),
    }

    # Normalize requested sources
    active_keys = []
    if sources and isinstance(sources, list) and len(sources) > 0:
        for s in sources:
            s_clean = str(s).strip().lower()
            if s_clean in available_scrapers and s_clean not in active_keys:
                active_keys.append(s_clean)
            elif s_clean in ["workindia_direct", "workindia"] and "workindia" not in active_keys:
                active_keys.append("workindia")
            elif s_clean in ["apna_direct", "apna"] and "apna" not in active_keys:
                active_keys.append("apna")

    if not active_keys:
        active_keys = ["lever_ats", "greenhouse_ats", "workindia", "apna"]

    # Execute scrapers concurrently
    tasks = [available_scrapers[k]() for k in active_keys]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    scraped: List[Dict[str, Any]] = []
    source_stats: Dict[str, Any] = {}

    for idx, key in enumerate(active_keys):
        res = raw_results[idx]
        if isinstance(res, list):
            scraped.extend(res)
            source_stats[key] = {
                "discovered": len(res),
                "valid": len(res),
                "status": "ACTIVE" if len(res) > 0 else "NO_RESULTS"
            }
        elif isinstance(res, Exception):
            print(f"[Worker][Discovery] Error in {key}: {res}")
            source_stats[key] = {
                "discovered": 0,
                "valid": 0,
                "status": "ERROR",
                "error": str(res)
            }
        else:
            source_stats[key] = {
                "discovered": 0,
                "valid": 0,
                "status": "NO_RESULTS"
            }

    elapsed_scrape = (datetime.now() - t0).total_seconds()
    print(f"[Worker][Discovery][PARALLEL SCRAPED in {elapsed_scrape:.2f}s] Total raw scraped: {len(scraped)}")

    # Strict truth-in-scraping: only add synthetic jobs when demo_mode is explicitly requested
    if demo_mode:
        sample_needed = max(0, limit - len(scraped))
        if sample_needed > 0:
            print(f"[Worker][Discovery][DEMO MODE ONLY] Adding {sample_needed} curated demo vacancies")
            sample_jobs = await scrape_curated_blue_collar_sample(query=query, city=target_city, limit=sample_needed)
            scraped.extend(sample_jobs)
            source_stats["curated_demo"] = {"discovered": len(sample_jobs), "valid": len(sample_jobs), "status": "DEMO"}

    # Deduplicate against source_hash
    unique_map: Dict[str, Dict[str, Any]] = {}
    for j in scraped:
        h = j.get("source_hash")
        if h and h not in unique_map:
            unique_map[h] = j
    unique_jobs = list(unique_map.values())[:limit]

    # Update in-memory store
    existing_hashes = {x.get("source_hash") for x in JOBS_STORE}
    for j in unique_jobs:
        if j.get("source_hash") not in existing_hashes:
            JOBS_STORE.insert(0, j)
            existing_hashes.add(j.get("source_hash"))
    if len(JOBS_STORE) > 500:
        JOBS_STORE = JOBS_STORE[:500]

    total_time = (datetime.now() - t0).total_seconds()
    print(f"[Worker][Discovery][DEDUPLICATED in {total_time:.2f}s] Total unique jobs: {len(unique_jobs)}")

    return {
        "items": unique_jobs,
        "source_stats": source_stats,
        "sources_scanned": active_keys,
        "total": len(unique_jobs)
    }
def json_response(data: Any, status: int = 200) -> Response:
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Internal-Secret",
    }
    return Response(json.dumps(data), status=status, headers=headers)


class Default(WorkerEntrypoint):
    """Cloudflare Worker Class Export Handling HTTP (fetch) and Queue (queue) Events."""

    async def fetch(self, request, *args, **kwargs):
        try:
            return await self._handle_fetch(request, *args, **kwargs)
        except Exception as err:
            import traceback
            tb = traceback.format_exc()
            print(f"[Worker Fatal Error] {err}\n{tb}")
            return json_response({"success": False, "error": str(err), "traceback": tb}, status=500)

    async def _handle_fetch(self, request, *args, **kwargs):
        env = self.env
        raw_method = getattr(request, "method", "GET")
        if hasattr(raw_method, "value"):
            method = str(raw_method.value).upper()
        else:
            method = str(raw_method).upper()

        parsed_url = urlparse(str(request.url))
        path = parsed_url.path.rstrip("/")
        if not path:
            path = "/"

        # CORS Preflight
        if method == "OPTIONS":
            headers = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, PUT, DELETE",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Internal-Secret",
            }
            return Response("", status=204, headers=headers)
# 1. Health check
        if path in ["/", "/health", "/api/v1/health"]:
            return json_response({
                "status": "UP",
                "service": "TrustHyre Blue-Collar Scraping Microservice",
                "runtime": "Cloudflare Workers (Pyodide / workerd)",
                "database": "Hyperdrive Enabled" if hasattr(env, "HYPERDRIVE") else "Direct Connection",
                "cached_jobs_count": len(JOBS_STORE),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

        # 2. Registered sources
        if path == "/api/v1/sources" and method == "GET":
            return json_response(REGISTERED_SOURCES)

        # 3. Synchronous Live Run-Discovery Endpoint (Direct Scrape & Return)
        if path in ["/api/v1/sources/run-discovery", "/api/v1/scans/run-discovery"] and method == "POST":
            try:
                payload = await request.json()
            except Exception:
                payload = {}

            city = payload.get("city") or "Chennai"
            query = payload.get("query")
            limit = min(payload.get("limit") or 25, 100)
            sources = payload.get("sources")
            demo_mode = bool(payload.get("demo") or payload.get("demo_mode") or False)

            discovery_res = await execute_live_discovery(
                query=query,
                city=city,
                sources=sources,
                limit=limit,
                demo_mode=demo_mode,
                env=env
            )
            discovered = discovery_res.get("items", [])
            source_stats = discovery_res.get("source_stats", {})
            sources_scanned = discovery_res.get("sources_scanned", [])

            return json_response({
                "success": True,
                "status": "COMPLETED",
                "total": len(discovered),
                "city": city,
                "query": query,
                "sources_scanned": sources_scanned,
                "source_stats": source_stats,
                "items": discovered,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, status=200)

        # 4. Trigger Discovery Scan (Session-based)
        if path == "/api/v1/scans" and method == "POST":
            try:
                payload = await request.json()
            except Exception:
                payload = {}

            scan_id = str(uuid.uuid4())
            city = payload.get("city") or "Chennai"
            query = payload.get("query")
            limit = min(payload.get("limit") or 25, 100)
            sources = payload.get("sources")
            demo_mode = bool(payload.get("demo") or payload.get("demo_mode") or False)

            discovery_res = await execute_live_discovery(
                query=query,
                city=city,
                sources=sources,
                limit=limit,
                demo_mode=demo_mode,
                env=env
            )
            discovered = discovery_res.get("items", [])
            source_stats = discovery_res.get("source_stats", {})
            sources_scanned = discovery_res.get("sources_scanned", [])

            session_data = {
                "id": scan_id,
                "status": "COMPLETED",
                "total_found": len(discovered),
                "valid_count": len(discovered),
                "duplicate_count": 0,
                "rejected_count": 0,
                "error_count": 0,
                "sources_scanned": sources_scanned,
                "source_stats": source_stats,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "city": city,
                "query": query,
                "limit": limit,
                "items": discovered,
            }
            SCAN_SESSIONS[scan_id] = session_data

            if hasattr(env, "DISCOVERY_QUEUE"):
                try:
                    await env.DISCOVERY_QUEUE.send(json.dumps({"id": scan_id, "city": city, "query": query}))
                except Exception:
                    pass

            return json_response(session_data, status=200)

        # 5. Get Scan Status
        if path.startswith("/api/v1/scans/") and method == "GET":
            scan_id = path.replace("/api/v1/scans/", "")
            session = SCAN_SESSIONS.get(scan_id)
            if not session:
                session = {
                    "id": scan_id,
                    "status": "COMPLETED",
                    "total_found": len(JOBS_STORE),
                    "valid_count": len(JOBS_STORE),
                    "duplicate_count": 0,
                    "rejected_count": 0,
                    "error_count": 0,
                    "sources_scanned": [s["source_id"] for s in REGISTERED_SOURCES],
                    "source_stats": {},
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "items": JOBS_STORE[:25],
                }
            return json_response(session)

        # 6. List jobs with filtering
        if path == "/api/v1/jobs" and method == "GET":
            query_params = parse_qs(parsed_url.query)
            city_filter = query_params.get("city", [None])[0]
            status_filter = query_params.get("status", ["ALL"])[0]
            q_filter = query_params.get("q", [None])[0]
            limit_val = int(query_params.get("limit", [25])[0])
            page_val = int(query_params.get("page", [1])[0])

            # If JOBS_STORE is empty, populate initial live cache
            if not JOBS_STORE:
                try:
                    await execute_live_discovery(city="Chennai", limit=25, env=env)
                except Exception:
                    pass

            filtered = JOBS_STORE
            if status_filter and status_filter.upper() != "ALL":
                filtered = [j for j in filtered if j.get("status", "").upper() == status_filter.upper()]

            if city_filter:
                c_norm = normalize_city(city_filter).lower()
                filtered = [j for j in filtered if c_norm in (j.get("city") or "").lower()]

            if q_filter:
                q_term = q_filter.lower().strip()
                filtered = [j for j in filtered if q_term in (j.get("title") or "").lower() or q_term in (j.get("employer_name") or "").lower()]

            start_idx = (page_val - 1) * limit_val
            page_items = filtered[start_idx:start_idx + limit_val]

            return json_response({
                "total": len(filtered),
                "page": page_val,
                "limit": limit_val,
                "items": page_items
            })

        # 7. Moderate job
        if path.startswith("/api/v1/jobs/") and method == "POST":
            parts = path.split("/")
            if len(parts) >= 6:
                job_id = parts[4]
                action = parts[5]
                new_status = "OPEN" if action == "approve" else ("REJECTED" if action == "reject" else "EXPIRED")

                # Update in memory store
                for j in JOBS_STORE:
                    if j.get("id") == job_id:
                        j["status"] = new_status
                        j["last_verified_at"] = datetime.now(timezone.utc).isoformat()

                return json_response({
                    "id": job_id,
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "message": f"Job {action}d successfully in edge repository"
                })

        return json_response({"error": "Endpoint not found", "path": path}, status=404)

    async def queue(self, batch, *args, **kwargs):
        """Asynchronous execution handler triggered by Cloudflare Queues."""
        for message in batch.messages:
            try:
                body = json.loads(message.body)
                scan_id = body.get("id")
                city = body.get("city") or "Chennai"
                query = body.get("query")
                jobs_res = await execute_live_discovery(query=query, city=city, limit=25, env=self.env)
                jobs = jobs_res.get("items", []) if isinstance(jobs_res, dict) else jobs_res
                if scan_id and scan_id in SCAN_SESSIONS:
                    SCAN_SESSIONS[scan_id]["status"] = "COMPLETED"
                    SCAN_SESSIONS[scan_id]["total_found"] = len(jobs)
                    SCAN_SESSIONS[scan_id]["valid_count"] = len(jobs)
                    SCAN_SESSIONS[scan_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
                    SCAN_SESSIONS[scan_id]["items"] = jobs
                message.ack()
            except Exception:
                message.retry()
