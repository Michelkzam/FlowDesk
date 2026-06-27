-- FlowDesk - Criar tabela holidays
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  recurring BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holidays_select" ON holidays;
DROP POLICY IF EXISTS "holidays_insert" ON holidays;
DROP POLICY IF EXISTS "holidays_update" ON holidays;
DROP POLICY IF EXISTS "holidays_delete" ON holidays;

CREATE POLICY "holidays_select" ON holidays FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "holidays_insert" ON holidays FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "holidays_update" ON holidays FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "holidays_delete" ON holidays FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_holidays_updated_at ON holidays;
CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON holidays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

NOTIFY pgrst, 'reload schema';
