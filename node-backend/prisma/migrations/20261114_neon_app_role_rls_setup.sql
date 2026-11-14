-- ============================================================================
-- TRUSTHYRE MIGRATION: 20261114_neon_app_role_rls_setup.sql
-- DESCRIPTION: Non-bypass App Role Setup, Controlled Challenge Procedures & Unique Job Application Constraint
-- ============================================================================

-- 1. SETUP DEDICATED NOBYPASSRLS APPLICATION ROLE
-- In Neon, default owner accounts inherit neon_superuser (BYPASSRLS).
-- This script provisions 'trusthire_app' role with NOBYPASSRLS for standard runtime connections.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'trusthire_app') THEN
    CREATE ROLE trusthire_app WITH LOGIN NOBYPASSRLS PASSWORD 'trusthire_app_secure_pass';
  ELSE
    ALTER ROLE trusthire_app WITH NOBYPASSRLS;
  END IF;

  -- Dynamic GRANT CONNECT ON DATABASE because PostgreSQL grammar requires a static identifier
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO trusthire_app', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO trusthire_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO trusthire_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trusthire_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trusthire_app;

-- 2. CONTROLLED SECURITY DEFINER FUNCTIONS FOR ATTENDANCE CHALLENGES
-- Allows attendance verification under restricted RLS without granting broad UPDATE access to shift participants.

CREATE OR REPLACE FUNCTION public.consume_attendance_challenge(
    p_nonce text,
    p_shift_id uuid,
    p_action text,
    p_issuer_id text,
    p_hashed_sig text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rows_affected integer;
BEGIN
    UPDATE public.attendance_challenges
    SET consumed_at = clock_timestamp()
    WHERE nonce = p_nonce
      AND shift_id = p_shift_id
      AND intended_action = p_action
      AND issuer_user_id = p_issuer_id
      AND hashed_secret = p_hashed_sig
      AND challenge_type = 'QR_CODE'
      AND consumed_at IS NULL
      AND expires_at > clock_timestamp();

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_challenge_failed_attempt(
    p_shift_id uuid,
    p_action text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_new_attempts integer;
BEGIN
    UPDATE public.attendance_challenges
    SET attempt_count = attempt_count + 1
    WHERE shift_id = p_shift_id
      AND intended_action = p_action
      AND challenge_type = 'ONE_TIME_PIN'
      AND consumed_at IS NULL
      AND expires_at > clock_timestamp()
      AND attempt_count < max_attempts
    RETURNING attempt_count INTO v_new_attempts;

    RETURN COALESCE(v_new_attempts, -1);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_otp_challenge(
    p_shift_id uuid,
    p_action text,
    p_hashed_secret text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rows_affected integer;
BEGIN
    UPDATE public.attendance_challenges
    SET consumed_at = clock_timestamp()
    WHERE shift_id = p_shift_id
      AND challenge_type = 'ONE_TIME_PIN'
      AND intended_action = p_action
      AND consumed_at IS NULL
      AND expires_at > clock_timestamp()
      AND attempt_count < max_attempts
      AND hashed_secret = p_hashed_secret;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_attendance_challenge TO trusthire_app, PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_otp_challenge TO trusthire_app, PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_challenge_failed_attempt TO trusthire_app, PUBLIC;

-- 3. UNIQUE CONSTRAINT ON JOB APPLICATIONS
-- Eliminates duplicate applications caused by concurrent submissions.
CREATE UNIQUE INDEX IF NOT EXISTS uq_job_applications_job_worker
ON public.job_applications(job_id, worker_id);
