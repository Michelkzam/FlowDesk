-- =====================================================
-- FlowDesk - SQL DEFINITIVO para on_call_rules
-- Copie e cole TODO este bloco no SQL Editor do Supabase
-- =====================================================

-- 1. Criar tabela se não existe (com TODAS as colunas que o frontend usa)
CREATE TABLE IF NOT EXISTS on_call_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

-- 2. Adicionar colunas que possam estar faltando (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'on_call_rules' AND column_name = 'day_of_week') THEN
    ALTER TABLE on_call_rules ADD COLUMN day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'on_call_rules' AND column_name = 'cycle_start_date') THEN
    ALTER TABLE on_call_rules ADD COLUMN cycle_start_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'on_call_rules' AND column_name = 'interval_weeks') THEN
    ALTER TABLE on_call_rules ADD COLUMN interval_weeks INTEGER DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'on_call_rules' AND column_name = 'status') THEN
    ALTER TABLE on_call_rules ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;

-- 3. Remover constraints NOT NULL das colunas antigas
ALTER TABLE on_call_rules ALTER COLUMN day_type DROP NOT NULL;
ALTER TABLE on_call_rules ALTER COLUMN recurrence_week DROP NOT NULL;

-- 4. Atualizar dados
UPDATE on_call_rules SET status = 'active' WHERE status IS NULL;

-- 5. RLS: DROPPAR todas as policies antigas e recriar
ALTER TABLE on_call_rules ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'on_call_rules' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON on_call_rules';
  END LOOP;
END $$;

CREATE POLICY "on_call_rules_select" ON on_call_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "on_call_rules_insert" ON on_call_rules
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "on_call_rules_update" ON on_call_rules
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "on_call_rules_delete" ON on_call_rules
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 6. Trigger de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_on_call_rules_updated_at ON on_call_rules;
CREATE TRIGGER update_on_call_rules_updated_at BEFORE UPDATE ON on_call_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Notificar PostgREST
NOTIFY pgrst, 'reload schema';

-- 8. Verificar: deve retornar vazio (tabela criada corretamente)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'on_call_rules'
ORDER BY ordinal_position;
