/**
 * POST /api/tickets/:id/transfer
 * 
 * Endpoint para transferência de tickets com nota interna obrigatória.
 * Cria automaticamente uma nota interna de histórico.
 * 
 * Request body:
 * - from_agent_id: ID do técnico atual
 * - from_agent_name: Nome do técnico atual
 * - to_agent_id: ID do novo técnico
 * - to_agent_name: Nome do novo técnico
 * - note: Justificativa da transferência (obrigatória)
 * 
 * Response:
 * - success: true/false
 * - ticket: Dados atualizados do ticket
 * - message: Mensagem de sucesso ou erro
 */

export async function transferTicketHandler(req, res) {
  const { id } = req.params;
  const { from_agent_id, from_agent_name, to_agent_id, to_agent_name, note } = req.body;

  if (!to_agent_id || !to_agent_name) {
    return res.status(400).json({
      success: false,
      message: "to_agent_id e to_agent_name são obrigatórios",
    });
  }

  if (!note || note.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "A justificativa da transferência é obrigatória",
    });
  }

  if (from_agent_id === to_agent_id) {
    return res.status(400).json({
      success: false,
      message: "Não é possível transferir para o mesmo técnico",
    });
  }

  const db = req.db;

  try {
    const result = await db.transaction(async (trx) => {
      // Verificar se o ticket existe
      const [ticket] = await trx("tickets").where({ id });

      if (!ticket) {
        throw new Error("Ticket não encontrado");
      }

      // Verificar se o técnico atual tem permissão para transferir
      if (ticket.agent_id && ticket.agent_id !== from_agent_id) {
        return {
          success: false,
          ticket,
          message: "Apenas o técnico responsável pode transferir o ticket",
        };
      }

      // Criar nota interna de transferência
      await trx("ticket_messages").insert({
        ticket_id: id,
        body: `[Transferência] Ticket transferido de ${from_agent_name || "N/A"} para ${to_agent_name}.\n\nMotivo: ${note}`,
        sender_type: "system",
        sender_id: from_agent_id,
        sender_name: from_agent_name || "Sistema",
        type: "system",
        is_internal: true,
        created_at: new Date(),
      });

      // Atualizar o ticket
      const [updatedTicket] = await trx("tickets")
        .where({ id })
        .update({
          agent_id: to_agent_id,
          agent_name: to_agent_name,
          updated_at: new Date(),
        })
        .returning("*");

      return {
        success: true,
        ticket: updatedTicket,
        message: `Ticket transferido para ${to_agent_name} com sucesso`,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("Erro ao transferir ticket:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao transferir ticket",
    });
  }
}
