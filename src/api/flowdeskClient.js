import { supabase } from '@/lib/supabase';

function formatDate(date) {
  if (!date) return null;
  return new Date(date).toISOString();
}

class EntityClient {
  constructor(tableName) {
    this.tableName = tableName;
  }

  mapField(field) {
    if (field === 'created_date') return 'created_at';
    if (field === '-created_date') return '-created_at';
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
      if (row.updated_at && !row.updated_date) row.updated_date = row.updated_at;
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
      if (row.updated_at && !row.updated_date) row.updated_date = row.updated_at;
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

  async create(data) {
    const insertData = { ...data };
    if (!insertData.created_date && !insertData.created_at) {
      insertData.created_date = new Date().toISOString();
    }
    delete insertData.created_at;
    delete insertData.updated_at;
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  async update(id, data) {
    const updateData = { ...data, updated_date: new Date().toISOString() };
    delete updateData.id;
    delete updateData.created_date;
    delete updateData.created_at;
    delete updateData.updated_at;
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

class AuthClient {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
    return data || { id: user.id, email: user.email, full_name: user.user_metadata?.full_name, role: user.user_metadata?.role || 'user' };
  }
}

class CannedResponseClient extends EntityClient {
  constructor() {
    super('canned_responses');
  }
}

class TicketMessageClient extends EntityClient {
  constructor() {
    super('ticket_messages');
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
  Agent: new EntityClient('users'),
  UserAccount: new EntityClient('users'),
  UserProfile: new EntityClient('users'),
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
