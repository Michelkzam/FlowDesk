-- FlowDesk: Corrigir RLS para que usuários vejam seus próprios tickets
-- O problema: as políticas exigem 'tickets:read' que não existe no sistema de permissões
-- Solução: permitir que usuários vejam seus próprios tickets sem verificar permissão

-- ============================================================
-- Correção policies de tickets
-- ============================================================

DROP POLICY IF EXISTS "tickets_client_read_own" ON public.tickets;
CREATE POLICY "tickets_client_read_own" ON public.tickets
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "tickets_client_insert" ON public.tickets;
CREATE POLICY "tickets_client_insert" ON public.tickets
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Agent: pode ver tickets atribuídos a ele ou sem agente
DROP POLICY IF EXISTS "tickets_agent_rw" ON public.tickets;
CREATE POLICY "tickets_agent_rw" ON public.tickets
  FOR ALL
  USING (
    agent_id::text = auth.uid()::text
    OR agent_id IS NULL
    OR user_id::text = auth.uid()::text
  )
  WITH CHECK (
    agent_id::text = auth.uid()::text
    OR user_id::text = auth.uid()::text
  );

-- Admin/Supervisor: acesso total (mantido)
DROP POLICY IF EXISTS "tickets_admin_all" ON public.tickets;
CREATE POLICY "tickets_admin_all" ON public.tickets
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'agent'))
  )
  WITH CHECK (true);

-- ============================================================
-- Correção policies de ticket_messages
-- ============================================================

DROP POLICY IF EXISTS "ticket_messages_client_read_own" ON public.ticket_messages;
CREATE POLICY "ticket_messages_client_read_own" ON public.ticket_messages
  FOR SELECT
  USING (
    is_internal = false
    AND ticket_id IN (
      SELECT id FROM public.tickets WHERE user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "ticket_messages_agent_rw" ON public.ticket_messages;
CREATE POLICY "ticket_messages_agent_rw" ON public.ticket_messages
  FOR ALL
  USING (
    sender_id::text = auth.uid()::text
    OR ticket_id IN (
      SELECT id FROM public.tickets WHERE agent_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "ticket_messages_admin_all" ON public.ticket_messages;
CREATE POLICY "ticket_messages_admin_all" ON public.ticket_messages
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'agent'))
  );
