/**
 * POST /api/tickets/:id/claim
 * 
 * Endpoint transacional para posse exclusiva de tickets.
 * Usa SELECT FOR UPDATE para evitar condition race entre dois técnicos.
 * 
 * Request body:
 * - agent_id: ID do técnico que está assumindo
 * - agent_name: Nome do técnico
 * 
 * Response:
 * - success: true/false
 * - ticket: Dados atualizados do ticket
 * - message: Mensagem de sucesso ou erro
 */

export async function claimTicketHandler(req, res) {
  const { id } = req.params;
  const agent_id = req.user.id;
  const agent_name = req.user.full_name || req.user.email;

  const db = req.db;

  try {
    // Iniciar transação
    const result = await db.transaction(async (trx) => {
      // SELECT FOR UPDATE - bloqueia a linha para其他 transações
      const [ticket] = await trx("tickets")
        .where({ id })
        .for("update");

      if (!ticket) {
        throw new Error("Ticket não encontrado");
      }

      // Verificar se o ticket já foi assumido por outro técnico
      if (ticket.agent_id && ticket.agent_id !== agent_id) {
        return {
          success: false,
          ticket,
          message: `Este ticket já foi assumido por ${ticket.agent_name || "outro técnico"}`,
        };
      }

      // Atualizar o ticket
      const [updatedTicket] = await trx("tickets")
        .where({ id })
        .update({
          agent_id,
          agent_name,
          status: ticket.status === "open" ? "in_progress" : ticket.status,
          updated_at: new Date(),
        })
        .returning("*");

      return {
        success: true,
        ticket: updatedTicket,
        message: "Ticket assumido com sucesso",
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("Erro ao assumir ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao assumir ticket",
    });
  }
}
