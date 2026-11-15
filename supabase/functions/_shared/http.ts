// Shared HTTP helpers for the IDC Edge Functions.
// ALLOWED_ORIGINS (Edge Function secret) = comma-separated list of exact site origins,
// e.g. "https://yourname.github.io". If it is empty the functions refuse browser requests (fail closed).

const BASE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function allowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
  if (origin && allowedOrigins().includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function reply(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, ...corsHeaders(request) },
  });
}

/** Returns a Response when the request must stop here (preflight / bad origin), otherwise null. */
export function gate(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (origin) {
    const list = allowedOrigins();
    if (list.length === 0) return reply(request, 503, { error: "Service is not configured" });
    if (!list.includes(origin)) return reply(request, 403, { error: "Origin not allowed" });
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...BASE_HEADERS, ...corsHeaders(request) } });
  if (request.method !== "POST") return reply(request, 405, { error: "Method not allowed" });
  return null;
}

// deno-lint-ignore no-explicit-any
export async function withinRateLimit(client: any, bucket: string, max: number, windowSeconds: number): Promise<"ok" | "limited" | "error"> {
  const { data, error } = await client.rpc("idc_rate_hit", {
    p_bucket: bucket,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) return "error";
  return data === true ? "ok" : "limited";
}
