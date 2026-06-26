-- FlowDesk - Criar tabelas faltantes (clients, roles)
-- Execute no SQL Editor do Supabase Dashboard

-- TABELA: clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(255),
  document VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON clients;
CREATE POLICY "Authenticated users can view clients" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage clients" ON clients FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON roles;
CREATE POLICY "Authenticated users can view roles" ON roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage roles" ON roles FOR ALL USING (auth.role() = 'authenticated');
