-- FlowDesk - RLS Completo para todas as tabelas
-- Execute no SQL Editor do Supabase

-- =====================================================
-- 1. GARANTIR QUE RLS ESTÁ HABILITADO EM TODAS AS TABELAS
-- =====================================================
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_call_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROPAR TODAS AS POLÍTICAS EXISTENTES (idempotente)
-- =====================================================
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'tickets', 'categories', 'sla_plans', 'departments', 'teams',
    'help_topics', 'users', 'kb_categories', 'kb_articles',
    'ticket_messages', 'audit_logs', 'organizations', 'clients',
    'roles', 'contracts', 'schedules', 'business_hours', 'assets',
    'quick_replies', 'operator_profiles', 'documents', 'ticket_filters',
    'work_schedules', 'on_call_rules', 'holidays'
  ]) LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || tbl;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- 3. CRIAR POLÍTICAS PADRÃO: auth.uid() IS NOT NULL
-- =====================================================

-- tickets
CREATE POLICY "tickets_select" ON tickets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tickets_insert" ON tickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tickets_update" ON tickets FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "tickets_delete" ON tickets FOR DELETE USING (auth.uid() IS NOT NULL);

-- categories
CREATE POLICY "categories_select" ON categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (auth.uid() IS NOT NULL);

-- sla_plans
CREATE POLICY "sla_plans_select" ON sla_plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sla_plans_insert" ON sla_plans FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sla_plans_update" ON sla_plans FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "sla_plans_delete" ON sla_plans FOR DELETE USING (auth.uid() IS NOT NULL);

-- departments
CREATE POLICY "departments_select" ON departments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "departments_insert" ON departments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "departments_update" ON departments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "departments_delete" ON departments FOR DELETE USING (auth.uid() IS NOT NULL);

-- teams
CREATE POLICY "teams_select" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teams_insert" ON teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "teams_update" ON teams FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "teams_delete" ON teams FOR DELETE USING (auth.uid() IS NOT NULL);

-- help_topics
CREATE POLICY "help_topics_select" ON help_topics FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "help_topics_insert" ON help_topics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "help_topics_update" ON help_topics FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "help_topics_delete" ON help_topics FOR DELETE USING (auth.uid() IS NOT NULL);

-- users
CREATE POLICY "users_select" ON users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "users_update" ON users FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_delete" ON users FOR DELETE USING (auth.uid() IS NOT NULL);

-- kb_categories
CREATE POLICY "kb_categories_select" ON kb_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kb_categories_insert" ON kb_categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kb_categories_update" ON kb_categories FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "kb_categories_delete" ON kb_categories FOR DELETE USING (auth.uid() IS NOT NULL);

-- kb_articles
CREATE POLICY "kb_articles_select" ON kb_articles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kb_articles_insert" ON kb_articles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "kb_articles_update" ON kb_articles FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "kb_articles_delete" ON kb_articles FOR DELETE USING (auth.uid() IS NOT NULL);

-- ticket_messages
CREATE POLICY "ticket_messages_select" ON ticket_messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ticket_messages_insert" ON ticket_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ticket_messages_update" ON ticket_messages FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ticket_messages_delete" ON ticket_messages FOR DELETE USING (auth.uid() IS NOT NULL);

-- audit_logs
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "audit_logs_update" ON audit_logs FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "audit_logs_delete" ON audit_logs FOR DELETE USING (auth.uid() IS NOT NULL);

-- organizations
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "organizations_insert" ON organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "organizations_delete" ON organizations FOR DELETE USING (auth.uid() IS NOT NULL);

-- clients
CREATE POLICY "clients_select" ON clients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (auth.uid() IS NOT NULL);

-- roles
CREATE POLICY "roles_select" ON roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "roles_insert" ON roles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "roles_update" ON roles FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "roles_delete" ON roles FOR DELETE USING (auth.uid() IS NOT NULL);

-- contracts
CREATE POLICY "contracts_select" ON contracts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "contracts_insert" ON contracts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "contracts_update" ON contracts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "contracts_delete" ON contracts FOR DELETE USING (auth.uid() IS NOT NULL);

-- schedules
CREATE POLICY "schedules_select" ON schedules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "schedules_insert" ON schedules FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "schedules_update" ON schedules FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "schedules_delete" ON schedules FOR DELETE USING (auth.uid() IS NOT NULL);

-- business_hours
CREATE POLICY "business_hours_select" ON business_hours FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "business_hours_insert" ON business_hours FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "business_hours_update" ON business_hours FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "business_hours_delete" ON business_hours FOR DELETE USING (auth.uid() IS NOT NULL);

-- assets
CREATE POLICY "assets_select" ON assets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "assets_insert" ON assets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "assets_update" ON assets FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "assets_delete" ON assets FOR DELETE USING (auth.uid() IS NOT NULL);

-- quick_replies
CREATE POLICY "quick_replies_select" ON quick_replies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "quick_replies_insert" ON quick_replies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "quick_replies_update" ON quick_replies FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "quick_replies_delete" ON quick_replies FOR DELETE USING (auth.uid() IS NOT NULL);

-- operator_profiles
CREATE POLICY "operator_profiles_select" ON operator_profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "operator_profiles_insert" ON operator_profiles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "operator_profiles_update" ON operator_profiles FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "operator_profiles_delete" ON operator_profiles FOR DELETE USING (auth.uid() IS NOT NULL);

-- documents
CREATE POLICY "documents_select" ON documents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "documents_update" ON documents FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "documents_delete" ON documents FOR DELETE USING (auth.uid() IS NOT NULL);

-- ticket_filters
CREATE POLICY "ticket_filters_select" ON ticket_filters FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ticket_filters_insert" ON ticket_filters FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ticket_filters_update" ON ticket_filters FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "ticket_filters_delete" ON ticket_filters FOR DELETE USING (auth.uid() IS NOT NULL);

-- work_schedules
CREATE POLICY "work_schedules_select" ON work_schedules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "work_schedules_insert" ON work_schedules FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "work_schedules_update" ON work_schedules FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "work_schedules_delete" ON work_schedules FOR DELETE USING (auth.uid() IS NOT NULL);

-- on_call_rules
CREATE POLICY "on_call_rules_select" ON on_call_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "on_call_rules_insert" ON on_call_rules FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "on_call_rules_update" ON on_call_rules FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "on_call_rules_delete" ON on_call_rules FOR DELETE USING (auth.uid() IS NOT NULL);

-- holidays
CREATE POLICY "holidays_select" ON holidays FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "holidays_insert" ON holidays FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "holidays_update" ON holidays FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "holidays_delete" ON holidays FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 4. NOTIFICAR POSTGREST
-- =====================================================
NOTIFY pgrst, 'reload schema';
