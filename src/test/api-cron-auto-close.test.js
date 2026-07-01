import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockIn = vi.fn().mockReturnThis();
const mockNot = vi.fn().mockReturnThis();
const mockLt = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdateChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
const mockUpdate = vi.fn().mockReturnValue(mockUpdateChain);

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

const mockReq = (overrides = {}) => ({
  method: 'GET',
  headers: { authorization: 'Bearer cron-secret' },
  query: {},
  ...overrides,
});

const mockRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
};

describe('API /api/cron/auto-close', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: mockSelect,
      in: mockIn,
      not: mockNot,
      lt: mockLt,
      insert: mockInsert,
      update: mockUpdate,
    });
    mockSelect.mockReturnThis();
    mockIn.mockReturnThis();
    mockNot.mockReturnThis();
    mockLt.mockReturnThis();
    mockUpdateChain.eq.mockResolvedValue({ error: null });
  });

  it('deve retornar 200 quando nao ha tickets inativos', async () => {
    const { default: handler } = await import('@api/cron/auto-close.js');
    const req = mockReq();
    const res = mockRes();

    mockLt.mockResolvedValueOnce({ data: [], error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ closed_count: 0 }));
  });

  it('deve fechar tickets inativos', async () => {
    const { default: handler } = await import('@api/cron/auto-close.js');
    const req = mockReq();
    const res = mockRes();

    mockLt.mockResolvedValueOnce({
      data: [
        { id: 'ticket-1', number: 'TK-001', title: 'Teste 1', agent_name: 'Agente', last_user_response_date: '2025-01-01T00:00:00Z' },
        { id: 'ticket-2', number: 'TK-002', title: 'Teste 2', agent_name: 'Agente', last_user_response_date: '2025-01-01T00:00:00Z' },
      ],
      error: null,
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ closed_count: 2 }));
  });

  it('deve ignorar tickets com erro ao atualizar', async () => {
    const { default: handler } = await import('@api/cron/auto-close.js');
    const req = mockReq();
    const res = mockRes();

    mockLt.mockResolvedValueOnce({
      data: [
        { id: 'ticket-1', number: 'TK-001', title: 'Teste', agent_name: 'Agente', last_user_response_date: '2025-01-01T00:00:00Z' },
      ],
      error: null,
    });
    mockUpdateChain.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ closed_count: 0 }));
  });

  it('deve retornar 500 quando ha erro ao buscar tickets', async () => {
    const { default: handler } = await import('@api/cron/auto-close.js');
    const req = mockReq();
    const res = mockRes();

    mockLt.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});