-- ============================================================================
-- TRUSTHYRE CONVERSATION CENTER & MESSAGING SYSTEM
-- Target: Neon Serverless PostgreSQL (Production) & Local PostgreSQL
-- Date: 2026-11-18
-- Description: Creates conversations, conversation_participants, 
--              conversation_messages, and conversation_reports tables.
--              Enforces strict Row-Level Security (RLS) with BOLA/IDOR protection.
-- ============================================================================

BEGIN;

-- 1. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE REFERENCES public.job_applications(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    employer_user_id VARCHAR(255) NOT NULL,
    worker_user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    last_message_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS idx_conversations_employer_last_msg 
    ON public.conversations (employer_user_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_worker_last_msg 
    ON public.conversations (worker_user_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_conversations_job_id 
    ON public.conversations (job_id);

CREATE INDEX IF NOT EXISTS idx_conversations_application_id 
    ON public.conversations (application_id);

-- 2. CONVERSATION PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    last_read_at TIMESTAMPTZ(6),
    last_read_message_id UUID,
    muted_at TIMESTAMPTZ(6),
    blocked_at TIMESTAMPTZ(6),
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_conversation_participant UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
    ON public.conversation_participants (user_id);

-- 3. CONVERSATION MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_user_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    body TEXT NOT NULL,
    client_message_id VARCHAR(128),
    metadata JSONB,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ(6),
    deleted_at TIMESTAMPTZ(6),
    CONSTRAINT uq_sender_client_message_id UNIQUE (sender_user_id, client_message_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_stream 
    ON public.conversation_messages (conversation_id, created_at DESC);

-- 4. CONVERSATION REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.conversation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    reporter_user_id VARCHAR(255) NOT NULL,
    reported_user_id VARCHAR(255) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_reports_conv 
    ON public.conversation_reports (conversation_id);

-- ============================================================================
-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Ensure helper functions exist
CREATE OR REPLACE FUNCTION public.current_app_user_id() 
RETURNS text 
LANGUAGE sql 
STABLE 
PARALLEL SAFE 
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin() 
RETURNS boolean 
LANGUAGE sql 
STABLE 
PARALLEL SAFE 
AS $$
  SELECT COALESCE(
    current_setting('app.is_admin', true) = 'true' 
    OR current_setting('app.current_user_role', true) IN ('ADMIN', 'SUPER_ADMIN')
    OR current_setting('app.bypass_rls', true) = 'true',
    false
  );
$$;

-- Enable and FORCE RLS on all four tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants FORCE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reports FORCE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Policies for: conversations
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
CREATE POLICY "conversations_select_participant" ON public.conversations
FOR SELECT USING (
  is_app_admin() OR
  employer_user_id = (SELECT current_app_user_id()) OR
  worker_user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "conversations_insert_participant" ON public.conversations;
CREATE POLICY "conversations_insert_participant" ON public.conversations
FOR INSERT WITH CHECK (
  is_app_admin() OR
  employer_user_id = (SELECT current_app_user_id()) OR
  worker_user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;
CREATE POLICY "conversations_update_participant" ON public.conversations
FOR UPDATE USING (
  is_app_admin() OR
  employer_user_id = (SELECT current_app_user_id()) OR
  worker_user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin() OR
  employer_user_id = (SELECT current_app_user_id()) OR
  worker_user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "conversations_delete_admin" ON public.conversations;
CREATE POLICY "conversations_delete_admin" ON public.conversations
FOR DELETE USING (
  is_app_admin()
);

-- ----------------------------------------------------------------------------
-- Policies for: conversation_participants
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "participants_select_member" ON public.conversation_participants;
CREATE POLICY "participants_select_member" ON public.conversation_participants
FOR SELECT USING (
  is_app_admin() OR
  user_id = (SELECT current_app_user_id()) OR
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE employer_user_id = (SELECT current_app_user_id()) 
       OR worker_user_id = (SELECT current_app_user_id())
  )
);

DROP POLICY IF EXISTS "participants_insert_member" ON public.conversation_participants;
CREATE POLICY "participants_insert_member" ON public.conversation_participants
FOR INSERT WITH CHECK (
  is_app_admin() OR
  user_id = (SELECT current_app_user_id()) OR
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE employer_user_id = (SELECT current_app_user_id()) 
       OR worker_user_id = (SELECT current_app_user_id())
  )
);

DROP POLICY IF EXISTS "participants_update_member" ON public.conversation_participants;
CREATE POLICY "participants_update_member" ON public.conversation_participants
FOR UPDATE USING (
  is_app_admin() OR
  user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin() OR
  user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "participants_delete_admin" ON public.conversation_participants;
CREATE POLICY "participants_delete_admin" ON public.conversation_participants
FOR DELETE USING (
  is_app_admin()
);

-- ----------------------------------------------------------------------------
-- Policies for: conversation_messages
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "messages_select_participant" ON public.conversation_messages;
CREATE POLICY "messages_select_participant" ON public.conversation_messages
FOR SELECT USING (
  is_app_admin() OR
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE employer_user_id = (SELECT current_app_user_id()) 
       OR worker_user_id = (SELECT current_app_user_id())
  )
);

DROP POLICY IF EXISTS "messages_insert_sender" ON public.conversation_messages;
CREATE POLICY "messages_insert_sender" ON public.conversation_messages
FOR INSERT WITH CHECK (
  is_app_admin() OR (
    sender_user_id = (SELECT current_app_user_id()) AND
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE (employer_user_id = (SELECT current_app_user_id()) OR worker_user_id = (SELECT current_app_user_id()))
        AND status = 'OPEN'
    )
  )
);

DROP POLICY IF EXISTS "messages_update_sender" ON public.conversation_messages;
CREATE POLICY "messages_update_sender" ON public.conversation_messages
FOR UPDATE USING (
  is_app_admin() OR sender_user_id = (SELECT current_app_user_id())
) WITH CHECK (
  is_app_admin() OR sender_user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "messages_delete_admin" ON public.conversation_messages;
CREATE POLICY "messages_delete_admin" ON public.conversation_messages
FOR DELETE USING (
  is_app_admin()
);

-- ----------------------------------------------------------------------------
-- Policies for: conversation_reports
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "reports_select_reporter_or_admin" ON public.conversation_reports;
CREATE POLICY "reports_select_reporter_or_admin" ON public.conversation_reports
FOR SELECT USING (
  is_app_admin() OR reporter_user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "reports_insert_reporter" ON public.conversation_reports;
CREATE POLICY "reports_insert_reporter" ON public.conversation_reports
FOR INSERT WITH CHECK (
  is_app_admin() OR reporter_user_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "reports_update_admin" ON public.conversation_reports;
CREATE POLICY "reports_update_admin" ON public.conversation_reports
FOR UPDATE USING (
  is_app_admin()
) WITH CHECK (
  is_app_admin()
);

DROP POLICY IF EXISTS "reports_delete_admin" ON public.conversation_reports;
CREATE POLICY "reports_delete_admin" ON public.conversation_reports
FOR DELETE USING (
  is_app_admin()
);

COMMIT;
