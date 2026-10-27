import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_FILE_BYTES = 5 * 1024 * 1024 + 33;
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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") return reply(405, { error: "Method not allowed" });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_BYTES + 64 * 1024) {
    return reply(413, { error: "File is too large" });
  }

  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return reply(401, { error: "Authentication required" });

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!projectUrl || !publishableKey) {
    return reply(503, { error: "Upload service is not configured" });
  }

  const client = createClient(projectUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userResult, error: authError } = await client.auth.getUser(match[1]);
  if (authError || !userResult.user) return reply(401, { error: "Invalid session" });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { error: "Expected multipart form data" });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return reply(400, { error: "A file is required" });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.enc$/i.test(file.name)) {
    return reply(400, { error: "Invalid encrypted file name" });
  }
  if (file.type !== "application/octet-stream") {
    return reply(415, { error: "Encrypted files must use application/octet-stream" });
  }
  if (file.size < 33 || file.size > MAX_FILE_BYTES) {
    return reply(413, { error: "Encrypted file size is outside the allowed range" });
  }

  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (header[0] !== 73 || header[1] !== 68 || header[2] !== 67 || header[3] !== 70 || header[4] !== 1) {
    return reply(400, { error: "Invalid encrypted file envelope" });
  }

  const path = `${userResult.user.id}/${file.name}`;
  const { error: uploadError } = await client.storage
    .from("idc-vault")
    .upload(path, file, {
      contentType: "application/octet-stream",
      upsert: false,
    });
  if (uploadError) return reply(400, { error: "File could not be stored" });

  return reply(201, { path });
});
