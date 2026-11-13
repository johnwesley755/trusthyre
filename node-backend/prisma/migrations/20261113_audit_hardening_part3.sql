-- ============================================================================
-- TRUSTHYRE MIGRATION: 20261113_audit_hardening_part3.sql
-- DESCRIPTION: Challenge Column Immutability Trigger & Event Name Alignment
-- STAGE: Phase 1 to 4 Third-Pass Hardening
-- ============================================================================

-- 1. ALIGN ATTENDANCE EVENTS INSERT POLICY FOR MANUAL ATTENDANCE NAMES
-- Permits both underscore and non-underscore variations:
-- SUPERVISOR_MANUAL_CHECK_IN / SUPERVISOR_MANUAL_CHECKIN
-- SUPERVISOR_MANUAL_CHECK_OUT / SUPERVISOR_MANUAL_CHECKOUT
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
                    'CORRECTION_REJECTED', 'SUPERVISOR_OVERRIDE', 
                    'SUPERVISOR_MANUAL_CHECKIN', 'SUPERVISOR_MANUAL_CHECK_IN',
                    'SUPERVISOR_MANUAL_CHECKOUT', 'SUPERVISOR_MANUAL_CHECK_OUT'
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

-- 2. ENFORCE COLUMN-LEVEL IMMUTABILITY ON attendance_challenges
-- RLS restricts rows; this trigger strictly restricts columns so secrets, nonces,
-- issuer, and actions cannot be modified during updates (only consumed_at and attempt_count).
CREATE OR REPLACE FUNCTION public.trg_enforce_challenge_column_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.hashed_secret IS DISTINCT FROM OLD.hashed_secret OR
      NEW.nonce IS DISTINCT FROM OLD.nonce OR
      NEW.shift_id IS DISTINCT FROM OLD.shift_id OR
      NEW.challenge_type IS DISTINCT FROM OLD.challenge_type OR
      NEW.intended_action IS DISTINCT FROM OLD.intended_action OR
      NEW.issuer_user_id IS DISTINCT FROM OLD.issuer_user_id) THEN
    RAISE EXCEPTION 'attendance_challenges secrets, nonces, and challenge metadata are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_challenges_immutability ON public.attendance_challenges;
CREATE TRIGGER trg_attendance_challenges_immutability
BEFORE UPDATE ON public.attendance_challenges
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_challenge_column_immutability();
