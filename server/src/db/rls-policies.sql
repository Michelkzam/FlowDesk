-- =====================================================
-- POLÍTICAS RLS PARA FLOWDESK
-- Execute no SQL Editor do Supabase
-- =====================================================

-- 1. Criar função helper para verificar se é admin (SECURITY DEFINER para bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Criar função helper para verificar se é agente (admin ou agent)
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'agent')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- TABELA: users
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Usuários podem ler seu próprio perfil
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Admins podem ler todos os usuários
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT USING (public.is_admin());

-- Agentes podem ler todos os usuários (para lista de agentes)
DROP POLICY IF EXISTS "users_select_agent" ON public.users;
CREATE POLICY "users_select_agent" ON public.users
  FOR SELECT USING (public.is_agent());

-- Usuários podem atualizar seu próprio perfil
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Admins podem atualizar qualquer usuário
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (public.is_admin());

-- Admins podem deletar usuários
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (public.is_admin());

-- =====================================================
-- TABELA: system_settings
-- =====================================================
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ler configurações
DROP POLICY IF EXISTS "system_settings_select" ON public.system_settings;
CREATE POLICY "system_settings_select" ON public.system_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas admins podem atualizar configurações
DROP POLICY IF EXISTS "system_settings_update_admin" ON public.system_settings;
CREATE POLICY "system_settings_update_admin" ON public.system_settings
  FOR UPDATE USING (public.is_admin());

-- Apenas admins podem inserir configurações
DROP POLICY IF EXISTS "system_settings_insert_admin" ON public.system_settings;
CREATE POLICY "system_settings_insert_admin" ON public.system_settings
  FOR INSERT WITH CHECK (public.is_admin());

-- =====================================================
-- TABELA: tickets
-- =====================================================
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Usuários podem ler seus próprios tickets
DROP POLICY IF EXISTS "tickets_select_own" ON public.tickets;
CREATE POLICY "tickets_select_own" ON public.tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Agentes/Admins podem ler todos os tickets
DROP POLICY IF EXISTS "tickets_select_agent" ON public.tickets;
CREATE POLICY "tickets_select_agent" ON public.tickets
  FOR SELECT USING (public.is_agent());

-- Usuários autenticados podem criar tickets
DROP POLICY IF EXISTS "tickets_insert_auth" ON public.tickets;
CREATE POLICY "tickets_insert_auth" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Usuários podem atualizar seus próprios tickets
DROP POLICY IF EXISTS "tickets_update_own" ON public.tickets;
CREATE POLICY "tickets_update_own" ON public.tickets
  FOR UPDATE USING (auth.uid() = user_id);

-- Agentes/Admins podem atualizar qualquer ticket
DROP POLICY IF EXISTS "tickets_update_agent" ON public.tickets;
CREATE POLICY "tickets_update_agent" ON public.tickets
  FOR UPDATE USING (public.is_agent());

-- Apenas admins podem deletar tickets
DROP POLICY IF EXISTS "tickets_delete_admin" ON public.tickets;
CREATE POLICY "tickets_delete_admin" ON public.tickets
  FOR DELETE USING (public.is_admin());

-- =====================================================
-- TABELA: ticket_messages
-- =====================================================
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Usuários podem ler mensagens de seus próprios tickets
DROP POLICY IF EXISTS "ticket_messages_select_own" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select_own" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_messages.ticket_id
      AND tickets.user_id = auth.uid()
    )
  );

-- Agentes/Admins podem ler todas as mensagens
DROP POLICY IF EXISTS "ticket_messages_select_agent" ON public.ticket_messages;
CREATE POLICY "ticket_messages_select_agent" ON public.ticket_messages
  FOR SELECT USING (public.is_agent());

-- Usuários autenticados podem criar mensagens
DROP POLICY IF EXISTS "ticket_messages_insert_auth" ON public.ticket_messages;
CREATE POLICY "ticket_messages_insert_auth" ON public.ticket_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: roles
-- =====================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ler roles (para permission checking)
DROP POLICY IF EXISTS "roles_select_auth" ON public.roles;
CREATE POLICY "roles_select_auth" ON public.roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas admins podem gerenciar roles
DROP POLICY IF EXISTS "roles_manage_admin" ON public.roles;
CREATE POLICY "roles_manage_admin" ON public.roles
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: categories (pública para leitura)
-- =====================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_auth" ON public.categories;
CREATE POLICY "categories_select_auth" ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "categories_manage_admin" ON public.categories;
CREATE POLICY "categories_manage_admin" ON public.categories
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: departments (pública para leitura)
-- =====================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_auth" ON public.departments;
CREATE POLICY "departments_select_auth" ON public.departments
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "departments_manage_admin" ON public.departments;
CREATE POLICY "departments_manage_admin" ON public.departments
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: teams (pública para leitura)
-- =====================================================
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select_auth" ON public.teams;
CREATE POLICY "teams_select_auth" ON public.teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "teams_manage_admin" ON public.teams;
CREATE POLICY "teams_manage_admin" ON public.teams
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: organizations (pública para leitura)
-- =====================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_auth" ON public.organizations;
CREATE POLICY "organizations_select_auth" ON public.organizations
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "organizations_manage_admin" ON public.organizations;
CREATE POLICY "organizations_manage_admin" ON public.organizations
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: clients (pública para leitura)
-- =====================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select_auth" ON public.clients;
CREATE POLICY "clients_select_auth" ON public.clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "clients_manage_admin" ON public.clients;
CREATE POLICY "clients_manage_admin" ON public.clients
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: kb_categories (pública para leitura)
-- =====================================================
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kb_categories_select_auth" ON public.kb_categories;
CREATE POLICY "kb_categories_select_auth" ON public.kb_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "kb_categories_manage_agent" ON public.kb_categories;
CREATE POLICY "kb_categories_manage_agent" ON public.kb_categories
  FOR ALL USING (public.is_agent());

-- =====================================================
-- TABELA: kb_articles (pública para leitura)
-- =====================================================
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kb_articles_select_auth" ON public.kb_articles;
CREATE POLICY "kb_articles_select_auth" ON public.kb_articles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "kb_articles_manage_agent" ON public.kb_articles;
CREATE POLICY "kb_articles_manage_agent" ON public.kb_articles
  FOR ALL USING (public.is_agent());

-- =====================================================
-- TABELA: canned_responses (pública para leitura)
-- =====================================================
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canned_responses_select_auth" ON public.canned_responses;
CREATE POLICY "canned_responses_select_auth" ON public.canned_responses
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "canned_responses_manage_agent" ON public.canned_responses;
CREATE POLICY "canned_responses_manage_agent" ON public.canned_responses
  FOR ALL USING (public.is_agent());

-- =====================================================
-- TABELA: sla_plans (pública para leitura)
-- =====================================================
ALTER TABLE public.sla_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sla_plans_select_auth" ON public.sla_plans;
CREATE POLICY "sla_plans_select_auth" ON public.sla_plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "sla_plans_manage_admin" ON public.sla_plans;
CREATE POLICY "sla_plans_manage_admin" ON public.sla_plans
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: help_topics (pública para leitura)
-- =====================================================
ALTER TABLE public.help_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_topics_select_auth" ON public.help_topics;
CREATE POLICY "help_topics_select_auth" ON public.help_topics
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "help_topics_manage_admin" ON public.help_topics;
CREATE POLICY "help_topics_manage_admin" ON public.help_topics
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: audit_logs (apenas admin)
-- =====================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert_auth" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_auth" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- TABELA: holidays (pública para leitura)
-- =====================================================
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holidays_select_auth" ON public.holidays;
CREATE POLICY "holidays_select_auth" ON public.holidays
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "holidays_manage_admin" ON public.holidays;
CREATE POLICY "holidays_manage_admin" ON public.holidays
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: schedules (pública para leitura)
-- =====================================================
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_select_auth" ON public.schedules;
CREATE POLICY "schedules_select_auth" ON public.schedules
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "schedules_manage_admin" ON public.schedules;
CREATE POLICY "schedules_manage_admin" ON public.schedules
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: contracts (pública para leitura)
-- =====================================================
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contracts_select_auth" ON public.contracts;
CREATE POLICY "contracts_select_auth" ON public.contracts
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "contracts_manage_admin" ON public.contracts;
CREATE POLICY "contracts_manage_admin" ON public.contracts
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: assets (pública para leitura)
-- =====================================================
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_select_auth" ON public.assets;
CREATE POLICY "assets_select_auth" ON public.assets
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "assets_manage_admin" ON public.assets;
CREATE POLICY "assets_manage_admin" ON public.assets
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: quick_replies (pública para leitura)
-- =====================================================
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quick_replies_select_auth" ON public.quick_replies;
CREATE POLICY "quick_replies_select_auth" ON public.quick_replies
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "quick_replies_manage_agent" ON public.quick_replies;
CREATE POLICY "quick_replies_manage_agent" ON public.quick_replies
  FOR ALL USING (public.is_agent());

-- =====================================================
-- TABELA: work_schedules
-- =====================================================
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_schedules_select_auth" ON public.work_schedules;
CREATE POLICY "work_schedules_select_auth" ON public.work_schedules
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "work_schedules_manage_admin" ON public.work_schedules;
CREATE POLICY "work_schedules_manage_admin" ON public.work_schedules
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: on_call_rules
-- =====================================================
ALTER TABLE public.on_call_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "on_call_rules_select_auth" ON public.on_call_rules;
CREATE POLICY "on_call_rules_select_auth" ON public.on_call_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "on_call_rules_manage_admin" ON public.on_call_rules;
CREATE POLICY "on_call_rules_manage_admin" ON public.on_call_rules
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: business_hours
-- =====================================================
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_hours_select_auth" ON public.business_hours;
CREATE POLICY "business_hours_select_auth" ON public.business_hours
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "business_hours_manage_admin" ON public.business_hours;
CREATE POLICY "business_hours_manage_admin" ON public.business_hours
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: documents
-- =====================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select_auth" ON public.documents;
CREATE POLICY "documents_select_auth" ON public.documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "documents_manage_agent" ON public.documents;
CREATE POLICY "documents_manage_agent" ON public.documents
  FOR ALL USING (public.is_agent());

-- =====================================================
-- TABELA: ticket_filters
-- =====================================================
ALTER TABLE public.ticket_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_filters_select_auth" ON public.ticket_filters;
CREATE POLICY "ticket_filters_select_auth" ON public.ticket_filters
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "ticket_filters_manage_auth" ON public.ticket_filters;
CREATE POLICY "ticket_filters_manage_auth" ON public.ticket_filters
  FOR ALL USING (public.is_agent());

-- =====================================================
-- TABELA: operator_profiles
-- =====================================================
ALTER TABLE public.operator_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operator_profiles_select_auth" ON public.operator_profiles;
CREATE POLICY "operator_profiles_select_auth" ON public.operator_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "operator_profiles_manage_admin" ON public.operator_profiles;
CREATE POLICY "operator_profiles_manage_admin" ON public.operator_profiles
  FOR ALL USING (public.is_admin());

-- =====================================================
-- TABELA: appointments (se existir)
-- =====================================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'appointments') THEN
    ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "appointments_select_auth" ON public.appointments;
    CREATE POLICY "appointments_select_auth" ON public.appointments
      FOR SELECT USING (auth.uid() IS NOT NULL);
    DROP POLICY IF EXISTS "appointments_manage_auth" ON public.appointments;
    CREATE POLICY "appointments_manage_auth" ON public.appointments
      FOR ALL USING (public.is_agent());
  END IF;
END $$;

-- =====================================================
-- TABELA: chat_queues (se existir)
-- =====================================================
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_queues') THEN
    ALTER TABLE public.chat_queues ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "chat_queues_select_auth" ON public.chat_queues;
    CREATE POLICY "chat_queues_select_auth" ON public.chat_queues
      FOR SELECT USING (auth.uid() IS NOT NULL);
    DROP POLICY IF EXISTS "chat_queues_manage_admin" ON public.chat_queues;
    CREATE POLICY "chat_queues_manage_admin" ON public.chat_queues
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- =====================================================
-- POLÍTICA ESPECIAL: Usuários do portal precisam ver todos os tickets
-- (para o portal funcionar, usuários veem tickets por user_email, não por user_id)
-- =====================================================
DROP POLICY IF EXISTS "tickets_select_portal" ON public.tickets;
CREATE POLICY "tickets_select_portal" ON public.tickets
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- RESUMO DAS POLÍTICAS
-- =====================================================
-- users:          próprio perfil + admin vê todos + agent vê todos
-- system_settings: autenticados lêem, admin escreve
-- tickets:        autenticados veem todos (portal precisa), admin deleta
-- ticket_messages: dono vê suas, agent vê todas, autenticados criam
-- roles:          autenticados lêem, admin gerencia
-- categories/departments/etc: autenticados lêem, admin gerencia
-- audit_logs:     apenas admin vê, autenticados criam
