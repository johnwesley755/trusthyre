-- ==============================================================================
-- TrustHyre v2.0 - Rich Job Criteria & Eligibility Schema Reference
-- NOTE: DO NOT RUN THIS SCRIPT DIRECTLY IF YOU ARE USING THE APPLICATION's
-- BUILT-IN JSON PERSISTENCE (which works out-of-the-box via alternate_sources).
--
-- If you want dedicated native relational columns in PostgreSQL later, 
-- you can run the following DDL statements manually:
-- ==============================================================================

-- 1. Add dedicated criteria columns to the live `jobs` table (Optional)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS department VARCHAR(150),
  ADD COLUMN IF NOT EXISTS role_category VARCHAR(150),
  ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shift VARCHAR(50),
  ADD COLUMN IF NOT EXISTS education VARCHAR(100),
  ADD COLUMN IF NOT EXISTS languages VARCHAR(255),
  ADD COLUMN IF NOT EXISTS age_limit VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gender VARCHAR(50);

-- 2. Add criteria columns to the `job_search_index` table (Optional)
ALTER TABLE job_search_index
  ADD COLUMN IF NOT EXISTS department VARCHAR(150),
  ADD COLUMN IF NOT EXISTS role_category VARCHAR(150),
  ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS shift VARCHAR(50),
  ADD COLUMN IF NOT EXISTS education VARCHAR(100),
  ADD COLUMN IF NOT EXISTS languages VARCHAR(255);

-- 3. Add criteria column to `employer_lead_requirements` (Optional)
ALTER TABLE employer_lead_requirements
  ADD COLUMN IF NOT EXISTS criteria_details JSONB DEFAULT '{}'::jsonb;

-- 4. Create indexes for high performance filtering (Optional)
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_shift ON jobs(shift);
CREATE INDEX IF NOT EXISTS idx_jobs_gender ON jobs(gender);

