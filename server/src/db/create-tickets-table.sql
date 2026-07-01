-- ============================================================
-- FlowDesk - Tabela de Tickets
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  number text,
  title text NOT NULL,
  description text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'pending_approval', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'emergency')),
  source text DEFAULT 'web' CHECK (source IN ('web', 'email', 'phone', 'whatsapp', 'portal')),
  channel text DEFAULT 'portal',

  -- Usuário que abriu
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  user_email text,
  user_phone text,

  -- Agente atribuído
  agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_name text,

  -- Departamento e categoria
  department_id uuid,
  department_name text,
  category_id uuid,
  category_name text,
  help_topic_id uuid,
  help_topic_name text,

  -- Organização e cliente
  organization_id uuid,
  organization_name text,
  client_name text,

  -- Datas
  due_date timestamptz,
  last_response_date timestamptz,
  last_user_response_date timestamptz,
  closed_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.tickets IS 'Tickets/chamados do sistema de helpdesk';

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_agent ON public.tickets(agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON public.tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON public.tickets(number);
CREATE INDEX IF NOT EXISTS idx_tickets_department ON public.tickets(department_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets(category_id);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trigger_tickets_updated_at ON public.tickets;
CREATE TRIGGER trigger_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Tabela de Mensagens dos Tickets
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  body text NOT NULL,
  sender_type text DEFAULT 'user' CHECK (sender_type IN ('user', 'agent', 'system')),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text,
  type text DEFAULT 'message' CHECK (type IN ('message', 'note', 'system')),
  is_internal boolean DEFAULT false,
  attachments jsonb,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.ticket_messages IS 'Mensagens dos tickets';

-- Índices
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON public.ticket_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender ON public.ticket_messages(sender_id);

-- ============================================================
-- Habilitar RLS
-- ============================================================

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Políticas RLS para tickets
-- ============================================================

DROP POLICY IF EXISTS "tickets_admin_all" ON public.tickets;
DROP POLICY IF EXISTS "tickets_supervisor_all" ON public.tickets;
DROP POLICY IF EXISTS "tickets_agent_rw" ON public.tickets;
DROP POLICY IF EXISTS "tickets_client_read_own" ON public.tickets;
DROP POLICY IF EXISTS "tickets_client_insert" ON public.tickets;

-- Admin: Acesso total
CREATE POLICY "tickets_admin_all" ON public.tickets
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'tickets:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'tickets:write'));

-- Supervisor: Leitura e escrita total
CREATE POLICY "tickets_supervisor_all" ON public.tickets
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'tickets:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'tickets:write'));

-- Agent: Leitura total, escrita nas atribuídas/sem agente
CREATE POLICY "tickets_agent_rw" ON public.tickets
  FOR ALL
  USING (
    public.usuario_tem_permissao(auth.uid(), 'tickets:read')
    AND (
      public.usuario_tem_permissao(auth.uid(), 'tickets:write')
      OR agent_id::text = auth.uid()::text
      OR agent_id IS NULL
    )
  )
  WITH CHECK (
    public.usuario_tem_permissao(auth.uid(), 'tickets:write')
    OR agent_id::text = auth.uid()::text
  );

-- Client: Leitura dos próprios tickets
CREATE POLICY "tickets_client_read_own" ON public.tickets
  FOR SELECT
  USING (
    public.usuario_tem_permissao(auth.uid(), 'tickets:read')
    AND user_id::text = auth.uid()::text
  );

-- Client: Pode criar tickets
CREATE POLICY "tickets_client_insert" ON public.tickets
  FOR INSERT
  WITH CHECK (
    public.usuario_tem_permissao(auth.uid(), 'tickets:write')
    OR user_id::text = auth.uid()::text
  );

-- ============================================================
-- Políticas RLS para ticket_messages
-- ============================================================

DROP POLICY IF EXISTS "ticket_messages_admin_all" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_agent_rw" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_client_read_own" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_insert_authenticated" ON public.ticket_messages;

-- Admin/Supervisor: Acesso total
CREATE POLICY "ticket_messages_admin_all" ON public.ticket_messages
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'tickets:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'tickets:write'));

-- Agent: Leitura total, escrita própria
CREATE POLICY "ticket_messages_agent_rw" ON public.ticket_messages
  FOR ALL
  USING (
    public.usuario_tem_permissao(auth.uid(), 'tickets:read')
    AND (
      public.usuario_tem_permissao(auth.uid(), 'tickets:write')
      OR sender_id::text = auth.uid()::text
    )
  );

-- Client: Leitura de mensagens públicas nos seus tickets
CREATE POLICY "ticket_messages_client_read_own" ON public.ticket_messages
  FOR SELECT
  USING (
    public.usuario_tem_permissao(auth.uid(), 'tickets:read')
    AND is_internal = false
    AND ticket_id IN (
      SELECT id FROM public.tickets WHERE user_id::text = auth.uid()::text
    )
  );

-- Insert: Autenticados podem criar mensagens
CREATE POLICY "ticket_messages_insert_authenticated" ON public.ticket_messages
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
