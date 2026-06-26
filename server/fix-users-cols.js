import pg from 'pg';
const c = new pg.Client({ connectionString: 'postgresql://postgres:FlowDesk2024%21@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres', ssl: { rejectUnauthorized: false } });
await c.connect();

const cols = [
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS department_name TEXT',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS role_name TEXT',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT \'tecnico\'',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS admin BOOLEAN DEFAULT false',
  'ALTER TABLE users ALTER COLUMN password_hash SET DEFAULT \'supabase_auth\'',
];

for (const sql of cols) {
  try {
    await c.query(sql);
    console.log('OK:', sql.substring(0, 50));
  } catch (e) {
    console.log('ERRO:', sql.substring(0, 50), '-', e.message);
  }
}

await c.end();
console.log('Concluído');
