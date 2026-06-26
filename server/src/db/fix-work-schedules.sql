-- FlowDesk - Tabelas de Escalas de Trabalho
-- Execute no SQL Editor do Supabase Dashboard

-- Dias e horários de atendimento padrão
CREATE TABLE IF NOT EXISTS work_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL DEFAULT 'Horário Padrão',
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  day_name VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  break_start TIME,
  break_end TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regras de plantão / rodízio
CREATE TABLE IF NOT EXISTS on_call_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_name VARCHAR(255),
  day_type VARCHAR(20) NOT NULL CHECK (day_type IN ('saturday', 'sunday', 'holiday')),
  recurrence_week INTEGER NOT NULL CHECK (recurrence_week BETWEEN 1 AND 5),
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE on_call_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage work_schedules" ON work_schedules;
CREATE POLICY "Authenticated users can manage work_schedules" ON work_schedules FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage on_call_rules" ON on_call_rules;
CREATE POLICY "Authenticated users can manage on_call_rules" ON on_call_rules FOR ALL USING (auth.role() = 'authenticated');

-- Inserts padrão: segunda a sexta
INSERT INTO work_schedules (day_of_week, day_name, is_active, start_time, end_time, break_start, break_end)
VALUES
  (1, 'Segunda', true, '08:00', '18:00', '12:00', '13:00'),
  (2, 'Terça', true, '08:00', '18:00', '12:00', '13:00'),
  (3, 'Quarta', true, '08:00', '18:00', '12:00', '13:00'),
  (4, 'Quinta', true, '08:00', '18:00', '12:00', '13:00'),
  (5, 'Sexta', true, '08:00', '18:00', '12:00', '13:00'),
  (6, 'Sábado', false, '08:00', '12:00', NULL, NULL),
  (0, 'Domingo', false, NULL, NULL, NULL, NULL);

NOTIFY pgrst, 'reload schema';
