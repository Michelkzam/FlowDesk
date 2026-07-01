import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[API] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const MIN_SOLUTION_LENGTH = 15;
const VALID_CLOSE_STATUSES = ["resolved", "closed"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { id } = req.query;
  const { status, category_name, solution } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Ticket ID is required" });
  }

  if (!status || !VALID_CLOSE_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_CLOSE_STATUSES.join(", ")}` });
  }

  if (!solution || solution.trim().length < MIN_SOLUTION_LENGTH) {
    return res.status(400).json({ error: `Solution must be at least ${MIN_SOLUTION_LENGTH} characters` });
  }

  try {
    const { data: hasPermission } = await supabaseAdmin.rpc("usuario_tem_permissao", {
      p_usuario_id: user.id,
      p_permissao_chave: "tickets:close",
    });

    if (!hasPermission) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select("id, status, title, number")
      .eq("id", id)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.status === "closed") {
      return res.status(400).json({ error: "Ticket is already closed" });
    }

    const { data: userProfile } = await supabaseAdmin
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const senderName = userProfile?.full_name || user.email;
    const now = new Date().toISOString();

    const { error: messageError } = await supabaseAdmin
      .from("ticket_messages")
      .insert({
        ticket_id: id,
        body: `[Solução] ${solution.trim()}`,
        sender_type: "system",
        sender_id: user.id,
        sender_name: senderName,
        type: "system",
        is_internal: false,
      });

    if (messageError) {
      console.error("[API] Error inserting resolution message:", messageError);
      return res.status(500).json({ error: "Failed to create resolution message" });
    }

    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from("tickets")
      .update({
        status,
        closed_date: now,
        updated_at: now,
        category_name: category_name || undefined,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[API] Error closing ticket:", updateError);
      return res.status(500).json({ error: "Failed to close ticket" });
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      user_name: senderName,
      action: "ticket_closed",
      entity_type: "Ticket",
      entity_id: id,
      entity_label: ticket.title,
      old_value: ticket.status,
      new_value: status,
      description: `Ticket ${ticket.number} fechado com status "${status}" por ${senderName}`,
    });

    return res.status(201).json({
      success: true,
      ticket: { id: updatedTicket.id, status: updatedTicket.status, closed_date: updatedTicket.closed_date },
    });
  } catch (error) {
    console.error("[API] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}