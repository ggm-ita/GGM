// ===========================================================================
// Supabase Edge Function — invite-user
//
// The only way to create an account. Public sign-up is disabled and the client
// no longer exposes any registration API, so this function is the single,
// server-verified provisioning path: it re-checks that the caller is an
// administrator before it touches the service-role key.
//
// Deploy:  supabase functions deploy invite-user
// (see README "Create accounts (admin only)")
// ===========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ error: "Function is misconfigured." }, 500);
  }

  // 1. Identify the caller from the JWT the Supabase client sends along.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not authenticated." }, 401);

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
  if (callerError || !callerData?.user) return json({ error: "Not authenticated." }, 401);

  // 2. The service-role client is only ever built after the caller is known.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .maybeSingle();
  if (profileError) return json({ error: "Could not verify permissions." }, 500);
  if (callerProfile?.role !== "admin") {
    return json({ error: "Only administrators can create users." }, 403);
  }

  // 3. Validate the request, then invite.
  let payload: { email?: unknown; role?: unknown; redirectTo?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const email = String(payload?.email ?? "").trim().toLowerCase();
  const role = payload?.role === "admin" ? "admin" : "user";
  const redirectTo =
    typeof payload?.redirectTo === "string" && payload.redirectTo.startsWith("http")
      ? payload.redirectTo
      : undefined;

  if (!EMAIL_RE.test(email)) return json({ error: "A valid email address is required." }, 400);

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo,
  });
  if (inviteError) {
    const alreadyExists = /already|exists|registered/i.test(inviteError.message || "");
    return json(
      { error: alreadyExists ? "That email already has an account." : "The invitation could not be sent." },
      alreadyExists ? 409 : 400
    );
  }

  // The signup trigger seeds the profile with the default role; apply the requested one.
  await admin.from("profiles").update({ role }).eq("email", email);

  return json({ id: invited?.user?.id ?? null, email, role }, 200);
});
