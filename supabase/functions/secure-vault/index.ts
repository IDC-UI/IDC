import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function readLimitedJson(request: Request) {
  if (!request.body) throw new Error("invalid-json");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("body-too-large");
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return reply(405, { error: "Method not allowed" });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return reply(413, { error: "Vault payload is too large" });

  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return reply(401, { error: "Authentication required" });

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!projectUrl || !publishableKey) return reply(503, { error: "Vault service is not configured" });

  const client = createClient(projectUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userResult, error: authError } = await client.auth.getUser(match[1]);
  if (authError || !userResult.user) return reply(401, { error: "Invalid session" });

  let payload: unknown;
  try {
    payload = await readLimitedJson(request);
  } catch (error) {
    if (error instanceof Error && error.message === "body-too-large") {
      return reply(413, { error: "Vault payload is too large" });
    }
    return reply(400, { error: "Expected a JSON body" });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return reply(400, { error: "Invalid encrypted vault payload" });
  }

  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== 2 || keys[0] !== "ciphertext" || keys[1] !== "salt") {
    return reply(400, { error: "Only salt and ciphertext are accepted" });
  }
  if (typeof record.salt !== "string" || !/^[A-Za-z0-9_-]{22}$/.test(record.salt)) {
    return reply(400, { error: "Invalid vault salt" });
  }
  if (typeof record.ciphertext !== "string" || record.ciphertext.length < 40 ||
    record.ciphertext.length > 8_000_000 || !/^[A-Za-z0-9_-]+$/.test(record.ciphertext)) {
    return reply(400, { error: "Invalid encrypted vault data" });
  }

  const { error: saveError } = await client.from("idc_vaults").upsert({
    user_id: userResult.user.id,
    salt: record.salt,
    ciphertext: record.ciphertext,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (saveError) return reply(400, { error: "Encrypted vault could not be saved" });

  return reply(200, { saved: true });
});
