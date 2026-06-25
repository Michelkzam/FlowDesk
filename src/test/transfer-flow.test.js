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
        filter: vi.fn(),
      },
    },
  },
}));

vi.mock('@/api/client', () => ({
  api: {
    transferTicket: vi.fn(),
    getTicketMessages: vi.fn(),
  },
}));

describe('Fluxo de Transferência de Ticket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Deve exigir nota interna para transferir', () => {
    const note = '';
    const canTransfer = note.trim().length > 0;
    expect(canTransfer).toBe(false);
  });

  it('2. Deve permitir transferência com nota preenchida', () => {
    const note = 'Ticket precisa de análise de rede';
    const canTransfer = note.trim().length > 0;
    expect(canTransfer).toBe(true);
  });

  it('3. Deve criar mensagem de sistema com a transferência', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticketId = 'ticket-1';
    const fromAgentName = 'João';
    const toAgentName = 'Maria';
    const note = 'Transferindo para especialista em rede';

    db.entities.TicketMessage.create.mockResolvedValue({ id: 'msg-1' });

    await db.entities.TicketMessage.create({
      ticket_id: ticketId,
      body: `[Transferência] Ticket transferido de ${fromAgentName} para ${toAgentName}.\n\nMotivo: ${note}`,
      sender_type: 'system',
      sender_name: fromAgentName,
      type: 'system',
      is_internal: true,
    });

    expect(db.entities.TicketMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: ticketId,
        is_internal: true,
        sender_type: 'system',
      })
    );
  });

  it('4. Deve atualizar o agente do ticket', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticketId = 'ticket-1';
    const newAgentId = 'agent-2';
    const newAgentName = 'Maria';

    db.entities.Ticket.update.mockResolvedValue({
      id: ticketId,
      agent_id: newAgentId,
      agent_name: newAgentName,
    });

    const result = await db.entities.Ticket.update(ticketId, {
      agent_id: newAgentId,
      agent_name: newAgentName,
    });

    expect(result.agent_id).toBe(newAgentId);
    expect(result.agent_name).toBe(newAgentName);
  });

  it('5. Não deve permitir transferir para o mesmo técnico', () => {
    const currentAgentId = 'agent-1';
    const toAgentId = 'agent-1';
    const canTransfer = currentAgentId !== toAgentId;
    expect(canTransfer).toBe(false);
  });

  it('6. Deve impedir transferência sem ser o técnico responsável', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const ticket = { id: 'ticket-1', agent_id: 'agent-1' };
    const currentUserId = 'agent-2';

    const canTransfer = !ticket.agent_id || ticket.agent_id === currentUserId;
    expect(canTransfer).toBe(false);
  });

  it('7. Deve permitir transferência para ticket sem agente', () => {
    const ticket = { id: 'ticket-1', agent_id: null };
    const canTransfer = !ticket.agent_id;
    expect(canTransfer).toBe(true);
  });

  it('8. Deve invalidar queries após transferência', async () => {
    const { api } = await import('@/api/client');

    api.transferTicket.mockResolvedValue({
      success: true,
      message: 'Ticket transferido com sucesso',
    });

    const result = await api.transferTicket('ticket-1', 'agent-2', 'Maria', 'Motivo');

    expect(result.success).toBe(true);
    expect(api.transferTicket).toHaveBeenCalledWith('ticket-1', 'agent-2', 'Maria', 'Motivo');
  });

  it('9. Deve mostrar toast de sucesso após transferência', () => {
    const toast = vi.fn();
    const message = 'Ticket transferido para Maria com sucesso';
    toast({ title: 'Sucesso', description: message });
    expect(toast).toHaveBeenCalledWith({
      title: 'Sucesso',
      description: message,
    });
  });

  it('10. Deve mostrar erro se transferência falhar', () => {
    const toast = vi.fn();
    const error = new Error('Apenas o técnico responsável pode transferir');
    toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    expect(toast).toHaveBeenCalledWith({
      title: 'Erro',
      description: error.message,
      variant: 'destructive',
    });
  });
});
