import { Client } from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = fs.readFileSync(path.join(__dirname, 'supabase-schema.sql'), 'utf8');

const c = new Client({
  connectionString: process.env.DATABASE_URL,
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
