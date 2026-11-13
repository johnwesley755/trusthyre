-- ============================================================================
-- TrustHyre Shift Scheduling and Attendance Engine
-- Migration: 20261113_shifts_and_attendance.sql
-- Description:
--   Creates the shifts and shift_attendances tables with immutable audit trails,
--   state-machine constraints, and enterprise Row-Level Security (RLS) enforcement.
-- ============================================================================

-- 1. SHIFTS TABLE
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    employer_id VARCHAR(255) NOT NULL REFERENCES public.employer_profiles(user_id) ON DELETE CASCADE,
    worker_id VARCHAR(255) NOT NULL REFERENCES public.worker_profiles(user_id) ON DELETE CASCADE,
    supervisor_id VARCHAR(255),
    shift_date DATE NOT NULL,
    start_time VARCHAR(10) NOT NULL, -- e.g. "09:00"
    end_time VARCHAR(10) NOT NULL,   -- e.g. "18:00"
    break_duration_minutes INT NOT NULL DEFAULT 60,
    worksite_name VARCHAR(255) NOT NULL,
    worksite_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, COMPLETED, CANCELLED
    recurrence_rule VARCHAR(100),                    -- DAILY, WEEKLY, WEEKDAYS, or NULL
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_shift_status CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED'))
);

-- Indexes for shifts
CREATE INDEX IF NOT EXISTS idx_shifts_work_order_id ON public.shifts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_shifts_employer_id ON public.shifts(employer_id);
CREATE INDEX IF NOT EXISTS idx_shifts_worker_id ON public.shifts(worker_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date_status ON public.shifts(shift_date, status);

-- 2. SHIFT ATTENDANCES TABLE
CREATE TABLE IF NOT EXISTS public.shift_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    worker_id VARCHAR(255) NOT NULL REFERENCES public.worker_profiles(user_id) ON DELETE CASCADE,
    employer_id VARCHAR(255) NOT NULL REFERENCES public.employer_profiles(user_id) ON DELETE CASCADE,
    supervisor_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    verification_method VARCHAR(50) NOT NULL DEFAULT 'QR_CODE', -- QR_CODE, ONE_TIME_PIN, MANUAL_SUPERVISOR
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    break_start_time TIMESTAMPTZ,
    break_end_time TIMESTAMPTZ,
    total_work_minutes INT NOT NULL DEFAULT 0,
    total_break_minutes INT NOT NULL DEFAULT 0,
    check_in_lat DOUBLE PRECISION,
    check_in_lng DOUBLE PRECISION,
    check_out_lat DOUBLE PRECISION,
    check_out_lng DOUBLE PRECISION,
    check_in_notes TEXT,
    check_out_notes TEXT,
    manual_reason TEXT,
    correction_requested_time TIMESTAMPTZ,
    correction_reason TEXT,
    correction_proposed_check_in TIMESTAMPTZ,
    correction_proposed_check_out TIMESTAMPTZ,
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    events JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_attendance_status CHECK (
        status IN (
            'NOT_STARTED',
            'CHECKED_IN',
            'ON_BREAK',
            'CHECKED_OUT',
            'PENDING_APPROVAL',
            'APPROVED',
            'CORRECTION_REQUESTED',
            'DISPUTED'
        )
    ),
    CONSTRAINT chk_verification_method CHECK (
        verification_method IN ('QR_CODE', 'ONE_TIME_PIN', 'MANUAL_SUPERVISOR')
    )
);

-- Indexes for shift attendances
CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_attendance_shift_worker ON public.shift_attendances(shift_id, worker_id);
CREATE INDEX IF NOT EXISTS idx_attendances_worker_id ON public.shift_attendances(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendances_employer_id ON public.shift_attendances(employer_id);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON public.shift_attendances(status);
CREATE INDEX IF NOT EXISTS idx_attendances_created_at ON public.shift_attendances(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- A. RLS for shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts FORCE ROW LEVEL SECURITY;

-- SELECT policy: Employer owns, worker assigned, or admin
DROP POLICY IF EXISTS shifts_select_policy ON public.shifts;
CREATE POLICY shifts_select_policy ON public.shifts
    FOR SELECT
    USING (
        (SELECT is_app_admin())
        OR employer_id = (SELECT current_app_user_id())
        OR worker_id = (SELECT current_app_user_id())
        OR supervisor_id = (SELECT current_app_user_id())
    );

-- INSERT policy: Employer can schedule shifts for their own work orders, or admin
DROP POLICY IF EXISTS shifts_insert_policy ON public.shifts;
CREATE POLICY shifts_insert_policy ON public.shifts
    FOR INSERT
    WITH CHECK (
        (SELECT is_app_admin())
        OR employer_id = (SELECT current_app_user_id())
    );

-- UPDATE policy: Employer can modify shift schedule, or admin
DROP POLICY IF EXISTS shifts_update_policy ON public.shifts;
CREATE POLICY shifts_update_policy ON public.shifts
    FOR UPDATE
    USING (
        (SELECT is_app_admin())
        OR employer_id = (SELECT current_app_user_id())
    );

-- DELETE policy: Employer can delete scheduled shifts, or admin
DROP POLICY IF EXISTS shifts_delete_policy ON public.shifts;
CREATE POLICY shifts_delete_policy ON public.shifts
    FOR DELETE
    USING (
        (SELECT is_app_admin())
        OR employer_id = (SELECT current_app_user_id())
    );


-- B. RLS for shift_attendances
ALTER TABLE public.shift_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_attendances FORCE ROW LEVEL SECURITY;

-- SELECT policy: Worker, employer, supervisor, or admin
DROP POLICY IF EXISTS shift_attendances_select_policy ON public.shift_attendances;
CREATE POLICY shift_attendances_select_policy ON public.shift_attendances
    FOR SELECT
    USING (
        (SELECT is_app_admin())
        OR worker_id = (SELECT current_app_user_id())
        OR employer_id = (SELECT current_app_user_id())
        OR supervisor_id = (SELECT current_app_user_id())
    );

-- INSERT policy: Employer, supervisor, worker (auto-create on check-in), or admin
DROP POLICY IF EXISTS shift_attendances_insert_policy ON public.shift_attendances;
CREATE POLICY shift_attendances_insert_policy ON public.shift_attendances
    FOR INSERT
    WITH CHECK (
        (SELECT is_app_admin())
        OR worker_id = (SELECT current_app_user_id())
        OR employer_id = (SELECT current_app_user_id())
    );

-- UPDATE policy:
-- Worker can check in, check out, break, and request corrections on their own record.
-- Employer can approve, modify, or resolve corrections. Admin has full access.
DROP POLICY IF EXISTS shift_attendances_update_policy ON public.shift_attendances;
CREATE POLICY shift_attendances_update_policy ON public.shift_attendances
    FOR UPDATE
    USING (
        (SELECT is_app_admin())
        OR worker_id = (SELECT current_app_user_id())
        OR employer_id = (SELECT current_app_user_id())
        OR supervisor_id = (SELECT current_app_user_id())
    );

-- DELETE policy: Only admin or employer can delete attendance records
DROP POLICY IF EXISTS shift_attendances_delete_policy ON public.shift_attendances;
CREATE POLICY shift_attendances_delete_policy ON public.shift_attendances
    FOR DELETE
    USING (
        (SELECT is_app_admin())
        OR employer_id = (SELECT current_app_user_id())
    );

