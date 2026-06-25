const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('flowdesk_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('flowdesk_token', token);
    } else {
      localStorage.removeItem('flowdesk_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/me')) {
        this.setToken(null);
      }
      throw new Error(data.message || 'Erro na requisição');
    }

    return data;
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth
  async login(email, password) {
    const data = await this.post('/api/auth/login', { email, password });
    this.setToken(data.token);
    return data;
  }

  async register(email, password, full_name, role) {
    const data = await this.post('/api/auth/register', { email, password, full_name, role });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.get('/api/auth/me');
  }

  async updateProfile(data) {
    return this.put('/api/auth/profile', data);
  }

  async changePassword(current_password, new_password) {
    return this.put('/api/auth/password', { current_password, new_password });
  }

  logout() {
    this.setToken(null);
  }

  // Tickets
  async getTickets(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/api/tickets?${query}`);
  }

  async getTicket(id) {
    return this.get(`/api/tickets/${id}`);
  }

  async createTicket(data) {
    return this.post('/api/tickets', data);
  }

  async updateTicket(id, data) {
    return this.put(`/api/tickets/${id}`, data);
  }

  async claimTicket(id) {
    return this.post(`/api/tickets/${id}/claim`);
  }

  async transferTicket(id, to_agent_id, to_agent_name, note) {
    return this.post(`/api/tickets/${id}/transfer`, { to_agent_id, to_agent_name, note });
  }

  async getTicketMessages(ticketId, limit) {
    return this.get(`/api/tickets/${ticketId}/messages${limit ? `?limit=${limit}` : ''}`);
  }

  async createTicketMessage(ticketId, data) {
    return this.post(`/api/tickets/${ticketId}/messages`, data);
  }

  // Categories
  async getCategories() {
    return this.get('/api/categories');
  }

  async createCategory(data) {
    return this.post('/api/categories', data);
  }

  async updateCategory(id, data) {
    return this.put(`/api/categories/${id}`, data);
  }

  async deleteCategory(id) {
    return this.delete(`/api/categories/${id}`);
  }

  // SLA Plans
  async getSLAPlans() {
    return this.get('/api/sla-plans');
  }

  async createSLAPlan(data) {
    return this.post('/api/sla-plans', data);
  }

  async updateSLAPlan(id, data) {
    return this.put(`/api/sla-plans/${id}`, data);
  }

  async deleteSLAPlan(id) {
    return this.delete(`/api/sla-plans/${id}`);
  }

  // Agents
  async getAgents() {
    return this.get('/api/agents');
  }

  async createAgent(data) {
    return this.post('/api/agents', data);
  }

  async updateAgent(id, data) {
    return this.put(`/api/agents/${id}`, data);
  }

  async deleteAgent(id) {
    return this.delete(`/api/agents/${id}`);
  }
}

export const api = new ApiClient();
export default api;
