# TrustHyre Platform Security Policy (v2.0)

> **Last Updated:** October 2026  
> **Status:** Active / Production Standard  
> **Scope:** TrustHyre Web Applications, APIs, Edge Workers, Mobile Apps, and Data Pipelines

---

## 1. Security Architecture Overview

TrustHyre operates an enterprise-grade, privacy-first trust architecture tailored for blue-collar workforce verification, real-time employer hiring, and decentralized background checks.

The platform architecture comprises:
1. **Frontend Layer (Unified PWA & Flutter App):**
   - React 19 + TypeScript PWA using Tailwind CSS and Vite.
   - Cross-platform Flutter mobile client for on-site operations.
2. **API & Edge Compute Layer:**
   - **Cloudflare Edge Workers** with Hono API routing (`node-backend`).
   - Python-based distributed scraping microservice (`python-scraper-service`) with hyperdrive-accelerated PostgreSQL access and background queue execution.
3. **Data & Storage Layer:**
   - Neon Serverless PostgreSQL with SSL connection pooling (`sslmode=require`).
   - Firebase Authentication & Firebase Cloud Messaging (FCM) v1 OAuth2 protocols.
   - Cloudinary encrypted media storage with signed uploads.

---

## 2. Authentication & Authorization Policies

### 2.1 Identity & Session Management
- **Token Verification:** JSON Web Tokens (JWT) signed with HMAC-SHA256 with strict claims validation (`userId`, `role`, `exp`).
- **Role-Based Access Control (RBAC):** Strict isolation between `WORKER`, `EMPLOYER`, and `ADMIN`.
  - Workers cannot access employer pipelines or update job lifecycle states.
  - Employers cannot alter worker trade verification credentials or audit histories.
  - Public discovery endpoints (`/search`, `/job/:id`) are strictly read-only and scrub private recruiter credentials, direct phone numbers, and internal hiring notes when `req.user` is unauthenticated.

### 2.2 Open Redirect & URL Sanitization (OWASP CWE-601 Prevention)
- All post-authentication redirect parameters (`?redirect=...`) pass through strict white-list sanitization via `sanitizeRedirectUrl`:
  - Enforces relative paths starting with a single forward slash `/`.
  - Disallows protocol-relative URLs (`//`), scheme injection (`https://`, `javascript:`), and control characters.
  - Ensures seamless zero-data-loss application intents while strictly blocking phishing and open-redirect vectors.

### 2.3 Password & Sensitive Credential Storage
- User passwords are automatically salted and hashed using `bcrypt` (work factor 10+). Plaintext passwords are never logged, echoed, or persisted.

---

## 3. Data Protection & Privacy Standards

### 3.1 Data in Transit & at Rest
- **In Transit:** Mandatory TLS 1.3 encryption across all client-to-edge, edge-to-database, and microservice-to-microservice communication.
- **At Rest:** Database disks and cloud snapshots are encrypted using AES-256 standards.
- **Hyperdrive Connection Security:** Database queries routed via Cloudflare Hyperdrive use encrypted tunnels to Neon PostgreSQL instances.

### 3.2 Aadhaar & Identity Verification Safeguards
- Physical Aadhaar numbers are never permanently stored in plaintext.
- Only SHA-256 cryptographic hashes or masked formats (`XXXX-XXXX-1234`) are retained for duplicate detection.
- Uploaded identity verification documents are stored in private Cloudinary folders accessible solely via short-lived signed URLs.

### 3.3 Attendance & Location Geofencing
- Worker GPS check-in data is validated with mathematical haversine radius checks against employer job worksites.
- Timestamps and selfie check-in photos are cryptographically signed at capture to prevent spoofing or replay attacks.

---

## 4. API & Network Security

### 4.1 Input Validation & Strict Typing
- All inbound requests are validated against Zod schemas in the frontend and validated with strict type contracts on backend routes.
- Sanitized HTML rendering: All rich emails and HTML inputs reject raw script injection or unescaped tags.

### 4.2 Cross-Site Scripting (XSS) & Content Security
- Content Security Policy (CSP) headers disallow `unsafe-eval` in production bundles.
- Email delivery pipelines strip `<script>` and `<style>` blocks using strict multi-pass HTML parsers to avoid CodeQL incomplete sanitization alerts.

### 4.3 Rate Limiting & Denial of Service Protection
- Cloudflare DDoS protection shields all edge routes.
- Cloudflare Queues (`discovery-scans-queue`) throttle background scraping and async workloads with batch boundaries (`max_batch_size = 1`, `max_batch_timeout = 5s`, `max_retries = 2`) to prevent downstream resource exhaustion.

---

## 5. Vulnerability Disclosure & Incident Response

### 5.1 Reporting Security Issues
If you discover a potential security vulnerability within TrustHyre:
- **Email:** `security@trusthyre.com`
- **PGP Key:** Available upon request.
- Please include reproduction steps, affected endpoints, and request payloads.
- We commit to acknowledging reports within 24 hours and providing remediation updates within 72 hours.

### 5.2 Bug Bounty & Responsible Disclosure Guidelines
- Do not access or modify other users' personal data.
- Avoid executing Denial of Service (DoS/DDoS) attacks.
- Do not exploit a security vulnerability beyond what is strictly necessary to demonstrate proof-of-concept.

