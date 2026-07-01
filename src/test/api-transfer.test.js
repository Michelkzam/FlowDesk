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
    to_agent_id: 'agent-2',
    to_agent_name: 'Joao',
    note: 'Ticket precisa de analise especializada de rede',
  },
  ...overrides,
});

const mockRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
};

describe('API /api/tickets/[id]/transfer', () => {
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
    const { default: handler } = await import('@api/tickets/[id]/transfer.js');
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('deve rejeitar requisicoes sem token', async () => {
    const { default: handler } = await import('@api/tickets/[id]/transfer.js');
    const req = mockReq({ headers: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve rejeitar sem to_agent_id', async () => {
    const { default: handler } = await import('@api/tickets/[id]/transfer.js');
    const req = mockReq({ body: { note: 'Motivo da transferencia' } });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve rejeitar sem nota de transferencia', async () => {
    const { default: handler } = await import('@api/tickets/[id]/transfer.js');
    const req = mockReq({ body: { to_agent_id: 'agent-2' } });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve retornar 403 para usuario nao-agente', async () => {
    const { default: handler } = await import('@api/tickets/[id]/transfer.js');
    const req = mockReq();
    const res = mockRes();

    // transfer.js order: user profile first, then ticket
    mockSingle.mockResolvedValueOnce({ data: { role: 'user', full_name: 'Cliente' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve retornar 404 quando ticket nao existe', async () => {
    const { default: handler } = await import('@api/tickets/[id]/transfer.js');
    const req = mockReq();
    const res = mockRes();

    // transfer.js order: user profile, then ticket
    mockSingle
      .mockResolvedValueOnce({ data: { role: 'agent', full_name: 'Tecnico' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deve retornar 403 ao transferir ticket fechado', async () => {
    const { default: handler } = await import('@api/tickets/[id]/transfer.js');
    const req = mockReq();
    const res = mockRes();

    // transfer.js order: user profile, then ticket
    mockSingle
      .mockResolvedValueOnce({ data: { role: 'agent', full_name: 'Tecnico' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'closed', agent_id: 'user-1', agent_name: 'Tecnico', number: 'TK-001', title: 'Teste' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve retornar 400 ao transferir para mesmo agente', async () => {
    const { default: handler } = await import('@api/tickets/[id]/transfer.js');
    const req = mockReq({ body: { to_agent_id: 'user-1', note: 'Motivo' } });
    const res = mockRes();

    // transfer.js order: user profile, then ticket
    mockSingle
      .mockResolvedValueOnce({ data: { role: 'agent', full_name: 'Tecnico' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'open', agent_id: 'user-1', agent_name: 'Tecnico', number: 'TK-001', title: 'Teste' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve retornar 200 ao transferir com sucesso', async () => {
    const { default: handler } = await import('@api/tickets/[id]/transfer.js');
    const req = mockReq();
    const res = mockRes();

    // transfer.js order: user profile, ticket, target agent
    mockSingle
      .mockResolvedValueOnce({ data: { role: 'agent', full_name: 'Tecnico' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'open', agent_id: 'agent-old', agent_name: 'Antigo', number: 'TK-001', title: 'Teste' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'agent-2', full_name: 'Joao', status: 'active' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});