import pg from 'pg';
import bcrypt from 'bcryptjs';

const c = new pg.Client({
  connectionString: 'postgresql://postgres:FlowDesk2024!@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
await c.connect();

const r = await c.query('SELECT email, password_hash, role FROM users WHERE email = $1', ['admin@flowdesk.com']);
const user = r.rows[0];
console.log('User:', user.email, user.role);
console.log('Hash:', user.password_hash);

const valid = await bcrypt.compare('admin123', user.password_hash);
console.log('Password valid:', valid);

await c.end();
