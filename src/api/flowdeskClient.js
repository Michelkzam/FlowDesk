import { supabase } from '@/lib/supabase';

class EntityClient {
  constructor(tableName) {
    this.tableName = tableName;
  }

  mapField(field) {
    if (field === 'created_date') return 'created_at';
    if (field === 'updated_date') return 'updated_at';
    return field;
  }

  async list(orderBy = '-created_date', limit = 100) {
    const descending = orderBy.startsWith('-');
    const rawField = orderBy.replace('-', '');
    const field = this.mapField(rawField);
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order(field, { ascending: !descending })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(row => {
      if (row.created_at && !row.created_date) row.created_date = row.created_at;
      if (row.full_name && !row.name) row.name = row.full_name;
      return row;
    });
  }

  async filter(filters = {}, orderBy = '-created_date', limit = 100) {
    const descending = orderBy.startsWith('-');
    const rawField = orderBy.replace('-', '');
    const field = this.mapField(rawField);
    let query = supabase.from(this.tableName).select('*');
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    });
    const { data, error } = await query.order(field, { ascending: !descending }).limit(limit);
    if (error) throw error;
    return (data || []).map(row => {
      if (row.created_at && !row.created_date) row.created_date = row.created_at;
      if (row.full_name && !row.name) row.name = row.full_name;
      return row;
    });
  }

  async get(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  _cleanData(data, isUpdate = false) {
    const clean = { ...data };
    if (isUpdate) {
      delete clean.id;
    }
    delete clean.created_at;
    delete clean.created_date;
    delete clean.updated_at;
    delete clean.updated_date;

    if (this.tableName === 'users') {
      if (clean.name && !clean.full_name) clean.full_name = clean.name;
      if (!isUpdate && !clean.password_hash) clean.password_hash = 'supabase_auth';
      if (!isUpdate && !clean.role) clean.role = clean.admin ? 'admin' : 'agent';
      if (clean.department_name && !clean.department) clean.department = clean.department_name;
    }

    Object.keys(clean).forEach(key => {
      if (clean[key] === undefined) delete clean[key];
    });

    return clean;
  }

  async create(data) {
    const insertData = this._cleanData(data);
    if (!insertData.created_at) {
      insertData.created_at = new Date().toISOString();
    }
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async update(id, data) {
    const updateData = this._cleanData(data, true);
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}

class AgentEntityClient extends EntityClient {
  constructor() {
    super('users');
  }

  async list(orderBy = '-created_date', limit = 100) {
    const descending = orderBy.startsWith('-');
    const rawField = orderBy.replace('-', '');
    const field = this.mapField(rawField);
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .in('role', ['admin', 'agent'])
      .order(field, { ascending: !descending })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(row => {
      if (row.created_at && !row.created_date) row.created_date = row.created_at;
      if (row.full_name && !row.name) row.name = row.full_name;
      return row;
    });
  }
}

class UserAccountEntityClient extends EntityClient {
  constructor() {
    super('users');
  }

  async list(orderBy = '-created_date', limit = 100) {
    const descending = orderBy.startsWith('-');
    const rawField = orderBy.replace('-', '');
    const field = this.mapField(rawField);
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order(field, { ascending: !descending })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(row => {
      if (row.created_at && !row.created_date) row.created_date = row.created_at;
      if (row.full_name && !row.name) row.name = row.full_name;
      return row;
    });
  }
}

class TicketMessageClient extends EntityClient {
  constructor() {
    super('ticket_messages');
  }
}

class CannedResponseClient extends EntityClient {
  constructor() {
    super('canned_responses');
  }
}

class AuthClient {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    return data || { id: user.id, email: user.email, full_name: user.user_metadata?.full_name, role: user.user_metadata?.role || 'user' };
  }
}

class IntegrationClient {
  async SendEmail({ to, subject, body }) {
    console.log('[Email]', { to, subject, body });
    return { success: true };
  }
}

const entities = {
  Ticket: new EntityClient('tickets'),
  TicketMessage: new TicketMessageClient(),
  Category: new EntityClient('categories'),
  SLAPlan: new EntityClient('sla_plans'),
  Department: new EntityClient('departments'),
  Team: new EntityClient('teams'),
  HelpTopic: new EntityClient('help_topics'),
  Agent: new AgentEntityClient(),
  UserAccount: new UserAccountEntityClient(),
  User: new UserAccountEntityClient(),
  UserProfile: new EntityClient('users'),
  Client: new EntityClient('clients'),
  Organization: new EntityClient('organizations'),
  KBCategory: new EntityClient('kb_categories'),
  KBArticle: new EntityClient('kb_articles'),
  CannedResponse: new CannedResponseClient(),
  AuditLog: new EntityClient('audit_logs'),
  ChatMessage: new EntityClient('ticket_messages'),
  ChannelLink: new EntityClient('organizations'),
  Role: new EntityClient('roles'),
};

const integrations = {
  Core: new IntegrationClient(),
};

const auth = new AuthClient();

export const db = {
  entities,
  auth,
  integrations,
};

export default db;
