-- FlowDesk - Adicionar colunas faltantes na tabela help_topics
-- Execute no SQL Editor do Supabase Dashboard

ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'public';
ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal';
ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES help_topics(id) ON DELETE SET NULL;
ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255);
ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS department_name VARCHAR(255);
ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS disable_auto_response BOOLEAN DEFAULT false;
ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS auto_assign_agent_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS sla_id UUID REFERENCES sla_plans(id) ON DELETE SET NULL;
ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS notes TEXT;

NOTIFY pgrst, 'reload schema';
