import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockAdmin = { createUser: vi.fn(), updateUserById: vi.fn() };

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser, admin: mockAdmin },
    from: mockFrom,
  })),
}));

const mockReq = (overrides = {}) => ({
  method: 'POST',
  headers: { authorization: 'Bearer test-token' },
  body: {
    email: 'novo@usuario.com',
    password: 'senha123',
    full_name: 'Novo Usuario',
    role: 'agent',
  },
  ...overrides,
});

const mockRes = () => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
};

describe('API /api/users/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle, upsert: vi.fn().mockResolvedValue({ error: null }) });
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
  });

  it('deve rejeitar metodos diferentes de POST', async () => {
    const { default: handler } = await import('@api/users/create.js');
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('deve rejeitar requisicoes sem token', async () => {
    const { default: handler } = await import('@api/users/create.js');
    const req = mockReq({ headers: {} });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('deve retornar 403 para usuario nao-admin', async () => {
    const { default: handler } = await import('@api/users/create.js');
    const req = mockReq();
    const res = mockRes();

    mockSingle.mockResolvedValueOnce({ data: { role: 'agent' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('deve rejeitar campos obrigatorios ausentes', async () => {
    const { default: handler } = await import('@api/users/create.js');
    const req = mockReq({ body: { email: 'test@test.com' } });
    const res = mockRes();

    mockSingle.mockResolvedValueOnce({ data: { role: 'admin' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve rejeitar senha com menos de 6 caracteres', async () => {
    const { default: handler } = await import('@api/users/create.js');
    const req = mockReq({ body: { email: 'test@test.com', password: '123', full_name: 'Test' } });
    const res = mockRes();

    mockSingle.mockResolvedValueOnce({ data: { role: 'admin' }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deve retornar 201 ao criar usuario com sucesso', async () => {
    const { default: handler } = await import('@api/users/create.js');
    const req = mockReq();
    const res = mockRes();

    mockSingle.mockResolvedValueOnce({ data: { role: 'admin' }, error: null });
    mockAdmin.createUser.mockResolvedValueOnce({ data: { user: { id: 'new-user-1' } }, error: null });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ id: 'new-user-1' }) }));
  });
});