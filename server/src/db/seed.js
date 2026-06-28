import db from './connection.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const AGENT_PERMISSIONS = [
  "tickets.create", "tickets.edit", "tickets.delete", "tickets.close", "tickets.assign", "tickets.transfer",
  "kb.create", "kb.edit", "kb.delete", "kb.publish",
  "reports.view",
];

const USER_PERMISSIONS = [
  "tickets.create", "tickets.edit", "tickets.close",
];

async function seed() {
  console.log('[DB] Iniciando seed...');

  // Seed roles
  const roles = [
    {
      name: 'Técnico',
      description: 'Perfil padrão para técnicos de suporte',
      permissions: AGENT_PERMISSIONS,
    },
    {
      name: 'Usuário',
      description: 'Perfil padrão para usuários comuns',
      permissions: USER_PERMISSIONS,
    },
  ];

  const roleIds = {};
  for (const role of roles) {
    let existing = await db('roles').where({ name: role.name }).first();
    if (!existing) {
      const [created] = await db('roles').insert({
        id: uuidv4(),
        name: role.name,
        description: role.description,
        permissions: JSON.stringify(role.permissions),
        status: 'active'
      }).returning('*');
      roleIds[role.name] = created.id;
      console.log(`[DB] Role "${role.name}" criada com ${role.permissions.length} permissões`);
    } else {
      roleIds[role.name] = existing.id;
      console.log(`[DB] Role "${role.name}" já existe`);
    }
  }

  // Assign roles to existing users without role_id
  const agentRoleId = roleIds['Técnico'];
  const userRoleId = roleIds['Usuário'];

  const agentsUpdated = await db('users')
    .where({ role: 'agent' })
    .whereNull('role_id')
    .update({ role_id: agentRoleId, updated_at: new Date() });
  console.log(`[DB] ${agentsUpdated} técnico(s) vinculado(s) ao role "Técnico"`);

  const usersUpdated = await db('users')
    .where({ role: 'user' })
    .whereNull('role_id')
    .update({ role_id: userRoleId, updated_at: new Date() });
  console.log(`[DB] ${usersUpdated} usuário(s) vinculado(s) ao role "Usuário"`);

  // Seed admin user
  const existingAdmin = await db('users').where({ email: 'admin@flowdesk.com' }).first();
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await db('users').insert({
      id: uuidv4(),
      email: 'admin@flowdesk.com',
      password_hash: passwordHash,
      full_name: 'Administrador',
      role: 'admin',
      status: 'active'
    });
    console.log('[DB] Usuário admin criado: admin@flowdesk.com / admin123');
  }

  // Seed default categories
  const categories = [
    { name: 'TI / Infraestrutura', description: 'Redes, servidores, hardware', color: '#3b82f6' },
    { name: 'Sistemas / Software', description: 'Instalação e suporte a software', color: '#8b5cf6' },
    { name: 'Financeiro', description: 'Financeiro, faturamento', color: '#10b981' },
    { name: 'RH / Departamento Pessoal', description: 'Recursos humanos, ponto', color: '#f59e0b' },
  ];

  for (const cat of categories) {
    const exists = await db('categories').where({ name: cat.name }).first();
    if (!exists) {
      await db('categories').insert({ id: uuidv4(), ...cat, status: 'active' });
    }
  }
  console.log('[DB] Categorias padrão criadas');

  // Seed default SLA plan
  const existingSLA = await db('sla_plans').where({ is_default: true }).first();
  if (!existingSLA) {
    await db('sla_plans').insert({
      id: uuidv4(),
      name: 'SLA Padrão',
      description: 'Plano de SLA padrão do sistema',
      emergency_hours: 2,
      high_hours: 8,
      normal_hours: 24,
      low_hours: 48,
      is_default: true,
      status: 'active'
    });
    console.log('[DB] Plano SLA padrão criado');
  }

  // Seed sample agent
  const existingAgent = await db('users').where({ email: 'tecnico@flowdesk.com' }).first();
  if (!existingAgent) {
    const passwordHash = await bcrypt.hash('tecnico123', 10);
    await db('users').insert({
      id: uuidv4(),
      email: 'tecnico@flowdesk.com',
      password_hash: passwordHash,
      full_name: 'João Silva',
      role: 'agent',
      role_id: agentRoleId,
      status: 'active'
    });
    console.log('[DB] Técnico criado: tecnico@flowdesk.com / tecnico123');
  }

  // Seed sample user
  const existingUser = await db('users').where({ email: 'usuario@exemplo.com' }).first();
  if (!existingUser) {
    const passwordHash = await bcrypt.hash('usuario123', 10);
    await db('users').insert({
      id: uuidv4(),
      email: 'usuario@exemplo.com',
      password_hash: passwordHash,
      full_name: 'Maria Santos',
      role: 'user',
      role_id: userRoleId,
      status: 'active'
    });
    console.log('[DB] Usuário criado: usuario@exemplo.com / usuario123');
  }

  console.log('[DB] Seed concluído!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[DB] Erro no seed:', err);
  process.exit(1);
});
