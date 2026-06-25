import pg from 'pg';

const c = new pg.Client({
  connectionString: 'postgresql://postgres:FlowDesk2024%21@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
await c.connect();

// Listar tabelas
const tables = await c.query(`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name
`);
console.log('=== TABELAS ===');
tables.rows.forEach(t => console.log(' -', t.table_name));

// Listar colunas e relações
for (const t of tables.rows) {
  const cols = await c.query(`
    SELECT 
      c.column_name, 
      c.data_type,
      c.is_nullable,
      c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN 'PK' ELSE '' END as pk,
      CASE WHEN fk.column_name IS NOT NULL THEN 'FK -> ' || fk.foreign_table || '.' || fk.foreign_column ELSE '' END as fk
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
      WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
    ) pk ON pk.column_name = c.column_name
    LEFT JOIN (
      SELECT 
        kcu.column_name,
        ccu.table_name as foreign_table,
        ccu.column_name as foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
    ) fk ON fk.column_name = c.column_name
    WHERE c.table_name = $1
    ORDER BY c.ordinal_position
  `, [t.table_name]);
  
  console.log(`\n=== ${t.table_name.toUpperCase()} ===`);
  cols.rows.forEach(c => {
    const parts = [c.column_name, c.data_type];
    if (c.pk) parts.push(`[${c.pk}]`);
    if (c.fk) parts.push(`[${c.fk}]`);
    if (c.is_nullable === 'YES') parts.push('(nullable)');
    console.log('  ', parts.join(' '));
  });
}

// Listar contagens
console.log('\n=== CONTAGENS ===');
for (const t of tables.rows) {
  const count = await c.query(`SELECT COUNT(*) as count FROM ${t.table_name}`);
  console.log(` ${t.table_name}: ${count.rows[0].count} registros`);
}

await c.end();
