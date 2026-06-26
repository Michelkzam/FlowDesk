-- =====================================================
-- FlowDesk - Garantir que todas as tabelas existem
-- Execute no SQL Editor do Supabase Dashboard
-- =====================================================

-- TABELA: clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(255),
  document VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6b7280',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: sla_plans
CREATE TABLE IF NOT EXISTS sla_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  emergency_hours INTEGER DEFAULT 2,
  high_hours INTEGER DEFAULT 8,
  normal_hours INTEGER DEFAULT 24,
  low_hours INTEGER DEFAULT 48,
  grace_period INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: help_topics
CREATE TABLE IF NOT EXISTS help_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  sla_plan_id UUID REFERENCES sla_plans(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number VARCHAR(20) UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'pending_approval', 'resolved', 'closed')),
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('emergency', 'high', 'normal', 'low')),
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_name VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  user_phone VARCHAR(20),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  department_name VARCHAR(255),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name VARCHAR(255),
  help_topic_id UUID REFERENCES help_topics(id) ON DELETE SET NULL,
  help_topic_name VARCHAR(255),
  sla_plan_id UUID REFERENCES sla_plans(id) ON DELETE SET NULL,
  sla_name VARCHAR(255),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_name VARCHAR(255),
  client_name VARCHAR(255),
  client_phone VARCHAR(20),
  channel VARCHAR(50) DEFAULT 'web',
  due_date TIMESTAMP WITH TIME ZONE,
  closed_date TIMESTAMP WITH TIME ZONE,
  last_response_date TIMESTAMP WITH TIME ZONE,
  last_user_response_date TIMESTAMP WITH TIME ZONE,
  source VARCHAR(50) DEFAULT 'web',
  is_overdue BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: ticket_messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('agent', 'user', 'system')),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name VARCHAR(255),
  body TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'message' CHECK (type IN ('message', 'note', 'system', 'reply')),
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_label VARCHAR(255),
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: canned_responses
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  document VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(20),
  website VARCHAR(255),
  address TEXT,
  account_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  account_manager_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: kb_categories
CREATE TABLE IF NOT EXISTS kb_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: kb_articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RLS Policies (todas com DROP IF EXISTS)
-- =====================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;

-- clients
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON clients;
CREATE POLICY "Authenticated users can view clients" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage clients" ON clients FOR ALL USING (auth.role() = 'authenticated');

-- roles
DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON roles;
CREATE POLICY "Authenticated users can view roles" ON roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage roles" ON roles FOR ALL USING (auth.role() = 'authenticated');

-- categories
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');

-- departments
DROP POLICY IF EXISTS "Anyone can view departments" ON departments;
DROP POLICY IF EXISTS "Authenticated users can manage departments" ON departments;
CREATE POLICY "Anyone can view departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage departments" ON departments FOR ALL USING (auth.role() = 'authenticated');

-- teams
DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can manage teams" ON teams;
CREATE POLICY "Anyone can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage teams" ON teams FOR ALL USING (auth.role() = 'authenticated');

-- sla_plans
DROP POLICY IF EXISTS "Anyone can view SLA plans" ON sla_plans;
DROP POLICY IF EXISTS "Authenticated users can manage SLA plans" ON sla_plans;
CREATE POLICY "Anyone can view SLA plans" ON sla_plans FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage SLA plans" ON sla_plans FOR ALL USING (auth.role() = 'authenticated');

-- help_topics
DROP POLICY IF EXISTS "Anyone can view help topics" ON help_topics;
DROP POLICY IF EXISTS "Authenticated users can manage help topics" ON help_topics;
CREATE POLICY "Anyone can view help topics" ON help_topics FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage help topics" ON help_topics FOR ALL USING (auth.role() = 'authenticated');

-- tickets
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON tickets;
CREATE POLICY "Authenticated users can view tickets" ON tickets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create tickets" ON tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tickets" ON tickets FOR UPDATE USING (auth.role() = 'authenticated');

-- ticket_messages
DROP POLICY IF EXISTS "Authenticated users can view messages" ON ticket_messages;
DROP POLICY IF EXISTS "Authenticated users can create messages" ON ticket_messages;
CREATE POLICY "Authenticated users can view messages" ON ticket_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create messages" ON ticket_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- audit_logs
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can view audit logs" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- canned_responses
DROP POLICY IF EXISTS "Authenticated users can view canned responses" ON canned_responses;
DROP POLICY IF EXISTS "Authenticated users can manage canned responses" ON canned_responses;
CREATE POLICY "Authenticated users can view canned responses" ON canned_responses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage canned responses" ON canned_responses FOR ALL USING (auth.role() = 'authenticated');

-- organizations
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can manage organizations" ON organizations;
CREATE POLICY "Authenticated users can view organizations" ON organizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage organizations" ON organizations FOR ALL USING (auth.role() = 'authenticated');

-- kb_categories
DROP POLICY IF EXISTS "Anyone can view KB categories" ON kb_categories;
DROP POLICY IF EXISTS "Authenticated users can manage KB categories" ON kb_categories;
CREATE POLICY "Anyone can view KB categories" ON kb_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage KB categories" ON kb_categories FOR ALL USING (auth.role() = 'authenticated');

-- kb_articles
DROP POLICY IF EXISTS "Anyone can view published articles" ON kb_articles;
DROP POLICY IF EXISTS "Authenticated users can manage articles" ON kb_articles;
CREATE POLICY "Anyone can view published articles" ON kb_articles FOR SELECT USING (status = 'published' OR auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage articles" ON kb_articles FOR ALL USING (auth.role() = 'authenticated');
