# Public Job Search & Guest Discovery Architecture

> **Document Version:** 1.0  
> **Status:** Implemented & Verified in Production Build  
> **Date:** October 2026

---

## 1. Executive Summary

To boost candidate acquisition, user conversion, and search engine discoverability (SEO), TrustHyre provides an open public job search experience. Unauthenticated users (guests) can freely discover verified blue-collar job openings across India directly from the landing page or `/search`, view full job details at `/job/:id`, and seamlessly transition into authenticated application workflows with zero data loss.

---

## 2. Core Architectural Components

### 2.1 Landing Page Tactile Search Bar (`LandingJobSearchBar.tsx`)
Located on `LandingPage.tsx`, the search bar provides:
- **Keyword / Title Input:** Searches job titles, trade competencies, and employers.
- **Experience Filter:** Fresher (0-1 Yr), 1-3 Years, 3-5 Years, and 5+ Years.
- **Location Selector & 1-Click GPS:** Autocompletes top industrial hubs (Chennai, Bengaluru, Coimbatore, Hyderabad, Mumbai, Delhi NCR, Pune) with instant browser geolocation detection via `detectCurrentCity()`.
- **Top Blue-Collar Trade Badges:** Minimalist, icon-free pills for core trades (*Electrician*, *Cook / Chef*, *Delivery / Driver*, *Warehouse & Logistics*, *Plumber*, *Security Guard*, *Carpenter & Mason*).
- **Execution Model:** Trade badge clicks update the active trade filter in state; navigation to `/search` is triggered explicitly upon pressing the "Search Jobs" button.
- **Z-Index & Stacking Isolation:** Container configured with `relative z-30` and the city selection dropdown with `z-50`, preventing visual overlap over surrounding badges or hero text.

### 2.2 Public Discovery Routing (`routes/index.tsx`)
The discovery routes have been moved outside `<ProtectedRoute>` into public `<AppLayout>`:
- `/search`: Interactive multi-facet job search feed.
- `/job/:id` and `/jobs/:id`: Full public job detail specification and location view.

### 2.3 Guest Compatibility & Cache Guarding (`JobSearchPage.tsx`)
To prevent unauthenticated 401 exceptions when guests browse the feed:
- Candidate-specific queries (`queryKeys.workers.detail('me')`, `queryKeys.jobs.myApplications`, and `searchAlerts`) are gated with `enabled: Boolean(user && user.role === 'WORKER')`.
- The public search endpoint (`/api/search/jobs`) handles unauthenticated requests cleanly via `optionalAuth`.

### 2.4 Frictionless "Sign In to Apply" Flow (`JobDetailPage.tsx`)
- When a guest candidate views an opening, the primary call-to-action renders as **"Sign In to Apply"**.
- Upon clicking, application intent is preserved in browser storage:
  ```ts
  sessionStorage.setItem('trusthyre_pending_application', JSON.stringify({
    jobId: id,
    jobTitle: job?.title,
    timestamp: Date.now()
  }));
  ```
- The user is redirected to `/sign-in?role=worker&redirect=/job/:id?action=apply`.
- Upon completing sign-in, the candidate returns to the job detail page, and an automated hook detects `action === 'apply'`, prompting them to finalize their application without losing context.

### 2.5 Security: Open Redirect Sanitization (`redirectSanitizer.ts`)
All redirect URLs pass through strict OWASP CWE-601 validation:
- Restricts targets strictly to local relative paths (`/job/...`).
- Automatically filters out protocol-relative URLs (`//evil.com`) and external schemes (`javascript:`, `data:`).
- Defaults safely to `/search` if an invalid target is supplied.

---

## 3. SEO & Google Search Console Mapping

1. **Rich JobPosting JSON-LD**: [JobDetailPage.tsx](file:///c:/Users/johnw/OneDrive/Desktop/GIT/trust-hire-v2/frontends/unified-pwa/src/modules/jobs/pages/JobDetailPage.tsx) automatically generates Schema.org `JobPosting` structured data for Google for Jobs indexing.
2. **Robots & Sitemap**:
   - `robots.txt` explicitly permits `Allow: /search` and `Allow: /job/*`.
   - `sitemap.xml` indexes all core discovery routes and high-priority city career guides.

