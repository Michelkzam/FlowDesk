import db from './connection.js';

async function migrate() {
  console.log('[DB] Iniciando migrações...');

  // Roles table (created before users because users.role_id references roles)
  if (!(await db.schema.hasTable('roles'))) {
    await db.schema.createTable('roles', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable().unique();
      table.string('description');
      table.json('permissions').defaultTo('[]');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "roles" criada');
  }

  // Users table
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('full_name').notNullable();
      table.string('role').defaultTo('agent');
      table.uuid('role_id').references('id').inTable('roles').onDelete('SET NULL');
      table.string('perfil').defaultTo('tecnico');
      table.string('status').defaultTo('active');
      table.string('avatar_url');
      table.string('phone');
      table.string('department');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "users" criada');
  }

  // Add perfil column to users if missing
  const hasPerfil = await db.schema.hasColumn('users', 'perfil');
  if (!hasPerfil) {
    await db.schema.alterTable('users', (table) => {
      table.string('perfil').defaultTo('tecnico');
    });
    console.log('[DB] Coluna "perfil" adicionada à tabela "users"');
  }

  // Categories table
  if (!(await db.schema.hasTable('categories'))) {
    await db.schema.createTable('categories', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('description');
      table.string('color').defaultTo('#6b7280');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "categories" criada');
  }

  // Departments table
  if (!(await db.schema.hasTable('departments'))) {
    await db.schema.createTable('departments', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('description');
      table.uuid('manager_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "departments" criada');
  }

  // Teams table
  if (!(await db.schema.hasTable('teams'))) {
    await db.schema.createTable('teams', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('description');
      table.uuid('department_id').references('id').inTable('departments').onDelete('SET NULL');
      table.uuid('lead_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "teams" criada');
  }

  // SLA Plans table
  if (!(await db.schema.hasTable('sla_plans'))) {
    await db.schema.createTable('sla_plans', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
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

  // Help Topics table
  if (!(await db.schema.hasTable('help_topics'))) {
    await db.schema.createTable('help_topics', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('description');
      table.uuid('category_id').references('id').inTable('categories').onDelete('SET NULL');
      table.uuid('department_id').references('id').inTable('departments').onDelete('SET NULL');
      table.uuid('sla_plan_id').references('id').inTable('sla_plans').onDelete('SET NULL');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "help_topics" criada');
  }

  // Tickets table
  if (!(await db.schema.hasTable('tickets'))) {
    await db.schema.createTable('tickets', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('number').unique();
      table.string('title').notNullable();
      table.text('description');
      table.string('status').defaultTo('open');
      table.string('priority').defaultTo('normal');
      table.uuid('agent_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('agent_name');
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('user_name');
      table.string('user_email');
      table.string('user_phone');
      table.uuid('department_id').references('id').inTable('departments').onDelete('SET NULL');
      table.string('department_name');
      table.uuid('category_id').references('id').inTable('categories').onDelete('SET NULL');
      table.string('category_name');
      table.uuid('help_topic_id').references('id').inTable('help_topics').onDelete('SET NULL');
      table.string('help_topic_name');
      table.uuid('sla_plan_id').references('id').inTable('sla_plans').onDelete('SET NULL');
      table.string('sla_name');
      table.uuid('team_id').references('id').inTable('teams').onDelete('SET NULL');
      table.string('team_name');
      table.timestamp('due_date');
      table.timestamp('closed_date');
      table.timestamp('last_response_date');
      table.timestamp('last_user_response_date');
      table.string('source').defaultTo('web');
      table.boolean('is_overdue').defaultTo(false);
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "tickets" criada');
  }

  // Ticket Messages table
  if (!(await db.schema.hasTable('ticket_messages'))) {
    await db.schema.createTable('ticket_messages', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
      table.string('sender_type').notNullable();
      table.uuid('sender_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('sender_name');
      table.text('body').notNullable();
      table.string('type').defaultTo('message');
      table.boolean('is_internal').defaultTo(false);
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "ticket_messages" criada');
  }

  // Audit Logs table
  if (!(await db.schema.hasTable('audit_logs'))) {
    await db.schema.createTable('audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('user_name');
      table.string('action').notNullable();
      table.string('entity_type');
      table.uuid('entity_id');
      table.string('entity_label');
      table.text('old_value');
      table.text('new_value');
      table.text('description');
      table.string('ip_address');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "audit_logs" criada');
  }

  // Canned Responses table
  if (!(await db.schema.hasTable('canned_responses'))) {
    await db.schema.createTable('canned_responses', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('title').notNullable();
      table.text('content').notNullable();
      table.string('category');
      table.string('status').defaultTo('active');
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "canned_responses" criada');
  }

  // Organizations table
  if (!(await db.schema.hasTable('organizations'))) {
    await db.schema.createTable('organizations', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('document');
      table.string('email');
      table.string('phone');
      table.text('address');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "organizations" criada');
  }

  // KB Categories table
  if (!(await db.schema.hasTable('kb_categories'))) {
    await db.schema.createTable('kb_categories', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('name').notNullable();
      table.string('description');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "kb_categories" criada');
  }

  // KB Articles table
  if (!(await db.schema.hasTable('kb_articles'))) {
    await db.schema.createTable('kb_articles', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
      table.string('title').notNullable();
      table.text('content').notNullable();
      table.uuid('category_id').references('id').inTable('kb_categories').onDelete('SET NULL');
      table.uuid('author_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('status').defaultTo('draft');
      table.integer('views').defaultTo(0);
      table.timestamps(true, true);
    });
    console.log('[DB] Tabela "kb_articles" criada');
  }

  console.log('[DB] Migrações concluídas!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[DB] Erro nas migrações:', err);
  process.exit(1);
});
