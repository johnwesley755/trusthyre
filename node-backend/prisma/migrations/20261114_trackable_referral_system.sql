-- ============================================================================
-- TRUSTHYRE MIGRATION: 20261114_trackable_referral_system.sql
-- DESCRIPTION: Add referral_code to user_metadata and create referral_attributions with RLS
-- ============================================================================

-- 1. ADD REFERRAL CODE COLUMN TO USER_METADATA
ALTER TABLE public.user_metadata
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(32);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_metadata_referral_code
ON public.user_metadata(referral_code)
WHERE referral_code IS NOT NULL;

-- 2. CREATE REFERRAL ATTRIBUTIONS TABLE
CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.user_metadata(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES public.user_metadata(id) ON DELETE CASCADE,
  referral_code VARCHAR(32) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'direct_invite',
  signup_role VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  activated_at TIMESTAMPTZ,
  activation_type VARCHAR(50)
);

-- Indices for rapid metrics and lookup
CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer ON public.referral_attributions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_code ON public.referral_attributions(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_source ON public.referral_attributions(source);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_role ON public.referral_attributions(signup_role);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_created ON public.referral_attributions(created_at);

-- 3. ROW LEVEL SECURITY (RLS) STRICT ENFORCEMENT
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions FORCE ROW LEVEL SECURITY;

-- SELECT POLICY:
-- Admin can view all attributions.
-- Referrers can query attributions they originated (for dashboard statistics).
-- Referred users can query their own attribution record.
DROP POLICY IF EXISTS "referral_attributions_select" ON public.referral_attributions;
CREATE POLICY "referral_attributions_select" ON public.referral_attributions
FOR SELECT USING (
  (SELECT is_app_admin()) OR
  (referrer_user_id)::text = (SELECT current_app_user_id()) OR
  (referred_user_id)::text = (SELECT current_app_user_id())
);

-- INSERT POLICY:
-- Admin or server inserting attribution for the newly registered user
DROP POLICY IF EXISTS "referral_attributions_insert" ON public.referral_attributions;
CREATE POLICY "referral_attributions_insert" ON public.referral_attributions
FOR INSERT WITH CHECK (
  (SELECT is_app_admin()) OR
  (referred_user_id)::text = (SELECT current_app_user_id())
);

-- UPDATE POLICY:
-- Admin or server updating activation timestamp
DROP POLICY IF EXISTS "referral_attributions_update" ON public.referral_attributions;
CREATE POLICY "referral_attributions_update" ON public.referral_attributions
FOR UPDATE USING (
  (SELECT is_app_admin()) OR
  (referred_user_id)::text = (SELECT current_app_user_id())
) WITH CHECK (
  (SELECT is_app_admin()) OR
  (referred_user_id)::text = (SELECT current_app_user_id())
);

-- DELETE POLICY:
-- Only admin can delete attribution records
DROP POLICY IF EXISTS "referral_attributions_delete" ON public.referral_attributions;
CREATE POLICY "referral_attributions_delete" ON public.referral_attributions
FOR DELETE USING (
  (SELECT is_app_admin())
);

-- 4. GRANT PERMISSIONS TO RESTRICTED APPLICATION ROLE
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'trusthire_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_attributions TO trusthire_app;
  END IF;
END
$$;
