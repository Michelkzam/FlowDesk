import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

const mockReq = (overrides = {}) => ({
  method: 'POST',
  headers: { authorization: 'Bearer test-token' },
  query: { id: 'ticket-123' },
  body: {
    status: 'resolved',
    solution: 'Problema resolvido reiniciando o servico de rede',
    category_name: 'TI / Infraestrutura',
  },
  ...overrides,
});

const mockRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
};

describe('API /api/tickets/[id]/close', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle, insert: mockInsert, update: mockUpdate });
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockRpc.mockResolvedValue({ data: true, error: null });
  });

  it('deve rejeitar metodos diferentes de POST', async () => {
    const { default: handler } = await import('@api/tickets/[id]/close.js');
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('deve rejeitar requisicoes sem token', async () => {
    const { default: handler } = await import('@api/tickets/[id]/close.js');
    const req = mockReq({ headers: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve rejeitar solution com menos de 15 caracteres', async () => {
    const { default: handler } = await import('@api/tickets/[id]/close.js');
    const req = mockReq({ body: { status: 'resolved', solution: 'Curta' } });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve rejeitar status invalido', async () => {
    const { default: handler } = await import('@api/tickets/[id]/close.js');
    const req = mockReq({ body: { status: 'invalid', solution: 'Solucao valida com mais de 15 caracteres' } });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve retornar 201 ao fechar com status resolved', async () => {
    const { default: handler } = await import('@api/tickets/[id]/close.js');
    const req = mockReq({ body: { status: 'resolved', solution: 'Solucao validada com sucesso pelo tecnico' } });
    const res = mockRes();

    mockSingle
      .mockResolvedValueOnce({ data: { id: 'user-1' }, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'open', title: 'Teste', number: 'TK-001' }, error: null })
      .mockResolvedValueOnce({ data: { full_name: 'Admin' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'msg-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'resolved' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('deve retornar 201 ao fechar com status closed', async () => {
    const { default: handler } = await import('@api/tickets/[id]/close.js');
    const req = mockReq({ body: { status: 'closed', solution: 'Ticket encerrado conforme politica da empresa' } });
    const res = mockRes();

    mockSingle
      .mockResolvedValueOnce({ data: { id: 'user-1' }, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'in_progress', title: 'Teste', number: 'TK-002' }, error: null })
      .mockResolvedValueOnce({ data: { full_name: 'Admin' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'msg-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'ticket-123', status: 'closed' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });
});