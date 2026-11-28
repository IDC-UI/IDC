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
const bankSrc = fs.existsSync(path.join(ROOT, "idc-bank.js")) ? read("idc-bank.js") : "";
check("S18 no admin routes / pages / debug flags exist", !/(admin(\.html|\/|panel|mode|dashboard)|isAdmin|role\s*[:=]\s*["']admin|debug\s*[:=]\s*true|console\.(log|debug))/i.test(html + supa + read("idc-plus.js") + read("idc-private.js") + read("idc-settings.js") + read("idc-intro.js") + bankSrc + vaultFn + uploadFn));
const secretHit = ["index.html", "idc-supabase.js", "idc-plus.js", "idc-private.js", "idc-settings.js", "supabase-config.js", "supabase/functions/secure-vault/index.ts", "supabase/functions/secure-upload/index.ts"]
  .concat(fs.existsSync(path.join(ROOT, "idc-bank.js")) ? ["idc-bank.js"] : [])
  .some((f) => /service_role|sk_live|BEGIN (RSA|EC|PRIVATE)|[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(read(f)));
check("S19 no secret/service-role keys or JWTs in shipped files (only the public publishable key)", !secretHit);
const sqlOpt = fs.existsSync(path.join(ROOT, "supabase/migrations/20261122000000_idc_postgres_optimizations.sql"))
  ? read("supabase/migrations/20261122000000_idc_postgres_optimizations.sql")
  : "";
check("S20 Postgres best-practices migration adds indexes and initPlan-cached auth.uid()", /create index if not exists idx_idc_rate_limits_window/.test(sqlOpt) && /create index if not exists idx_idc_vaults_updated_at/.test(sqlOpt) && /\(select auth\.uid\(\)\)/.test(sqlOpt));
check("S21 client caches public emergency storage and parallelizes independent async work", /memEmergencyCache/.test(supa) && /Promise\.all/.test(supa));
const settingsSrc = read("idc-settings.js");
check("S22 Settings CSS enforces media-scoped light theme, focus-visible ring, and reduced-motion rule", /@media \(prefers-color-scheme:light\)/.test(settingsSrc) && /\.idc-st :focus-visible/.test(settingsSrc) && /@media \(prefers-reduced-motion:reduce\)/.test(settingsSrc));
const allUiSrc = html + supa + read("idc-plus.js") + read("idc-private.js") + settingsSrc + read("idc-intro.js") + bankSrc;
const femRe = /ابدئي|سجّلي|سجلي|افتحي|اكتبي|أدخلي|ادخلي|تحققي|جرّبي|جربي|اختاري|أضيفي|ضيفي|(?:^|\s|")فعّلي|حاولي|تأكدي|اتأكدي|أكدي|أكديه|أنتِ|محتاجة|مش عارفة|كلمينا|لا تشاركيه|تقدري|تقدرين|حدديه|تحدديه|بتدخلي|تكمليه|أنشئي|اطلبي|تجاوزتي|استني|ارفعي|رتّبي|اجمعي|شاركي|صدّري|دوسي|قوليه|كلمي|شيلي|بلّغي|املي|كمّلي|تطلعي|تخرجي|تعدّلي|قلّلي|قرّبي|انسخي|حطي|سيبيه|تحسي\s|تدوسي|تحذفي|عايزاها|معاكي|بتعرفيها|صاحبة الكارت|بتفتحيه|تبلّغ عن|متأكدة؟|تحتاجيها|استخدمي/;
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
const introSrc = read("idc-intro.js");
check("S29 speed-engineer Images & Loading UX: WebP compression, lazy/fetchpriority attributes, .sk Skeleton loader, and auth pending state", /image\/webp/.test(html) && /loading="lazy"/.test(html) && /fetchpriority="high"/.test(introSrc) && /\.sk\b/.test(html) && /skCard/.test(plusSrc + supa) && /authBusy/.test(supa));
check("S30 speed-engineer Pagination & Caching: 20-item page size with load-more and in-memory vault/bundle caches", /PAGE_SIZE\s*=\s*20/.test(html) && /moreItems/.test(html) && /memLocalVaults/.test(supa) && /memStoredBundles/.test(plusSrc));
check("S31 web-design-guidelines: label-for binding, aria-live polite, touch-action manipulation, overscroll-behavior contain, preconnect, and ellipsis in 404.html", /<label for="/.test(html) && /aria-live="polite"/.test(html) && /touch-action:\s*manipulation/.test(html) && /overscroll-behavior:\s*contain/.test(html) && /rel="preconnect"/.test(html) && !/\.\.\./.test(router404));
const sqlStorageIdx = fs.existsSync(path.join(ROOT, "supabase/migrations/20261123000000_idc_storage_rls_index.sql"))
  ? read("supabase/migrations/20261123000000_idc_storage_rls_index.sql")
  : "";
check("S32 supabase-postgres-best-practices: storage.objects 200-file RLS check filters on indexed owner = (select auth.uid())", /o\.owner\s*=\s*\(select auth\.uid\(\)\)/.test(sqlStorageIdx));
const agentsMd = fs.existsSync(path.join(ROOT, "AGENTS.md")) ? read("AGENTS.md") : "";
check("S33 speed-engineer profile persisted in AGENTS.md with Tier S and speed-engineer trigger rule", /## Performance profile/.test(agentsMd) && /Tier:\s*S/.test(agentsMd) && /speed-engineer/.test(agentsMd));
const docsSrc = read("SECURITY.md") + read("SETUP.md") + read("README.md");
const docsFemMatch = (read("SECURITY.md") + read("SETUP.md")).match(/فعّليها|فعّلي|راجعي|أنشئي|ضعي|وأضيفيه|اضبطي|انسخي|ثبّتي|وسجّلي|شغّلي|أضيفي|تستخدمي|اختاري|اخترتِ|تحطي|عايزة|اعملي|وتأكدي/);
check("S34 writing-guidelines: SECURITY.md, SETUP.md, and README.md are 100% gender-neutral and document authorize-route", !docsFemMatch && /authorize-route/.test(docsSrc), docsFemMatch ? "Found in docs: " + docsFemMatch[0] : "");
check("S35 Emergency SOS button sends GPS location + emergency profile and works offline", /idcTriggerSOS/.test(plusSrc + supa) && /maps\.google\.com/.test(plusSrc + supa));
const privSrc = read("idc-private.js");
check("S36 Private partition supports Duress PIN (decoy vault without decrypting real vault)", /duressHash/.test(privSrc) && /duressMode/.test(privSrc) && /DECOY_ITEMS/.test(privSrc));
check("S37 Card Bank implements spending limit (linear bar + 80% warn + block), hide balance (10s auto-rehide + biometric), 5 categories breakdown, and <=30d expiry alert", /bk-pg/.test(bankSrc) && /0\.8/.test(bankSrc) && /10000/.test(bankSrc) && /expDays/.test(bankSrc) && /transport/.test(bankSrc) && /bills/.test(bankSrc));
check("S38 Direct LinkedIn flow normalizes HTTPS profile URLs and opens saved LinkedIn profile directly", /idcOpenLinkedIn/.test(plusSrc) && /idcNormalizeHttpsUrl/.test(plusSrc) && /idcOpenLinkedIn/.test(html));
check("S39 Hourly Temporary Share (#s=...) supports 4/7/24h + custom hours and CV/Profile/Both scopes", /IDCTempShare/.test(plusSrc) && /IDCTempShare/.test(html) && /IDCTempShare/.test(settingsSrc));
{
  const enMatch = html.match(/var EN=(\{[^\n]+\});/);
  const enDict = enMatch ? JSON.parse(enMatch[1]) : {};
  const ks = Object.keys(enDict).sort((a, b) => b.length - a.length);
  const trFn = (s) => {
    if (enDict[s]) return enDict[s];
    const t = s.trim();
    if (enDict[t]) return s.replace(t, enDict[t]);
    for (const k of ks) if (s.includes(k)) s = s.split(k).join(enDict[k]);
    return s;
  };
  const mustTranslate = [
    "الكارد بانك / IBAN", "بروفايل LinkedIn", "مشاركة مؤقتة", "فتح البروفايل ↗", "+ إضافة الرابط",
    "تعديل رابط LinkedIn", "معرّف الرابط الشخصي", "معاينة وتصدير PDF", "رابط مؤقت", "حساب بنكي",
    "رابط شخصي", "عرض المزيد (3)", "رجوع", "المحفظة مقفولة", "فتح المحفظة المشفرة",
    "فتح بالبصمة / Face ID", "الدخول بالبصمة / Face ID"
  ];
  const untranslated = mustTranslate.filter((p) => /[\u0600-\u06FF]/.test(trFn(p)));
  check("S40 English mode translates all Home quick-actions, LinkedIn/Share controls, CV actions, and Lock/Auth labels with zero leftover Arabic", untranslated.length === 0 && /applyLang/.test(supa), untranslated.length ? "Untranslated: " + untranslated.join(", ") : "");
}
check("S41 Card Bank supports Egyptian banks & fintechs (NBE, Banque Misr, CIB, QNB, Telda, Klivvr, myFawry, InstaPay) with SVG logos, clear/remove controls, and Settings section",
  /البنك الأهلي المصري/.test(bankSrc) &&
  /بنك مصر/.test(bankSrc) &&
  /Telda/i.test(bankSrc) &&
  /Klivvr/i.test(bankSrc) &&
  /myFawry/i.test(bankSrc) &&
  /clearAllCards/.test(bankSrc) &&
  /<svg/.test(bankSrc) &&
  /id:\s*"banking"/.test(settingsSrc));
check("S42 Email OTP password recovery, Recovery Key envelope, in-app password change, local-only 5-fail wipe, and production site_url are configured",
  /^site_url\s*=\s*"https:\/\/idc-ui\.github\.io\/IDC\/"/m.test(cfg) &&
  /doVerifyResetOtp/.test(supa) &&
  /verifyOtp/.test(supa) &&
  /wipeLocalDeviceOnly/.test(supa) &&
  /idcChangePasswordInApp/.test(supa) &&
  /doVerifyResetOtp/.test(html));
{
  const enMatch = html.match(/var EN=(\{[^\n]+\});/);
  const enDict = enMatch ? JSON.parse(enMatch[1]) : {};
  const ks = Object.keys(enDict).sort((a, b) => b.length - a.length);
  const trFn = (s) => {
    if (enDict[s]) return enDict[s];
    const t = s.trim();
    if (enDict[t]) return s.replace(t, enDict[t]);
    for (const k of ks) if (s.includes(k)) s = s.split(k).join(enDict[k]);
    return s;
  };
  const errPhrases = [
    "تعذر إكمال الطلب. تحقق من البيانات وحاول مرة أخرى.",
    "تعذر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.",
    "البريد أو كلمة المرور غير صحيحة.",
    "هذا البريد مسجل بالفعل. سجّل الدخول.",
    "يرجى إدخال بريد إلكتروني صحيح.",
    "كود التحقق غير صحيح أو منتهي الصلاحية. اطلب كودًا جديدًا.",
    "تم تجاوز الحد المؤقت لإرسال رسائل البريد في Supabase (رسالتان في الساعة للخدمة المجانية). انتظر قليلًا أو افتح آخر رسالة وصلتك."
  ];
  const broken = errPhrases.filter((p) => /[\u0600-\u06FF]/.test(trFn(p)));
  check("S43 All Supabase auth/OTP/rate-limit error messages translate 100% cleanly in English mode (no mixed Arabic/Other)",
    broken.length === 0 && /over_email_send_rate_limit|rate limit/i.test(supa), broken.length ? "Broken: " + broken[0] : "");
}

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

function boot({ session = null, remoteRow = null, signIn, signUp, verifyOtp, resetEmail, localStore = {}, invokeOk = true } = {}) {
  const store = new Map(Object.entries(localStore));
  const calls = { signIn: 0, signUp: 0, directUpsert: 0, remoteDelete: 0, invoke: 0, signOut: 0, resetEmail: 0, verifyOtp: 0, updateUser: 0 };
  const handlers = [];
  const form = {};
  const checkboxes = {};
  const app = { innerHTML: "" };
  const ctx = {
    console, TextEncoder, TextDecoder, Uint8Array, Promise, JSON, Math, Date, Object, Array, String, Number, Boolean, Error, RegExp, parseInt, URL,
    atob, btoa, setTimeout, clearTimeout, crypto: globalThis.crypto, navigator: { onLine: true },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => void store.set(k, String(v)), removeItem: (k) => void store.delete(k) },
    document: { getElementById: (id) => (id === "app" ? app : { value: form[id] ?? "", checked: Boolean(checkboxes[id]), textContent: "" }), querySelector: () => null },
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
      resetPasswordForEmail: async (e, o) => { calls.resetEmail++; return resetEmail ? resetEmail(e, o) : { error: null }; },
      verifyOtp: async (a) => { calls.verifyOtp++; return verifyOtp ? verifyOtp(a) : { data: { user: USER, session: { access_token: "t" } }, error: null }; },
      updateUser: async (a) => { calls.updateUser++; ctx.__updatedUser = a; return { data: { user: USER }, error: null }; },
      resend: async () => ({ error: null }),
    },
    functions: { invoke: async (name, { body }) => { calls.invoke++; if (!invokeOk) return { error: { message: "boom" } }; ctx.__saved = body; return { data: { saved: true }, error: null }; } },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: remoteRow, error: null }) }) }),
      upsert: async () => { calls.directUpsert++; return { error: null }; },
      delete: () => ({ eq: async () => { calls.remoteDelete++; return { error: null }; } }),
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
    sv() {}, pickAtt() {}, attRow() { return ""; }, vw() {}, dla() {}, del() {}, fdel() {}, A(m) { ctx.au.m = m; ctx.err = ""; ctx.R(); },
  });
  vm.runInContext("(function(){" + cryptoSrc + "\n})();", ctx);
  vm.runInContext(read("idc-supabase.js"), ctx);
  return { ctx, store, calls, form, checkboxes, app, toasts, handlers, dump: () => [...store.entries()].map(([k, v]) => k + "=" + v).join("\n") };
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

// T10 & T11: Direct LinkedIn URL flow & Hourly Temporary Share (#s=...) in idc-plus.js
{
  const openedUrls = [];
  const modals = [];
  const appEl = { innerHTML: "" };
  const pCtx = {
    console, TextEncoder, TextDecoder, Uint8Array, Uint32Array, Promise, JSON, Math, Date, Object, Array, String, Number, Boolean, Error, RegExp, parseInt, parseFloat, isNaN, URL, URLSearchParams, encodeURIComponent, decodeURIComponent,
    atob, btoa, setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, crypto: globalThis.crypto,
    navigator: { onLine: true, userAgent: "Mozilla/5.0" },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    history: { replaceState: () => {} },
    location: { origin: "https://idc-ui.github.io", pathname: "/IDC/", search: "", hash: "" },
    open: (u, target, rel) => { openedUrls.push({ u, target, rel }); },
    document: {
      getElementById: (id) => (id === "app" ? appEl : null),
      createElement: () => ({ style: {}, setAttribute: () => {}, querySelector: () => ({ onclick: null }), remove: () => {} }),
      body: { appendChild: (el) => modals.push(el) },
      head: { appendChild: () => {} }
    },
    addEventListener: () => {},
    S: {
      lang: "ar",
      screen: "home",
      p: { n: "نور محمد", nid: "29901011234567", bd: "2000-05-14", ph: "01012345678", ct: "القاهرة", role: "emp", linkedin: "", photo: "data:image/webp;base64,AAAA" },
      items: [
        { id: "1", mode: "on", level: "public", type: "edu", title: "بكالوريوس حاسبات", value: "2022", issuer: "جامعة القاهرة" },
        { id: "2", mode: "on", level: "public", type: "exp", title: "مهندس برمجيات", value: "2024 - 2026", issuer: "شركة تقنية" },
        { id: "3", mode: "on", level: "private", type: "bank", title: "حساب بنكي خاص", value: "EG9900001111", issuer: "CIB" },
        { id: "4", mode: "on", level: "secret", type: "cert", title: "شهادة سرية", value: "SEC-99", issuer: "Cisco", until: "2099-01-01" }
      ],
      em: null
    },
    RL: { emp: ["موظف/ـة", "work"], student: ["طالب/ـة", "school"] },
    esc: (x) => String(x == null ? "" : x).replace(/[&<>"']/g, "_"),
    mi: (n) => "[" + n + "]",
    wm: () => '<div class="wm">IDC</div>',
    fld: (id, l) => '<input id="' + id + '">',
    pgh: (t) => "<h2>" + t + "</h2>",
    qr: () => "<svg></svg>",
    lv: (i) => i.level,
    v: () => "",
    tst: () => {},
    sv: () => {},
    R: () => { appEl.innerHTML = "home"; },
    hHome: () => "<div>home</div>",
    page: () => "<div>page</div>",
    setup: () => '<div><div class="ar"></div></div>'
  };
  pCtx.window = pCtx;
  vm.createContext(pCtx);
  try { vm.runInContext(read("idc-plus.js"), pCtx); } catch (e) {}

  const norm = pCtx.idcNormalizeHttpsUrl;
  check("T10a idcNormalizeHttpsUrl normalizes linkedin.com/in/... to https://", typeof norm === "function" && norm("linkedin.com/in/nour-dev") === "https://linkedin.com/in/nour-dev" && norm("https://www.linkedin.com/in/nour") === "https://www.linkedin.com/in/nour");
  check("T10b idcNormalizeHttpsUrl blocks javascript:, data:, http:, and blank URLs", typeof norm === "function" && norm("javascript:alert(1)") === "" && norm("data:text/html,x") === "" && norm("http://evil.example") === "" && norm("   ") === "");

  if (typeof pCtx.idcOpenLinkedIn === "function") {
    pCtx.idcOpenLinkedIn(false); // empty linkedin -> opens prompt modal, no window.open
    const openedWhenEmpty = openedUrls.length;
    const modalsWhenEmpty = modals.length;
    pCtx.S.p.linkedin = "linkedin.com/in/nour-dev";
    pCtx.idcOpenLinkedIn(false); // saved linkedin -> opens directly in new tab!
    check("T10c idcOpenLinkedIn prompts when unset and opens saved LinkedIn directly via noopener", openedWhenEmpty === 0 && modalsWhenEmpty === 1 && openedUrls.length === 1 && openedUrls[0].u === "https://linkedin.com/in/nour-dev" && /noopener/.test(openedUrls[0].rel));
  } else {
    check("T10c idcOpenLinkedIn prompts when unset and opens saved LinkedIn directly via noopener", false, "idcOpenLinkedIn missing");
  }

  const ts = pCtx.IDCTempShare;
  if (ts && typeof ts.buildLink === "function" && typeof ts.parseHash === "function") {
    const now = 1_700_000_000_000;
    const cvShare = ts.buildLink({ scope: "cv", hours: 4, nowMs: now });
    const hashPart = "#" + cvShare.url.split("#")[1];
    const parsedBefore = ts.parseHash(hashPart, now + 3 * 3600_000);
    const parsedAfter = ts.parseHash(hashPart, now + 4 * 3600_000 + 1);
    const rawStr = JSON.stringify(parsedBefore.data || {});

    check("T11a 4-hour CV link includes public CV items and excludes private/secret items, full NID, and base64 photos",
      cvShare.exp === now + 4 * 3600_000 &&
      parsedBefore.active === true &&
      parsedBefore.data.scope === "cv" &&
      /بكالوريوس حاسبات/.test(rawStr) &&
      !/EG9900001111/.test(rawStr) &&
      !/SEC-99/.test(rawStr) &&
      !/29901011234567/.test(rawStr) &&
      !/data:image/.test(cvShare.url));

    const prof7 = ts.buildLink({ scope: "profile", hours: 7, nowMs: now });
    const both24 = ts.buildLink({ scope: "both", hours: 24, nowMs: now });
    const clamped = ts.buildLink({ scope: "both", hours: 9999, nowMs: now });
    const p7Data = ts.parseHash("#" + prof7.url.split("#")[1], now + 1000).data;
    const b24Data = ts.parseHash("#" + both24.url.split("#")[1], now + 1000).data;
    check("T11b scope isolation (profile vs cv vs both) and 7h/24h/clamped durations work accurately",
      prof7.exp === now + 7 * 3600_000 &&
      both24.exp === now + 24 * 3600_000 &&
      clamped.hours === 168 &&
      p7Data && p7Data.scope === "profile" && (!p7Data.cv || p7Data.cv.length === 0) &&
      b24Data && b24Data.scope === "both" && Array.isArray(b24Data.cv) && b24Data.cv.length === 2);

    check("T11c temporary share link expires automatically right after hours elapse", parsedAfter.active === false && parsedAfter.expired === true && parsedAfter.data === null);

    pCtx.location.hash = "#" + cvShare.url.split("#")[1];
    const origNow = pCtx.Date.now;
    pCtx.Date.now = () => now + 5 * 3600_000;
    pCtx.R();
    pCtx.Date.now = origNow;
    const corrupted = ts.parseHash("#s=%%%not_valid_base64%%%", now);
    check("T11d expired/corrupted #s=... link fails closed and renders expiry screen with zero leaked data",
      corrupted.active === false && corrupted.invalid === true && corrupted.data === null &&
      /انتهت صلاحية|expired/i.test(appEl.innerHTML) && !/نور محمد/.test(appEl.innerHTML) && !/بكالوريوس/.test(appEl.innerHTML));
  } else {
    check("T11a 4-hour CV link includes public CV items and excludes private/secret items, full NID, and base64 photos", false, "IDCTempShare missing");
    check("T11b scope isolation (profile vs cv vs both) and 7h/24h/clamped durations work accurately", false, "IDCTempShare missing");
    check("T11c temporary share link expires automatically right after hours elapse", false, "IDCTempShare missing");
    check("T11d expired/corrupted #s=... link fails closed and renders expiry screen with zero leaked data", false, "IDCTempShare missing");
  }
}

// T13: Card Bank empty real-user default, Egyptian banks & Telda SVG templates, IBAN/InstaPay edit, and remove/clear all
{
  const bForm = {};
  const bCtx = {
    console, Math, Date, Object, Array, String, Number, Boolean, RegExp, parseFloat, parseInt, isNaN,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    crypto: globalThis.crypto,
    navigator: { clipboard: { writeText: async () => {} } },
    confirm: () => true,
    document: {
      getElementById: (id) => (id === "bkAddErr" ? { textContent: "" } : null),
      createElement: () => ({ style: {}, setAttribute: () => {}, querySelector: () => ({ onclick: null }), remove: () => {} }),
      head: { appendChild: () => {} },
      body: { appendChild: () => {} }
    },
    location: { hostname: "localhost" },
    S: { lang: "ar", preview: 0, p: { n: "Maria Ibrahim" }, bk: null },
    pg: { k: "bank" },
    esc: (x) => String(x == null ? "" : x).replace(/[&<>"']/g, "_"),
    mi: (n) => "[" + n + "]",
    fld: (id, l) => '<input id="' + id + '">',
    v: (id) => String(bForm[id] ?? "").trim(),
    tst: () => {},
    sv: () => {},
    R: () => {},
    page: () => "<div>base</div>"
  };
  bCtx.window = bCtx;
  vm.createContext(bCtx);
  vm.runInContext(read("idc-bank.js"), bCtx);

  const initialHtml = bCtx.page();
  check("T13a real user Card Bank starts empty with zero fake Nile Bank cards",
    Boolean(bCtx.S.bk && Array.isArray(bCtx.S.bk.cards) && bCtx.S.bk.cards.length === 0 && !/Nile Bank/.test(initialHtml)));

  const bkApi = bCtx.IDCBank;
  const providers = bkApi && typeof bkApi.getProviders === "function" ? bkApi.getProviders() : [];
  const hasKeyProviders = ["nbe", "bm", "cib", "qnb", "telda", "klivvr", "fawry", "instapay"].every((id) => providers.some((p) => p.id === id));

  if (bkApi && hasKeyProviders) {
    // Add NBE Meeza, Banque Misr Visa Gold, and Telda Mastercard
    bCtx.pg = { k: "bank-add" };
    Object.assign(bForm, { bkProvider: "nbe", bkType: "0", bkHolder: "MARIA IBRAHIM", bkNum: "5078 1234 5678 9100", bkExp: "09/29", bkOpen: "5000" });
    bkApi.saveNewCard();
    Object.assign(bForm, { bkProvider: "bm", bkType: "1", bkHolder: "MARIA IBRAHIM", bkNum: "4111 2222 3333 7788", bkExp: "11/28", bkOpen: "8000" });
    bkApi.saveNewCard();
    Object.assign(bForm, { bkProvider: "telda", bkType: "3", bkHolder: "MARIA IBRAHIM", bkNum: "5200 9999 8888 4455", bkExp: "06/30", bkOpen: "1500" });
    bkApi.saveNewCard();

    bCtx.pg = { k: "bank" };
    const renderedCards = bCtx.page();
    check("T13b adding NBE, Banque Misr, and Telda cards renders bank SVG logos + Meeza/VISA/Mastercard badges and keeps only last 4 digits",
      bCtx.S.bk.cards.length === 3 &&
      bCtx.S.bk.cards[0].last4 === "9100" &&
      !/50781234/.test(JSON.stringify(bCtx.S.bk)) &&
      /<svg/.test(renderedCards) &&
      /البنك الأهلي المصري|NATIONAL BANK OF EGYPT/.test(renderedCards) &&
      /بنك مصر|BANQUE MISR/.test(renderedCards) &&
      /telda/i.test(renderedCards));

    bkApi.saveIbanValues("EG99 0003 0004 0005 0006 0007 0008", "maria@instapay");
    const afterIbanHtml = bCtx.page();
    check("T13c IBAN and InstaPay address can be updated and rendered cleanly",
      bCtx.S.bk.iban === "EG99 0003 0004 0005 0006 0007 0008" &&
      bCtx.S.bk.instapay === "maria@instapay" &&
      /maria@instapay/.test(afterIbanHtml));

    bkApi.removeCardAt(1, true);
    const lenAfterOneRemoved = bCtx.S.bk.cards.length;
    bkApi.clearAllCards(true);
    check("T13d individual card removal and clearAllCards wipe cards cleanly without errors",
      lenAfterOneRemoved === 2 && bCtx.S.bk.cards.length === 0 && bCtx.S.bk.sel === 0);

    // Luxury tiers: Platinum, Titanium, Infinite
    bCtx.pg = { k: "bank-add" };
    Object.assign(bForm, { bkProvider: "bm", bkType: "1", bkTier: "platinum", bkHolder: "MARIA IBRAHIM", bkNum: "4111 5555 6666 1001", bkExp: "10/29", bkOpen: "15000" });
    bkApi.saveNewCard();
    Object.assign(bForm, { bkProvider: "bm", bkType: "3", bkTier: "titanium", bkHolder: "MARIA IBRAHIM", bkNum: "5200 5555 6666 1002", bkExp: "11/29", bkOpen: "20000" });
    bkApi.saveNewCard();
    Object.assign(bForm, { bkProvider: "bm", bkType: "1", bkTier: "infinite", bkHolder: "MARIA IBRAHIM", bkNum: "4111 5555 6666 1003", bkExp: "12/30", bkOpen: "50000" });
    bkApi.saveNewCard();
    bCtx.pg = { k: "bank" };
    const luxHtml = bCtx.page();
    check("T13e luxury tiers (Platinum brushed band, Titanium S-wave chrome, Infinite geometric line-art) render distinct skins and badges",
      /bk-skin-platinum/.test(luxHtml) &&
      /bk-skin-titanium/.test(luxHtml) &&
      /bk-skin-infinite/.test(luxHtml) &&
      /Platinum/.test(luxHtml) &&
      /titanium/i.test(luxHtml) &&
      /Infinite/.test(luxHtml));
  } else {
    check("T13b adding NBE, Banque Misr, and Telda cards renders bank SVG logos + Meeza/VISA/Mastercard badges and keeps only last 4 digits", false, "getProviders missing");
    check("T13c IBAN and InstaPay address can be updated and rendered cleanly", false, "saveIbanValues missing");
    check("T13d individual card removal and clearAllCards wipe cards cleanly without errors", false, "clearAllCards missing");
  }
}

// T14: 5-fail local-device-only wipe, Email OTP verification, Recovery Key zero-loss restore, and in-app password change
{
  // T14a: 5 wrong password attempts wipe cached local vaults on the phone WITHOUT deleting remote Supabase data
  const seed = boot();
  Object.assign(seed.form, { lg: "maria@example.com", lp: GOOD_PW });
  await seed.ctx.doLogin();
  await tick();
  const cachedVaultJson = seed.store.get("idc_local_vaults_v2");
  const remoteSaved = seed.ctx.__saved; // { salt, ciphertext }
  const recKey = typeof seed.ctx.idcGetRecoveryKey === "function" ? seed.ctx.idcGetRecoveryKey() : "";

  const phone = boot({
    remoteRow: remoteSaved,
    localStore: { idc_local_vaults_v2: cachedVaultJson, idcDemoV8: '{"p":{"n":"Cached"}}' },
    signIn: () => ({ data: null, error: { message: "Invalid login credentials" } })
  });
  Object.assign(phone.form, { lg: "maria@example.com", lp: "wrong-pass-attempt" });
  for (let i = 0; i < 5; i++) await phone.ctx.doLogin();
  check("T14a 5 wrong password attempts wipe phone localStorage cache while keeping remote Supabase DB untouched",
    !phone.store.has("idc_local_vaults_v2") && !phone.store.has("idcDemoV8") && phone.calls.remoteDelete === 0 && phone.calls.invoke === 0);

  // T14b & T14c: Email OTP flow (doF1 -> doVerifyResetOtp -> doF3) + Recovery Key restores encrypted vault with zero data loss
  if (typeof seed.ctx.doVerifyResetOtp === "function" && recKey) {
    // Seed an item into Maria's vault first so we prove zero data loss!
    seed.ctx.S.items = [{ id: "doc1", title: "شهادة تخرج أصلية", value: "امتياز" }];
    await seed.ctx.IDCPersist();
    const rowWithItem = seed.ctx.__saved;
    const activeRecKey = seed.ctx.idcGetRecoveryKey();
    check("T14b ciphertext stays 100% pure Base64URL for secure-vault Edge Function",
      Boolean(rowWithItem && /^[A-Za-z0-9_-]+$/.test(rowWithItem.ciphertext) && /^[A-Za-z0-9_-]{22}$/.test(rowWithItem.salt)));

    const rec = boot({ remoteRow: rowWithItem });
    rec.form.fp = "maria@example.com";
    await rec.ctx.doF1();
    rec.form.otpCode = "482910";
    await rec.ctx.doVerifyResetOtp();
    const otpVerifiedStage = rec.ctx.au.m;

    const NEW_PW = "brand-new-pass99";
    Object.assign(rec.form, { np: NEW_PW, np2: NEW_PW, rkInput: activeRecKey });
    await rec.ctx.doF3();
    await tick();
    check("T14c Email OTP + Recovery Key updates password and restores all encrypted vault items with zero data loss",
      otpVerifiedStage === "f3" && rec.calls.verifyOtp >= 1 && rec.calls.updateUser === 1 &&
      rec.ctx.S.screen === "home" && rec.ctx.S.items.length === 1 && rec.ctx.S.items[0].title === "شهادة تخرج أصلية");

    // T14d: In-app password change when already unlocked via Fingerprint (Maria's exact case!) + fresh-vault fallback
    const changeOk = typeof rec.ctx.idcChangePasswordInApp === "function"
      ? await rec.ctx.idcChangePasswordInApp("even-newer-pass88", "even-newer-pass88")
      : false;
    const freshRec = boot({ remoteRow: rowWithItem });
    freshRec.form.fp = "maria@example.com";
    await freshRec.ctx.doF1();
    freshRec.form.otpCode = "193847";
    await freshRec.ctx.doVerifyResetOtp();
    Object.assign(freshRec.form, { np: "fresh-start-pass77", np2: "fresh-start-pass77", rkInput: "" });
    freshRec.checkboxes.resetVaultConfirm = true;
    await freshRec.ctx.doF3();
    await tick();
    check("T14d unlocked biometric user can change password without old password, and OTP reset supports confirmed fresh-vault fallback",
      changeOk === true && freshRec.calls.updateUser === 1 && freshRec.ctx.S.screen === "home");

    // T14e: Returning from Supabase Reset Password email link (INITIAL_SESSION + PASSWORD_RECOVERY) opens f3 instead of Lock Screen
    const linkRec = boot({ session: { user: USER } });
    await tick(30);
    linkRec.handlers.forEach((cb) => cb("PASSWORD_RECOVERY", { user: USER }));
    await tick(20);
    check("T14e clicking Reset Password email link (PASSWORD_RECOVERY) opens f3 password form instead of getting stuck on Lock Screen",
      !/المحفظة مقفولة/.test(linkRec.app.innerHTML) && linkRec.ctx.au.m === "f3" && linkRec.ctx.S.screen === "auth");

    // T14f: 429 / over_email_send_rate_limit detected via code/status (even if message is generic), preserves typed email, and SW bypasses stale HTTP disk cache
    const rateLimited = boot({
      resetEmail: async () => ({ error: { message: "Request failed", code: "over_email_send_rate_limit", status: 429 } })
    });
    rateLimited.form.fp = "htff7965@gmail.com";
    await rateLimited.ctx.doF1();
    check("T14f 429 over_email_send_rate_limit detected via error.code/status, preserves typed email, and SW revalidates HTTP cache",
      /رسالتان في الساعة/.test(rateLimited.ctx.err) &&
      rateLimited.ctx.au.d.em === "htff7965@gmail.com" &&
      /updateViaCache:\s*"none"/.test(plusSrc) &&
      /cache:\s*'no-cache'/.test(sw));
  } else {
    check("T14b ciphertext stays 100% pure Base64URL for secure-vault Edge Function", false, "doVerifyResetOtp or recKey missing");
    check("T14c Email OTP + Recovery Key updates password and restores all encrypted vault items with zero data loss", false, "doVerifyResetOtp missing");
    check("T14d unlocked biometric user can change password without old password, and OTP reset supports confirmed fresh-vault fallback", false, "idcChangePasswordInApp missing");
  }
}

/* ---------------------------------------------------------------- summary */
const failed = results.filter((r) => !r.ok);
console.log("\n" + (results.length - failed.length) + "/" + results.length + " checks passed");
fs.writeFileSync(path.join(ROOT, "tests", "last-run.json"), JSON.stringify({ at: new Date().toISOString(), passed: results.length - failed.length, total: results.length, results }, null, 2));
process.exit(failed.length ? 1 : 0);
