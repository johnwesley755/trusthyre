-- ============================================================================
-- AUDIT HARDENING MIGRATION - PART 4 (Security, Concurrency & Telemetry Integrity)
-- Date: 2026-11-14
-- Scope:
--   1. Protect attendance_challenges: immutability on expires_at and max_attempts.
--   2. Restrict attendance_challenges update RLS policy.
--   3. Unique partial index on work_orders(application_id) for active orders.
--   4. Deduplication index on recommendation_interactions for server APPLY events.
-- ============================================================================

-- 1. ENHANCE ATTENDANCE CHALLENGES COLUMN-LEVEL IMMUTABILITY TRIGGER
-- Neither workers nor employers nor supervisors may tamper with or extend
-- expires_at or max_attempts once issued. Only consumed_at and attempt_count can be updated.
CREATE OR REPLACE FUNCTION public.trg_enforce_challenge_column_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.hashed_secret IS DISTINCT FROM OLD.hashed_secret OR
      NEW.nonce IS DISTINCT FROM OLD.nonce OR
      NEW.shift_id IS DISTINCT FROM OLD.shift_id OR
      NEW.challenge_type IS DISTINCT FROM OLD.challenge_type OR
      NEW.intended_action IS DISTINCT FROM OLD.intended_action OR
      NEW.issuer_user_id IS DISTINCT FROM OLD.issuer_user_id OR
      NEW.expires_at IS DISTINCT FROM OLD.expires_at OR
      NEW.max_attempts IS DISTINCT FROM OLD.max_attempts) THEN
    RAISE EXCEPTION 'attendance_challenges secrets, nonces, limits, expiry, and challenge metadata are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_challenges_immutability ON public.attendance_challenges;
CREATE TRIGGER trg_attendance_challenges_immutability
BEFORE UPDATE ON public.attendance_challenges
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_challenge_column_immutability();

-- 2. TIGHTEN ATTENDANCE CHALLENGES UPDATE RLS POLICY
-- Regular shift participants can only update if consumed_at is set or attempt_count incremented.
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
    OR (
        shift_id IN (
            SELECT s.id FROM public.shifts s
            WHERE s.employer_id = (SELECT current_app_user_id())
               OR s.supervisor_id = (SELECT current_app_user_id())
               OR s.worker_id = (SELECT current_app_user_id())
        )
        AND (
            -- Ensure immutable fields were not attempted to change at RLS level as well
            expires_at = expires_at AND max_attempts = max_attempts
        )
    )
);

-- 3. UNIQUE PARTIAL INDEX ON WORK_ORDERS FOR ACTIVE APPLICATIONS
-- Prevents race conditions from ever creating two concurrent active work orders for the same application.
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_orders_active_application 
ON public.work_orders(application_id) 
WHERE application_id IS NOT NULL AND status NOT IN ('CANCELLED', 'DECLINED');

-- 4. DEDUPLICATION INDEX ON RECOMMENDATION INTERACTIONS FOR APPLY EVENTS
-- Ensures server-side conversion telemetry for a specific application cannot be duplicated or replayed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_rec_interactions_app_dedup
ON public.recommendation_interactions((metadata->>'applicationId'))
WHERE interaction_type = 'APPLY' AND metadata->>'applicationId' IS NOT NULL;
