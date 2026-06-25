import pg from 'pg';
import bcrypt from 'bcryptjs';

async function testLogin() {
  const c = new pg.Client({
    connectionString: 'postgresql://postgres:FlowDesk2024%21@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  console.log('Conectado com %21');

  const r = await c.query('SELECT email, password_hash, role FROM users WHERE email = $1', ['admin@flowdesk.com']);
  console.log('Rows:', r.rows.length);

  if (r.rows.length > 0) {
    const valid = await bcrypt.compare('admin123', r.rows[0].password_hash);
    console.log('Password valid:', valid);
  }

  await c.end();
}

testLogin().catch(e => console.error('Erro:', e.message));
