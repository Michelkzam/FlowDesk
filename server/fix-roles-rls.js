import pg from 'pg';

const c = new pg.Client({
  connectionString: 'postgresql://postgres:FlowDesk2024%21@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
await c.connect();

await c.query('DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles');
await c.query('DROP POLICY IF EXISTS "Admins can manage roles" ON roles');

await c.query(`CREATE POLICY "Authenticated users can view roles" ON roles FOR SELECT USING (auth.role() = 'authenticated')`);
await c.query(`CREATE POLICY "Authenticated users can insert roles" ON roles FOR INSERT WITH CHECK (auth.role() = 'authenticated')`);
await c.query(`CREATE POLICY "Authenticated users can update roles" ON roles FOR UPDATE USING (auth.role() = 'authenticated')`);
await c.query(`CREATE POLICY "Authenticated users can delete roles" ON roles FOR DELETE USING (auth.role() = 'authenticated')`);

console.log('RLS policies corrigidas - sem recursão');
await c.end();
