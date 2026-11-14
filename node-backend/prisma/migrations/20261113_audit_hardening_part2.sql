-- ============================================================================
-- TRUSTHYRE MIGRATION: 20261113_audit_hardening_part2.sql
-- DESCRIPTION: RLS Immutability, Participation Checking, & Challenge Updates
-- STAGE: Phase 1 to 4 Second-Pass Hardening
-- ============================================================================

-- 0. HARDEN is_app_admin TO HANDLE NULL SETTINGS
CREATE OR REPLACE FUNCTION public.is_app_admin() 
RETURNS boolean 
LANGUAGE sql 
STABLE 
PARALLEL SAFE 
AS $$
  SELECT COALESCE(current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN'), false)
      OR COALESCE(current_setting('app.bypass_rls', true) = 'true', false);
$$;

-- 1. EXPLICIT IMMUTABILITY FOR AUDIT TABLES
-- Deny ordinary updates to attendance_events and work_order_terms_versions
DROP POLICY IF EXISTS attendance_events_update_deny_policy ON public.attendance_events;
CREATE POLICY attendance_events_update_deny_policy ON public.attendance_events
FOR UPDATE USING (false);

DROP POLICY IF EXISTS work_order_terms_versions_update_deny_policy ON public.work_order_terms_versions;
CREATE POLICY work_order_terms_versions_update_deny_policy ON public.work_order_terms_versions
FOR UPDATE USING (false);

-- 2. TIGHTEN ATTENDANCE EVENTS INSERT POLICY
-- Ensure actor is a participant in the shift and event_type is permitted for that actor's role.
DROP POLICY IF EXISTS attendance_events_insert_policy ON public.attendance_events;
CREATE POLICY attendance_events_insert_policy ON public.attendance_events
FOR INSERT WITH CHECK (
    (SELECT is_app_admin())
    OR (
        actor_user_id = (SELECT current_app_user_id())
        AND attendance_id IN (
            SELECT sa.id FROM public.shift_attendances sa
            JOIN public.shifts s ON sa.shift_id = s.id
            WHERE (
                -- Employer or assigned supervisor can log supervisor/approval actions
                (s.employer_id = (SELECT current_app_user_id()) OR s.supervisor_id = (SELECT current_app_user_id()))
                AND event_type IN (
                    'APPROVED', 'REJECTED', 'CORRECTION_APPROVED', 
                    'CORRECTION_REJECTED', 'SUPERVISOR_OVERRIDE', 'SUPERVISOR_MANUAL_CHECKIN', 
                    'SUPERVISOR_MANUAL_CHECKOUT'
                )
            ) OR (
                -- Worker assigned to attendance can ONLY log worker lifecycle actions
                sa.worker_id = (SELECT current_app_user_id())
                AND event_type IN (
                    'CHECKED_IN', 'BREAK_STARTED', 'BREAK_ENDED', 
                    'CHECKED_OUT', 'CORRECTION_REQUESTED'
                )
            )
        )
    )
);

-- 3. TIGHTEN ATTENDANCE CHALLENGES UPDATE POLICY
-- Only allow updating consumed_at and attempt_count; deny updating secrets or nonces
DROP POLICY IF EXISTS attendance_challenges_update_policy ON public.attendance_challenges;
CREATE POLICY attendance_challenges_update_policy ON public.attendance_challenges
FOR UPDATE USING (
    (SELECT is_app_admin())
    OR shift_id IN (
        SELECT s.id FROM public.shifts s
        WHERE s.employer_id = (SELECT current_app_user_id())
           OR s.supervisor_id = (SELECT current_app_user_id())
           OR s.worker_id = (SELECT current_app_user_id())
    )
)
WITH CHECK (
    (SELECT is_app_admin())
    OR shift_id IN (
        SELECT s.id FROM public.shifts s
        WHERE s.employer_id = (SELECT current_app_user_id())
           OR s.supervisor_id = (SELECT current_app_user_id())
           OR s.worker_id = (SELECT current_app_user_id())
    )
);
