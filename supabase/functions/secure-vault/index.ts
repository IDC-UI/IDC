import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { gate, reply, withinRateLimit } from "../_shared/http.ts";

const MAX_BODY_BYTES = 8 * 1024 * 1024;

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
  const stop = gate(request);
  if (stop) return stop;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return reply(request, 413, { error: "Vault payload is too large" });

  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return reply(request, 401, { error: "Authentication required" });

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!projectUrl || !publishableKey) return reply(request, 503, { error: "Vault service is not configured" });

  const client = createClient(projectUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userResult, error: authError } = await client.auth.getUser(match[1]);
  if (authError || !userResult.user) return reply(request, 401, { error: "Invalid session" });

  // At most 30 vault saves per user per minute (enforced in Postgres, not in the browser).
  const limit = await withinRateLimit(client, "vault-save", 30, 60);
  if (limit === "limited") return reply(request, 429, { error: "Too many requests. Try again shortly." });
  if (limit === "error") return reply(request, 503, { error: "Vault service is not ready" });

  let payload: unknown;
  try {
    payload = await readLimitedJson(request);
  } catch (error) {
    if (error instanceof Error && error.message === "body-too-large") {
      return reply(request, 413, { error: "Vault payload is too large" });
    }
    return reply(request, 400, { error: "Expected a JSON body" });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return reply(request, 400, { error: "Invalid encrypted vault payload" });
  }

  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== 2 || keys[0] !== "ciphertext" || keys[1] !== "salt") {
    return reply(request, 400, { error: "Only salt and ciphertext are accepted" });
  }
  if (typeof record.salt !== "string" || !/^[A-Za-z0-9_-]{22}$/.test(record.salt)) {
    return reply(request, 400, { error: "Invalid vault salt" });
  }
  if (typeof record.ciphertext !== "string" || record.ciphertext.length < 40 ||
    record.ciphertext.length > 8_000_000 || !/^[A-Za-z0-9_-]+$/.test(record.ciphertext)) {
    return reply(request, 400, { error: "Invalid encrypted vault data" });
  }

  // The owner always comes from the verified JWT. The query builder sends bound parameters (PostgREST),
  // so no value is ever concatenated into SQL.
  const { error: saveError } = await client.from("idc_vaults").upsert({
    user_id: userResult.user.id,
    salt: record.salt,
    ciphertext: record.ciphertext,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (saveError) return reply(request, 400, { error: "Encrypted vault could not be saved" });

  return reply(request, 200, { saved: true });
});
