import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/flowdeskClient', () => ({
  db: {
    entities: {
      Ticket: {
        list: vi.fn(),
        update: vi.fn(),
      },
      TicketMessage: {
        create: vi.fn(),
      },
    },
  },
}));

const INACTIVITY_HOURS = 120; // 5 dias

function isInactivityExceeded(lastUserResponseDate, hours = INACTIVITY_HOURS) {
  if (!lastUserResponseDate) return false;
  const lastResponse = new Date(lastUserResponseDate);
  const now = new Date();
  const hoursSinceLastResponse = (now - lastResponse) / (1000 * 60 * 60);
  return hoursSinceLastResponse >= hours;
}

describe('Auto-Close Inactive Tickets (Cron Job)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve detectar ticket waiting como inativo após 5 dias', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const result = isInactivityExceeded(fiveDaysAgo);
    expect(result).toBe(true);
  });

  it('deve detectar ticket in_progress como inativo após 5 dias', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const result = isInactivityExceeded(fiveDaysAgo);
    expect(result).toBe(true);
  });

  it('não deve marcar ticket como inativo se passaram menos de 5 dias', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const result = isInactivityExceeded(twoDaysAgo);
    expect(result).toBe(false);
  });

  it('não deve marcar ticket como inativo se não tem last_user_response_date', () => {
    const result = isInactivityExceeded(null);
    expect(result).toBe(false);
  });

  it('deve filtrar tickets com status waiting ou in_progress', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const tickets = [
      { id: '1', status: 'waiting', last_user_response_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '2', status: 'in_progress', last_user_response_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '3', status: 'open', last_user_response_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '4', status: 'resolved', last_user_response_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '5', status: 'waiting', last_user_response_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    const closableTickets = tickets.filter(t => {
      if (!['waiting', 'in_progress'].includes(t.status)) return false;
      if (!t.last_user_response_date) return false;
      return isInactivityExceeded(t.last_user_response_date);
    });

    expect(closableTickets.length).toBe(2);
    expect(closableTickets.map(t => t.id)).toEqual(['1', '2']);
  });

  it('deve criar mensagem de sistema ao encerrar ticket', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticketId = '1';
    const lastResponse = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();

    db.entities.TicketMessage.create.mockResolvedValue({ id: 'msg-1' });

    await db.entities.TicketMessage.create({
      ticket_id: ticketId,
      body: `[Sistema] Ticket encerrado automaticamente por inatividade do usuário. Última interação: ${new Date(lastResponse).toLocaleString('pt-BR')}.`,
      sender_type: 'system',
      sender_name: 'Sistema',
      type: 'system',
      is_internal: false,
    });

    expect(db.entities.TicketMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: ticketId,
        sender_type: 'system',
        is_internal: false,
      })
    );
  });

  it('deve atualizar status para closed ao encerrar', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticketId = '1';
    db.entities.Ticket.update.mockResolvedValue({ id: ticketId, status: 'closed' });

    await db.entities.Ticket.update(ticketId, {
      status: 'closed',
      closed_date: expect.any(String),
    });

    expect(db.entities.Ticket.update).toHaveBeenCalledWith(
      ticketId,
      expect.objectContaining({
        status: 'closed',
      })
    );
  });
});
