import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { emitToAll } from '../services/websocket.js';

const INACTIVITY_HOURS = 120; // 5 dias

export function startAutoCloseCron() {
  // Executa todo dia às 02:00
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Iniciando verificação de tickets inativos...');

    try {
      const cutoff = new Date(Date.now() - INACTIVITY_HOURS * 60 * 60 * 1000);

      const inactiveTickets = await db('tickets')
        .whereIn('status', ['waiting', 'in_progress'])
        .whereNotNull('last_user_response_date')
        .where('last_user_response_date', '<', cutoff)
        .select('id', 'number', 'title', 'agent_name', 'last_user_response_date');

      let closedCount = 0;

      for (const ticket of inactiveTickets) {
        await db.transaction(async (trx) => {
          await trx('tickets').where({ id: ticket.id }).update({
            status: 'closed',
            closed_date: new Date(),
            updated_at: new Date()
          });

          await trx('ticket_messages').insert({
            id: uuidv4(),
            ticket_id: ticket.id,
            sender_type: 'system',
            sender_name: 'Sistema (Cron Job)',
            body: `[Sistema] Ticket encerrado automaticamente por inatividade do usuário. Última interação: ${ticket.last_user_response_date ? new Date(ticket.last_user_response_date).toLocaleString('pt-BR') : 'desconhecida'}. Prazo de inatividade: ${INACTIVITY_HOURS} horas (5 dias).`,
            type: 'system',
            is_internal: false,
            created_at: new Date()
          });

          closedCount++;
        });

        emitToAll('ticket:auto-closed', { ticketId: ticket.id, number: ticket.number });
      }

      console.log(`[Cron] ${closedCount} ticket(s) encerrado(s) por inatividade`);
    } catch (error) {
      console.error('[Cron] Erro ao encerrar tickets inativos:', error);
    }
  });

  console.log('[Cron] Auto-close inactive tickets agendado (diário às 02:00)');
}
