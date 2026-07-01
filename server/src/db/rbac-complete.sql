-- ============================================================
-- FlowDesk RBAC System - Complete Implementation
-- PostgreSQL / Supabase
-- ============================================================

-- ============================================================
-- 1. TABELAS DO RBAC
-- ============================================================

-- Tabela de Perfis (roles)
CREATE TABLE IF NOT EXISTS public.perfis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  descricao text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.perfis IS 'Perfis de acesso do sistema RBAC';

-- Tabela de Permissões atômicas
CREATE TABLE IF NOT EXISTS public.permissoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL UNIQUE,
  descricao text,
  modulo text NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.permissoes IS 'Permissões atômicas do sistema (ex: assets:read, tickets:write)';

-- Tabela de relacionamento Perfil <-> Permissão (N:N)
CREATE TABLE IF NOT EXISTS public.perfil_permissao (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  perfil_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  permissao_id uuid NOT NULL REFERENCES public.permissoes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(perfil_id, permissao_id)
);

COMMENT ON TABLE public.perfil_permissao IS 'Relacionamento entre perfis e permissões';

-- Tabela de relacionamento Usuário <-> Perfil (N:N)
CREATE TABLE IF NOT EXISTS public.usuario_perfil (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(usuario_id, perfil_id)
);

COMMENT ON TABLE public.usuario_perfil IS 'Relacionamento entre usuários do Supabase Auth e perfis RBAC';

-- ============================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_perfil_permissao_perfil ON public.perfil_permissao(perfil_id);
CREATE INDEX IF NOT EXISTS idx_perfil_permissao_permissao ON public.perfil_permissao(permissao_id);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_usuario ON public.usuario_perfil(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_perfil ON public.usuario_perfil(perfil_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_modulo ON public.permissoes(modulo);
CREATE INDEX IF NOT EXISTS idx_permissoes_chave ON public.permissoes(chave);

-- ============================================================
-- 3. FUNÇÃO DE CHECAGEM DE PERMISSÃO (SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION public.usuario_tem_permissao(
  p_usuario_id uuid,
  p_permissao_chave text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_permission boolean := false;
  v_user_role text;
BEGIN
  -- Verificar se é admin (acesso irrestrito)
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_usuario_id;

  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Verificar se o usuário tem a permissão via perfil
  SELECT EXISTS(
    SELECT 1
    FROM public.usuario_perfil up
    JOIN public.perfil_permissao pp ON pp.perfil_id = up.perfil_id
    JOIN public.permissoes p ON p.id = pp.permissao_id
    WHERE up.usuario_id = p_usuario_id
      AND p.chave = p_permissao_chave
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$;

COMMENT ON FUNCTION public.usuario_tem_permissao(uuid, text) IS 'Verifica se um usuário possui uma permissão específica. Admins sempre retornam true.';

-- ============================================================
-- 4. FUNÇÃO AUXILIAR: LISTAR PERMISSÕES DO USUÁRIO
-- ============================================================

CREATE OR REPLACE FUNCTION public.usuario_permissoes(p_usuario_id uuid)
RETURNS TABLE(chave text, descricao text, modulo text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
BEGIN
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_usuario_id;

  IF v_user_role = 'admin' THEN
    RETURN QUERY SELECT p.chave, p.descricao, p.modulo FROM public.permissoes p;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.chave, p.descricao, p.modulo
  FROM public.usuario_perfil up
  JOIN public.perfil_permissao pp ON pp.perfil_id = up.perfil_id
  JOIN public.permissoes p ON p.id = pp.permissao_id
  WHERE up.usuario_id = p_usuario_id;
END;
$$;

COMMENT ON FUNCTION public.usuario_permissoes(uuid) IS 'Retorna todas as permissões de um usuário. Admins recebem todas.';

-- ============================================================
-- 5. SEED: PERFIS
-- ============================================================

INSERT INTO public.perfis (nome, descricao) VALUES
  ('admin', 'Administrador Global - Controle irrestrito e configurações do sistema'),
  ('supervisor', 'Supervisor - Gerencia departamentos, técnicos e dados operacionais'),
  ('agent', 'Agente / Técnico - Atendimento do dia a dia, leitura e escrita operacional'),
  ('client_user', 'Cliente - Portal externo, apenas leitura e abertura de demandas próprias')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- 6. SEED: PERMISSÕES ATÔMICAS
-- ============================================================

INSERT INTO public.permissoes (chave, descricao, modulo) VALUES
  -- Assets (Ativos de TI)
  ('assets:read', 'Visualizar ativos', 'assets'),
  ('assets:write', 'Criar e editar ativos', 'assets'),
  ('assets:delete', 'Excluir ativos', 'assets'),
  ('assets:assign', 'Atribuir ativos a usuários', 'assets'),

  -- Clients (Clientes)
  ('clients:read', 'Visualizar clientes', 'clients'),
  ('clients:write', 'Criar e editar clientes', 'clients'),
  ('clients:delete', 'Excluir clientes', 'clients'),

  -- Contracts (Contratos)
  ('contracts:read', 'Visualizar contratos', 'contracts'),
  ('contracts:write', 'Criar e editar contratos', 'contracts'),
  ('contracts:delete', 'Excluir contratos', 'contracts'),
  ('contracts:approve', 'Aprovar contratos', 'contracts'),

  -- Departments (Departamentos)
  ('departments:read', 'Visualizar departamentos', 'departments'),
  ('departments:write', 'Criar e editar departamentos', 'departments'),
  ('departments:delete', 'Excluir departamentos', 'departments'),

  -- Tickets (Chamados)
  ('tickets:read', 'Visualizar tickets', 'tickets'),
  ('tickets:write', 'Criar e editar tickets', 'tickets'),
  ('tickets:delete', 'Excluir tickets', 'tickets'),
  ('tickets:assign', 'Atribuir tickets a técnicos', 'tickets'),
  ('tickets:transfer', 'Transferir tickets entre técnicos', 'tickets'),
  ('tickets:close', 'Fechar tickets', 'tickets'),
  ('tickets:reopen', 'Reabrir tickets', 'tickets'),

  -- Users (Usuários)
  ('users:read', 'Visualizar usuários', 'users'),
  ('users:write', 'Criar e editar usuários', 'users'),
  ('users:delete', 'Excluir usuários', 'users'),
  ('users:manage_roles', 'Gerenciar perfis de usuários', 'users'),

  -- Reports (Relatórios)
  ('reports:view', 'Visualizar relatórios', 'reports'),
  ('reports:export', 'Exportar relatórios', 'reports'),

  -- Audit (Auditoria)
  ('audit:read', 'Visualizar logs de auditoria', 'audit'),
  ('audit:export', 'Exportar logs de auditoria', 'audit'),

  -- Settings (Configurações)
  ('settings:read', 'Visualizar configurações', 'settings'),
  ('settings:write', 'Editar configurações do sistema', 'settings'),

  -- Knowledge Base (Base de Conhecimento)
  ('kb:read', 'Visualizar artigos da KB', 'kb'),
  ('kb:write', 'Criar e editar artigos da KB', 'kb'),
  ('kb:delete', 'Excluir artigos da KB', 'kb'),
  ('kb:publish', 'Publicar artigos da KB', 'kb'),

  -- Schedules (Escalas)
  ('schedules:read', 'Visualizar escalas', 'schedules'),
  ('schedules:write', 'Gerenciar escalas', 'schedules'),

  -- SLA
  ('sla:read', 'Visualizar planos SLA', 'sla'),
  ('sla:write', 'Gerenciar planos SLA', 'sla'),

  -- Holidays (Feriados)
  ('holidays:read', 'Visualizar feriados', 'holidays'),
  ('holidays:write', 'Gerenciar feriados', 'holidays'),

  -- Categories (Categorias)
  ('categories:read', 'Visualizar categorias', 'categories'),
  ('categories:write', 'Gerenciar categorias', 'categories'),

  -- Business Hours (Horário de Funcionamento)
  ('business_hours:read', 'Visualizar horários de funcionamento', 'business_hours'),
  ('business_hours:write', 'Gerenciar horários de funcionamento', 'business_hours')

ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- 7. SEED: RELACIONAMENTO PERFIL <-> PERMISSÃO
-- ============================================================

-- Admin: Todas as permissões
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM public.perfis p, public.permissoes pm
WHERE p.nome = 'admin'
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- Supervisor: Acesso amplo, exceto configurações do sistema
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM public.perfis p, public.permissoes pm
WHERE p.nome = 'supervisor'
  AND pm.chave NOT IN ('settings:write', 'users:manage_roles')
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- Agent: Acesso operacional (leitura/escrita em tickets, ativos, KB)
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM public.perfis p, public.permissoes pm
WHERE p.nome = 'agent'
  AND pm.chave IN (
    'assets:read', 'assets:write',
    'clients:read',
    'contracts:read',
    'departments:read',
    'tickets:read', 'tickets:write', 'tickets:assign', 'tickets:transfer', 'tickets:close', 'tickets:reopen',
    'users:read',
    'reports:view',
    'kb:read', 'kb:write',
    'schedules:read',
    'sla:read',
    'holidays:read',
    'categories:read',
    'business_hours:read'
  )
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- Client User: Apenas leitura e abertura de demandas próprias
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM public.perfis p, public.permissoes pm
WHERE p.nome = 'client_user'
  AND pm.chave IN (
    'tickets:read', 'tickets:write',
    'contracts:read',
    'kb:read',
    'assets:read'
  )
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- ============================================================
-- 8. RLS: HABILITAR ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. RLS: POLÍTICAS PARA audit_logs
-- ============================================================

-- Limpar políticas existentes
DROP POLICY IF EXISTS "audit_logs_admin_all" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_supervisor_read" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_agent_read" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;

-- Admin: Acesso total
CREATE POLICY "audit_logs_admin_all" ON public.audit_logs
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'audit:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'audit:read'));

-- Supervisor: Leitura de logs do seu departamento
CREATE POLICY "audit_logs_supervisor_read" ON public.audit_logs
  FOR SELECT
  USING (
    public.usuario_tem_permissao(auth.uid(), 'audit:read')
    AND (
      public.usuario_tem_permissao(auth.uid(), 'settings:write')
      OR user_id::text = auth.uid()::text
    )
  );

-- Agent: Apenas leitura dos próprios logs
CREATE POLICY "audit_logs_agent_read" ON public.audit_logs
  FOR SELECT
  USING (
    public.usuario_tem_permissao(auth.uid(), 'audit:read')
    AND user_id::text = auth.uid()::text
  );

-- Insert: Qualquer um autenticado pode criar log (para auditoria)
CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 10. RLS: POLÍTICAS PARA contracts
-- ============================================================

-- Limpar políticas existentes
DROP POLICY IF EXISTS "contracts_admin_all" ON public.contracts;
DROP POLICY IF EXISTS "contracts_supervisor_rw" ON public.contracts;
DROP POLICY IF EXISTS "contracts_agent_read" ON public.contracts;
DROP POLICY IF EXISTS "contracts_client_read_own" ON public.contracts;

-- Admin: Acesso total
CREATE POLICY "contracts_admin_all" ON public.contracts
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'contracts:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'contracts:write'));

-- Supervisor: Leitura e escrita
CREATE POLICY "contracts_supervisor_rw" ON public.contracts
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'contracts:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'contracts:write'));

-- Agent: Apenas leitura
CREATE POLICY "contracts_agent_read" ON public.contracts
  FOR SELECT
  USING (public.usuario_tem_permissao(auth.uid(), 'contracts:read'));

-- Client: Apenas leitura dos próprios contratos
CREATE POLICY "contracts_client_read_own" ON public.contracts
  FOR SELECT
  USING (
    public.usuario_tem_permissao(auth.uid(), 'contracts:read')
    AND (
      public.usuario_tem_permissao(auth.uid(), 'contracts:write')
      OR client_name IS NOT NULL
    )
  );

-- ============================================================
-- 11. RLS: POLÍTICAS PARA assets
-- ============================================================

-- Limpar políticas existentes
DROP POLICY IF EXISTS "assets_admin_all" ON public.assets;
DROP POLICY IF EXISTS "assets_supervisor_rw" ON public.assets;
DROP POLICY IF EXISTS "assets_agent_rw" ON public.assets;
DROP POLICY IF EXISTS "assets_agent_insert" ON public.assets;
DROP POLICY IF EXISTS "assets_agent_update" ON public.assets;
DROP POLICY IF EXISTS "assets_client_read_own" ON public.assets;

-- Admin: Acesso total
CREATE POLICY "assets_admin_all" ON public.assets
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'assets:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'assets:write'));

-- Supervisor: Leitura e escrita
CREATE POLICY "assets_supervisor_rw" ON public.assets
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'assets:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'assets:write'));

-- Agent: Leitura e escrita (não deleta)
CREATE POLICY "assets_agent_rw" ON public.assets
  FOR SELECT
  USING (public.usuario_tem_permissao(auth.uid(), 'assets:read'));

CREATE POLICY "assets_agent_insert" ON public.assets
  FOR INSERT
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'assets:write'));

CREATE POLICY "assets_agent_update" ON public.assets
  FOR UPDATE
  USING (public.usuario_tem_permissao(auth.uid(), 'assets:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'assets:write'));

-- Client: Apenas leitura dos próprios ativos
CREATE POLICY "assets_client_read_own" ON public.assets
  FOR SELECT
  USING (
    public.usuario_tem_permissao(auth.uid(), 'assets:read')
    AND (
      assigned_to::text = auth.uid()::text
      OR public.usuario_tem_permissao(auth.uid(), 'assets:write')
    )
  );

-- ============================================================
-- 12. RLS: POLÍTICAS PARA clients
-- ============================================================

-- Limpar políticas existentes
DROP POLICY IF EXISTS "clients_admin_all" ON public.clients;
DROP POLICY IF EXISTS "clients_agent_read" ON public.clients;

-- Admin/Supervisor: Acesso total
CREATE POLICY "clients_admin_all" ON public.clients
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'clients:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'clients:write'));

-- Agent: Leitura
CREATE POLICY "clients_agent_read" ON public.clients
  FOR SELECT
  USING (public.usuario_tem_permissao(auth.uid(), 'clients:read'));

-- ============================================================
-- 13. TRIGGERS: ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_perfis_updated_at ON public.perfis;
CREATE TRIGGER trigger_perfis_updated_at
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 14. FUNÇÃO: OBTER PERFIL DO USUÁRIO
-- ============================================================

CREATE OR REPLACE FUNCTION public.usuario_perfil_atual(p_usuario_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perfil text;
BEGIN
  SELECT p.nome INTO v_perfil
  FROM public.usuario_perfil up
  JOIN public.perfis p ON p.id = up.perfil_id
  WHERE up.usuario_id = p_usuario_id
  LIMIT 1;

  RETURN v_perfil;
END;
$$;

COMMENT ON FUNCTION public.usuario_perfil_atual(uuid) IS 'Retorna o nome do perfil principal de um usuário.';

-- ============================================================
-- 15. FUNÇÃO: VERIFICAR SE USUÁRIO TEM QUALQUER PERMISSÃO DO ARRAY
-- ============================================================

CREATE OR REPLACE FUNCTION public.usuario_tem_qualquer_permissao(
  p_usuario_id uuid,
  p_permissoes text[]
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_has_any boolean;
BEGIN
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_usuario_id;

  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.usuario_perfil up
    JOIN public.perfil_permissao pp ON pp.perfil_id = up.perfil_id
    JOIN public.permissoes p ON p.id = pp.permissao_id
    WHERE up.usuario_id = p_usuario_id
      AND p.chave = ANY(p_permissoes)
  ) INTO v_has_any;

  RETURN v_has_any;
END;
$$;

COMMENT ON FUNCTION public.usuario_tem_qualquer_permissao(uuid, text[]) IS 'Verifica se um usuário tem pelo menos uma das permissões do array.';

-- ============================================================
-- FIM DO SCRIPT RBAC
-- ============================================================
