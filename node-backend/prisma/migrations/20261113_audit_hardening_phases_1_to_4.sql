-- ============================================================================
-- TRUSTHYRE MIGRATION: 20261113_audit_hardening_phases_1_to_4.sql
-- DESCRIPTION: Audit Hardening for Digital Work Orders, Shifts & Attendance
-- STAGE: Phases 1 to 4 Comprehensive Security Hardening
-- ============================================================================

-- 1. ATTENDANCE CHALLENGES (DURABLE OTP / QR SESSION STORAGE)
-- Replaces ephemeral in-memory storage with cryptographically hashed, single-use,
-- rate-limited records tied to shifts, actions, and authorized issuers.
CREATE TABLE IF NOT EXISTS public.attendance_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    challenge_type VARCHAR(20) NOT NULL CHECK (challenge_type IN ('ONE_TIME_PIN', 'QR_CODE')),
    intended_action VARCHAR(20) NOT NULL CHECK (intended_action IN ('CHECK_IN', 'CHECK_OUT')),
    hashed_secret VARCHAR(255) NOT NULL,
    nonce VARCHAR(64) NOT NULL UNIQUE,
    issuer_user_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_challenges_shift_action 
    ON public.attendance_challenges(shift_id, intended_action, expires_at);
CREATE INDEX IF NOT EXISTS idx_attendance_challenges_nonce 
    ON public.attendance_challenges(nonce);

-- 2. WORK ORDER TERMS VERSIONS (AUDITABLE VERSIONING & ACCEPTANCE SNAPSHOTS)
CREATE TABLE IF NOT EXISTS public.work_order_terms_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    terms_snapshot JSONB NOT NULL,
    terms_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of canonical terms JSON
    created_by_user_id VARCHAR(255) NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_work_order_version UNIQUE (work_order_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_work_order_terms_work_order 
    ON public.work_order_terms_versions(work_order_id, version_number);

-- 3. ATTENDANCE IMMUTABLE EVENTS TABLE (APPEND-ONLY VERIFIABLE AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.attendance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES public.shift_attendances(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'CHECKED_IN', 'BREAK_STARTED', 'BREAK_ENDED', 'CHECKED_OUT', 'CORRECTION_REQUESTED', 'CORRECTION_APPROVED', 'CORRECTION_REJECTED', 'SUPERVISOR_OVERRIDE'
    actor_user_id VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    verification_method VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    notes TEXT,
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_events_attendance_id 
    ON public.attendance_events(attendance_id, created_at);

-- 4. HARDEN WORK ORDERS AND SHIFT ATTENDANCES COLUMNS
ALTER TABLE public.work_orders 
    ADD COLUMN IF NOT EXISTS terms_version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS accepted_terms_version INT,
    ADD COLUMN IF NOT EXISTS accepted_terms_hash VARCHAR(64);

ALTER TABLE public.shift_attendances 
    ADD COLUMN IF NOT EXISTS last_break_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS correction_resolved_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS correction_resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS correction_resolution_notes TEXT;

-- 5. ROW-LEVEL SECURITY ENFORCEMENT & STRICT POLICIES
ALTER TABLE public.attendance_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_challenges FORCE ROW LEVEL SECURITY;

ALTER TABLE public.work_order_terms_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_terms_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events FORCE ROW LEVEL SECURITY;

-- 5.1 attendance_challenges RLS
DROP POLICY IF EXISTS attendance_challenges_select_policy ON public.attendance_challenges;
CREATE POLICY attendance_challenges_select_policy ON public.attendance_challenges
FOR SELECT USING (
    (SELECT is_app_admin())
    OR issuer_user_id = (SELECT current_app_user_id())
    OR shift_id IN (
        SELECT s.id FROM public.shifts s
        WHERE s.worker_id = (SELECT current_app_user_id())
    )
);

DROP POLICY IF EXISTS attendance_challenges_insert_policy ON public.attendance_challenges;
CREATE POLICY attendance_challenges_insert_policy ON public.attendance_challenges
FOR INSERT WITH CHECK (
    (SELECT is_app_admin())
    OR (
        issuer_user_id = (SELECT current_app_user_id())
        AND shift_id IN (
            SELECT s.id FROM public.shifts s
            WHERE s.employer_id = (SELECT current_app_user_id()) OR s.supervisor_id = (SELECT current_app_user_id())
        )
    )
);

DROP POLICY IF EXISTS attendance_challenges_update_policy ON public.attendance_challenges;
CREATE POLICY attendance_challenges_update_policy ON public.attendance_challenges
FOR UPDATE USING (
    (SELECT is_app_admin())
    OR issuer_user_id = (SELECT current_app_user_id())
    OR shift_id IN (
        SELECT s.id FROM public.shifts s
        WHERE s.worker_id = (SELECT current_app_user_id())
    )
);

-- Delete disallowed except by app admin
DROP POLICY IF EXISTS attendance_challenges_delete_policy ON public.attendance_challenges;
CREATE POLICY attendance_challenges_delete_policy ON public.attendance_challenges
FOR DELETE USING ((SELECT is_app_admin()));

-- 5.2 work_order_terms_versions RLS
DROP POLICY IF EXISTS work_order_terms_versions_select_policy ON public.work_order_terms_versions;
CREATE POLICY work_order_terms_versions_select_policy ON public.work_order_terms_versions
FOR SELECT USING (
    (SELECT is_app_admin())
    OR work_order_id IN (
        SELECT wo.id FROM public.work_orders wo
        WHERE wo.employer_id = (SELECT current_app_user_id())
           OR wo.worker_id = (SELECT current_app_user_id())
    )
);

DROP POLICY IF EXISTS work_order_terms_versions_insert_policy ON public.work_order_terms_versions;
CREATE POLICY work_order_terms_versions_insert_policy ON public.work_order_terms_versions
FOR INSERT WITH CHECK (
    (SELECT is_app_admin())
    OR (
        created_by_user_id = (SELECT current_app_user_id())
        AND work_order_id IN (
            SELECT wo.id FROM public.work_orders wo
            WHERE wo.employer_id = (SELECT current_app_user_id())
        )
    )
);

-- 5.3 attendance_events RLS
DROP POLICY IF EXISTS attendance_events_select_policy ON public.attendance_events;
CREATE POLICY attendance_events_select_policy ON public.attendance_events
FOR SELECT USING (
    (SELECT is_app_admin())
    OR attendance_id IN (
        SELECT sa.id FROM public.shift_attendances sa
        JOIN public.shifts s ON sa.shift_id = s.id
        WHERE s.employer_id = (SELECT current_app_user_id())
           OR s.supervisor_id = (SELECT current_app_user_id())
           OR sa.worker_id = (SELECT current_app_user_id())
    )
);

DROP POLICY IF EXISTS attendance_events_insert_policy ON public.attendance_events;
CREATE POLICY attendance_events_insert_policy ON public.attendance_events
FOR INSERT WITH CHECK (
    (SELECT is_app_admin())
    OR actor_user_id = (SELECT current_app_user_id())
);

-- Disallow deleting attendance events (strictly append-only)
DROP POLICY IF EXISTS attendance_events_delete_policy ON public.attendance_events;
CREATE POLICY attendance_events_delete_policy ON public.attendance_events
FOR DELETE USING ((SELECT is_app_admin()));

-- 5.4 Hardening shift_attendances and shifts DELETE policies (DISALLOW ordinary user deletion)
DROP POLICY IF EXISTS shift_attendances_delete_policy ON public.shift_attendances;
CREATE POLICY shift_attendances_delete_policy ON public.shift_attendances
FOR DELETE USING ((SELECT is_app_admin()));

DROP POLICY IF EXISTS shifts_delete_policy ON public.shifts;
CREATE POLICY shifts_delete_policy ON public.shifts
FOR DELETE USING ((SELECT is_app_admin()));
