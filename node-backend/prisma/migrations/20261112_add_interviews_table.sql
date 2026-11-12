-- ============================================================================
-- TRUSTHYRE INTERVIEWS SUITE MIGRATION & RLS POLICIES
-- Target: PostgreSQL / Neon DB
-- Date: 2026-11-12
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    employer_id VARCHAR(255) NOT NULL,
    worker_id VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMP(6) NOT NULL,
    interview_type VARCHAR(50) NOT NULL DEFAULT 'IN_PERSON',
    location_address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(50),
    instructions TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
    reschedule_note TEXT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interviews_app_id ON public.interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_emp_id ON public.interviews(employer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_worker_id ON public.interviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON public.interviews(scheduled_at);

-- Force RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews FORCE ROW LEVEL SECURITY;

-- Granular RLS Policies
DROP POLICY IF EXISTS "interviews_select" ON public.interviews;
CREATE POLICY "interviews_select" ON public.interviews
    FOR SELECT USING (
        employer_id = (SELECT current_app_user_id())
        OR worker_id = (SELECT current_app_user_id())
        OR is_app_admin()
    );

DROP POLICY IF EXISTS "interviews_insert" ON public.interviews;
CREATE POLICY "interviews_insert" ON public.interviews
    FOR INSERT WITH CHECK (
        employer_id = (SELECT current_app_user_id())
        OR is_app_admin()
    );

DROP POLICY IF EXISTS "interviews_update" ON public.interviews;
CREATE POLICY "interviews_update" ON public.interviews
    FOR UPDATE USING (
        employer_id = (SELECT current_app_user_id())
        OR worker_id = (SELECT current_app_user_id())
        OR is_app_admin()
    ) WITH CHECK (
        employer_id = (SELECT current_app_user_id())
        OR worker_id = (SELECT current_app_user_id())
        OR is_app_admin()
    );

DROP POLICY IF EXISTS "interviews_delete" ON public.interviews;
CREATE POLICY "interviews_delete" ON public.interviews
    FOR DELETE USING (
        employer_id = (SELECT current_app_user_id())
        OR is_app_admin()
    );

COMMIT;

