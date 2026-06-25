import { Client } from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = fs.readFileSync(path.join(__dirname, 'supabase-schema.sql'), 'utf8');

const c = new Client({
  connectionString: 'postgresql://postgres:FlowDesk2024!@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

try {
  await c.connect();
  console.log('Executando schema SQL...');
  await c.query(sql);
  console.log('Schema executado com sucesso!');

  const result = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Tabelas criadas:');
  result.rows.forEach(t => console.log('  -', t.table_name));

  await c.end();
} catch (e) {
  console.error('Erro:', e.message);
  await c.end();
}
