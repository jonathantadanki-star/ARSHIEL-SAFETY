-- ============================================================================
-- ARSHIEL SAFETY — POSTGRESQL / SUPABASE ROW-LEVEL SECURITY (RLS) MIGRATION
-- Platform Owner & Key Contact: Jonathan Thadanki (jonathan.tadanki@gmail.com)
--
-- Multi-Tenant Isolation Identifiers:
--   organization_id (company_id)
--   plant_id        (site_id)
--   department_id
--   user_id
--   role_id
--
-- Usage:
--   Apply on Supabase PostgreSQL or any PostgreSQL 15+ instance to enforce
--   strict tenant isolation at the database layer alongside API RBAC.
-- ============================================================================

-- Helper schema & context functions (works with both Supabase JWT claims and
-- application-level SET LOCAL app.organization_id / app.is_super_admin)
CREATE OR REPLACE FUNCTION public.arshiel_current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.organization_id', true), '')::uuid,
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'organization_id'), '')::uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.arshiel_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    LOWER(current_setting('app.user_email', true)) = 'jonathan.tadanki@gmail.com',
    LOWER(current_setting('request.jwt.claims', true)::jsonb ->> 'email') = 'jonathan.tadanki@gmail.com',
    false
  );
$$;

-- Enable RLS & enforce strict tenant isolation across all EHS domain tables
DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'business_units',
    'plants',
    'departments',
    'areas',
    'locations',
    'users',
    'roles',
    'user_roles',
    'modules',
    'module_permissions',
    'module_versions',
    'module_assignments',
    'module_forms',
    'form_fields',
    'form_submissions',
    'module_checklists',
    'checklist_items',
    'approval_workflows',
    'approval_steps',
    'approval_instances',
    'approval_history',
    'module_reports',
    'work_permits',
    'loto_records',
    'incidents',
    'capas',
    'safety_observations',
    'risk_assessments',
    'safety_audits',
    'equipment_assets',
    'contractors',
    'contractor_workers',
    'training_records',
    'emergency_records',
    'environment_records',
    'legal_compliances',
    'documents',
    'weekly_safety_activities',
    'ppe_inventory',
    'gate_entries',
    'safety_committees',
    'ai_knowledge_base',
    'notifications',
    'notification_delivery_logs',
    'notification_escalation_rules',
    'push_device_tokens',
    'workforce_records',
    'kpi_categories',
    'kpi_definitions',
    'kpi_records'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS arshiel_tenant_isolation ON public.%I;', tbl);
      EXECUTE format(
        'CREATE POLICY arshiel_tenant_isolation ON public.%I
         USING (public.arshiel_is_super_admin() OR organization_id = public.arshiel_current_org_id())
         WITH CHECK (public.arshiel_is_super_admin() OR organization_id = public.arshiel_current_org_id());',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- Immutable append-only protection on audit_logs (no UPDATE or DELETE allowed)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS arshiel_audit_read ON public.audit_logs;
CREATE POLICY arshiel_audit_read ON public.audit_logs
  FOR SELECT
  USING (public.arshiel_is_super_admin() OR organization_id = public.arshiel_current_org_id());

DROP POLICY IF EXISTS arshiel_audit_insert ON public.audit_logs;
CREATE POLICY arshiel_audit_insert ON public.audit_logs
  FOR INSERT
  WITH CHECK (public.arshiel_is_super_admin() OR organization_id = public.arshiel_current_org_id());

-- Super Admin-only tables (platform_usage_quotas, security_events, api_error_logs, demo_requests)
DO $$
DECLARE
  sa_tbl text;
  super_admin_tables text[] := ARRAY[
    'platform_usage_quotas',
    'security_events',
    'api_error_logs',
    'demo_requests'
  ];
BEGIN
  FOREACH sa_tbl IN ARRAY super_admin_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = sa_tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', sa_tbl);
      EXECUTE format('DROP POLICY IF EXISTS arshiel_super_admin_only ON public.%I;', sa_tbl);
      EXECUTE format(
        'CREATE POLICY arshiel_super_admin_only ON public.%I
         USING (public.arshiel_is_super_admin())
         WITH CHECK (public.arshiel_is_super_admin());',
        sa_tbl
      );
    END IF;
  END LOOP;
END $$;
