import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  const c = new Client({
    connectionString: 'postgresql://postgres:FlowDesk2024!@db.lxolgqkavtnnrzakjtrw.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  console.log('Conectado ao Supabase');

  const hash = await bcrypt.hash('admin123', 10);

  const users = [
    { email: 'admin@flowdesk.com', name: 'Administrador', role: 'admin' },
    { email: 'tecnico@flowdesk.com', name: 'João Silva', role: 'agent' },
    { email: 'usuario@exemplo.com', name: 'Maria Santos', role: 'user' },
  ];

  for (const u of users) {
    const existing = await c.query('SELECT id FROM users WHERE email = $1', [u.email]);
    if (existing.rows.length === 0) {
      await c.query(
        'INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [uuidv4(), u.email, hash, u.name, u.role, 'active']
      );
      console.log('Criado:', u.email);
    } else {
      console.log('Existe:', u.email);
    }
  }

  const cats = await c.query('SELECT id FROM categories LIMIT 1');
  if (cats.rows.length === 0) {
    await c.query("INSERT INTO categories (name, description, color) VALUES ('TI / Infraestrutura', 'Redes, servidores, hardware', '#3b82f6')");
    await c.query("INSERT INTO categories (name, description, color) VALUES ('Sistemas / Software', 'Instalação e suporte a software', '#8b5cf6')");
    await c.query("INSERT INTO categories (name, description, color) VALUES ('Financeiro', 'Financeiro, faturamento', '#10b981')");
    await c.query("INSERT INTO categories (name, description, color) VALUES ('RH / Departamento Pessoal', 'Recursos humanos, ponto', '#f59e0b')");
    console.log('Categorias criadas');
  }

  const sla = await c.query('SELECT id FROM sla_plans LIMIT 1');
  if (sla.rows.length === 0) {
    await c.query("INSERT INTO sla_plans (name, description, emergency_hours, high_hours, normal_hours, low_hours, is_default) VALUES ('SLA Padrão', 'Plano de SLA padrão', 2, 8, 24, 48, true)");
    console.log('SLA criado');
  }

  await c.end();
  console.log('Seed concluído!');
}

seed().catch(e => { console.error('Erro:', e.message); process.exit(1); });
