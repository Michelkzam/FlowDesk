import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[API] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
  const { to_agent_id, to_agent_name, note } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Ticket ID is required" });
  }

  if (!to_agent_id) {
    return res.status(400).json({ error: "Target agent ID is required" });
  }

  if (!note || !note.trim()) {
    return res.status(400).json({ error: "Transfer note is required" });
  }

  try {
    const { data: userProfile } = await supabaseAdmin
      .from("users")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const isAgent = userProfile?.role === "admin" || userProfile?.role === "agent";
    if (!isAgent) {
      return res.status(403).json({ error: "Only agents can transfer tickets" });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select("id, status, agent_id, agent_name, number, title")
      .eq("id", id)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.status === "closed") {
      return res.status(403).json({ error: "Cannot transfer closed tickets" });
    }

    if (ticket.agent_id === to_agent_id) {
      return res.status(400).json({ error: "Ticket is already assigned to this agent" });
    }

    const { data: targetAgent, error: agentError } = await supabaseAdmin
      .from("users")
      .select("id, full_name, status")
      .eq("id", to_agent_id)
      .single();

    if (agentError || !targetAgent) {
      return res.status(404).json({ error: "Target agent not found" });
    }

    if (targetAgent.status !== "active") {
      return res.status(400).json({ error: "Target agent is not active" });
    }

    const fromAgentName = ticket.agent_name || "Nenhum agente";
    const senderName = userProfile?.full_name || user.email;

    const { error: updateError } = await supabaseAdmin
      .from("tickets")
      .update({
        agent_id: to_agent_id,
        agent_name: to_agent_name || targetAgent.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("[API] Error transferring ticket:", updateError);
      return res.status(500).json({ error: "Failed to transfer ticket" });
    }

    await supabaseAdmin.from("ticket_messages").insert({
      ticket_id: id,
      body: `[Transferência] Ticket transferido de "${fromAgentName}" para "${to_agent_name || targetAgent.full_name}".\n\nMotivo: ${note.trim()}`,
      sender_type: "system",
      sender_id: user.id,
      sender_name: senderName,
      type: "system",
      is_internal: true,
    });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      user_name: senderName,
      action: "ticket_transferred",
      entity_type: "Ticket",
      entity_id: id,
      entity_label: ticket.title,
      old_value: fromAgentName,
      new_value: to_agent_name || targetAgent.full_name,
      description: `Ticket transferido de "${fromAgentName}" para "${to_agent_name || targetAgent.full_name}" por ${senderName}`,
    });

    return res.status(200).json({
      success: true,
      ticket: { id, agent_id: to_agent_id, agent_name: to_agent_name || targetAgent.full_name },
    });
  } catch (error) {
    console.error("[API] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
