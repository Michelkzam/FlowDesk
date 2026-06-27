-- FlowDesk - Corrigir tabela on_call_rules para usar day_of_week
-- Execute no SQL Editor do Supabase Dashboard

-- Adicionar coluna day_of_week se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'on_call_rules' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE on_call_rules ADD COLUMN day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6);
  END IF;
END $$;

-- Migrar dados de day_type para day_of_week (se houver dados existentes)
UPDATE on_call_rules 
SET day_of_week = CASE day_type
  WHEN 'saturday' THEN 6
  WHEN 'sunday' THEN 0
  WHEN 'holiday' THEN 0
  ELSE 6
END
WHERE day_of_week IS NULL AND day_type IS NOT NULL;

-- Garantir que status tenha um valor padrão
UPDATE on_call_rules SET status = 'active' WHERE status IS NULL;

-- Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
