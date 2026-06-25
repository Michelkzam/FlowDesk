/**
 * POST /api/cron/auto-close-inactive
 * 
 * Endpoint acionado por cron job para encerrar automaticamente
 * tickets inativos há mais de 5 dias.
 * 
 * Lógica:
 * - Tickets com status "waiting" ou "in_progress"
 * - Sem movimentação do usuário há mais de 120 horas (5 dias)
 * - Encerrados automaticamente com log de sistema
 * 
 * Response:
 * - success: true/false
 * - closed_count: Número de tickets encerrados
 * - closed_tickets: Lista dos IDs encerrados
 */

export async function autoCloseInactiveHandler(req, res) {
  const db = req.db;
  const INACTIVITY_HOURS = 120; // 5 dias

  try {
    // Calcular a data limite
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - INACTIVITY_HOURS);

    // Buscar tickets inativos
    const inactiveTickets = await db("tickets")
      .where(function () {
        this.where("status", "waiting").orWhere("status", "in_progress");
      })
      .whereNotNull("last_user_response_date")
      .where("last_user_response_date", "<", cutoffDate)
      .select("id", "number", "title", "agent_name", "last_user_response_date");

    const closedTickets = [];

    for (const ticket of inactiveTickets) {
      await db.transaction(async (trx) => {
        // Atualizar status para closed
        await trx("tickets")
          .where({ id: ticket.id })
          .update({
            status: "closed",
            closed_date: new Date(),
            updated_at: new Date(),
          });

        // Criar mensagem de sistema
        await trx("ticket_messages").insert({
          ticket_id: ticket.id,
          body: `[Sistema] Ticket encerrado automaticamente por inatividade do usuário. Última interação: ${ticket.last_user_response_date ? new Date(ticket.last_user_response_date).toLocaleString("pt-BR") : "desconhecida"}. Prazo de inatividade: ${INACTIVITY_HOURS} horas (5 dias).`,
          sender_type: "system",
          sender_name: "Sistema (Cron Job)",
          type: "system",
          is_internal: false,
          created_at: new Date(),
        });

        closedTickets.push(ticket.id);
      });
    }

    console.log(`[Cron] ${closedTickets.length} tickets encerrados por inatividade`);

    return res.json({
      success: true,
      closed_count: closedTickets.length,
      closed_tickets: closedTickets,
      message: `${closedTickets.length} ticket(s) encerrado(s) automaticamente`,
    });
  } catch (error) {
    console.error("[Cron] Erro ao encerrar tickets inativos:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao processar tickets inativos",
    });
  }
}
