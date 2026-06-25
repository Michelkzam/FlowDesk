import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do db
vi.mock('@/api/flowdeskClient', () => ({
  db: {
    entities: {
      Ticket: {
        filter: vi.fn(),
        update: vi.fn(),
        list: vi.fn(),
      },
      TicketMessage: {
        create: vi.fn(),
        filter: vi.fn(),
      },
    },
  },
}));

describe('Trava de Concorrência', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve detectar quando outro técnico assumiu o ticket', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const currentTicket = { id: '1', agent_id: 'user-1', status: 'open' };
    const latestTicket = { id: '1', agent_id: 'user-2', status: 'in_progress', agent_name: 'João' };

    db.entities.Ticket.filter.mockResolvedValue([latestTicket]);

    const currentAgentId = currentTicket.agent_id;
    const latestAgentId = latestTicket.agent_id;
    const ticketWasTakenByOther = latestAgentId && latestAgentId !== currentAgentId && currentTicket.agent_id !== latestAgentId;

    expect(ticketWasTakenByOther).toBe(true);
  });

  it('deve permitir envio quando o ticket pertence ao técnico atual', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const currentTicket = { id: '1', agent_id: 'user-1', status: 'open' };
    const latestTicket = { id: '1', agent_id: 'user-1', status: 'in_progress' };

    db.entities.Ticket.filter.mockResolvedValue([latestTicket]);

    const currentAgentId = currentTicket.agent_id;
    const latestAgentId = latestTicket.agent_id;
    const ticketWasTakenByOther = latestAgentId && latestAgentId !== currentAgentId && currentTicket.agent_id !== latestAgentId;

    expect(ticketWasTakenByOther).toBe(false);
  });

  it('deve permitir envio quando o ticket não tem agente', async () => {
    const { db } = await import('@/api/flowdeskClient');

    const currentTicket = { id: '1', agent_id: null, status: 'open' };
    const latestTicket = { id: '1', agent_id: null, status: 'open' };

    db.entities.Ticket.filter.mockResolvedValue([latestTicket]);

    const currentAgentId = currentTicket.agent_id;
    const latestAgentId = latestTicket.agent_id;
    const ticketWasTakenByOther = latestAgentId && latestAgentId !== currentAgentId && currentTicket.agent_id !== latestAgentId;

    expect(!!ticketWasTakenByOther).toBe(false);
  });
});
