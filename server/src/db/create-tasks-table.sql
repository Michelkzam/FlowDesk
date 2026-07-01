-- ============================================================
-- FlowDesk - Tabela de Tarefas
-- ============================================================

-- Tabela de Tarefas
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  prioridade text DEFAULT 'normal' CHECK (prioridade IN ('low', 'normal', 'high', 'urgent')),
  atribuido_para uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ticket_id uuid,
  data_limite timestamptz,
  data_conclusao timestamptz,
  notas text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.tasks IS 'Tarefas do sistema de helpdesk';

-- Índices
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_atribuido ON public.tasks(atribuido_para);
CREATE INDEX IF NOT EXISTS idx_tasks_criado_por ON public.tasks(criado_por);
CREATE INDEX IF NOT EXISTS idx_tasks_ticket ON public.tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tasks_data_limite ON public.tasks(data_limite);
CREATE INDEX IF NOT EXISTS idx_tasks_prioridade ON public.tasks(prioridade);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Políticas RLS
-- ============================================================

DROP POLICY IF EXISTS "tasks_admin_all" ON public.tasks;
DROP POLICY IF EXISTS "tasks_supervisor_all" ON public.tasks;
DROP POLICY IF EXISTS "tasks_agent_rw_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_client_read_own" ON public.tasks;

-- Admin: Acesso total
CREATE POLICY "tasks_admin_all" ON public.tasks
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'tickets:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'tickets:write'));

-- Supervisor: Leitura de todas, escrita nas suas
CREATE POLICY "tasks_supervisor_all" ON public.tasks
  FOR ALL
  USING (
    public.usuario_tem_permissao(auth.uid(), 'tickets:read')
    AND (
      public.usuario_tem_permissao(auth.uid(), 'tickets:write')
      OR atribuido_para = auth.uid()
      OR criado_por = auth.uid()
    )
  );

-- Agent: Leitura de atribuídas, escrita nas suas
CREATE POLICY "tasks_agent_rw_own" ON public.tasks
  FOR ALL
  USING (
    public.usuario_tem_permissao(auth.uid(), 'tickets:read')
    AND (
      atribuido_para = auth.uid()
      OR criado_por = auth.uid()
      OR public.usuario_tem_permissao(auth.uid(), 'tickets:write')
    )
  );

-- Client: Apenas leitura das suas tarefas
CREATE POLICY "tasks_client_read_own" ON public.tasks
  FOR SELECT
  USING (
    public.usuario_tem_permissao(auth.uid(), 'tickets:read')
    AND criado_por = auth.uid()
  );

-- ============================================================
-- Permissões RBAC para tasks
-- ============================================================

INSERT INTO public.permissoes (chave, descricao, modulo) VALUES
  ('tasks:read', 'Visualizar tarefas', 'tasks'),
  ('tasks:write', 'Criar e editar tarefas', 'tasks'),
  ('tasks:delete', 'Excluir tarefas', 'tasks'),
  ('tasks:assign', 'Atribuir tarefas a outros usuários', 'tasks')
ON CONFLICT (chave) DO NOTHING;

-- Admin: Todas as permissões de tasks
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM public.perfis p, public.permissoes pm
WHERE p.nome = 'admin' AND pm.modulo = 'tasks'
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- Supervisor: Read, Write, Assign
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM public.perfis p, public.permissoes pm
WHERE p.nome = 'supervisor' AND pm.chave IN ('tasks:read', 'tasks:write', 'tasks:assign')
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- Agent: Read, Write (próprias)
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM public.perfis p, public.permissoes pm
WHERE p.nome = 'agent' AND pm.chave IN ('tasks:read', 'tasks:write')
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;

-- Client: Read only
INSERT INTO public.perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM public.perfis p, public.permissoes pm
WHERE p.nome = 'client_user' AND pm.chave = 'tasks:read'
ON CONFLICT (perfil_id, permissao_id) DO NOTHING;
