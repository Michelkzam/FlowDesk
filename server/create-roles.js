import pg from 'pg';

const c = new pg.Client({
  connectionString: 'postgresql://postgres:FlowDesk2024%21@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
await c.connect();

await c.query(`
  CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )
`);

await c.query('ALTER TABLE roles ENABLE ROW LEVEL SECURITY');
await c.query(`CREATE POLICY "Authenticated users can view roles" ON roles FOR SELECT USING (auth.role() = 'authenticated')`);
await c.query(`CREATE POLICY "Admins can manage roles" ON roles FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))`);

console.log('Tabela roles criada com RLS');
await c.end();
