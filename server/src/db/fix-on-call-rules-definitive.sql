-- FlowDesk - Criar/corrigir tabela on_call_rules definitivamente
-- Execute no SQL Editor do Supabase Dashboard

-- 1. Criar a tabela se não existir (com o schema que o frontend espera)
CREATE TABLE IF NOT EXISTS on_call_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_name VARCHAR(255),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_type VARCHAR(20),
  recurrence_week INTEGER,
  cycle_start_date DATE,
  interval_weeks INTEGER DEFAULT 2,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Se a tabela já existia, adicionar colunas faltantes
DO $$
BEGIN
  -- day_of_week
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'on_call_rules' AND column_name = 'day_of_week') THEN
    ALTER TABLE on_call_rules ADD COLUMN day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6);
  END IF;
  -- cycle_start_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'on_call_rules' AND column_name = 'cycle_start_date') THEN
    ALTER TABLE on_call_rules ADD COLUMN cycle_start_date DATE;
  END IF;
  -- interval_weeks
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'on_call_rules' AND column_name = 'interval_weeks') THEN
    ALTER TABLE on_call_rules ADD COLUMN interval_weeks INTEGER DEFAULT 2;
  END IF;
END $$;

-- 3. Remover constraints NOT NULL das colunas antigas
ALTER TABLE on_call_rules ALTER COLUMN day_type DROP NOT NULL;
ALTER TABLE on_call_rules ALTER COLUMN recurrence_week DROP NOT NULL;

-- 4. Atualizar status para todos os registros
UPDATE on_call_rules SET status = 'active' WHERE status IS NULL;

-- 5. Garantir trigger de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_on_call_rules_updated_at ON on_call_rules;
CREATE TRIGGER update_on_call_rules_updated_at BEFORE UPDATE ON on_call_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS - política ampla para usuários autenticados
ALTER TABLE on_call_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage on_call_rules" ON on_call_rules;
DROP POLICY IF EXISTS "Users can view on_call_rules" ON on_call_rules;
DROP POLICY IF EXISTS "Users can insert on_call_rules" ON on_call_rules;
DROP POLICY IF EXISTS "Users can update on_call_rules" ON on_call_rules;
DROP POLICY IF EXISTS "Users can delete on_call_rules" ON on_call_rules;

CREATE POLICY "Users can view on_call_rules" ON on_call_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert on_call_rules" ON on_call_rules
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update on_call_rules" ON on_call_rules
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete on_call_rules" ON on_call_rules
  FOR DELETE USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
