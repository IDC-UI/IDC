# IDC 5-Skills Maximum-Impact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maximize the quality, security, database speed, runtime performance, visual identity, and automated browser verification of the IDC Digital Identity & NFC platform by applying the 5 AI skills in their optimal architectural sequence.

**Architecture:** Process skills (`superpowers`) govern the workflow first via TDD and plan-driven tasks; database hardening (`supabase-postgres-best-practices`) secures and indexes the Supabase Postgres & Storage layer second; runtime & async optimization (`vercel-react-best-practices`) eliminates network/storage waterfalls third; studio-grade UI refinement (`frontend-design`) polishes the RTL/LTR dark/light interfaces fourth; and automated Playwright visual & functional verification (`webapp-testing`) gates completion fifth.

**Tech Stack:** HTML5 / CSS3 / Vanilla ES2022 PWA (`index.html`, `idc-supabase.js`, `idc-private.js`, `idc-plus.js`, `idc-settings.js`), WebCrypto (`AES-256-GCM`, `PBKDF2-SHA256`), WebAuthn + IndexedDB, Supabase Auth / Postgres RLS / Edge Functions / Storage, Node.js test runner (`tests/security.test.mjs`), Python Playwright (`webapp-testing`).

**Spec:** `d:\IDC\SECURITY.md` & `d:\IDC\SETUP.md`

## Global Constraints

- All 44 existing static and behavioral security checks in `d:\IDC\tests\security.test.mjs` must continue to pass (`44/44`) plus new checks added by this plan.
- No `Math.random`, no `console.log` / `console.debug`, no `admin` routes or flags, and no raw vault keys in `localStorage`.
- Content-Security-Policy (`connect-src 'self' https://*.supabase.co`) must remain strict with `object-src 'none'` and `base-uri 'self'`.
- Customer support phone number must remain `+20 15 58540330` across all views.

## Review Focus

- **Cold reload while vault is locked (`المحفظة مقفولة`):** Responder tapping `الطوارئ (بدون باسورد)` must see the cardholder's public emergency summary immediately without triggering a decrypt error or requiring a password.
- **System Dark Mode vs Explicit Light/Dark Toggle:** Opening `الإعدادات` (`idc-settings.js`) under OS Dark Mode (when `<html data-theme>` is unset) must render dark navy cards (`#151B30`) and inputs, never white cards on a dark background.
- **Storage RLS lookup under 200-file cap:** Counting a user's files in `storage.objects` during upload policy evaluation must use an indexed prefix/owner expression and cached `(select auth.uid())` so uploads do not degrade under load.
- **Repeated `localStorage` reads on every render (`R()`):** `getLocalVault` and `loadPublicEmergencyCache` must avoid redundant JSON parsing when storage has not mutated.
- **Playwright headless verification across RTL Arabic & LTR English:** Automated browser tests must wait for `networkidle`, verify zero console/page errors, and capture full-page screenshots of both outer partitions and inner settings.

---

### Task 1: Database & RLS Optimization (`supabase-postgres-best-practices`)

**Files:**
-Create: `d:\IDC\supabase\migrations\20261122000000_idc_postgres_optimizations.sql`
-Modify: `d:\IDC\tests\security.test.mjs:40-48`
-Test: `d:\IDC\tests\security.test.mjs`

**Interfaces:**
- Consumes: `public.idc_vaults`, `public.idc_rate_limits`, `public.idc_rate_hit(text, integer, integer)` from `20261027000000_idc_vault.sql` and `20261114000000_idc_hardening.sql`.
- Produces: `idx_idc_rate_limits_window` partial/covering index, `idc_vaults_updated_at_touch()` trigger, and optimized `storage.objects` RLS policy using `(select auth.uid())` initPlan caching.

- [ ] **Step 1: Write the failing test in `d:\IDC\tests\security.test.mjs`**

```javascript
const sqlOpt = fs.existsSync(path.join(ROOT, "supabase/migrations/20261122000000_idc_postgres_optimizations.sql"))
  ? read("supabase/migrations/20261122000000_idc_postgres_optimizations.sql")
  : "";
check("S20 Postgres best-practices migration adds index and initPlan-cached auth.uid()", /create index if not exists idx_idc_rate_limits_window/.test(sqlOpt) && /\(select auth\.uid\(\)\)/.test(sqlOpt));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types d:\IDC\tests\security.test.mjs`
Expected: FAIL on `S20 Postgres best-practices migration adds index and initPlan-cached auth.uid()`

- [ ] **Step 3: Implement `d:\IDC\supabase\migrations\20261122000000_idc_postgres_optimizations.sql`**

Apply `supabase-postgres-best-practices` rules:
- `security-rls-initplan`: Wrap `auth.uid()` in `(select auth.uid())` inside `idc_rate_hit` and policies so Postgres caches the UID once per query (`InitPlan`) instead of evaluating per row.
- `query-missing-indexes`: Add `idx_idc_rate_limits_window on public.idc_rate_limits (user_id, bucket, window_start)` and `idx_idc_vaults_updated_at on public.idc_vaults (updated_at desc)`.
- `schema-constraints`: Enforce `updated_at = now()` via a lightweight `BEFORE UPDATE` trigger on `public.idc_vaults`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types d:\IDC\tests\security.test.mjs`
Expected: PASS (`45/45 checks passed`)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261122000000_idc_postgres_optimizations.sql tests/security.test.mjs
git commit -m "perf(db): apply supabase-postgres-best-practices indexes and RLS initPlan caching"
```

---

### Task 2: Async Waterfall Elimination & Storage Caching (`vercel-react-best-practices`)

**Files:**
- Modify: `d:\IDC\idc-supabase.js:110-165`
- Modify: `d:\IDC\idc-supabase.js:350-405`
- Test: `d:\IDC\tests\security.test.mjs`

**Interfaces:**
- Consumes: `getLocalVault(email)`, `setLocalVault(email, record)`, `loadPublicEmergencyCache()`, `loadVault(password, user, isNewSignup)` in `d:\IDC\idc-supabase.js`.
- Produces: In-memory storage cache invalidating on `setLocalVault` / `clearActiveSession` (`js-cache-storage`), and parallelized key derivation + remote vault fetch (`async-parallel` via `Promise.all`) during `loadVault`.

- [ ] **Step 1: Write the failing test in `d:\IDC\tests\security.test.mjs`**

```javascript
check("S21 loadVault parallelizes remote fetch and caches localStorage reads", /Promise\.all/.test(supa) && /memEmergencyCache/.test(supa));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types d:\IDC\tests\security.test.mjs`
Expected: FAIL on `S21 loadVault parallelizes remote fetch and caches localStorage reads`

- [ ] **Step 3: Implement storage caching and parallel async resolution in `d:\IDC\idc-supabase.js`**

Apply `vercel-react-best-practices` rules:
- `js-cache-storage`: Cache `idc_public_em_v1` in `memEmergencyCache` so repeated `R()` calls on the lock/login screen do not re-parse `localStorage` on every render.
- `async-parallel`: When both `remoteRow` and `localRow` exist or when fetching session + remote vault metadata, use `Promise.all` where operations are independent, and check cheap synchronous preconditions before `await` (`async-cheap-condition-before-await`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types d:\IDC\tests\security.test.mjs`
Expected: PASS (`46/46 checks passed`)

- [ ] **Step 5: Commit**

```bash
git add idc-supabase.js tests/security.test.mjs
git commit -m "perf(client): apply vercel-react-best-practices storage caching and async parallelization"
```

---

### Task 3: Distinctive Visual Polish & Contrast Discipline (`frontend-design`)

**Files:**
- Modify: `d:\IDC\idc-settings.js:7-55`
- Modify: `d:\IDC\idc-supabase.js:205-260`
- Test: `d:\IDC\tests\security.test.mjs`

**Interfaces:**
- Consumes: `.idc-st` token system in `d:\IDC\idc-settings.js` and `window.idcOuterPartitionsBarHtml()` / `window.idcOuterEmergencyCardHtml()` in `d:\IDC\idc-supabase.js`.
- Produces: High-contrast, zero-collision design tokens (`--bg:#0E1322`, `--card:#151B30`, `--tile:#1E2745`, `--ink:#E9ECF7`, `--brand:#8C98E8`, `--ok:#6FC9AB`, `--bad:#F0868F`), tactile focus states (`:focus-visible`), and clear visual hierarchy on the outer lock/login partitions.

- [ ] **Step 1: Write the failing test in `d:\IDC\tests\security.test.mjs`**

```javascript
const settingsSrc = read("idc-settings.js");
check("S22 Settings CSS enforces media-scoped light theme and collision-free .st-f fields", /@media \(prefers-color-scheme:light\)/.test(settingsSrc) && /\.idc-st \.st-f input/.test(settingsSrc));
```

- [ ] **Step 2: Run test to verify it passes or fails**

Run: `node --experimental-strip-types d:\IDC\tests\security.test.mjs`
Expected: PASS or verify token completeness.

- [ ] **Step 3: Refine typography, active-voice microcopy, and keyboard focus rings in `d:\IDC\idc-settings.js` and `d:\IDC\idc-supabase.js`**

Apply `frontend-design` rules:
- Ensure `:focus-visible` ring and `@media (prefers-reduced-motion: reduce)` are active inside `.idc-st`.
- Ensure active-voice CTAs match their confirmation toasts across all 8 Settings sections.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types d:\IDC\tests\security.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add idc-settings.js idc-supabase.js tests/security.test.mjs
git commit -m "style(ui): apply frontend-design token discipline, focus rings, and reduced-motion rules"
```

---

### Task 4: Automated Headless Browser Verification (`webapp-testing` + `verification-before-completion`)

**Files:**
- Create: `d:\IDC\tests\webapp_e2e_verify.py`
- Test: `d:\IDC\tests\webapp_e2e_verify.py`

**Interfaces:**
- Consumes: Local HTTP server serving `d:\IDC` and Playwright Chromium headless browser.
- Produces: Verified screenshots and DOM assertions for:
  1. Outer Login screen with the 2 partitions (`البصمة / Face ID` + `الطوارئ بدون باسورد`).
  2. Outer Emergency view showing responder card without password.
  3. Inner Home screen showing the 3D IDC Card and hiding setup cards once Emergency & Private data are populated.
  4. Side Drawer showing the official IDC icon (`icon-192.png`) and slogan instead of raw UUID.
  5. Settings Center (`idc-settings.js`) in Dark Mode verifying dark navy cards (`rgb(21, 27, 48)`) and support number `+20 15 58540330`.

- [ ] **Step 1: Write `d:\IDC\tests\webapp_e2e_verify.py` using Playwright (`webapp-testing`)**

Write a self-contained Python Playwright test script that launches a local HTTP server, waits for `networkidle`, tests all 5 user journeys in Dark Mode and Light Mode, asserts zero uncaught page errors, and saves verification screenshots.

- [ ] **Step 2: Run `webapp_e2e_verify.py` and `security.test.mjs`**

Run: `python d:\IDC\tests\webapp_e2e_verify.py && node --experimental-strip-types d:\IDC\tests\security.test.mjs`
Expected: All Playwright assertions and all Node security checks pass with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add tests/webapp_e2e_verify.py
git commit -m "test(e2e): add automated Playwright browser verification suite via webapp-testing skill"
```
