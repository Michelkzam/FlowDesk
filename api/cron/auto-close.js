import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("[Cron] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  // Also allow GET for Vercel cron (which sends a secret in search params)
  const urlSecret = req.query.secret;
  if (CRON_SECRET && urlSecret !== CRON_SECRET) {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  const INACTIVITY_HOURS = 120; // 5 dias
  const cutoffDate = new Date(Date.now() - INACTIVITY_HOURS * 60 * 60 * 1000);

  try {
    // Buscar tickets inativos
    const { data: inactiveTickets, error: fetchError } = await supabase
      .from("tickets")
      .select("id, number, title, agent_name, last_user_response_date")
      .in("status", ["waiting", "in_progress"])
      .not("last_user_response_date", "is", null)
      .lt("last_user_response_date", cutoffDate.toISOString());

    if (fetchError) {
      console.error("[Cron] Error fetching tickets:", fetchError);
      return res.status(500).json({ success: false, message: "Error fetching tickets" });
    }

    const closedTickets = [];

    for (const ticket of inactiveTickets || []) {
      // Atualizar status para closed
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          status: "closed",
          closed_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      if (updateError) {
        console.error(`[Cron] Error closing ticket ${ticket.id}:`, updateError);
        continue;
      }

      // Criar mensagem de sistema
      const lastInteraction = ticket.last_user_response_date
        ? new Date(ticket.last_user_response_date).toLocaleString("pt-BR")
        : "desconhecida";

      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        body: `[Sistema] Ticket encerrado automaticamente por inatividade do usuário. Última interação: ${lastInteraction}. Prazo de inatividade: ${INACTIVITY_HOURS} horas (5 dias).`,
        sender_type: "system",
        sender_name: "Sistema (Cron Job)",
        type: "system",
        is_internal: false,
        created_at: new Date().toISOString(),
      });

      closedTickets.push(ticket.id);
    }

    console.log(`[Cron] ${closedTickets.length} tickets encerrados por inatividade`);

    return res.status(200).json({
      success: true,
      closed_count: closedTickets.length,
      closed_tickets: closedTickets,
      message: `${closedTickets.length} ticket(s) encerrado(s) automaticamente`,
    });
  } catch (error) {
    console.error("[Cron] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao processar tickets inativos",
    });
  }
}
