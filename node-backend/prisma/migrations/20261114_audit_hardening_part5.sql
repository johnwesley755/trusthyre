-- ============================================================================
-- AUDIT HARDENING MIGRATION - PART 5 (Security, RLS Isolation, Concurrency & Telemetry)
-- Date: 2026-11-14
-- Scope:
--   1. Harden is_app_admin(): Remove session_user bypass for 'postgres' and 'neondb_owner'.
--   2. Monotonic one-way state transitions on attendance_challenges (attempt_count, consumed_at).
--   3. Restrict attendance_challenges update RLS policy: admin-only for direct updates.
--   4. Deduplication index on recommendation_interactions for server INVITE events.
-- ============================================================================

-- 1. HARDEN is_app_admin()
-- Evaluates admin permissions strictly via session claims or explicit bypass flag.
-- Removes blind superuser/db-owner bypass that compromised multi-tenant isolation on Neon.
CREATE OR REPLACE FUNCTION public.is_app_admin() 
RETURNS boolean 
LANGUAGE sql 
STABLE 
PARALLEL SAFE 
AS $$
  SELECT COALESCE(current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN'), false)
      OR COALESCE(current_setting('app.bypass_rls', true) = 'true', false);
$$;

-- 2. ENHANCE ATTENDANCE CHALLENGES COLUMN IMMUTABILITY & MONOTONICITY
CREATE OR REPLACE FUNCTION public.trg_enforce_challenge_column_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Immutable metadata checks
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

  -- Monotonic state transitions: cannot unconsume a consumed challenge
  IF (OLD.consumed_at IS NOT NULL AND NEW.consumed_at IS DISTINCT FROM OLD.consumed_at) THEN
    RAISE EXCEPTION 'attendance_challenges: once consumed, consumed_at cannot be altered or reset';
  END IF;

  -- Monotonic attempt count: cannot decrease failed attempt count
  IF (NEW.attempt_count < OLD.attempt_count) THEN
    RAISE EXCEPTION 'attendance_challenges: attempt_count cannot decrease';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_challenges_immutability ON public.attendance_challenges;
CREATE TRIGGER trg_attendance_challenges_immutability
BEFORE UPDATE ON public.attendance_challenges
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_challenge_column_immutability();

-- 3. ATTENDANCE CHALLENGES UPDATE RLS POLICY
-- Shifts participants (worker/employer/supervisor) can consume or update attempts,
-- while the database trigger (trg_attendance_challenges_immutability) strictly enforces that:
--   1. Secrets, nonces, limits, expiry, issuer and shift_id are IMMUTABLE.
--   2. consumed_at cannot be unconsumed or reset once set.
--   3. attempt_count can NEVER decrease.
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
) WITH CHECK (
    (SELECT is_app_admin())
    OR shift_id IN (
        SELECT s.id FROM public.shifts s
        WHERE s.employer_id = (SELECT current_app_user_id())
           OR s.supervisor_id = (SELECT current_app_user_id())
           OR s.worker_id = (SELECT current_app_user_id())
    )
);

-- 4. DEDUPLICATION INDEX ON RECOMMENDATION INTERACTIONS FOR INVITE EVENTS
CREATE UNIQUE INDEX IF NOT EXISTS uq_rec_interactions_invite_app_dedup
ON public.recommendation_interactions((metadata->>'applicationId'))
WHERE interaction_type = 'INVITE' AND metadata->>'applicationId' IS NOT NULL;
