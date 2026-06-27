-- FlowDesk - Adicionar client_id na tabela users e criar relação com clients
-- Execute no SQL Editor do Supabase

-- 1. Adicionar client_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'client_id') THEN
    ALTER TABLE users ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Atualizar client_id baseado no client_name existente (se houver)
UPDATE users u
SET client_id = c.id
FROM clients c
WHERE u.client_name = c.name AND u.client_id IS NULL;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);

NOTIFY pgrst, 'reload schema';
