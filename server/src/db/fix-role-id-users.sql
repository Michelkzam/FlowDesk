-- FlowDesk - Adicionar role_id na tabela users
-- Execute no SQL Editor do Supabase

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
