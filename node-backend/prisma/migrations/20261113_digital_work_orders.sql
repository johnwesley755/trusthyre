-- ============================================================================
-- TrustHyre Migration: 20261113_digital_work_orders.sql
-- Description: Creates Digital Work Orders & Work Order Events tables
-- Security: Full RLS (ENABLE & FORCE) with explicit granular policies
-- Target: Compatible with PostgreSQL 15+ (Local & Neon DB Production)
-- ============================================================================

-- 1. Create work_orders table
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL,
    employer_id VARCHAR(255) NOT NULL,
    worker_id VARCHAR(255) NOT NULL,
    
    -- Work Details
    job_title VARCHAR(255) NOT NULL,
    work_description TEXT,
    worksite_name VARCHAR(255) NOT NULL,
    worksite_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    taluk VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    
    -- Employment & Schedule Terms
    start_date DATE NOT NULL,
    expected_end_date DATE,
    work_duration_days INTEGER,
    shift_timing VARCHAR(100) NOT NULL,
    weekly_rest_day VARCHAR(50) DEFAULT 'SUNDAY',
    daily_working_hours NUMERIC(4, 2) NOT NULL DEFAULT 8.00,
    overtime_terms TEXT,
    
    -- Compensation & Benefits
    wage_amount NUMERIC(10, 2) NOT NULL,
    wage_frequency VARCHAR(50) NOT NULL DEFAULT 'DAILY', -- HOURLY, DAILY, WEEKLY, MONTHLY, PROJECT
    food_provided BOOLEAN DEFAULT false,
    accommodation_provided BOOLEAN DEFAULT false,
    transport_provided BOOLEAN DEFAULT false,
    other_benefits TEXT,
    agreed_deductions TEXT,
    
    -- Lifecycle Status
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, DECLINED, IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED
    worker_response_notes TEXT,
    accepted_at TIMESTAMP(6) WITHOUT TIME ZONE,
    declined_at TIMESTAMP(6) WITHOUT TIME ZONE,
    created_at TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for work_orders
CREATE INDEX IF NOT EXISTS idx_work_orders_employer_id ON public.work_orders(employer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_worker_id ON public.work_orders(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_job_id ON public.work_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON public.work_orders(created_at DESC);

-- 2. Create work_order_events table (Audit Trail & Term Negotiations)
CREATE TABLE IF NOT EXISTS public.work_order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    actor_id VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL, -- EMPLOYER, WORKER, ADMIN
    event_type VARCHAR(50) NOT NULL, -- CREATED, SENT, ACCEPTED, DECLINED, CLARIFICATION_REQUESTED, UPDATED, CANCELLED, DISPUTED
    notes TEXT,
    snapshot JSONB,
    created_at TIMESTAMP(6) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_order_events_wo_id ON public.work_order_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_events_created_at ON public.work_order_events(created_at DESC);

-- ============================================================================
-- 3. Row-Level Security (RLS) Hardening
-- ============================================================================

-- RLS for work_orders
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_orders_select_policy" ON public.work_orders;
CREATE POLICY "work_orders_select_policy" ON public.work_orders
FOR SELECT USING (
    is_app_admin()
    OR employer_id = (SELECT current_app_user_id())
    OR worker_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "work_orders_insert_policy" ON public.work_orders;
CREATE POLICY "work_orders_insert_policy" ON public.work_orders
FOR INSERT WITH CHECK (
    is_app_admin()
    OR employer_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "work_orders_update_policy" ON public.work_orders;
CREATE POLICY "work_orders_update_policy" ON public.work_orders
FOR UPDATE USING (
    is_app_admin()
    OR employer_id = (SELECT current_app_user_id())
    OR worker_id = (SELECT current_app_user_id())
) WITH CHECK (
    is_app_admin()
    OR employer_id = (SELECT current_app_user_id())
    OR worker_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "work_orders_delete_policy" ON public.work_orders;
CREATE POLICY "work_orders_delete_policy" ON public.work_orders
FOR DELETE USING (
    is_app_admin()
);

-- RLS for work_order_events
ALTER TABLE public.work_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_order_events_select_policy" ON public.work_order_events;
CREATE POLICY "work_order_events_select_policy" ON public.work_order_events
FOR SELECT USING (
    is_app_admin()
    OR EXISTS (
        SELECT 1 FROM public.work_orders wo
        WHERE wo.id = work_order_events.work_order_id
        AND (wo.employer_id = (SELECT current_app_user_id()) OR wo.worker_id = (SELECT current_app_user_id()))
    )
);

DROP POLICY IF EXISTS "work_order_events_insert_policy" ON public.work_order_events;
CREATE POLICY "work_order_events_insert_policy" ON public.work_order_events
FOR INSERT WITH CHECK (
    is_app_admin()
    OR actor_id = (SELECT current_app_user_id())
);

DROP POLICY IF EXISTS "work_order_events_update_policy" ON public.work_order_events;
CREATE POLICY "work_order_events_update_policy" ON public.work_order_events
FOR UPDATE USING (
    is_app_admin()
);

DROP POLICY IF EXISTS "work_order_events_delete_policy" ON public.work_order_events;
CREATE POLICY "work_order_events_delete_policy" ON public.work_order_events
FOR DELETE USING (
    is_app_admin()
);

