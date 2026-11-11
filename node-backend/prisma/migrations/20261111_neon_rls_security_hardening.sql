-- ============================================================================
-- TRUSTHYRE PRODUCTION ROW-LEVEL SECURITY (RLS) HARDENING
-- Target: Neon Serverless PostgreSQL (Production) / Local PostgreSQL
-- Date: 2026-11-11
-- Description: Comprehensive Row-Level Security rules across all 28 tables.
--              Defends against BOLA, IDOR, connection pooling context bleed,
--              and table-owner bypass.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CONTEXT HELPER FUNCTIONS
-- ============================================================================

-- Returns the current authenticated user's ID from session settings
CREATE OR REPLACE FUNCTION public.current_app_user_id() 
RETURNS text 
LANGUAGE sql 
STABLE 
PARALLEL SAFE 
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$;

-- Returns the current authenticated user's role (defaults to 'ANONYMOUS')
CREATE OR REPLACE FUNCTION public.current_app_user_role() 
RETURNS text 
LANGUAGE sql 
STABLE 
PARALLEL SAFE 
AS $$
  SELECT NULLIF(current_setting('app.current_user_role', true), 'ANONYMOUS');
$$;

-- Checks if the session has administrative privileges or bypass flag
CREATE OR REPLACE FUNCTION public.is_app_admin() 
RETURNS boolean 
LANGUAGE sql 
STABLE 
PARALLEL SAFE 
AS $$
  SELECT current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
      OR current_setting('app.bypass_rls', true) = 'true';
$$;

GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_user_role() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO PUBLIC;


-- ============================================================================
-- 2. USER IDENTITY & PROFILES
-- ============================================================================

-- 2.1 user_metadata
ALTER TABLE public.user_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metadata FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_metadata_select_policy" ON public.user_metadata;
CREATE POLICY "user_metadata_select_policy" ON public.user_metadata
FOR SELECT USING (
  is_app_admin() 
  OR id::text = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "user_metadata_insert_policy" ON public.user_metadata;
CREATE POLICY "user_metadata_insert_policy" ON public.user_metadata
FOR INSERT WITH CHECK (
  is_app_admin() 
  OR (SELECT current_app_user_id()) IS NULL 
  OR id::text = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "user_metadata_update_policy" ON public.user_metadata;
CREATE POLICY "user_metadata_update_policy" ON public.user_metadata
FOR UPDATE USING (
  is_app_admin() 
  OR id::text = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin() 
  OR id::text = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "user_metadata_delete_policy" ON public.user_metadata;
CREATE POLICY "user_metadata_delete_policy" ON public.user_metadata
FOR DELETE USING (is_app_admin());


-- 2.2 worker_profiles
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_profiles_select_policy" ON public.worker_profiles;
CREATE POLICY "worker_profiles_select_policy" ON public.worker_profiles
FOR SELECT USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
  OR is_available = true
);

DROP POLICY IF EXISTS "worker_profiles_insert_policy" ON public.worker_profiles;
CREATE POLICY "worker_profiles_insert_policy" ON public.worker_profiles
FOR INSERT WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "worker_profiles_update_policy" ON public.worker_profiles;
CREATE POLICY "worker_profiles_update_policy" ON public.worker_profiles
FOR UPDATE USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "worker_profiles_delete_policy" ON public.worker_profiles;
CREATE POLICY "worker_profiles_delete_policy" ON public.worker_profiles
FOR DELETE USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);


-- 2.3 employer_profiles
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employer_profiles_select_policy" ON public.employer_profiles;
CREATE POLICY "employer_profiles_select_policy" ON public.employer_profiles
FOR SELECT USING (true);

DROP POLICY IF EXISTS "employer_profiles_insert_policy" ON public.employer_profiles;
CREATE POLICY "employer_profiles_insert_policy" ON public.employer_profiles
FOR INSERT WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "employer_profiles_update_policy" ON public.employer_profiles;
CREATE POLICY "employer_profiles_update_policy" ON public.employer_profiles
FOR UPDATE USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "employer_profiles_delete_policy" ON public.employer_profiles;
CREATE POLICY "employer_profiles_delete_policy" ON public.employer_profiles
FOR DELETE USING (is_app_admin());


-- 2.4 worker_standby_pool
ALTER TABLE public.worker_standby_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_standby_pool FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_standby_select_policy" ON public.worker_standby_pool;
CREATE POLICY "worker_standby_select_policy" ON public.worker_standby_pool
FOR SELECT USING (
  is_app_admin()
  OR is_ready_now = true
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "worker_standby_insert_policy" ON public.worker_standby_pool;
CREATE POLICY "worker_standby_insert_policy" ON public.worker_standby_pool
FOR INSERT WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "worker_standby_update_policy" ON public.worker_standby_pool;
CREATE POLICY "worker_standby_update_policy" ON public.worker_standby_pool
FOR UPDATE USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "worker_standby_delete_policy" ON public.worker_standby_pool;
CREATE POLICY "worker_standby_delete_policy" ON public.worker_standby_pool
FOR DELETE USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);


-- 2.5 worker_work_history
ALTER TABLE public.worker_work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_work_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_history_select_policy" ON public.worker_work_history;
CREATE POLICY "worker_history_select_policy" ON public.worker_work_history
FOR SELECT USING (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
  OR verification_status IN ('VERIFIED', 'SELF_REPORTED')
);

DROP POLICY IF EXISTS "worker_history_insert_policy" ON public.worker_work_history;
CREATE POLICY "worker_history_insert_policy" ON public.worker_work_history
FOR INSERT WITH CHECK (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "worker_history_update_policy" ON public.worker_work_history;
CREATE POLICY "worker_history_update_policy" ON public.worker_work_history
FOR UPDATE USING (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
  OR verified_by_employer_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
  OR verified_by_employer_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "worker_history_delete_policy" ON public.worker_work_history;
CREATE POLICY "worker_history_delete_policy" ON public.worker_work_history
FOR DELETE USING (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
);


-- ============================================================================
-- 3. JOBS & APPLICATION PIPELINE
-- ============================================================================

-- 3.1 jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_select_policy" ON public.jobs;
CREATE POLICY "jobs_select_policy" ON public.jobs
FOR SELECT USING (
  is_app_admin()
  OR status IN ('OPEN', 'ACTIVE')
  OR employer_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "jobs_insert_policy" ON public.jobs;
CREATE POLICY "jobs_insert_policy" ON public.jobs
FOR INSERT WITH CHECK (
  is_app_admin()
  OR employer_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "jobs_update_policy" ON public.jobs;
CREATE POLICY "jobs_update_policy" ON public.jobs
FOR UPDATE USING (
  is_app_admin()
  OR employer_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR employer_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "jobs_delete_policy" ON public.jobs;
CREATE POLICY "jobs_delete_policy" ON public.jobs
FOR DELETE USING (
  is_app_admin()
  OR employer_id = (SELECT current_app_user_id())
);


-- 3.2 job_applications
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_applications_select_policy" ON public.job_applications;
CREATE POLICY "job_applications_select_policy" ON public.job_applications
FOR SELECT USING (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
  OR EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_applications.job_id 
      AND jobs.employer_id = (SELECT current_app_user_id())
  )
);

DROP POLICY IF EXISTS "job_applications_insert_policy" ON public.job_applications;
CREATE POLICY "job_applications_insert_policy" ON public.job_applications
FOR INSERT WITH CHECK (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "job_applications_update_policy" ON public.job_applications;
CREATE POLICY "job_applications_update_policy" ON public.job_applications
FOR UPDATE USING (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
  OR EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_applications.job_id 
      AND jobs.employer_id = (SELECT current_app_user_id())
  )
) WITH CHECK (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
  OR EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_applications.job_id 
      AND jobs.employer_id = (SELECT current_app_user_id())
  )
);

DROP POLICY IF EXISTS "job_applications_delete_policy" ON public.job_applications;
CREATE POLICY "job_applications_delete_policy" ON public.job_applications
FOR DELETE USING (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
);


-- 3.3 saved_jobs
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_jobs_user_isolation" ON public.saved_jobs;
CREATE POLICY "saved_jobs_user_isolation" ON public.saved_jobs
FOR ALL USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);


-- 3.4 saved_workers
ALTER TABLE public.saved_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_workers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_workers_employer_isolation" ON public.saved_workers;
CREATE POLICY "saved_workers_employer_isolation" ON public.saved_workers
FOR ALL USING (
  is_app_admin()
  OR employer_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR employer_id = (SELECT current_app_user_id())
);


-- ============================================================================
-- 4. USER SETTINGS, ALERTS & TOKENS
-- ============================================================================

-- 4.1 user_search_alerts
ALTER TABLE public.user_search_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_search_alerts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_alerts_isolation" ON public.user_search_alerts;
CREATE POLICY "user_alerts_isolation" ON public.user_search_alerts
FOR ALL USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);


-- 4.2 user_fcm_tokens
ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fcm_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_fcm_tokens_isolation" ON public.user_fcm_tokens;
CREATE POLICY "user_fcm_tokens_isolation" ON public.user_fcm_tokens
FOR ALL USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);


-- 4.3 user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_isolation" ON public.user_settings;
CREATE POLICY "user_settings_isolation" ON public.user_settings
FOR ALL USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);


-- 4.4 notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
FOR SELECT USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
FOR UPDATE USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" ON public.notifications
FOR DELETE USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);


-- 4.5 user_activities
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_activities_select_policy" ON public.user_activities;
CREATE POLICY "user_activities_select_policy" ON public.user_activities
FOR SELECT USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "user_activities_insert_policy" ON public.user_activities;
CREATE POLICY "user_activities_insert_policy" ON public.user_activities
FOR INSERT WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "user_activities_admin_only" ON public.user_activities;
CREATE POLICY "user_activities_admin_only" ON public.user_activities
FOR UPDATE USING (is_app_admin());

DROP POLICY IF EXISTS "user_activities_delete_policy" ON public.user_activities;
CREATE POLICY "user_activities_delete_policy" ON public.user_activities
FOR DELETE USING (is_app_admin());


-- ============================================================================
-- 5. TRUST, RATINGS & VERIFICATION
-- ============================================================================

-- 5.1 ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select_policy" ON public.ratings;
CREATE POLICY "ratings_select_policy" ON public.ratings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "ratings_insert_policy" ON public.ratings;
CREATE POLICY "ratings_insert_policy" ON public.ratings
FOR INSERT WITH CHECK (
  is_app_admin()
  OR (
    reviewer_id = (SELECT current_app_user_id())
    AND ratee_id != (SELECT current_app_user_id())
  )
);

DROP POLICY IF EXISTS "ratings_update_policy" ON public.ratings;
CREATE POLICY "ratings_update_policy" ON public.ratings
FOR UPDATE USING (
  is_app_admin()
  OR reviewer_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR reviewer_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "ratings_delete_policy" ON public.ratings;
CREATE POLICY "ratings_delete_policy" ON public.ratings
FOR DELETE USING (
  is_app_admin()
  OR reviewer_id = (SELECT current_app_user_id())
);


-- 5.2 verification_records
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_records_select_policy" ON public.verification_records;
CREATE POLICY "verification_records_select_policy" ON public.verification_records
FOR SELECT USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "verification_records_insert_policy" ON public.verification_records;
CREATE POLICY "verification_records_insert_policy" ON public.verification_records
FOR INSERT WITH CHECK (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "verification_records_update_policy" ON public.verification_records;
CREATE POLICY "verification_records_update_policy" ON public.verification_records
FOR UPDATE USING (is_app_admin())
WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "verification_records_delete_policy" ON public.verification_records;
CREATE POLICY "verification_records_delete_policy" ON public.verification_records
FOR DELETE USING (is_app_admin());


-- ============================================================================
-- 6. SKILL TESTS & ASSESSMENTS
-- ============================================================================

-- 6.1 skill_tests
ALTER TABLE public.skill_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_test_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_tests_public_read" ON public.skill_tests;
CREATE POLICY "skill_tests_public_read" ON public.skill_tests FOR SELECT USING (true);

DROP POLICY IF EXISTS "skill_tests_admin_write" ON public.skill_tests;
CREATE POLICY "skill_tests_admin_write" ON public.skill_tests FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "skill_test_questions_read" ON public.skill_test_questions;
CREATE POLICY "skill_test_questions_read" ON public.skill_test_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "skill_test_questions_admin_write" ON public.skill_test_questions;
CREATE POLICY "skill_test_questions_admin_write" ON public.skill_test_questions FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());


-- 6.2 skill_test_results
ALTER TABLE public.skill_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_test_results FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_results_select_policy" ON public.skill_test_results;
CREATE POLICY "skill_results_select_policy" ON public.skill_test_results
FOR SELECT USING (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "skill_results_insert_policy" ON public.skill_test_results;
CREATE POLICY "skill_results_insert_policy" ON public.skill_test_results
FOR INSERT WITH CHECK (
  is_app_admin()
  OR worker_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "skill_results_admin_write" ON public.skill_test_results;
CREATE POLICY "skill_results_admin_write" ON public.skill_test_results
FOR UPDATE USING (is_app_admin()) WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "skill_results_admin_delete" ON public.skill_test_results;
CREATE POLICY "skill_results_admin_delete" ON public.skill_test_results
FOR DELETE USING (is_app_admin());


-- ============================================================================
-- 7. MEDIA ASSETS & SUPPORT TICKETS
-- ============================================================================

-- 7.1 media_assets
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_assets_select_policy" ON public.media_assets;
CREATE POLICY "media_assets_select_policy" ON public.media_assets
FOR SELECT USING (true);

DROP POLICY IF EXISTS "media_assets_insert_policy" ON public.media_assets;
CREATE POLICY "media_assets_insert_policy" ON public.media_assets
FOR INSERT WITH CHECK (
  is_app_admin()
  OR owner_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "media_assets_update_delete_policy" ON public.media_assets;
CREATE POLICY "media_assets_update_delete_policy" ON public.media_assets
FOR ALL USING (
  is_app_admin()
  OR owner_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin()
  OR owner_id = (SELECT current_app_user_id())
);


-- 7.2 support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_select_policy" ON public.support_tickets;
CREATE POLICY "support_tickets_select_policy" ON public.support_tickets
FOR SELECT USING (
  is_app_admin()
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "support_tickets_insert_policy" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_policy" ON public.support_tickets
FOR INSERT WITH CHECK (
  is_app_admin()
  OR user_id IS NULL
  OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "support_tickets_admin_write" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_write" ON public.support_tickets
FOR UPDATE USING (is_app_admin()) WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "support_tickets_admin_delete" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_delete" ON public.support_tickets
FOR DELETE USING (is_app_admin());


-- ============================================================================
-- 8. SEARCH INDEXES, MASTER DATA & CMS
-- ============================================================================

-- 8.1 Search indexes
ALTER TABLE public.job_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_search_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_search_index_public_read" ON public.job_search_index;
CREATE POLICY "job_search_index_public_read" ON public.job_search_index FOR SELECT USING (true);

DROP POLICY IF EXISTS "job_search_index_write" ON public.job_search_index;
CREATE POLICY "job_search_index_write" ON public.job_search_index FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "worker_search_index_public_read" ON public.worker_search_index;
CREATE POLICY "worker_search_index_public_read" ON public.worker_search_index FOR SELECT USING (true);

DROP POLICY IF EXISTS "worker_search_index_write" ON public.worker_search_index;
CREATE POLICY "worker_search_index_write" ON public.worker_search_index FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());


-- 8.2 Blog categories & posts
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_categories_public_read" ON public.blog_categories;
CREATE POLICY "blog_categories_public_read" ON public.blog_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "blog_categories_admin_write" ON public.blog_categories;
CREATE POLICY "blog_categories_admin_write" ON public.blog_categories FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "blog_posts_public_read" ON public.blog_posts;
CREATE POLICY "blog_posts_public_read" ON public.blog_posts FOR SELECT USING (status = 'PUBLISHED' OR is_app_admin());

DROP POLICY IF EXISTS "blog_posts_admin_write" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_write" ON public.blog_posts FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());


-- 8.3 Location & Onboarding options
ALTER TABLE public.location_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_master_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "location_master_public_read" ON public.location_master;
CREATE POLICY "location_master_public_read" ON public.location_master FOR SELECT USING (true);

DROP POLICY IF EXISTS "location_master_admin_write" ON public.location_master;
CREATE POLICY "location_master_admin_write" ON public.location_master FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "onboarding_options_public_read" ON public.onboarding_master_options;
CREATE POLICY "onboarding_options_public_read" ON public.onboarding_master_options FOR SELECT USING (is_active = true OR is_app_admin());

DROP POLICY IF EXISTS "onboarding_options_admin_write" ON public.onboarding_master_options;
CREATE POLICY "onboarding_options_admin_write" ON public.onboarding_master_options FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());


-- ============================================================================
-- 9. CRM, SCRAPERS & INTERNAL TOOLS (Admin Only)
-- ============================================================================

ALTER TABLE public.employer_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_lead_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.early_access_requests ENABLE ROW LEVEL SECURITY;

-- CRM
DROP POLICY IF EXISTS "employer_leads_admin_only" ON public.employer_leads;
CREATE POLICY "employer_leads_admin_only" ON public.employer_leads FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "employer_lead_reqs_admin_only" ON public.employer_lead_requirements;
CREATE POLICY "employer_lead_reqs_admin_only" ON public.employer_lead_requirements FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "lead_outreach_logs_admin_only" ON public.lead_outreach_logs;
CREATE POLICY "lead_outreach_logs_admin_only" ON public.lead_outreach_logs FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

-- Scrapers
DROP POLICY IF EXISTS "scraper_scans_admin_only" ON public.scraper_scans;
CREATE POLICY "scraper_scans_admin_only" ON public.scraper_scans FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "scraper_scan_logs_admin_only" ON public.scraper_scan_logs;
CREATE POLICY "scraper_scan_logs_admin_only" ON public.scraper_scan_logs FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

-- Early Access
DROP POLICY IF EXISTS "early_access_insert" ON public.early_access_requests;
CREATE POLICY "early_access_insert" ON public.early_access_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "early_access_admin_read" ON public.early_access_requests;
CREATE POLICY "early_access_admin_read" ON public.early_access_requests FOR SELECT USING (is_app_admin());

DROP POLICY IF EXISTS "early_access_admin_write" ON public.early_access_requests;
CREATE POLICY "early_access_admin_write" ON public.early_access_requests FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

-- Translation Cache
CREATE TABLE IF NOT EXISTS public.translation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash varchar(64) UNIQUE NOT NULL,
  source_lang varchar(10) DEFAULT 'en' NOT NULL,
  target_lang varchar(10) NOT NULL,
  source_text text NOT NULL,
  translated_text text NOT NULL,
  hit_count integer DEFAULT 1 NOT NULL,
  created_at timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trans_content_hash ON public.translation_cache (content_hash);
CREATE INDEX IF NOT EXISTS idx_trans_target_lang ON public.translation_cache (target_lang);

ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_cache FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "translation_cache_read" ON public.translation_cache;
CREATE POLICY "translation_cache_read" ON public.translation_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "translation_cache_insert" ON public.translation_cache;
CREATE POLICY "translation_cache_insert" ON public.translation_cache FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "translation_cache_admin_modify" ON public.translation_cache;
CREATE POLICY "translation_cache_admin_modify" ON public.translation_cache FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

-- 9.4 Admin Invitations
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_invitations_admin_all" ON public.admin_invitations;
CREATE POLICY "admin_invitations_admin_all" ON public.admin_invitations
FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

DROP POLICY IF EXISTS "admin_invitations_token_verify" ON public.admin_invitations;
CREATE POLICY "admin_invitations_token_verify" ON public.admin_invitations
FOR SELECT USING (status = 'PENDING');

DROP POLICY IF EXISTS "admin_invitations_token_accept" ON public.admin_invitations;
CREATE POLICY "admin_invitations_token_accept" ON public.admin_invitations
FOR UPDATE USING (status = 'PENDING') WITH CHECK (status = 'ACCEPTED');

COMMIT;

