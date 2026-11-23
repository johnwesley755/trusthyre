-- ==============================================================================
-- TrustHyre Migration: Candidate Activity Timeline, Notes & Follow-ups
-- Strict Neon Row-Level Security (RLS) Hardening Enforcement
-- ==============================================================================

-- 1. Create application_activity_events table
CREATE TABLE IF NOT EXISTS public.application_activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    actor_type VARCHAR(50) NOT NULL DEFAULT 'EMPLOYER',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_app_id ON public.application_activity_events(application_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON public.application_activity_events(created_at);

-- 2. Create application_notes table (Private employer-internal notes)
CREATE TABLE IF NOT EXISTS public.application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    author_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_notes_app_id ON public.application_notes(application_id);

-- 3. Create application_follow_ups table
CREATE TABLE IF NOT EXISTS public.application_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    creator_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    note TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_app_id ON public.application_follow_ups(application_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_at ON public.application_follow_ups(due_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.application_follow_ups(status);

-- ==============================================================================
-- Row-Level Security (RLS) Enforcement
-- ==============================================================================

ALTER TABLE public.application_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_activity_events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_notes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.application_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_follow_ups FORCE ROW LEVEL SECURITY;

-- Policies for application_activity_events
DROP POLICY IF EXISTS p_activity_events_select ON public.application_activity_events;
CREATE POLICY p_activity_events_select ON public.application_activity_events
    FOR SELECT
    USING (
        is_app_admin()
        OR EXISTS (
            SELECT 1 FROM public.job_applications ja
            JOIN public.jobs j ON j.id = ja.job_id
            WHERE ja.id = application_activity_events.application_id
            AND j.employer_id = (SELECT current_app_user_id())
        )
        OR (
            -- Candidate can see limited public events (e.g. application submitted, interview scheduled, offer sent)
            event_type NOT IN ('INTERNAL_NOTE_ADDED', 'FOLLOW_UP_SCHEDULED', 'FOLLOW_UP_COMPLETED')
            AND EXISTS (
                SELECT 1 FROM public.job_applications ja
                WHERE ja.id = application_activity_events.application_id
                AND ja.worker_id = (SELECT current_app_user_id())
            )
        )
    );

DROP POLICY IF EXISTS p_activity_events_insert ON public.application_activity_events;
CREATE POLICY p_activity_events_insert ON public.application_activity_events
    FOR INSERT
    WITH CHECK (
        is_app_admin()
        OR EXISTS (
            SELECT 1 FROM public.job_applications ja
            JOIN public.jobs j ON j.id = ja.job_id
            WHERE ja.id = application_activity_events.application_id
            AND (j.employer_id = (SELECT current_app_user_id()) OR ja.worker_id = (SELECT current_app_user_id()))
        )
    );

-- Policies for application_notes (Strictly Employer Internal & Admin Only)
DROP POLICY IF EXISTS p_notes_select ON public.application_notes;
CREATE POLICY p_notes_select ON public.application_notes
    FOR SELECT
    USING (
        is_app_admin()
        OR EXISTS (
            SELECT 1 FROM public.job_applications ja
            JOIN public.jobs j ON j.id = ja.job_id
            WHERE ja.id = application_notes.application_id
            AND j.employer_id = (SELECT current_app_user_id())
        )
    );

DROP POLICY IF EXISTS p_notes_insert ON public.application_notes;
CREATE POLICY p_notes_insert ON public.application_notes
    FOR INSERT
    WITH CHECK (
        is_app_admin()
        OR (
            author_id = (SELECT current_app_user_id())
            AND EXISTS (
                SELECT 1 FROM public.job_applications ja
                JOIN public.jobs j ON j.id = ja.job_id
                WHERE ja.id = application_notes.application_id
                AND j.employer_id = (SELECT current_app_user_id())
            )
        )
    );

DROP POLICY IF EXISTS p_notes_update ON public.application_notes;
CREATE POLICY p_notes_update ON public.application_notes
    FOR UPDATE
    USING (
        is_app_admin()
        OR (
            author_id = (SELECT current_app_user_id())
            AND EXISTS (
                SELECT 1 FROM public.job_applications ja
                JOIN public.jobs j ON j.id = ja.job_id
                WHERE ja.id = application_notes.application_id
                AND j.employer_id = (SELECT current_app_user_id())
            )
        )
    );

DROP POLICY IF EXISTS p_notes_delete ON public.application_notes;
CREATE POLICY p_notes_delete ON public.application_notes
    FOR DELETE
    USING (
        is_app_admin()
        OR (
            author_id = (SELECT current_app_user_id())
            AND EXISTS (
                SELECT 1 FROM public.job_applications ja
                JOIN public.jobs j ON j.id = ja.job_id
                WHERE ja.id = application_notes.application_id
                AND j.employer_id = (SELECT current_app_user_id())
            )
        )
    );

-- Policies for application_follow_ups (Strictly Employer Internal & Admin Only)
DROP POLICY IF EXISTS p_follow_ups_select ON public.application_follow_ups;
CREATE POLICY p_follow_ups_select ON public.application_follow_ups
    FOR SELECT
    USING (
        is_app_admin()
        OR EXISTS (
            SELECT 1 FROM public.job_applications ja
            JOIN public.jobs j ON j.id = ja.job_id
            WHERE ja.id = application_follow_ups.application_id
            AND j.employer_id = (SELECT current_app_user_id())
        )
    );

DROP POLICY IF EXISTS p_follow_ups_insert ON public.application_follow_ups;
CREATE POLICY p_follow_ups_insert ON public.application_follow_ups
    FOR INSERT
    WITH CHECK (
        is_app_admin()
        OR (
            creator_id = (SELECT current_app_user_id())
            AND EXISTS (
                SELECT 1 FROM public.job_applications ja
                JOIN public.jobs j ON j.id = ja.job_id
                WHERE ja.id = application_follow_ups.application_id
                AND j.employer_id = (SELECT current_app_user_id())
            )
        )
    );

DROP POLICY IF EXISTS p_follow_ups_update ON public.application_follow_ups;
CREATE POLICY p_follow_ups_update ON public.application_follow_ups
    FOR UPDATE
    USING (
        is_app_admin()
        OR EXISTS (
            SELECT 1 FROM public.job_applications ja
            JOIN public.jobs j ON j.id = ja.job_id
            WHERE ja.id = application_follow_ups.application_id
            AND j.employer_id = (SELECT current_app_user_id())
        )
    );

DROP POLICY IF EXISTS p_follow_ups_delete ON public.application_follow_ups;
CREATE POLICY p_follow_ups_delete ON public.application_follow_ups
    FOR DELETE
    USING (
        is_app_admin()
        OR EXISTS (
            SELECT 1 FROM public.job_applications ja
            JOIN public.jobs j ON j.id = ja.job_id
            WHERE ja.id = application_follow_ups.application_id
            AND j.employer_id = (SELECT current_app_user_id())
        )
    );
