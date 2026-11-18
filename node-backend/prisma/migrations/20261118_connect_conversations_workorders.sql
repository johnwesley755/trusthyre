-- ============================================================================
-- Migration: 20261118_connect_conversations_workorders.sql
-- Description: Unifies conversations with work_orders and job_applications,
--              creating a single canonical messaging stream per (job, employer, worker)
--              and enabling direct messaging for selected/hired workers.
-- ============================================================================

-- 1. Alter conversations: support work_orders and make application_id nullable
ALTER TABLE public.conversations 
  ALTER COLUMN application_id DROP NOT NULL;

ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL;

-- Drop previous single-application unique constraint if present
ALTER TABLE public.conversations 
  DROP CONSTRAINT IF EXISTS conversations_application_id_key;

-- Create canonical unique index per (job_id, employer_user_id, worker_user_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_job_employer_worker
  ON public.conversations (job_id, employer_user_id, worker_user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_work_order_id 
  ON public.conversations (work_order_id);

CREATE INDEX IF NOT EXISTS idx_conversations_application_id 
  ON public.conversations (application_id);

-- 2. Alter conversation_messages: allow direct links to work orders and interviews
ALTER TABLE public.conversation_messages 
  ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL;

ALTER TABLE public.conversation_messages 
  ADD COLUMN IF NOT EXISTS interview_id uuid REFERENCES public.interviews(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_work_order 
  ON public.conversation_messages (work_order_id);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_interview 
  ON public.conversation_messages (interview_id);

-- 3. Backfill existing work orders to link their conversations where matching
UPDATE public.conversations c
SET work_order_id = wo.id
FROM public.work_orders wo
WHERE c.work_order_id IS NULL
  AND (
    (c.application_id IS NOT NULL AND wo.application_id = c.application_id)
    OR (c.job_id = wo.job_id AND c.employer_user_id = wo.employer_id AND c.worker_user_id = wo.worker_id)
  );

-- 4. Re-enforce and force Row-Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants FORCE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reports FORCE ROW LEVEL SECURITY;
