-- FlowDesk - Tabela de configurações do sistema
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select" ON system_settings;
DROP POLICY IF EXISTS "system_settings_insert" ON system_settings;
DROP POLICY IF EXISTS "system_settings_update" ON system_settings;
DROP POLICY IF EXISTS "system_settings_delete" ON system_settings;

CREATE POLICY "system_settings_select" ON system_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "system_settings_insert" ON system_settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "system_settings_update" ON system_settings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "system_settings_delete" ON system_settings FOR DELETE USING (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

NOTIFY pgrst, 'reload schema';
