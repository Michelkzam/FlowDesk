-- FlowDesk - Adicionar coluna client_name na tabela tickets
-- Execute no SQL Editor do Supabase

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'client_name') THEN
    ALTER TABLE tickets ADD COLUMN client_name VARCHAR(255);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
