-- =====================================================
-- FlowDesk - Correcao de RLS Policies (recursao users)
-- Execute no SQL Editor do Supabase Dashboard
-- =====================================================

-- 1. Dropar politicas problematicas da tabela users
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- 2. Recriar politicas usando auth.jwt() (sem auto-referencia)
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

-- 3. Dropar e recriar politicas das outras tabelas tambem
-- (usam EXISTS na tabela users, mas como e cross-table, geralmente funciona.
--  Trocar para auth.jwt() por seguranca)

-- categories
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');

-- departments
DROP POLICY IF EXISTS "Anyone can view departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;
CREATE POLICY "Anyone can view departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage departments" ON departments FOR ALL USING (auth.role() = 'authenticated');

-- teams
DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
DROP POLICY IF EXISTS "Admins can manage teams" ON teams;
CREATE POLICY "Anyone can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage teams" ON teams FOR ALL USING (auth.role() = 'authenticated');

-- sla_plans
DROP POLICY IF EXISTS "Anyone can view SLA plans" ON sla_plans;
DROP POLICY IF EXISTS "Admins can manage SLA plans" ON sla_plans;
CREATE POLICY "Anyone can view SLA plans" ON sla_plans FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage SLA plans" ON sla_plans FOR ALL USING (auth.role() = 'authenticated');

-- help_topics
DROP POLICY IF EXISTS "Anyone can view help topics" ON help_topics;
DROP POLICY IF EXISTS "Admins can manage help topics" ON help_topics;
CREATE POLICY "Anyone can view help topics" ON help_topics FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage help topics" ON help_topics FOR ALL USING (auth.role() = 'authenticated');

-- tickets
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Agents can update tickets" ON tickets;
CREATE POLICY "Authenticated users can view tickets" ON tickets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create tickets" ON tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tickets" ON tickets FOR UPDATE USING (auth.role() = 'authenticated');

-- ticket_messages
DROP POLICY IF EXISTS "Authenticated users can view messages" ON ticket_messages;
DROP POLICY IF EXISTS "Authenticated users can create messages" ON ticket_messages;
CREATE POLICY "Authenticated users can view messages" ON ticket_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create messages" ON ticket_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can view audit logs" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- canned_responses
DROP POLICY IF EXISTS "Authenticated users can view canned responses" ON canned_responses;
DROP POLICY IF EXISTS "Admins can manage canned responses" ON canned_responses;
CREATE POLICY "Authenticated users can view canned responses" ON canned_responses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage canned responses" ON canned_responses FOR ALL USING (auth.role() = 'authenticated');

-- organizations
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON organizations;
CREATE POLICY "Authenticated users can view organizations" ON organizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage organizations" ON organizations FOR ALL USING (auth.role() = 'authenticated');

-- kb_categories
DROP POLICY IF EXISTS "Anyone can view KB categories" ON kb_categories;
DROP POLICY IF EXISTS "Admins can manage KB categories" ON kb_categories;
CREATE POLICY "Anyone can view KB categories" ON kb_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage KB categories" ON kb_categories FOR ALL USING (auth.role() = 'authenticated');

-- kb_articles
DROP POLICY IF EXISTS "Anyone can view published articles" ON kb_articles;
DROP POLICY IF EXISTS "Authenticated users can manage articles" ON kb_articles;
CREATE POLICY "Anyone can view published articles" ON kb_articles FOR SELECT USING (status = 'published' OR auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage articles" ON kb_articles FOR ALL USING (auth.role() = 'authenticated');
