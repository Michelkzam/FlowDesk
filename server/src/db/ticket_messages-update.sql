-- FlowDesk: Adicionar coluna edited_at na tabela ticket_messages
-- Executar no Supabase SQL Editor

ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS is_highlighted boolean DEFAULT false;