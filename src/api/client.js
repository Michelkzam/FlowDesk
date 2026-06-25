import { supabase } from '@/lib/supabase';

class SupabaseApi {
  // Auth
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return { token: data.session.access_token, user: profile };
  }

  async register(email, password, full_name, role = 'user') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, role } }
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        password_hash: '',
        full_name,
        role,
        status: 'active'
      });
    }

    return { user: data.user };
  }

  async getMe() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return data;
  }

  logout() {
    supabase.auth.signOut();
  }

  // Tickets
  async getTickets(params = {}) {
    let query = supabase.from('tickets').select('*');

    if (params.status) query = query.eq('status', params.status);
    if (params.priority) query = query.eq('priority', params.priority);
    if (params.agent_id) query = query.eq('agent_id', params.agent_id);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(params.limit || 100);
    if (error) throw error;
    return data || [];
  }

  async getTicket(id) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async createTicket(ticketData) {
    const { data, error } = await supabase
      .from('tickets')
      .insert(ticketData)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateTicket(id, updateData) {
    const { data, error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async claimTicket(id) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (ticket.agent_id && ticket.agent_id !== user.id) {
      return {
        success: false,
        message: `Ticket já assumido por ${ticket.agent_name || 'outro técnico'}`
      };
    }

    const { data, error } = await supabase
      .from('tickets')
      .update({
        agent_id: user.id,
        agent_name: user.user_metadata?.full_name || user.email,
        status: ticket.status === 'open' ? 'in_progress' : ticket.status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, ticket: data };
  }

  async transferTicket(id, to_agent_id, to_agent_name, note) {
    const { data: { user } } = await supabase.auth.getUser();

    const { error: msgError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: id,
        body: `[Transferência] Ticket transferido para ${to_agent_name}.\n\nMotivo: ${note}`,
        sender_type: 'system',
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || user.email,
        type: 'system',
        is_internal: true
      });

    if (msgError) throw msgError;

    const { data, error } = await supabase
      .from('tickets')
      .update({
        agent_id: to_agent_id,
        agent_name: to_agent_name
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, ticket: data };
  }

  // Messages
  async getTicketMessages(ticketId) {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createTicketMessage(ticketId, messageData) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: messageData.sender_type || 'agent',
        sender_id: user?.id,
        sender_name: user?.user_metadata?.full_name || user?.email,
        body: messageData.body,
        type: messageData.type || 'message',
        is_internal: messageData.is_internal || false
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('tickets')
      .update({
        last_response_date: new Date().toISOString(),
        ...(messageData.sender_type === 'user' ? { last_user_response_date: new Date().toISOString() } : {})
      })
      .eq('id', ticketId);

    return data;
  }

  // Categories
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  }

  async createCategory(catData) {
    const { data, error } = await supabase
      .from('categories')
      .insert(catData)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateCategory(id, catData) {
    const { data, error } = await supabase
      .from('categories')
      .update(catData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteCategory(id) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // SLA Plans
  async getSLAPlans() {
    const { data, error } = await supabase
      .from('sla_plans')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  }

  async createSLAPlan(planData) {
    const { data, error } = await supabase
      .from('sla_plans')
      .insert(planData)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateSLAPlan(id, planData) {
    const { data, error } = await supabase
      .from('sla_plans')
      .update(planData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteSLAPlan(id) {
    const { error } = await supabase
      .from('sla_plans')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Agents (users with role agent/admin)
  async getAgents() {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, status, avatar_url, created_at')
      .in('role', ['admin', 'agent'])
      .order('full_name');
    if (error) throw error;
    return data || [];
  }
}

export const api = new SupabaseApi();
export default api;
