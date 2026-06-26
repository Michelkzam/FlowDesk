-- FlowDesk - Atualizar tabela on_call_rules com lógica de ciclo
-- Execute no SQL Editor do Supabase Dashboard

-- Adicionar colunas novas
ALTER TABLE on_call_rules ADD COLUMN IF NOT EXISTS cycle_start_date DATE;
ALTER TABLE on_call_rules ADD COLUMN IF NOT EXISTS interval_weeks INTEGER DEFAULT 2;

-- Migrar dados antigos: converter recurrence_week para cycle_start_date
-- (apenas para referência, os dados antigos podem ser apagados depois)
UPDATE on_call_rules SET interval_weeks = 2 WHERE interval_weeks IS NULL;

-- Limpar dados antigos de recurrence_week
DELETE FROM on_call_rules WHERE cycle_start_date IS NULL;

NOTIFY pgrst, 'reload schema';
