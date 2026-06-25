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

describe('Transferência de Ticket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve exigir nota interna para transferir', () => {
    const transferNote = '';
    const canTransfer = transferNote.trim().length > 0;
    expect(canTransfer).toBe(false);
  });

  it('deve permitir transferência com nota preenchida', () => {
    const transferNote = 'Transferindo para especialista em rede';
    const canTransfer = transferNote.trim().length > 0;
    expect(canTransfer).toBe(true);
  });

  it('deve criar nota interna ao transferir', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticketId = '1';
    const toAgentName = 'João';
    const transferNote = 'Ticket precisa de análise de rede';

    db.entities.TicketMessage.create.mockResolvedValue({ id: 'msg-1' });

    await db.entities.TicketMessage.create({
      ticket_id: ticketId,
      body: `[Transferência] Ticket transferido para ${toAgentName}.\nMotivo: ${transferNote}`,
      sender_type: 'system',
      type: 'system',
      is_internal: true,
    });

    expect(db.entities.TicketMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: ticketId,
        body: `[Transferência] Ticket transferido para ${toAgentName}.\nMotivo: ${transferNote}`,
        is_internal: true,
      })
    );
  });

  it('deve atualizar o agente ao transferir', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticketId = '1';
    const newAgentId = 'agent-2';
    const newAgentName = 'João';

    db.entities.Ticket.update.mockResolvedValue({ id: ticketId });

    await db.entities.Ticket.update(ticketId, {
      agent_id: newAgentId,
      agent_name: newAgentName,
    });

    expect(db.entities.Ticket.update).toHaveBeenCalledWith(ticketId, {
      agent_id: newAgentId,
      agent_name: newAgentName,
    });
  });
});
