-- FlowDesk - Criar tabela contracts com suporte a anexos
-- Execute no SQL Editor do Supabase Dashboard

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  type VARCHAR(50) DEFAULT 'support',
  status VARCHAR(20) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  value NUMERIC(12,2),
  sla_hours INTEGER,
  notes TEXT,
  clauses TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can manage contracts" ON contracts;
CREATE POLICY "Authenticated users can view contracts" ON contracts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage contracts" ON contracts FOR ALL USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
