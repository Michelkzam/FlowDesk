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
  const { body, type = "message", is_internal = false, attachments } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Ticket ID is required" });
  }

  if (!body || !body.trim()) {
    return res.status(400).json({ error: "Message body is required" });
  }

  try {
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select("id, status, agent_id, user_id")
      .eq("id", id)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const { data: userProfile } = await supabaseAdmin
      .from("users")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const isAgent = userProfile?.role === "admin" || userProfile?.role === "agent";
    const isOwner = ticket.user_id === user.id;

    if (!isAgent && !isOwner) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (ticket.status === "closed" && userProfile?.role !== "admin") {
      return res.status(403).json({ error: "Cannot send messages to closed tickets" });
    }

    const senderType = isAgent ? "agent" : "user";
    const senderName = userProfile?.full_name || user.email;

    const { data: message, error: insertError } = await supabaseAdmin
      .from("ticket_messages")
      .insert({
        ticket_id: id,
        body: body.trim(),
        sender_type: senderType,
        sender_id: user.id,
        sender_name: senderName,
        type,
        is_internal,
        attachments: attachments || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[API] Error inserting message:", insertError);
      return res.status(500).json({ error: "Failed to send message" });
    }

    const now = new Date().toISOString();
    const updateFields = { updated_at: now };

    if (senderType === "user") {
      updateFields.last_user_response_date = now;
    } else {
      updateFields.last_response_date = now;
    }

    if (ticket.status === "open" && isAgent) {
      updateFields.status = "in_progress";
    }

    await supabaseAdmin
      .from("tickets")
      .update(updateFields)
      .eq("id", id);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      user_name: senderName,
      action: "message_sent",
      entity_type: "Ticket",
      entity_id: id,
      description: `Mensagem ${type === "note" ? "(nota interna)" : ""} enviada por ${senderName}`,
    });

    return res.status(201).json({ message });
  } catch (error) {
    console.error("[API] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
