-- ============================================================================
-- TRUSTHYRE RECOMMENDATION SYSTEM & INTERACTION TELEMETRY MIGRATION
-- Date: 2026-11-12
-- Target: Local PostgreSQL / Neon DB Production
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  interaction_type VARCHAR(50) NOT NULL,
  item_type VARCHAR(20) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  match_score INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_rec_interactions_user_type ON public.recommendation_interactions(user_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_item ON public.recommendation_interactions(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_rec_interactions_created_at ON public.recommendation_interactions(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) ENFORCEMENT
-- ============================================================================
ALTER TABLE public.recommendation_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_interactions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rec_interactions_select" ON public.recommendation_interactions;
CREATE POLICY "rec_interactions_select" ON public.recommendation_interactions
FOR SELECT USING (
  is_app_admin() OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "rec_interactions_insert" ON public.recommendation_interactions;
CREATE POLICY "rec_interactions_insert" ON public.recommendation_interactions
FOR INSERT WITH CHECK (
  is_app_admin() OR user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "rec_interactions_delete" ON public.recommendation_interactions;
CREATE POLICY "rec_interactions_delete" ON public.recommendation_interactions
FOR DELETE USING (
  is_app_admin() OR user_id = (SELECT current_app_user_id())
);

