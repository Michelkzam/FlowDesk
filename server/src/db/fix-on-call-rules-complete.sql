-- FlowDesk - Corrigir tabela on_call_rules para funcionar com o frontend
-- Execute no SQL Editor do Supabase Dashboard

-- 1. Remover constraints NOT NULL das colunas antigas que o frontend não usa
ALTER TABLE on_call_rules ALTER COLUMN day_type DROP NOT NULL;
ALTER TABLE on_call_rules ALTER COLUMN recurrence_week DROP NOT NULL;

-- 2. Garantir que day_of_week existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'on_call_rules' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE on_call_rules ADD COLUMN day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6);
  END IF;
END $$;

-- 3. Migrar dados existentes de day_type para day_of_week
UPDATE on_call_rules 
SET day_of_week = CASE day_type
  WHEN 'saturday' THEN 6
  WHEN 'sunday' THEN 0
  WHEN 'holiday' THEN 0
  ELSE 6
END
WHERE day_of_week IS NULL AND day_type IS NOT NULL;

-- 4. Garantir que status tenha valor padrão
UPDATE on_call_rules SET status = 'active' WHERE status IS NULL;

-- 5. Corrigir RLS - usar auth.uid() que funciona corretamente no Supabase
DROP POLICY IF EXISTS "Authenticated users can manage on_call_rules" ON on_call_rules;
CREATE POLICY "Authenticated users can manage on_call_rules" ON on_call_rules 
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. Garantir que RLS está habilitado
ALTER TABLE on_call_rules ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
