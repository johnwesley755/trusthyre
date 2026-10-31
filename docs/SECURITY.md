# TrustHyre Security & Privacy Architecture Guide

> **Standard:** Production v2.0  
> **Last Updated:** October 2026  
> **Scope:** TrustHyre Unified PWA, Cloudflare Edge Backend, Python Scraper Service, Neon PostgreSQL, Firebase Auth & Storage

---

## 1. System & Architecture Security Context

TrustHyre implements modern defense-in-depth security engineered for blue-collar workforce verification, high-speed employer hiring, and background checks. 

The production system has transitioned away from monolithic setups to a modern serverless edge architecture:
- **Unified Client:** React 19 + TypeScript PWA deployed on Vercel with mobile-first responsive interfaces.
- **Edge API Gateway & Business Backend:** Cloudflare Workers running Hono with JWT authentication, RBAC authorization, and Hyperdrive connection acceleration (`node-backend`).
- **Distributed Scraping & Onboarding Worker:** Cloudflare Python Worker with Queues (`discovery-scans-queue`) and automated sanitization (`python-scraper-service`).
- **Database Layer:** Neon Serverless PostgreSQL with SSL encryption enforced (`sslmode=require`).
- **Auth & Storage Providers:** Firebase Auth / Clerk identity validation, Cloudinary encrypted media storage, and Resend / Brevo transactional messaging.

---

## 2. Core Security Principles

1. **Zero Trust Edge Validation**: Every request terminating at Cloudflare Edge Workers is authenticated and verified via JWT bearer tokens and cryptographic signatures.
2. **Least Privilege & Role Isolation**: Strict Role-Based Access Control (RBAC) separating `WORKER`, `EMPLOYER`, and `ADMIN`.
3. **Data Protection at Rest & Transit**: Mandatory TLS 1.3 encryption across all communication pathways and AES-256 for storage volumes and database snapshots.
4. **Defense in Depth**: Multi-layer sanitization (CodeQL-compliant multi-character sanitization, DOM XSS prevention, open redirect blocking).
5. **Privacy by Design**: Sensitive PII (Aadhaar, national IDs) is masked and hashed with SHA-256; raw identity numbers are never persisted in plaintext.

---

## 3. Authentication & Authorization Policies

### 3.1 Token & Session Management
- **Access Tokens:** Signed via HMAC-SHA256 with standard claims (`userId`, `role`, `exp`). Short lifetimes minimize exposure windows.
- **Token Verification:** Validated by Edge middleware on every incoming request in the `Authorization: Bearer <token>` header.
- **Role Isolation:**
  - `WORKER`: Can browse discovery jobs, apply for vacancies, check in with GPS/selfie verification, and view their tenure score. Cannot access employer pipeline metrics or admin tools.
  - `EMPLOYER`: Can post job requisitions, view applied workers, initiate onboarding, and execute worker payouts. Cannot modify worker core identity badges or platform logs.
  - `ADMIN`: Has full moderation capabilities (`/admin/jobs`, `/admin/leads`, `/admin/logs`, and scrapers) protected by admin-role middleware and two-factor session checks.

### 3.2 URL Redirection & Open-Redirect Prevention (CWE-601)
- Post-login and referral redirects (`?redirect=...`) pass through white-list sanitization (`sanitizeRedirectUrl`):
  - Must begin with a single `/`.
  - Protocol-relative URLs (`//example.com`), explicit schemas (`javascript:`, `data:`, `https://`), and control characters are stripped.
  - Fallback defaults strictly to root `/` or internal dashboards.

### 3.3 Credential & Password Safeguards
- All user passwords are automatically salted and hashed using `bcrypt` (work factor 10+).
- Plaintext passwords and raw tokens are excluded from application logs and error traces.

---

## 4. Input Sanitization & Content Security (OWASP & CodeQL Standards)

### 4.1 HTML Sanitization & Tag Stripping (CWE-116)
- Scraped job data and user inputs undergo multi-pass parsing and character-state sanitization:
  - Line-break preserving tags (`<br>`, `<p>`, `<li>`, `<div>`) are safely translated into readable newlines and bullet points.
  - All residual HTML tags (`<...>`) are removed via iterative character-loop parsing to completely prevent incomplete multi-character sanitization vulnerabilities and XSS injection.
  - HTML entity replacement is executed in a single-pass dictionary lookup to prevent double-unescaping vulnerabilities.

### 4.2 Cross-Site Scripting (XSS) Prevention
- Frontend user-generated content is rendered using standard React JSX data binding, automatically escaping HTML entities.
- Rich preview descriptions are sanitized with strict sanitizers before rendering.

---

## 5. Data Privacy & Compliance (DPDP Act 2023 - India)

TrustHyre adheres strictly to the **Digital Personal Data Protection (DPDP) Act 2023**:

1. **Clear Purpose & Consent:** Candidate data is collected solely for background verification, identity validation, and employment matching with explicit user opt-in.
2. **Aadhaar & Government ID Masking:**
   - Physical Aadhaar numbers are never stored in plain text.
   - Only masked strings (`XXXX-XXXX-1234`) and cryptographic one-way SHA-256 hashes are preserved for uniqueness checks.
   - Verification documents are securely stored in private Cloudinary / S3 buckets accessible only via short-lived signed URLs.
3. **Right to Correction & Erasure:**
   - Users can update their profile or request account deletion, triggering cascading deletion of their session tokens and personal information across active tables.
4. **Geofenced Check-in Privacy:**
   - Worker GPS location coordinates are only captured during active shift check-ins and check-outs to verify worksite presence via mathematical Haversine checks. Continuous background tracking is strictly avoided.

---

## 6. Infrastructure, Edge & Operational Security

### 6.1 Edge Cloudflare Workers & Queues
- **DDoS Protection:** Edge network absorbs Layer 3/4 and Layer 7 volumetric attacks before traffic reaches backend systems.
- **Cloudflare Queues:** Background jobs and scraper workflows are dispatched to `discovery-scans-queue` with controlled concurrency and retry caps (`max_retries: 2`, `max_batch_size: 1`), preventing downstream database saturation.
- **Hyperdrive DB Pooling:** Secure SSL-encrypted connection pooling between Cloudflare Workers and Neon Serverless PostgreSQL.

### 6.2 Secrets Management
- All sensitive credentials (`DATABASE_URL`, `INTERNAL_SERVICE_SECRET`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`) are managed as encrypted environment variables in Cloudflare and Vercel dashboards.
- Zero plaintext secrets are stored in Git repositories.

---

## 7. Vulnerability Disclosure & Incident Response

### 7.1 Reporting a Vulnerability
If you discover a security concern or bug in TrustHyre:
- **Email:** `security@trusthyre.com`
- **Response Commitment:** Acknowledged within 24 hours; remediation deployment initiated within 72 hours.
- Please provide reproducible steps, request URLs, and non-destructive proof-of-concept evidence.

### 7.2 Responsible Disclosure Terms
- Never access, download, or alter other users' private data.
- Avoid disrupting platform availability or running automated volumetric load tests without prior authorization.
- Allow reasonable time for remediation before any public disclosure.
