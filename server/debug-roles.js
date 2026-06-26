import pg from 'pg';
const c = new pg.Client({ connectionString: 'postgresql://postgres:FlowDesk2024%21@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres', ssl: { rejectUnauthorized: false } });
await c.connect();

// Verificar tabela roles
const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'roles' ORDER BY ordinal_position");
console.log('=== COLUNAS DA TABELA ROLES ===');
cols.rows.forEach(r => console.log(' -', r.column_name, r.data_type));

// Listar todas as tabelas
const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
console.log('\n=== TODAS AS TABELAS ===');
tables.rows.forEach(t => console.log(' -', t.table_name));

// Testar insert
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient('https://lxolgqkavtnnrzakjtrw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4b2xncWthdnRubnJ6YWtqdHJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDQ4NTMsImV4cCI6MjA5Nzk4MDg1M30.o6Ltqffw2u4lOx69PZ2PCrmYN7NYzjR9J1nskDyQHVM');
await supabase.auth.signInWithPassword({ email: 'admin@flowdesk.com', password: 'admin123' });

const { data, error } = await supabase.from('roles').insert({
  name: 'Teste Delete',
  permissions: ['tickets.create'],
  status: 'active'
}).select();

if (error) {
  console.log('\nERRO INSERT:', error.message);
} else {
  console.log('\nINSERT OK:', data[0].name);
  // Deletar o registro de teste
  await supabase.from('roles').delete().eq('id', data[0].id);
  console.log('DELETE OK');
}

await c.end();
