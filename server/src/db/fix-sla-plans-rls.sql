-- FlowDesk - Corrigir tabela sla_plans com RLS
-- Execute no SQL Editor do Supabase

ALTER TABLE sla_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sla_plans_select" ON sla_plans;
DROP POLICY IF EXISTS "sla_plans_insert" ON sla_plans;
DROP POLICY IF EXISTS "sla_plans_update" ON sla_plans;
DROP POLICY IF EXISTS "sla_plans_delete" ON sla_plans;

CREATE POLICY "sla_plans_select" ON sla_plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sla_plans_insert" ON sla_plans FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sla_plans_update" ON sla_plans FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "sla_plans_delete" ON sla_plans FOR DELETE USING (auth.uid() IS NOT NULL);

NOTIFY pgrst, 'reload schema';
