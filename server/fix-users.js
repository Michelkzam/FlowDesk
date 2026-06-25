import pg from 'pg';

const c = new pg.Client({
  connectionString: 'postgresql://postgres:FlowDesk2024%21@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
await c.connect();

await c.query('DELETE FROM users');
console.log('Tabela users limpa');

const users = [
  { id: 'dd8d4df9-a15b-434c-b254-8e27c270cf9a', email: 'admin@flowdesk.com', name: 'Administrador', role: 'admin' },
  { id: '41fad381-65bd-4563-b7ca-2975358d3865', email: 'tecnico@flowdesk.com', name: 'João Silva', role: 'agent' },
  { id: '8b981ad0-fa28-43f8-99f1-3843a245bcb1', email: 'usuario@exemplo.com', name: 'Maria Santos', role: 'user' },
];

for (const u of users) {
  await c.query(
    'INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
    [u.id, u.email, 'supabase_auth', u.name, u.role, 'active']
  );
  console.log('Inserido:', u.email);
}

await c.end();
console.log('Concluído!');
