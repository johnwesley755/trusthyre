# TrustHyre — Indian Blue-Collar Job Source Research Report

**Research Date:** October 24, 2026  
**Target Geographies:** Chennai, Coimbatore, Madurai, Pan-Tamil Nadu, India  
**Target Job Sectors:** Delivery & Logistics, Warehouse & Factory, Security & Facilities, Skilled Trades (ITI/Technicians), Construction  
**Compliance Standard:** Ethical public aggregation, zero CAPTCHA bypass, zero TOS violations, explicit API & structured feed integration  

---

## Executive Summary & Source Classification Matrix

| Source Identifier | Source Name | Category | Primary Focus | Auth / Access Mechanism | Current Operational Status | Integration Route |
|---|---|---|---|---|---|---|
| `jobvetta` | Jobvetta API | Group A: Job-Data API | India-specific live employer career postings | REST API / Bearer Token (`JOBVETTA_API_KEY`) | `SUPPORTED` (Requires API Key) | Official JSON REST API (`https://api.jobvetta.com/v1`) |
| `headcount_labs` | Headcount Labs API | Group A: Job-Data API | Aggregated multi-ATS enterprise postings | REST API / Bearer Token (`HEADCOUNTLABS_API_KEY`) | `SUPPORTED` (Requires API Key) | Official JSON REST API (`https://api.headcountlabs.com/v1/jobs`) |
| `lever_ats` | Lever Enterprise ATS | Group D: Direct ATS | Porter, Meesho, regional logistics feeds | Public unauthenticated employer JSON endpoints | `ACTIVE` | Direct public JSON feed consumption |
| `greenhouse_ats` | Greenhouse Logistics ATS | Group D: Direct ATS | Shadowfax, Delhivery logistics feeds | Public Greenhouse Board JSON API | `ACTIVE` | Direct public Board API (`boards-api.greenhouse.io`) |
| `schema_org` | Schema.org Public Feeds | Group D: Structured Web | Verified employer career portals | Permitted public JSON-LD JobPosting metadata | `ACTIVE` | Universal HTML JSON-LD microdata extractor |
| `workindia` | WorkIndia Verified Portal | Group C: Major Portal | Blue/Grey collar hyperlocal | Cloudflare WAF + Mobile app API | `PERMISSION_REQUIRED` | Formal B2B Enterprise Partner Agreement |
| `apna` | Apna.co Verified Gateway | Group C: Major Portal | Frontline & skilled roles in Tier 1/2 India | Cloudflare + Auth wall | `PERMISSION_REQUIRED` | Formal B2B Enterprise Partner Agreement |
| `jobhai` | Job Hai (InfoEdge) | Group C: Major Portal | Hyperlocal blue-collar (delivery, drivers) | Cloudflare + Anti-automation TOS | `PERMISSION_REQUIRED` | Formal B2B Enterprise Partner Agreement |
| `naukri` | Naukri.com Enterprise | Group C: Major Portal | General Indian employment | Akamai Bot Manager + Legal restrictions | `PERMISSION_REQUIRED` | InfoEdge Resdex / Official Recruiter API |
| `ncs_gov` | National Career Service (NCS) | Group B: Regional/Govt | Government & registered MSME vacancies | Ministry of Labour & Employment institutional API | `AUTH_REQUIRED` | Institutional API registration under NCS Scheme |
| `lokal_jobs` | Lokal Jobs App | Group B: Regional Platform | Hyperlocal district/vernacular jobs | Native mobile app only (no open web API) | `UNAVAILABLE` | Direct mobile SDK or partnership |
| `nithra_jobs` | Nithra Jobs Tamil Nadu | Group B: Regional Platform | Tamil Nadu district jobs (Chennai, Madurai) | Native Android app (Tamil vernacular) | `UNAVAILABLE` | Direct commercial partnership with Nithra Edu |
| `vahan` | Vahan.co Blue-Collar | Group B: Regional Platform | Gig economy delivery & driver onboarding | WhatsApp bot / Partner onboarding portal | `PERMISSION_REQUIRED` | Enterprise employer partner agreement |
| `quikr_jobs` | Quikr Jobs Classifieds | Group B: Regional Platform | Local classified listings | Anti-scraping terms + Cloudflare mitigation | `PERMISSION_REQUIRED` | Quikr Developer API / Commercial feed |
| `workmithra` | WorkMithra | Group B: Regional Platform | South Indian blue-collar listings | Web portal with strict TOS | `PERMISSION_REQUIRED` | Written publisher authorization |
| `myjobee` / `jobsupi` | MyJobee / JobsUPI | Group B: Regional Platform | Niche blue-collar portals | Web listing aggregator without public API | `PERMISSION_REQUIRED` | Written publisher authorization |

---

## Detailed Source-by-Source Investigation

### 1. Group A: Job-Data APIs

#### 1.1 Jobvetta API
* **Official URL:** `https://www.jobvetta.com/` | **Docs:** `https://www.jobvetta.com/api` & `https://www.jobvetta.com/docs`
* **Geographic Coverage:** Exclusively India. Queries targeting locations outside India return no records.
* **Blue-Collar Relevance:** Medium-High. Aggregates directly from corporate career pages of logistics, retail, manufacturing, and field services across Indian Tier 1 & Tier 2 cities (Chennai, Coimbatore, Bengaluru, Hyderabad).
* **Access & Authentication:**
  - Standard HTTP REST: `Authorization: Bearer <JOBVETTA_API_KEY>`
  - Base URL: `https://api.jobvetta.com/v1/jobs`
  - Free Tier Allowance: 50 requests per UTC day.
* **Fields Captured:** Normalized job title, employer name, city, state, work model, original publication date, salary min/max (when declared), direct canonical URL.
* **Rate Limits & Constraints:** 50 req/day on free tier; paginated with `limit` (max 50) and `offset`.
* **Legal & Republication Status:** Permitted for discovery and aggregation under Jobvetta API terms of service.
* **Integration Decision:** **Supported**. Created dedicated adapter `JobvettaAdapter`. Operates when `JOBVETTA_API_KEY` is provided; safely reports `AUTH_REQUIRED` when unconfigured.

#### 1.2 Headcount Labs Jobs API
* **Official URL:** `https://headcountlabs.com/` | **Docs:** `https://headcountlabs.com/docs/`
* **Geographic Coverage:** Global catalog containing millions of live job postings, with filterable country and city attributes for India.
* **Blue-Collar Relevance:** Medium. Extensive indexing of enterprise ATS boards (Greenhouse, Lever, Workday, iCIMS, Ashby) covering Indian operations of major supply-chain, logistics, and retail multinationals.
* **Access & Authentication:**
  - Standard HTTP REST: `Authorization: Bearer jc_live_<KEY>`
  - Base URL: `https://api.headcountlabs.com/v1/jobs`
  - Filter: `currentness=current&country=IN`
  - Free Tier Allowance: 100,000 records per UTC calendar month.
* **Fields Captured:** Job ID (`job_id`), title, company name, location/city, absolute application URL, source ATS identifier, first observed date, last observed date.
* **Rate Limits & Constraints:** 30–60 requests per minute; returns HTTP 429 with `Retry-After` if exceeded. 10-second query timeout.
* **Legal & Republication Status:** Commercial data provider permitting programmatic display with source attribution.
* **Integration Decision:** **Supported**. Created dedicated adapter `HeadcountLabsAdapter`. Operates when `HEADCOUNTLABS_API_KEY` is provided; safely reports `AUTH_REQUIRED` when unconfigured.

---

### 2. Group B: Regional & Vernacular Indian Job Platforms

#### 2.1 National Career Service (NCS - Ministry of Labour & Employment)
* **Official URL:** `https://www.ncs.gov.in/`
* **Geographic Coverage:** Pan-India, with dedicated district employment exchange data across Tamil Nadu (Chennai, Coimbatore, Madurai, Salem, Tiruppur).
* **Blue-Collar Relevance:** Very High. Covers ITI trades, security, construction, drivers, textile workers, and government contractor requisitions.
* **Access & Authentication:** Does not provide an unauthenticated open public REST endpoint. Requires institutional API registration under the National Career Service Portal Data Sharing Policy.
* **Integration Decision:** Marked **`AUTH_REQUIRED`**. No unofficial web scraping allowed due to government IT security policies. Adapter stub built to report requirements.

#### 2.2 Lokal Jobs & Nithra Jobs
* **Official URLs:**
  - Lokal: `https://play.google.com/store/apps/details?id=get.lokal.localjobs`
  - Nithra: `https://play.google.com/store/apps/details?id=nithra.jobs.career.placement`
* **Geographic Coverage:** Hyperlocal Tamil Nadu districts (Madurai, Coimbatore, Tiruchirappalli, Salem, Tirunelveli).
* **Blue-Collar Relevance:** Exceptional for rural and semi-urban Tamil Nadu blue-collar labor.
* **Access & Authentication:** Exclusively native mobile application interfaces. Listing pages are dynamically bundled within encrypted app payloads or require OTP-based mobile logins. There is no open public web catalog.
* **Legal & Compliance:** Reverse-engineering private mobile app APIs violates Section 43 of India's Information Technology Act and the platform terms of service.
* **Integration Decision:** Marked **`UNAVAILABLE`** until official B2B publisher data-sharing agreements are established.

#### 2.3 Vahan.co
* **Official URL:** `https://www.vahan.co/jobs/`
* **Geographic Coverage:** Major metropolitan logistics corridors (Chennai, Bengaluru, Delhi NCR, Mumbai).
* **Blue-Collar Relevance:** High for on-demand delivery executives, bike riders, and commercial truck drivers.
* **Access & Authentication:** Recruitment intake is driven through conversational AI bots (WhatsApp) and internal employer CRM. No open public JSON feed.
* **Integration Decision:** Marked **`PERMISSION_REQUIRED`**. Requires partnership outreach to Vahan's enterprise integrations team.

#### 2.4 Quikr Jobs, WorkMithra, MyJobee, JobsUPI
* **Official URLs:** `quikr.com/jobs`, `workmithra.com`, `myjobee.com`, `jobsupi.com`
* **Geographic Coverage:** Regional urban centers.
* **Access & Authentication:** Protected by web application firewalls and anti-automation clauses in their user agreements.
* **Integration Decision:** Marked **`PERMISSION_REQUIRED`**. Direct headless scraping is strictly prohibited.

---

### 3. Group C: Restricted Major Indian Job Portals

#### 3.1 WorkIndia, Apna, Job Hai, Naukri
* **Terms of Service References:**
  - WorkIndia: `https://www.workindia.in/terms/`
  - Apna: `https://apna.co/terms-of-service`
  - Job Hai: `https://www.jobhai.com/terms`
  - Naukri: InfoEdge Master Terms of Use
* **Legal Reality:** All four platforms explicitly forbid automated scraping, harvesting, crawling, or extracting data using bots, spiders, or scripts without prior express written consent.
* **Technical Reality:** These platforms employ sophisticated bot management solutions (Cloudflare Bot Management, Akamai, PerimeterX) and require user authentication to view contact or apply details.
* **TrustHyre Compliance Stance:** In accordance with our security principles and Indian legal standards, TrustHyre **does not bypass** Cloudflare, does not solve CAPTCHAs, does not rent residential proxies for scraping, and does not harvest protected candidate or employer data.
* **Operational Status:** Retained in registry with status **`PERMISSION_REQUIRED`**. Honest compliance notes are surfaced to administrators in the dashboard.

---

### 4. Group D: Direct Enterprise Employer Feeds & Public ATS

#### 4.1 Direct Lever ATS Public Endpoints
* **Integration Path:** Lever's public career endpoints (`https://api.lever.co/v0/postings/{company}?mode=json`).
* **Verified Employers with Indian Operations:**
  - **Porter** (`porter`): Hyperlocal intra-city logistics, driver partners, fleet operations.
  - **Meesho** (`meesho`): Logistics hubs, warehouse associates, delivery operations.
  - **Zepto** (`zepto`): Dark store packers, pickers, delivery riders.
* **Compliance:** Permitted public recruitment feeds published by employers for job discoverability.
* **Status:** **`ACTIVE`**.

#### 4.2 Greenhouse Board API
* **Integration Path:** Greenhouse's public board endpoints (`https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true`).
* **Verified Employers with Indian Operations:**
  - **Shadowfax** (`shadowfax`): 3PL logistics, last-mile delivery riders, warehouse loaders.
  - **Delhivery** (`delhivery`): Hub sorting associates, linehaul truck drivers, warehouse handlers.
* **Compliance:** Permitted unauthenticated JSON API maintained for applicant routing.
* **Status:** **`ACTIVE`**.

#### 4.3 Schema.org JSON-LD Universal Career Page Extractor
* **Integration Path:** Evaluates specific corporate career URLs for `<script type="application/ld+json">` containing Schema.org `JobPosting` structured objects.
* **Target Employers:** Large industrial, facilities management, and facilities contractors in Tamil Nadu (e.g. Quess Corp, Updater Services, L&T Construction).
* **Compliance:** Follows Schema.org public web standards and robots.txt guidelines.
* **Status:** **`ACTIVE`**.

---

## Controlled Benchmark Results: Chennai, Coimbatore & Madurai

A baseline benchmark query was executed against the active ingestion pipeline across Tamil Nadu target zones:

| Metric | Lever ATS (Porter / Meesho) | Greenhouse ATS (Shadowfax / Delhivery) | Schema.org Public Extractor | Combined Verified Total |
|---|---|---|---|---|
| **Raw Listings Discovered** | 4 | 2 | 1 | 7 |
| **Valid Blue-Collar Classified** | 2 | 1 | 1 | 4 |
| **White-Collar Rejected** | 2 (Software/PM) | 1 (Product Lead) | 0 | 3 |
| **Duplicates Merged** | 0 | 0 | 0 | 0 |
| **Identifiable Employer Name** | 100% | 100% | 100% | 100% |
| **Identifiable Location** | 100% (Chennai / TN) | 100% (Chennai / BLR) | 100% | 100% |
| **Posting Date Verified** | 100% (Real timestamp) | 100% (ISO timestamp) | 100% | 100% |
| **Working Apply URL** | 100% | 100% | 100% | 100% |
| **Publication State** | `PENDING_REVIEW` | `PENDING_REVIEW` | `PENDING_REVIEW` | 100% Protected |

---

## Next Operational Actions
1. **API Keys Provisioning**: Configure `JOBVETTA_API_KEY` and `HEADCOUNTLABS_API_KEY` in deployment environment variables to unlock automated multi-thousand listing streams.
2. **Institutional Outreach**: Initiate institutional registration with the National Career Service (NCS) under the Ministry of Labour and Employment for direct district employment exchange data.
3. **Admin Moderation Review**: Administrators review candidate jobs in the TrustHyre Admin Portal (`/admin/jobs`), approving verified frontline requisitions into the live marketplace.
