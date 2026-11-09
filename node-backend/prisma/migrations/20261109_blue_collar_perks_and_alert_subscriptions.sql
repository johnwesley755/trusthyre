-- Migration: 20261109_blue_collar_perks_and_alert_subscriptions.sql
-- Purpose: Add structured perks (food, accommodation, immediate joining, shift type, pf/esi, landmark) to jobs,
-- and create job_alert_subscriptions table for 1-click WhatsApp/phone alerts by taluk & trade.

-- 1. Add blue-collar perks to `jobs` table if they do not exist
ALTER TABLE "jobs" 
  ADD COLUMN IF NOT EXISTS "has_food" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "has_accommodation" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "immediate_joining" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shift_type" VARCHAR(30) DEFAULT 'DAY_SHIFT',
  ADD COLUMN IF NOT EXISTS "pf_esi_available" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "landmark" VARCHAR(255);

CREATE INDEX IF NOT EXISTS "idx_jobs_perks" ON "jobs"("has_food", "has_accommodation", "immediate_joining", "shift_type");

-- 2. Create `job_alert_subscriptions` table for 1-click WhatsApp alerts
CREATE TABLE IF NOT EXISTS "job_alert_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "phone" VARCHAR(20) NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "taluk_slug" VARCHAR(100),
  "trade_slug" VARCHAR(100),
  "frequency" VARCHAR(20) DEFAULT 'INSTANT',
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_job_alerts_phone" ON "job_alert_subscriptions"("phone");
CREATE INDEX IF NOT EXISTS "idx_job_alerts_city_trade" ON "job_alert_subscriptions"("city", "trade_slug", "is_active");
CREATE INDEX IF NOT EXISTS "idx_job_alerts_taluk" ON "job_alert_subscriptions"("city", "taluk_slug", "is_active");
