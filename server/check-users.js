import pg from 'pg';

const c = new pg.Client({
  connectionString: 'postgresql://postgres:FlowDesk2024%21@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
await c.connect();

// Verificar constraint PK da tabela users
const pk = await c.query(`
  SELECT ku.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
  WHERE tc.table_name = 'users' AND tc.constraint_type = 'PRIMARY KEY'
`);
console.log('PKs da tabela users:', pk.rows.map(r => r.column_name));

// Listar todas as colunas
const cols = await c.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'users'
  ORDER BY ordinal_position
`);
console.log('Colunas:', cols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

await c.end();
