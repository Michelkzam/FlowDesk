-- ============================================================
-- FlowDesk - RLS e Permissões para tabela tickets (existente)
-- ============================================================

-- Habilitar RLS na tabela existente
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

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

-- Supervisor: Leitura de todas, escrita em todas
CREATE POLICY "tickets_supervisor_all" ON public.tickets
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'tickets:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'tickets:write'));

-- Agent: Leitura de todas, escrita nas atribuídas ou sem agente
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

-- Client: Leitura apenas dos seus tickets
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
-- RLS para ticket_messages
-- ============================================================

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_messages_admin_all" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_agent_rw" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_client_read_own" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_insert_authenticated" ON public.ticket_messages;

-- Admin/Supervisor: Acesso total
CREATE POLICY "ticket_messages_admin_all" ON public.ticket_messages
  FOR ALL
  USING (public.usuario_tem_permissao(auth.uid(), 'tickets:read'))
  WITH CHECK (public.usuario_tem_permissao(auth.uid(), 'tickets:write'));

-- Agent: Leitura de todas, escrita nas suas
CREATE POLICY "ticket_messages_agent_rw" ON public.ticket_messages
  FOR ALL
  USING (
    public.usuario_tem_permissao(auth.uid(), 'tickets:read')
    AND (
      public.usuario_tem_permissao(auth.uid(), 'tickets:write')
      OR sender_id::text = auth.uid()::text
    )
  );

-- Client: Leitura apenas das mensagens públicas dos seus tickets
CREATE POLICY "ticket_messages_client_read_own" ON public.ticket_messages
  FOR SELECT
  USING (
    public.usuario_tem_permissao(auth.uid(), 'tickets:read')
    AND is_internal = false
    AND ticket_id IN (
      SELECT id FROM public.tickets WHERE user_id::text = auth.uid()::text
    )
  );

-- Insert: Qualquer um autenticado pode criar mensagem
CREATE POLICY "ticket_messages_insert_authenticated" ON public.ticket_messages
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
