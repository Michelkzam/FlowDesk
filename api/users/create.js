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

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") {
    return res.status(403).json({ error: "Only admins can create users" });
  }

  const { email, password, full_name, role, phone, department_id, client_id } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: "Email, password and full_name are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: role || "user" }
    });

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    const userId = newUser.user?.id;
    if (!userId) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    const { error: insertError } = await supabaseAdmin.from("users").upsert({
      id: userId,
      email,
      password_hash: "supabase_auth",
      full_name,
      role: role || "user",
      phone: phone || null,
      department_id: department_id || null,
      client_id: client_id || null,
      status: "active"
    });

    if (insertError) {
      console.error("[API] Error inserting user profile:", insertError);
    }

    return res.status(201).json({ user: newUser.user });
  } catch (error) {
    console.error("[API] Error creating user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
