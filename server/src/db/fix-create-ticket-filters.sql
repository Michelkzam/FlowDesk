-- FlowDesk - Criar tabela ticket_filters
-- Execute no SQL Editor do Supabase Dashboard

CREATE TABLE IF NOT EXISTS ticket_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  target VARCHAR(50) DEFAULT 'any',
  match_type VARCHAR(20) DEFAULT 'all',
  execution_order INTEGER DEFAULT 1,
  rules JSONB DEFAULT '[]',
  actions JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ticket_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage ticket_filters" ON ticket_filters;
CREATE POLICY "Authenticated users can manage ticket_filters" ON ticket_filters FOR ALL USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
