-- =========================================================================
-- TrustHyre Blue-Collar Scraping Microservice Database Migration
-- Target: PostgreSQL (Local, Supabase, Neon, AWS RDS)
-- =========================================================================

-- Ensure pgcrypto or uuid extension is available for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Scraper Scans Table (Session tracking for job discovery runs)
CREATE TABLE IF NOT EXISTS scraper_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED, CANCELLED
    total_found INT NOT NULL DEFAULT 0,
    valid_count INT NOT NULL DEFAULT 0,
    duplicate_count INT NOT NULL DEFAULT 0,
    rejected_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    sources_scanned JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    query_params JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for Scraper Scans
CREATE INDEX IF NOT EXISTS idx_scraper_scans_status ON scraper_scans(status);
CREATE INDEX IF NOT EXISTS idx_scraper_scans_started_at ON scraper_scans(started_at DESC);

-- 2. Scraper Scan Logs Table (Audit and diagnostic event logs per scan run)
CREATE TABLE IF NOT EXISTS scraper_scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scraper_scans(id) ON DELETE CASCADE,
    source_id VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'INFO', -- INFO, WARNING, ERROR
    message TEXT NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Scraper Scan Logs
CREATE INDEX IF NOT EXISTS idx_scraper_scan_logs_scan_id ON scraper_scan_logs(scan_id);
CREATE INDEX IF NOT EXISTS idx_scraper_scan_logs_created_at ON scraper_scan_logs(created_at DESC);

-- 3. Verify / Add Columns on existing 'jobs' table (if running on fresh database)
-- Note: 'jobs' already exists in TrustHyre Prisma schema. These are idempotent safety checks.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_name VARCHAR(100);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_hash VARCHAR(64);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS alternate_sources JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS date_posted TIMESTAMP WITH TIME ZONE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Indexes for external job queries on 'jobs' table
CREATE INDEX IF NOT EXISTS idx_jobs_is_external_status ON jobs(is_external, status);
CREATE INDEX IF NOT EXISTS idx_jobs_source_hash ON jobs(source_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_source_external_id ON jobs(source_name, external_id);
