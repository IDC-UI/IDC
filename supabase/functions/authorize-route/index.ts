import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { gate, reply, withinRateLimit } from "../_shared/http.ts";

const ROUTE_RE = /^[a-z0-9_-]{3,24}$/;

Deno.serve(async (request: Request) => {
  const stop = gate(request);
  if (stop) return stop;

  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return reply(request, 401, { error: "Authentication required" });

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!projectUrl || !publishableKey) return reply(request, 503, { error: "Authorization service is not configured" });

  const client = createClient(projectUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userResult, error: authError } = await client.auth.getUser(match[1]);
  if (authError || !userResult.user) return reply(request, 401, { error: "Invalid session" });

  // Rate limit route lookups/claims to prevent route ID enumeration
  const limit = await withinRateLimit(client, "route-auth", 30, 60);
  if (limit === "limited") return reply(request, 429, { error: "Too many route requests. Try again shortly." });
  if (limit === "error") return reply(request, 503, { error: "Authorization service is not ready" });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return reply(request, 400, { error: "Invalid JSON body" });
  }

  const action = String(body.action || "resolve");
  const routeId = String(body.route_id || "").trim().toLowerCase();
  if (!ROUTE_RE.test(routeId)) {
    return reply(request, 400, { error: "Invalid route_id format" });
  }

  if (action === "claim") {
    const publicEm = (body.public_em && typeof body.public_em === "object" && !Array.isArray(body.public_em)) ? body.public_em : {};
    const cardGate = (body.card_gate && typeof body.card_gate === "object" && !Array.isArray(body.card_gate)) ? body.card_gate : {};
    const { error: upsertError } = await client.from("idc_user_routes").upsert({
      route_id: routeId,
      user_id: userResult.user.id,
      public_em: publicEm,
      card_gate: cardGate,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (upsertError) {
      return reply(request, 403, { authorized: false, status: 403, error: "Route ID is already claimed by another user" });
    }
    return reply(request, 200, { authorized: true, status: 200, role: "owner", route_id: routeId });
  }

  // Default action: "resolve" — anti-IDOR ownership verification
  const { data: resolved, error: rpcError } = await client.rpc("idc_resolve_route", { p_route_id: routeId });
  if (rpcError || !resolved) {
    return reply(request, 403, { authorized: false, status: 403, role: "visitor_idor_blocked", route_id: routeId });
  }

  if (resolved.is_owner === true) {
    return reply(request, 200, {
      authorized: true,
      status: 200,
      role: "owner",
      route_id: routeId,
    });
  }

  // Caller is authenticated as a DIFFERENT user and attempted to access /IDC/<routeId> (IDOR attempt)
  return reply(request, 403, {
    authorized: false,
    status: 403,
    role: "visitor_idor_blocked",
    route_id: routeId,
    exists: Boolean(resolved.exists),
    public_em: resolved.public_em || {},
    card_gate: resolved.card_gate || {},
    error: "Access denied: you do not own this route.",
  });
});
