import db from './connection.js';

async function migrate() {
  console.log('[DB] Iniciando migrações...');

  // Users table
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.string('id').primary();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('full_name').notNullable();
      table.string('role').defaultTo('agent');
      table.string('status').defaultTo('active');
      table.string('avatar_url');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "users" criada');
  }

  // Categories table
  if (!(await db.schema.hasTable('categories'))) {
    await db.schema.createTable('categories', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('description');
      table.string('color').defaultTo('#6b7280');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "categories" criada');
  }

  // SLA Plans table
  if (!(await db.schema.hasTable('sla_plans'))) {
    await db.schema.createTable('sla_plans', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('description');
      table.integer('emergency_hours').defaultTo(2);
      table.integer('high_hours').defaultTo(8);
      table.integer('normal_hours').defaultTo(24);
      table.integer('low_hours').defaultTo(48);
      table.integer('grace_period').defaultTo(0);
      table.boolean('is_default').defaultTo(false);
      table.string('status').defaultTo('active');
      table.text('notes');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "sla_plans" criada');
  }

  // Departments table
  if (!(await db.schema.hasTable('departments'))) {
    await db.schema.createTable('departments', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('description');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "departments" criada');
  }

  // Tickets table
  if (!(await db.schema.hasTable('tickets'))) {
    await db.schema.createTable('tickets', (table) => {
      table.string('id').primary();
      table.string('number').unique();
      table.string('title').notNullable();
      table.text('description');
      table.string('status').defaultTo('open');
      table.string('priority').defaultTo('normal');
      table.string('agent_id');
      table.string('agent_name');
      table.string('user_id');
      table.string('user_name');
      table.string('user_email');
      table.string('user_phone');
      table.string('department_id');
      table.string('department_name');
      table.string('category_id');
      table.string('category_name');
      table.string('sla_plan_id');
      table.timestamp('due_date');
      table.timestamp('closed_date');
      table.string('source').defaultTo('web');
      table.boolean('is_overdue').defaultTo(false);
      table.timestamp('last_response_date');
      table.timestamp('last_user_response_date');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "tickets" criada');
  }

  // Ticket Messages table
  if (!(await db.schema.hasTable('ticket_messages'))) {
    await db.schema.createTable('ticket_messages', (table) => {
      table.string('id').primary();
      table.string('ticket_id');
      table.string('sender_type').notNullable();
      table.string('sender_id');
      table.string('sender_name');
      table.text('body').notNullable();
      table.string('type').defaultTo('message');
      table.boolean('is_internal').defaultTo(false);
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "ticket_messages" criada');
  }

  // Audit Log table
  if (!(await db.schema.hasTable('audit_logs'))) {
    await db.schema.createTable('audit_logs', (table) => {
      table.string('id').primary();
      table.string('user_id');
      table.string('user_name');
      table.string('action').notNullable();
      table.string('entity_type');
      table.string('entity_id');
      table.string('entity_label');
      table.string('old_value');
      table.string('new_value');
      table.text('description');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "audit_logs" criada');
  }

  console.log('[DB] Migrações concluídas!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[DB] Erro nas migrações:', err);
  process.exit(1);
});
