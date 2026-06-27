-- FlowDesk - Adicionar campo client_name na tabela users
-- Execute no SQL Editor do Supabase

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'client_name') THEN
    ALTER TABLE users ADD COLUMN client_name VARCHAR(255);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
