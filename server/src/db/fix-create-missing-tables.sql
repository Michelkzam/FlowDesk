-- FlowDesk - Criar tabelas faltantes (schedules, business_hours, assets, quick_replies, operator_profiles, documents)
-- Execute no SQL Editor do Supabase Dashboard

-- schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  timezone VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- business_hours
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week INTEGER NOT NULL,
  day_name VARCHAR(20) NOT NULL,
  start_time TIME,
  end_time TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- assets (inventario)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  tag VARCHAR(100),
  category VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  location VARCHAR(255),
  assigned_to VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quick_replies
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  shortcut VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- operator_profiles
CREATE TABLE IF NOT EXISTS operator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  category VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para todas as tabelas
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage schedules" ON schedules;
CREATE POLICY "Authenticated users can manage schedules" ON schedules FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage business_hours" ON business_hours;
CREATE POLICY "Authenticated users can manage business_hours" ON business_hours FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage assets" ON assets;
CREATE POLICY "Authenticated users can manage assets" ON assets FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage quick_replies" ON quick_replies;
CREATE POLICY "Authenticated users can manage quick_replies" ON quick_replies FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage operator_profiles" ON operator_profiles;
CREATE POLICY "Authenticated users can manage operator_profiles" ON operator_profiles FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage documents" ON documents;
CREATE POLICY "Authenticated users can manage documents" ON documents FOR ALL USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
