import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const mockReq = (overrides = {}) => ({
  method: 'POST',
  headers: { authorization: 'Bearer test-token' },
  query: { id: 'ticket-123' },
  body: {
    body: 'Mensagem de teste para o ticket',
    type: 'message',
    is_internal: false,
  },
  ...overrides,
});

const mockRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
};

describe('API /api/tickets/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle, insert: mockInsert, update: mockUpdate });
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('deve rejeitar metodos diferentes de POST', async () => {
    const { default: handler } = await import('@api/tickets/[id]/messages.js');
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('deve rejeitar requisicoes sem token', async () => {
    const { default: handler } = await import('@api/tickets/[id]/messages.js');
    const req = mockReq({ headers: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve rejeitar mensagem vazia', async () => {
    const { default: handler } = await import('@api/tickets/[id]/messages.js');
    const req = mockReq({ body: { body: '' } });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve retornar 404 quando ticket nao existe', async () => {
    const { default: handler } = await import('@api/tickets/[id]/messages.js');
    const req = mockReq();
    const res = mockRes();

    // Order: getUser, then from("tickets").single()
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deve retornar 403 para usuario nao autorizado', async () => {
    const { default: handler } = await import('@api/tickets/[id]/messages.js');
    const req = mockReq();
    const res = mockRes();

    // Order: ticket lookup, then user profile lookup
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'open', agent_id: 'agent-2', user_id: 'other-user' }, error: null })
      .mockResolvedValueOnce({ data: { role: 'user', full_name: 'Cliente' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve retornar 403 ao enviar mensagem em ticket fechado (nao-admin)', async () => {
    const { default: handler } = await import('@api/tickets/[id]/messages.js');
    const req = mockReq();
    const res = mockRes();

    // Order: ticket lookup, then user profile lookup
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'closed', agent_id: 'user-1', user_id: 'user-1' }, error: null })
      .mockResolvedValueOnce({ data: { role: 'agent', full_name: 'Tecnico' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve retornar 201 ao enviar mensagem como agente', async () => {
    const { default: handler } = await import('@api/tickets/[id]/messages.js');
    const req = mockReq({ body: { body: 'Mensagem do agente', type: 'message', is_internal: false } });
    const res = mockRes();

    // Order: ticket, user profile, insert message
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'open', agent_id: 'user-1', user_id: 'client-1' }, error: null })
      .mockResolvedValueOnce({ data: { role: 'agent', full_name: 'Tecnico' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'msg-1' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('deve criar nota interna corretamente', async () => {
    const { default: handler } = await import('@api/tickets/[id]/messages.js');
    const req = mockReq({ body: { body: 'Nota interna do tecnico', type: 'note', is_internal: true } });
    const res = mockRes();

    // Order: ticket, user profile, insert message
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'in_progress', agent_id: 'user-1', user_id: 'client-1' }, error: null })
      .mockResolvedValueOnce({ data: { role: 'agent', full_name: 'Tecnico' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'msg-1' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});