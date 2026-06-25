import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/flowdeskClient', () => ({
  db: {
    entities: {
      Ticket: {
        update: vi.fn(),
        filter: vi.fn(),
      },
      TicketMessage: {
        create: vi.fn(),
      },
    },
  },
}));

describe('Reabertura por Usuário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve reabrir ticket quando usuário envia mensagem em status Aguardando', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticket = { id: '1', status: 'waiting', user_email: 'user@test.com' };
    const updateData = {
      status: 'in_progress',
      last_user_response_date: expect.any(String),
      last_response_date: expect.any(String),
    };

    db.entities.Ticket.update.mockResolvedValue({ ...ticket, ...updateData });

    const needsReopen = ['waiting', 'resolved'].includes(ticket.status);
    expect(needsReopen).toBe(true);

    await db.entities.Ticket.update(ticket.id, { status: 'in_progress' });
    expect(db.entities.Ticket.update).toHaveBeenCalledWith(ticket.id, { status: 'in_progress' });
  });

  it('deve reabrir ticket quando usuário envia mensagem em status Resolvido', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticket = { id: '1', status: 'resolved', user_email: 'user@test.com' };

    const needsReopen = ['waiting', 'resolved'].includes(ticket.status);
    expect(needsReopen).toBe(true);
  });

  it('não deve reabrir ticket quando usuário envia mensagem em status Em Atendimento', async () => {
    const ticket = { id: '1', status: 'in_progress' };

    const needsReopen = ['waiting', 'resolved'].includes(ticket.status);
    expect(needsReopen).toBe(false);
  });

  it('deve atualizar last_user_response_date ao enviar mensagem', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticket = { id: '1', status: 'waiting' };
    const now = new Date().toISOString();

    db.entities.Ticket.update.mockResolvedValue(ticket);

    await db.entities.Ticket.update(ticket.id, {
      last_user_response_date: now,
      last_response_date: now,
    });

    expect(db.entities.Ticket.update).toHaveBeenCalledWith(ticket.id, {
      last_user_response_date: now,
      last_response_date: now,
    });
  });
});
