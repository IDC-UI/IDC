// Run with:  node --experimental-strip-types tests/security.test.mjs
// No network and no dependencies: static checks + behavioural tests that load the REAL idc-supabase.js
// (and the real IDCrypto from idc-plus.js) inside a sandbox with a mocked Supabase client.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log((ok ? "PASS  " : "FAIL  ") + name + (ok || !detail ? "" : "  -> " + detail));
}

/* ---------------------------------------------------------------- static checks */
const html = read("index.html");
const sw = read("sw.js");
const supa = read("idc-supabase.js");
const vaultFn = read("supabase/functions/secure-vault/index.ts");
const uploadFn = read("supabase/functions/secure-upload/index.ts");
const sharedHttp = read("supabase/functions/_shared/http.ts");
const sql = read("supabase/migrations/20261114000000_idc_hardening.sql");
const cfg = read("supabase/config.toml");

check("S1  HTTPS redirect script is the first script in <head>", /location\.protocol==="http:"[\s\S]*location\.replace\("https:"/.test(html) && html.indexOf("location.replace") < html.indexOf("<script src="));
check("S2  CSP meta present with object-src none, base-uri self, upgrade-insecure-requests", /Content-Security-Policy/.test(html) && /object-src 'none'/.test(html) && /base-uri 'self'/.test(html) && /upgrade-insecure-requests/.test(html));
check("S3  CSP connect-src is limited to own origin + the Supabase project", /connect-src 'self' https:\/\/[a-z0-9]+\.supabase\.co;/.test(html));
check("S4  every err message rendered into HTML goes through esc()", !/class="err">'\+err\+'/.test(html) && (html.match(/class="err">'\+esc\(err\)\+'/g) || []).length === 6);
check("S5  hard-coded demo OTP removed", !/482913/.test(html));
check("S6  no Math.random left for OTP / ids", !/Math\.random/.test(html));
check("S7  password hash is PBKDF2 (no unsalted SHA-256, no base64 fallback)", /PBKDF2/.test(html) && !/"nexa"\+p/.test(html) && !/btoa\(p\)/.test(html));
check("S8  legacy local login no longer auto-creates accounts", !/S\.accts=ac\.concat\(a\)\}\n/.test(html) && /الحساب غير موجود/.test(html));
check("S9  vault key is never written to localStorage (no 'k:' / 's:' session payload)", !/k:\s*base64Url\(keyBytes\)/.test(supa) && !/\bk: base64Url/.test(supa));
check("S10 no direct-table upsert fallback and no local_ account creation in auth code", !/from\("idc_vaults"\)\s*\.upsert/.test(supa.replace(/\s+/g, " ").replace('from("idc_vaults") .upsert', 'from("idc_vaults").upsert')) && !/id: "local_"/.test(supa));
check("S11 service worker never caches cross-origin / authenticated requests", /u\.origin!==self\.location\.origin/.test(sw) && /has\('authorization'\)/.test(sw));
check("S12 Edge Functions: JWT verified, rate limited, CORS allow-list (no wildcard)", [vaultFn, uploadFn].every((f) => /auth\.getUser/.test(f) && /withinRateLimit/.test(f)) && !/Allow-Origin["']?\s*:\s*["']\*/.test(sharedHttp + vaultFn + uploadFn));
check("S13 Edge Functions pin supabase-js to an exact version", [vaultFn, uploadFn].every((f) => /supabase-js@\d+\.\d+\.\d+"/.test(f)));
check("S14 SQL: RLS on, rate-limit fn is SECURITY DEFINER with empty search_path, no anon/PUBLIC grants", /enable row level security/.test(sql) && /security definer/.test(sql) && /set search_path = ''/.test(sql) && /revoke all on function public\.idc_rate_hit\(text, integer, integer\) from public, anon/.test(sql));
check("S15 SQL: parameterised only (no EXECUTE / dynamic SQL anywhere in migrations)", !/\bexecute\s+(format|'|\$)/i.test(sql + read("supabase/migrations/20261027000000_idc_vault.sql")));
check("S16 no raw SQL string building in frontend or functions", !/(select|insert|update|delete)\s+[\w*,\s]+\s+(from|into|set)\s+['"`]?\s*\+/i.test(html + supa + vaultFn + uploadFn));
check("S17 auth config: min password 12, confirmations on, signups rate limited, anon off", /minimum_password_length = 12/.test(cfg) && /enable_confirmations = true/.test(cfg) && /\[auth\.rate_limit\]/.test(cfg) && /enable_anonymous_sign_ins = false/.test(cfg));
check("S18 no admin routes / pages / debug flags exist", !/(admin(\.html|\/|panel|mode|dashboard)|isAdmin|role\s*[:=]\s*["']admin|debug\s*[:=]\s*true|console\.(log|debug))/i.test(html + supa + read("idc-plus.js") + read("idc-private.js") + read("idc-settings.js") + read("idc-intro.js") + vaultFn + uploadFn));
const secretHit = ["index.html", "idc-supabase.js", "idc-plus.js", "idc-private.js", "idc-settings.js", "supabase-config.js", "supabase/functions/secure-vault/index.ts", "supabase/functions/secure-upload/index.ts"]
  .some((f) => /service_role|sk_live|BEGIN (RSA|EC|PRIVATE)|[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(read(f)));
check("S19 no secret/service-role keys or JWTs in shipped files (only the public publishable key)", !secretHit);
const sqlOpt = fs.existsSync(path.join(ROOT, "supabase/migrations/20261122000000_idc_postgres_optimizations.sql"))
  ? read("supabase/migrations/20261122000000_idc_postgres_optimizations.sql")
  : "";
check("S20 Postgres best-practices migration adds indexes and initPlan-cached auth.uid()", /create index if not exists idx_idc_rate_limits_window/.test(sqlOpt) && /create index if not exists idx_idc_vaults_updated_at/.test(sqlOpt) && /\(select auth\.uid\(\)\)/.test(sqlOpt));
check("S21 client caches public emergency storage and parallelizes independent async work", /memEmergencyCache/.test(supa) && /Promise\.all/.test(supa));
const settingsSrc = read("idc-settings.js");
check("S22 Settings CSS enforces media-scoped light theme, focus-visible ring, and reduced-motion rule", /@media \(prefers-color-scheme:light\)/.test(settingsSrc) && /\.idc-st :focus-visible/.test(settingsSrc) && /@media \(prefers-reduced-motion:reduce\)/.test(settingsSrc));
const allUiSrc = html + supa + read("idc-plus.js") + read("idc-private.js") + settingsSrc + read("idc-intro.js");
const femRe = /ابدئي|سجّلي|سجلي|افتحي|اكتبي|أدخلي|ادخلي|تحققي|جرّبي|جربي|اختاري|أضيفي|ضيفي|(?:^|\s|")فعّلي|حاولي|تأكدي|اتأكدي|أكدي|أكديه|أنتِ|محتاجة|مش عارفة|كلمينا|لا تشاركيه|تقدري|تقدرين|حدديه|تحدديه|بتدخلي|تكمليه|أنشئي|اطلبي|تجاوزتي|استني|ارفعي|رتّبي|اجمعي|شاركي|صدّري|دوسي|قوليه|كلمي|شيلي|بلّغي|املي|كمّلي|تطلعي|تخرجي|تعدّلي|قلّلي|قرّبي|انسخي|حطي|سيبيه|تحسي\s|تدوسي|تحذفي|عايزاها|معاكي|بتعرفيها|صاحبة الكارت|بتفتحيه|تبلّغ عن|متأكدة؟|تحتاجيها/;
const femMatch = allUiSrc.match(femRe);
check("S23 All UI copy is gender-neutral (no feminine-only address across HTML/JS)", !femMatch, femMatch ? "Found: " + femMatch[0] : "");
const sqlRoutes = fs.existsSync(path.join(ROOT, "supabase/migrations/20261122010000_idc_user_routes.sql"))
  ? read("supabase/migrations/20261122010000_idc_user_routes.sql")
  : "";
check("S24 User routes table enforces RLS, (select auth.uid()) initPlan, and revokes direct anon/public SELECT", /create table if not exists public\.idc_user_routes/.test(sqlRoutes) && /enable row level security/.test(sqlRoutes) && /\(select auth\.uid\(\)\)/.test(sqlRoutes) && /revoke all on table public\.idc_user_routes from public, anon/.test(sqlRoutes));
const authRouteFn = fs.existsSync(path.join(ROOT, "supabase/functions/authorize-route/index.ts"))
  ? read("supabase/functions/authorize-route/index.ts")
  : "";
check("S25 authorize-route Edge Function middleware verifies JWT, enforces rate limiting, and blocks IDOR access", /supabase-js@2\.118\.0"/.test(authRouteFn) && /auth\.getUser/.test(authRouteFn) && /withinRateLimit/.test(authRouteFn) && /visitor_idor_blocked/.test(authRouteFn));
const router404 = fs.existsSync(path.join(ROOT, "404.html")) ? read("404.html") : "";
const plusSrc = read("idc-plus.js");
check("S26 Clean URL router (404.html + IDCAuthMiddleware) resolves /IDC/<id> and enforces anti-IDOR authorization", /idc_requested_route/.test(router404) && /IDCAuthMiddleware/.test(plusSrc + supa));
check("S27 First-time setup & NFC studio auto-generate personal URL + QR code and render step-by-step NFC programming guide", /دليل برمجة كارت الـ NFC خطوة بخطوة/.test(plusSrc + html) && /NFC Tools/.test(plusSrc + html));
check("S28 LinkedIn, custom user links, and Bank Accounts (IBAN / InstaPay) are supported across profile and vault", /linkedin/.test(html + plusSrc) && /bank:\s*"حساب بنكي"/.test(html + plusSrc) && /IBAN|InstaPay/.test(html + plusSrc + settingsSrc));

/* ---------------------------------------------------------------- Edge-function helper (real TS, Deno stubbed) */
globalThis.Deno = { env: { get: (k) => (k === "ALLOWED_ORIGINS" ? "https://app.example.github.io" : undefined) } };
const http = await import(pathToFileURL(path.join(ROOT, "supabase/functions/_shared/http.ts")).href);
const mkReq = (method, origin) => new Request("https://x.test/fn", { method, headers: origin ? { origin } : {} });
check("E1  allowed origin gets CORS header, no wildcard", (await http.reply(mkReq("POST", "https://app.example.github.io"), 200, {})).headers.get("access-control-allow-origin") === "https://app.example.github.io");
check("E2  foreign origin is rejected with 403", http.gate(mkReq("POST", "https://evil.example"))?.status === 403);
check("E3  non-POST rejected with 405", http.gate(mkReq("GET", "https://app.example.github.io"))?.status === 405);
check("E4  preflight returns 204", http.gate(mkReq("OPTIONS", "https://app.example.github.io"))?.status === 204);
globalThis.Deno.env.get = () => "";
check("E5  no ALLOWED_ORIGINS configured => browser requests fail closed (503)", http.gate(mkReq("POST", "https://app.example.github.io"))?.status === 503);
const fakeClient = (rows) => ({ rpc: async () => rows });
check("E6  rate limit: RPC false => limited", (await http.withinRateLimit(fakeClient({ data: false, error: null }), "b", 1, 1)) === "limited");
check("E7  rate limit: RPC error => fails closed", (await http.withinRateLimit(fakeClient({ data: null, error: {} }), "b", 1, 1)) === "error");

/* ---------------------------------------------------------------- behavioural harness for idc-supabase.js */
const plusLines = read("idc-plus.js").split("\n");
const cryptoSrc = plusLines.slice(10, 47).join("\n"); // real b64/ub64 + IDCrypto
const USER = { id: "11111111-2222-4333-8444-555555555555", email: "maria@example.com", user_metadata: { display_name: "Maria" } };
const GOOD_PW = "correct-horse-9battery";

function boot({ session = null, remoteRow = null, signIn, signUp, localStore = {}, invokeOk = true } = {}) {
  const store = new Map(Object.entries(localStore));
  const calls = { signIn: 0, signUp: 0, directUpsert: 0, invoke: 0, signOut: 0 };
  const handlers = [];
  const form = {};
  const app = { innerHTML: "" };
  const ctx = {
    console, TextEncoder, TextDecoder, Uint8Array, Promise, JSON, Math, Date, Object, Array, String, Number, Boolean, Error, RegExp, parseInt, URL,
    atob, btoa, setTimeout, clearTimeout, crypto: globalThis.crypto, navigator: { onLine: true },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => void store.set(k, String(v)), removeItem: (k) => void store.delete(k) },
    document: { getElementById: (id) => (id === "app" ? app : { value: form[id] ?? "", textContent: "" }), querySelector: () => null },
    location: { origin: "https://app.example.github.io", pathname: "/IDC/", hash: "" },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const mockClient = {
    auth: {
      signUp: async (a) => { calls.signUp++; return signUp ? signUp(a) : { data: { user: USER, session: null }, error: null }; },
      signInWithPassword: async (a) => { calls.signIn++; return signIn ? signIn(a) : { data: { user: USER }, error: null }; },
      signOut: async () => { calls.signOut++; return {}; },
      getSession: async () => ({ data: { session: { access_token: "t" } } }),
      getUser: async () => ({ data: { user: USER }, error: null }),
      onAuthStateChange: (cb) => { handlers.push(cb); if (session) setTimeout(() => cb("INITIAL_SESSION", session), 0); },
      resetPasswordForEmail: async () => ({ error: null }), updateUser: async () => ({ data: { user: USER }, error: null }), resend: async () => ({ error: null }),
    },
    functions: { invoke: async (name, { body }) => { calls.invoke++; if (!invokeOk) return { error: { message: "boom" } }; ctx.__saved = body; return { data: { saved: true }, error: null }; } },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: remoteRow, error: null }) }) }),
      upsert: async () => { calls.directUpsert++; return { error: null }; },
    }),
    storage: { from: () => ({ remove: async () => ({}), download: async () => ({ error: {} }) }) },
  };
  ctx.supabase = { createClient: () => mockClient };
  ctx.IDC_SUPABASE_CONFIG = { url: "https://abcdefghijklmnop.supabase.co", publishableKey: "sb_publishable_testkey123" };
  const toasts = [];
  Object.assign(ctx, {
    S: { screen: "auth", preview: 0, items: [], p: null, sec: {}, log: [] }, err: "", au: { m: "login", d: {} }, un: false, pk: false, land: true, pa: null, pg: null,
    esc: (x) => String(x == null ? "" : x).replace(/[&<>"']/g, "_"), mi: () => "", mk: () => ({}),
    v: (id) => String(form[id] ?? "").trim(), tst: (m) => toasts.push(m),
    R() { app.innerHTML = "screen:" + ctx.S.screen; }, go(o) { Object.assign(ctx.S, o); ctx.err = ""; ctx.R(); },
    sv() {}, pickAtt() {}, attRow() { return ""; }, vw() {}, dla() {}, del() {}, fdel() {}, A() {},
  });
  vm.runInContext("(function(){" + cryptoSrc + "\n})();", ctx);
  vm.runInContext(read("idc-supabase.js"), ctx);
  return { ctx, store, calls, form, app, toasts, handlers, dump: () => [...store.entries()].map(([k, v]) => k + "=" + v).join("\n") };
}
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

// T1: short password rejected before any network call
{
  const t = boot();
  Object.assign(t.form, { nm: "Maria", em: "maria@example.com", pw: "short1", pw2: "short1" });
  await t.ctx.doSu();
  check("T1  sign-up with a short password is rejected client-side (no API call)", t.calls.signUp === 0 && /12/.test(t.ctx.err));
  Object.assign(t.form, { pw: "abcdefghijklmn", pw2: "abcdefghijklmn" });
  await t.ctx.doSu();
  check("T1b password without digits rejected", t.calls.signUp === 0);
  Object.assign(t.form, { pw: "maria-2024-secure", pw2: "maria-2024-secure" });
  await t.ctx.doSu();
  check("T1c password containing the e-mail name rejected", t.calls.signUp === 0);
}

// T2: sign-up requiring e-mail confirmation never opens a vault or stores anything
{
  const t = boot();
  Object.assign(t.form, { nm: "Maria", em: "maria@example.com", pw: GOOD_PW, pw2: GOOD_PW });
  await t.ctx.doSu();
  check("T2  sign-up without confirmed e-mail opens no vault and writes no local vault/session", t.calls.signUp === 1 && !t.ctx.S.user && !/idc_local_vaults|idc_active_session/.test(t.dump()));
}

// T3: after a successful login the vault key is not in storage, and legacy leaked keys are wiped
let savedBody;
{
  const t = boot({ localStore: { idc_active_session_v2: JSON.stringify({ user: USER, k: "LEAKED_KEY_FROM_OLD_VERSION", s: "LEAKED_SALT" }) } });
  await tick();
  check("T3a legacy session containing the vault key is deleted on load", !/LEAKED_KEY/.test(t.dump()));
  Object.assign(t.form, { lg: "maria@example.com", lp: GOOD_PW });
  await t.ctx.doLogin();
  await tick();
  savedBody = t.ctx.__saved;
  const salt = t.ctx.__saved && t.ctx.__saved.salt;
  const keyB64 = salt ? Buffer.from(await t.ctx.IDCrypto.fromPass(GOOD_PW, Uint8Array.from(Buffer.from(salt.replace(/-/g, "+").replace(/_/g, "/") + "==", "base64")))).toString("base64url") : "NOSALT";
  check("T3b login succeeds and opens the home screen", t.ctx.S.screen === "home" && t.ctx.S.user === USER.id, t.ctx.S.screen);
  check("T3c derived vault key is NOT present anywhere in localStorage", keyB64 !== "NOSALT" && !t.dump().includes(keyB64) && !/idc_active_session_v2/.test(t.dump()));
  check("T3d only ciphertext+salt were sent to the Edge Function, never the key or plaintext", savedBody && Object.keys(savedBody).sort().join() === "ciphertext,salt" && !JSON.stringify(savedBody).includes("Maria"));
  await t.ctx.idcSignOut();
  check("T3e sign-out clears cached ciphertext and session", !/idc_local_vaults|idc_active_session/.test(t.dump()) && t.ctx.S.items.length === 0);
}

// T4: wrong credentials / Supabase failure must NOT fall back to a local vault
{
  const seed = boot();
  Object.assign(seed.form, { lg: "maria@example.com", lp: GOOD_PW });
  await seed.ctx.doLogin(); await tick();
  const local = seed.store.get("idc_local_vaults_v2");
  check("T4a (setup) a cached local vault exists on the device", Boolean(local));
  const t = boot({ localStore: { idc_local_vaults_v2: local }, signIn: () => ({ data: null, error: { message: "Invalid login credentials" } }) });
  Object.assign(t.form, { lg: "maria@example.com", lp: GOOD_PW });
  await t.ctx.doLogin();
  check("T4b with the server refusing the login, the cached local vault does NOT let anyone in", t.ctx.S.screen !== "home" && !t.ctx.S.user);
  const t2 = boot({ signIn: () => { throw new Error("network down"); } });
  Object.assign(t2.form, { lg: "maria@example.com", lp: GOOD_PW });
  await t2.ctx.doLogin();
  check("T4c network failure during login is handled (no crash, no entry)", t2.ctx.S.screen !== "home");
}

// T5: server save failure must not fall back to a direct table write
{
  const t = boot({ invokeOk: false });
  Object.assign(t.form, { lg: "maria@example.com", lp: GOOD_PW });
  await t.ctx.doLogin(); await tick();
  check("T5  when secure-vault fails there is no direct idc_vaults upsert fallback", t.calls.invoke >= 1 && t.calls.directUpsert === 0);
}

// T6: a tampered (but correctly encrypted) vault with a hostile attachment path / id is rejected
{
  const salt = Uint8Array.from(Buffer.alloc(16, 7));
  const ctx0 = boot().ctx;
  const key = await ctx0.IDCrypto.fromPass(GOOD_PW, salt);
  const saltStr = Buffer.from(salt).toString("base64url");
  const evil = { p: null, items: [{ id: "x", title: "t", value: "v", att: { path: "../other-user/secret.enc", t: "img", mime: "image/png" } }], pv: null };
  const evil2 = { p: null, items: [{ id: "a');alert(1);('", title: "t", value: "v" }], pv: null };
  for (const [label, vaultObj] of [["path traversal in attachment", evil], ["script-injection id", evil2]]) {
    const ct = await ctx0.IDCrypto.enc(vaultObj, key);
    const t = boot({ remoteRow: { salt: saltStr, ciphertext: ct } });
    Object.assign(t.form, { lg: "maria@example.com", lp: GOOD_PW });
    await t.ctx.doLogin(); await tick();
    check("T6  tampered vault rejected: " + label, t.ctx.S.screen !== "home" && t.ctx.S.items.length === 0, t.ctx.S.screen);
  }
}

// T7: login back-off after repeated failures
{
  const t = boot({ signIn: () => ({ data: null, error: { message: "Invalid login credentials" } }) });
  Object.assign(t.form, { lg: "maria@example.com", lp: "wrong-password-1" });
  for (let i = 0; i < 8; i++) await t.ctx.doLogin();
  check("T7  after 5 bad logins the client stops calling the API (back-off active)", t.calls.signIn === 5 && /جرّب بعد/.test(t.ctx.err), "signIn calls=" + t.calls.signIn);
}

// T8: reload with a live Supabase session lands on the lock screen, vault stays sealed
{
  const t = boot({ session: { user: USER } });
  await tick(60);
  check("T8  page reload with a stored Supabase session shows the lock screen (key not recoverable)", /المحفظة مقفولة/.test(t.app.innerHTML), t.app.innerHTML.slice(0, 60));
  t.handlers.forEach((cb) => cb("SIGNED_OUT", null));
  check("T8b sign-out in another tab wipes in-memory state", t.ctx.S.items.length === 0 && t.ctx.S.user === null && t.ctx.S.screen === "auth");
}

// T9: Anti-IDOR Authorization Middleware prevents URL ID tampering (/IDC/1111 -> /IDC/2222)
{
  const t = boot();
  Object.assign(t.form, { lg: "maria@example.com", lp: GOOD_PW });
  await t.ctx.doLogin();
  await tick();
  const hasMiddleware = Boolean(t.ctx.IDCAuthMiddleware && typeof t.ctx.IDCAuthMiddleware.authorizeRoute === "function");
  let ownRes = null, foreignRes = null;
  if (hasMiddleware) {
    t.ctx.S.routeId = "1111";
    ownRes = await t.ctx.IDCAuthMiddleware.authorizeRoute("1111");
    foreignRes = await t.ctx.IDCAuthMiddleware.authorizeRoute("2222");
  }
  check("T9a owner accessing their own route (/IDC/1111) is authorized as owner", Boolean(ownRes && ownRes.authorized === true && ownRes.role === "owner"));
  check("T9b changing URL ID to another user's route (/IDC/2222) is blocked by IDOR middleware (403)", Boolean(foreignRes && foreignRes.authorized === false && foreignRes.status === 403 && foreignRes.role === "visitor_idor_blocked"));
  check("T9c blocked IDOR attempt never leaks the current user's vault or grants owner access to route 2222", Boolean(foreignRes && !foreignRes.vault && t.ctx.S.routeId === "1111"));
}

/* ---------------------------------------------------------------- summary */
const failed = results.filter((r) => !r.ok);
console.log("\n" + (results.length - failed.length) + "/" + results.length + " checks passed");
fs.writeFileSync(path.join(ROOT, "tests", "last-run.json"), JSON.stringify({ at: new Date().toISOString(), passed: results.length - failed.length, total: results.length, results }, null, 2));
process.exit(failed.length ? 1 : 0);
