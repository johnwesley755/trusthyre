-- Migration: Custom Email Template Management System with Strict RLS
-- Date: 2026-11-15

-- 1. Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL_TRANSACTIONAL',
    subject VARCHAR(500) NOT NULL,
    preheader VARCHAR(500),
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    source_type VARCHAR(30) NOT NULL DEFAULT 'APPLICATION',
    brevo_template_id VARCHAR(50),
    published_version_id UUID,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    published_by VARCHAR(255),
    created_at TIMESTAMPTZ(6) DEFAULT now(),
    updated_at TIMESTAMPTZ(6) DEFAULT now(),
    published_at TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates (category);
CREATE INDEX IF NOT EXISTS idx_email_templates_status ON public.email_templates (status);
CREATE INDEX IF NOT EXISTS idx_email_templates_brevo_id ON public.email_templates (brevo_template_id);

-- 2. Create email_template_versions table
CREATE TABLE IF NOT EXISTS public.email_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    subject VARCHAR(500) NOT NULL,
    preheader VARCHAR(500),
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    brevo_template_id VARCHAR(50),
    change_summary TEXT,
    created_by VARCHAR(255),
    published_at TIMESTAMPTZ(6) DEFAULT now(),
    created_at TIMESTAMPTZ(6) DEFAULT now(),
    CONSTRAINT uq_email_template_version UNIQUE (template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_email_template_versions_tpl_v ON public.email_template_versions (template_id, version_number);

-- 3. Create email_template_audit_logs table
CREATE TABLE IF NOT EXISTS public.email_template_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    actor_user_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ(6) DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_template_audit_tpl ON public.email_template_audit_logs (template_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_template_audit_actor ON public.email_template_audit_logs (actor_user_id, created_at);

-- 4. Mandatory Row-Level Security (RLS) Enforcement
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates FORCE ROW LEVEL SECURITY;

ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_versions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.email_template_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_audit_logs FORCE ROW LEVEL SECURITY;

-- 5. Explicit granular RLS policies for Admins
DROP POLICY IF EXISTS "email_templates_admin_all" ON public.email_templates;
CREATE POLICY "email_templates_admin_all" ON public.email_templates
FOR ALL USING (
  is_app_admin()
) WITH CHECK (
  is_app_admin()
);

DROP POLICY IF EXISTS "email_template_versions_admin_all" ON public.email_template_versions;
CREATE POLICY "email_template_versions_admin_all" ON public.email_template_versions
FOR ALL USING (
  is_app_admin()
) WITH CHECK (
  is_app_admin()
);

DROP POLICY IF EXISTS "email_template_audit_admin_select" ON public.email_template_audit_logs;
CREATE POLICY "email_template_audit_admin_select" ON public.email_template_audit_logs
FOR SELECT USING (
  is_app_admin()
);

DROP POLICY IF EXISTS "email_template_audit_admin_insert" ON public.email_template_audit_logs;
CREATE POLICY "email_template_audit_admin_insert" ON public.email_template_audit_logs
FOR INSERT WITH CHECK (
  is_app_admin()
);
