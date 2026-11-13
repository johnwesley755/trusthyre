-- ============================================================================
-- Migration: 20261113_job_required_skills_pk
-- Purpose: Add composite primary key on job_required_skills(job_id, skill)
--          and performance indexes for recommendation engine.
-- ============================================================================

-- Clean up any duplicate (job_id, skill) entries safely before adding PK
DELETE FROM public.job_required_skills a USING public.job_required_skills b
WHERE a.ctid < b.ctid 
  AND a.job_id = b.job_id 
  AND LOWER(TRIM(a.skill)) = LOWER(TRIM(b.skill));

-- Add composite primary key constraint on (job_id, skill) if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'job_required_skills_pkey' 
      AND conrelid = 'public.job_required_skills'::regclass
  ) THEN
    ALTER TABLE public.job_required_skills ADD CONSTRAINT job_required_skills_pkey PRIMARY KEY (job_id, skill);
  END IF;
END $$;

-- Recommendation engine high-frequency lookup indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status_expires_at ON public.jobs (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_avail_city ON public.worker_profiles (is_available, city);
CREATE INDEX IF NOT EXISTS idx_job_required_skills_skill ON public.job_required_skills (skill);

