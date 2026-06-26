-- =====================================================
-- FlowDesk - RLS Policies para Supabase
-- Corrigido: usa auth.jwt() em vez de auto-referencia
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
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

-- =====================================================
-- POLÍTICAS: users (SEM auto-referencia!)
-- =====================================================
CREATE POLICY "Authenticated users can view users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can insert users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can delete users" ON users
  FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
  );

-- =====================================================
-- POLÍTICAS: categories
-- =====================================================
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage categories" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS: departments
-- =====================================================
CREATE POLICY "Anyone can view departments" ON departments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage departments" ON departments
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS: teams
-- =====================================================
CREATE POLICY "Anyone can view teams" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage teams" ON teams
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS: sla_plans
-- =====================================================
CREATE POLICY "Anyone can view SLA plans" ON sla_plans
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage SLA plans" ON sla_plans
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS: help_topics
-- =====================================================
CREATE POLICY "Anyone can view help topics" ON help_topics
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage help topics" ON help_topics
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS: tickets
-- =====================================================
CREATE POLICY "Authenticated users can view tickets" ON tickets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create tickets" ON tickets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tickets" ON tickets
  FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS: ticket_messages
-- =====================================================
CREATE POLICY "Authenticated users can view messages" ON ticket_messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create messages" ON ticket_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS: audit_logs
-- =====================================================
CREATE POLICY "Authenticated users can view audit logs" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS: canned_responses
-- =====================================================
CREATE POLICY "Authenticated users can view canned responses" ON canned_responses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage canned responses" ON canned_responses
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS: organizations
-- =====================================================
CREATE POLICY "Authenticated users can view organizations" ON organizations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage organizations" ON organizations
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- POLÍTICAS: kb_categories e kb_articles
-- =====================================================
CREATE POLICY "Anyone can view KB categories" ON kb_categories
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage KB categories" ON kb_categories
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view published articles" ON kb_articles
  FOR SELECT USING (status = 'published' OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage articles" ON kb_articles
  FOR ALL USING (auth.role() = 'authenticated');
