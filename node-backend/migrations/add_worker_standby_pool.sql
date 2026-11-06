-- Migration: Add worker_standby_pool for Digital Labour Chowk spot hiring
CREATE TABLE IF NOT EXISTS worker_standby_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    trade VARCHAR(100) NOT NULL,
    expected_daily_wage DECIMAL(10, 2) NOT NULL,
    taluk VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Chennai',
    latitude FLOAT,
    longitude FLOAT,
    is_ready_now BOOLEAN DEFAULT true,
    available_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift_preference VARCHAR(50) DEFAULT 'DAY_SHIFT', -- DAY_SHIFT, NIGHT_SHIFT, ANY
    notes VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique index so a worker has at most 1 active standby record per day
CREATE UNIQUE INDEX IF NOT EXISTS uq_worker_standby_daily 
ON worker_standby_pool (user_id, available_date);

-- Composite search index for fast filtered lookup by city, trade, wage, and readiness
CREATE INDEX IF NOT EXISTS idx_standby_pool_search 
ON worker_standby_pool (city, available_date, is_ready_now, trade);

CREATE INDEX IF NOT EXISTS idx_standby_pool_user 
ON worker_standby_pool (user_id);

