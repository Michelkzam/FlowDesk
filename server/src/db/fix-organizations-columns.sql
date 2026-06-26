-- FlowDesk - Adicionar colunas faltantes na tabela organizations
-- Execute no SQL Editor do Supabase Dashboard

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS account_manager_name VARCHAR(255);
