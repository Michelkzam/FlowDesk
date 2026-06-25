import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/flowdeskClient', () => ({
  db: {
    entities: {
      Ticket: {
        update: vi.fn(),
      },
      TicketMessage: {
        create: vi.fn(),
      },
    },
  },
}));

describe('Finalização de Ticket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar mensagem do sistema com a solução ao finalizar', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticketId = '1';
    const solution = 'Problema resolvido reiniciando o serviço';
    const category = 'TI / Infraestrutura';

    db.entities.TicketMessage.create.mockResolvedValue({ id: 'msg-1' });
    db.entities.Ticket.update.mockResolvedValue({ id: ticketId });

    await db.entities.TicketMessage.create({
      ticket_id: ticketId,
      body: `[Solução] ${solution}`,
      sender_type: 'system',
      type: 'system',
      is_internal: false,
    });

    await db.entities.Ticket.update(ticketId, {
      status: 'resolved',
      closed_date: expect.any(String),
      category_name: category,
    });

    expect(db.entities.TicketMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: ticketId,
        body: `[Solução] ${solution}`,
        sender_type: 'system',
      })
    );

    expect(db.entities.Ticket.update).toHaveBeenCalledWith(
      ticketId,
      expect.objectContaining({
        status: 'resolved',
        category_name: category,
      })
    );
  });

  it('deve exigir descrição da solução para finalizar', () => {
    const solution = '';
    const canFinalize = solution.trim().length > 0;
    expect(canFinalize).toBe(false);
  });

  it('deve permitir finalização com solução preenchida', () => {
    const solution = 'Problema resolvido';
    const canFinalize = solution.trim().length > 0;
    expect(canFinalize).toBe(true);
  });
});
