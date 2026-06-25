import pg from 'pg';

const c = new pg.Client({
  connectionString: 'postgresql://postgres:FlowDesk2024%21@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
await c.connect();

// Backup dos dados
const backup = await c.query('SELECT id, email, full_name, role, status FROM users');
console.log('Backup:', backup.rows);

// Dropar tabela users antiga
await c.query('DROP TABLE IF EXISTS users CASCADE');
console.log('Tabela users antiga removida');

// Criar tabela users limpa
await c.query(`
  CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) DEFAULT 'supabase_auth',
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'user')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    avatar_url TEXT,
    phone VARCHAR(20),
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`);
console.log('Tabela users recriada');

// Recriar constraints FK nas outras tabelas
const fkTables = [
  { table: 'tickets', column: 'agent_id' },
  { table: 'tickets', column: 'user_id' },
  { table: 'ticket_messages', column: 'sender_id' },
  { table: 'audit_logs', column: 'user_id' },
  { table: 'canned_responses', column: 'created_by' },
  { table: 'departments', column: 'manager_id' },
  { table: 'teams', column: 'lead_id' },
  { table: 'kb_articles', column: 'author_id' },
];

for (const fk of fkTables) {
  try {
    await c.query(`ALTER TABLE ${fk.table} DROP CONSTRAINT IF EXISTS ${fk.table}_${fk.column}_fkey`);
    await c.query(`ALTER TABLE ${fk.table} ADD CONSTRAINT ${fk.table}_${fk.column}_fkey FOREIGN KEY (${fk.column}) REFERENCES users(id) ON DELETE SET NULL`);
    console.log(`FK criada: ${fk.table}.${fk.column} -> users.id`);
  } catch (e) {
    console.log(`FK ${fk.table}.${fk.column}: ${e.message}`);
  }
}

// Recriar RLS
await c.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
await c.query('DROP POLICY IF EXISTS "Users can view all users" ON users');
await c.query('DROP POLICY IF EXISTS "Users can update own profile" ON users');
await c.query('DROP POLICY IF EXISTS "Admins can manage users" ON users');
await c.query(`CREATE POLICY "Users can view all users" ON users FOR SELECT USING (auth.role() = 'authenticated')`);
await c.query(`CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id)`);
await c.query(`CREATE POLICY "Admins can manage users" ON users FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))`);
console.log('RLS policies recriadas');

// Re-inserir dados
for (const u of backup.rows) {
  await c.query(
    'INSERT INTO users (id, email, full_name, role, status) VALUES ($1, $2, $3, $4, $5)',
    [u.id, u.email, u.full_name, u.role, u.status]
  );
  console.log('Re-inserido:', u.email);
}

// Criar categorias se não existirem
const cats = await c.query('SELECT COUNT(*) as count FROM categories');
if (parseInt(cats.rows[0].count) === 0) {
  await c.query("INSERT INTO categories (name, description, color) VALUES ('TI / Infraestrutura', 'Redes, servidores, hardware', '#3b82f6')");
  await c.query("INSERT INTO categories (name, description, color) VALUES ('Sistemas / Software', 'Instalação e suporte a software', '#8b5cf6')");
  await c.query("INSERT INTO categories (name, description, color) VALUES ('Financeiro', 'Financeiro, faturamento', '#10b981')");
  await c.query("INSERT INTO categories (name, description, color) VALUES ('RH / Departamento Pessoal', 'Recursos humanos, ponto', '#f59e0b')");
  console.log('Categorias criadas');
}

// Criar SLA padrão se não existir
const sla = await c.query('SELECT COUNT(*) as count FROM sla_plans');
if (parseInt(sla.rows[0].count) === 0) {
  await c.query("INSERT INTO sla_plans (name, description, emergency_hours, high_hours, normal_hours, low_hours, is_default) VALUES ('SLA Padrão', 'Plano de SLA padrão', 2, 8, 24, 48, true)");
  console.log('SLA criado');
}

// Criar departamentos padrão
const depts = await c.query('SELECT COUNT(*) as count FROM departments');
if (parseInt(depts.rows[0].count) === 0) {
  await c.query("INSERT INTO departments (name, description) VALUES ('Suporte Técnico', 'Suporte técnico geral')");
  await c.query("INSERT INTO departments (name, description) VALUES ('Desenvolvimento', 'Desenvolvimento de software')");
  await c.query("INSERT INTO departments (name, description) VALUES ('Administrativo', 'Gestão administrativa')");
  console.log('Departamentos criados');
}

await c.end();
console.log('\nConcluído!');
