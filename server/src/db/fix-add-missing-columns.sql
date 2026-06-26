-- =====================================================
-- FlowDesk - Adicionar TODAS as colunas faltantes
-- Execute no SQL Editor do Supabase Dashboard
-- =====================================================

-- DEPARTMENTS
ALTER TABLE departments ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'public';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS alert_recipients VARCHAR(50) DEFAULT 'all_members';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS auto_response_new_ticket BOOLEAN DEFAULT false;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS auto_response_new_message BOOLEAN DEFAULT false;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255);

-- TEAMS
ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader_name VARCHAR(255);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS assignment_alert BOOLEAN DEFAULT true;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS notes TEXT;

-- ORGANIZATIONS
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notes TEXT;

-- USERS
ALTER TABLE users ADD COLUMN IF NOT EXISTS perfil VARCHAR(50) DEFAULT 'tecnico';
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- CATEGORIES
ALTER TABLE categories ADD COLUMN IF NOT EXISTS notes TEXT;

-- SLA_PLANS
ALTER TABLE sla_plans ADD COLUMN IF NOT EXISTS notes TEXT;

-- HELP_TOPICS
ALTER TABLE help_topics ADD COLUMN IF NOT EXISTS notes TEXT;
