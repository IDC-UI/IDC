# IDC Full-Onboarding All-Skills Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply every actionable improvement surfaced across all installed skills (`speed-engineer`, `web-design-guidelines`, `supabase-postgres-best-practices`, `vercel-react-best-practices`, `frontend-design`, `writing-guidelines`, and `webapp-testing`) following full project onboarding.

**Architecture:**
- **Task 1 (`speed-engineer` + `frontend-design` — Images, Skeletons & Pending States):** Convert client-side image compression in `rs()` to WebP (`0.80` with JPEG fallback), add explicit `width`/`height`/`loading="lazy"`/`fetchpriority="high"` on `<img>` tags, add a layout-matching `.sk` Skeleton component for async vault/emergency views, and add pending/disabled button states during auth/vault operations.
- **Task 2 (`speed-engineer` + `vercel-react-best-practices` — Pagination & In-Memory Storage Caching):** Paginate Wallet document lists (`list()`, `listPub()`) and Settings document lists (`docs_list`) to 20 items per page with a `"عرض المزيد"` button, and cache `idc_local_vaults_v2` (`memLocalVaults`) and `idc_card_bundles_v1` (`memStoredBundles`) in memory with write/logout invalidation.
- **Task 3 (`web-design-guidelines` — Accessibility, Focus, Forms, Touch & Typography):** Bind `<label for>` in `fld()`, add `aria-label` to icon-only `.ib` buttons and `aria-hidden="true"` to `.mi` icons, add `role="status" aria-live="polite"` to `.tt` toasts, add Google Fonts `preconnect`, add `touch-action:manipulation`, `:focus-visible`, and `overscroll-behavior:contain`, and fix `...` → `…` in `404.html`.
- **Task 4 (`supabase-postgres-best-practices` + `writing-guidelines` + `speed-engineer` Profile):** Add migration `20261123000000_idc_storage_rls_index.sql` optimizing the `storage.objects` 200-file RLS check with `o.owner = (select auth.uid())`, create `AGENTS.md` with the `## Performance profile` block, and update `README.md`, `SETUP.md`, and `SECURITY.md` with gender-neutral copy and `authorize-route` deployment steps.
- **Task 5 (`webapp-testing` + `verification-before-completion`):** Run the expanded 62-check test suite (`tests/security.test.mjs`) and E2E verification (`tests/webapp_e2e_verify.py`).

**Tech Stack:** HTML5 / CSS3 / ES2022 PWA, WebCrypto, Supabase Postgres RLS & Edge Functions, Node.js Test Runner, Python/Chrome E2E.

**Spec:** `C:\Users\TIGER LAPTOP\.gemini\antigravity\brain\984fa32d-3865-4239-bcb7-9e90052e052b\onboarding_guide.md`

## Global Constraints

- All 56 existing checks in `d:\IDC\tests\security.test.mjs` plus new checks `S29`–`S34` (`62/62` total) must pass.
- All Arabic copy in code AND markdown docs (`SETUP.md`, `SECURITY.md`) must be 100% gender-neutral.
- Tier S right-sizing (`speed-engineer`): Free tier only (no Redis, no external paid CDN).

## Review Focus

- **WebP fallback on older browsers:** `c.toDataURL("image/webp", 0.80)` returns `"data:image/png..."` if a browser does not support WebP encoding; verify `d.indexOf("data:image/webp") === 0` and fall back to `c.toDataURL("image/jpeg", 0.82)`.
- **Pagination reset on tab switch:** Switching between `عامة`, `خاصة`, and `سرية` tabs must reset or scope pagination cleanly without hiding newly added items.
- **In-memory cache invalidation on Sign Out:** `idcSignOut()` must reset `memLocalVaults = null` and `memEmergencyCache = null` so `T3e` and multi-account sign-ins never see stale cached data.

---

### Task 1: WebP Image Optimization, Image Attributes, Skeleton Loader & Button Pending States (`speed-engineer` + `frontend-design`)

**Files:**
- Modify: `d:\IDC\index.html:100-108`, `d:\IDC\index.html:158`, `d:\IDC\index.html:179-192`
- Modify: `d:\IDC\idc-intro.js:30-32`
- Modify: `d:\IDC\idc-plus.js:188-196`
- Modify: `d:\IDC\idc-supabase.js:460-541`
- Test: `d:\IDC\tests\security.test.mjs`

- [ ] **Step 1: Add failing test `S29` (WebP compression, `loading="lazy"`, `fetchpriority="high"`, and `.sk` Skeleton component) in `d:\IDC\tests\security.test.mjs`**
- [ ] **Step 2: Run `node --experimental-strip-types d:\IDC\tests\security.test.mjs` and watch `S29` fail (RED)**
- [ ] **Step 3: Implement WebP compression with JPEG fallback in `rs()`, explicit `width`/`height`/`loading="lazy"`/`fetchpriority="high"`, `.sk` skeleton loader in `index.html` and `emView()`, and pending state helper `withBusyBtn` in `idc-supabase.js`**
- [ ] **Step 4: Run test suite and verify `S29` passes (GREEN)**

---

### Task 2: Wallet/Settings Pagination (Page Size 20) & In-Memory Storage Caching (`speed-engineer` + `vercel-react-best-practices`)

**Files:**
- Modify: `d:\IDC\index.html:144`, `d:\IDC\index.html:284`
- Modify: `d:\IDC\idc-settings.js:907-925`
- Modify: `d:\IDC\idc-supabase.js:81-98`, `d:\IDC\idc-supabase.js:600-610`
- Modify: `d:\IDC\idc-plus.js:68-85`
- Test: `d:\IDC\tests\security.test.mjs`

- [ ] **Step 1: Add failing test `S30` (20-item pagination with `moreItems` and in-memory `memLocalVaults` / `memStoredBundles` caches) in `d:\IDC\tests\security.test.mjs`**
- [ ] **Step 2: Run test suite and watch `S30` fail (RED)**
- [ ] **Step 3: Implement `PAGE_SIZE = 20` pagination with `"عرض المزيد"` button in `index.html` and `idc-settings.js`, and add `memLocalVaults` / `memStoredBundles` with write/logout invalidation**
- [ ] **Step 4: Run test suite and verify `S30` passes (GREEN)**

---

### Task 3: Web Interface Guidelines Compliance (`web-design-guidelines`)

**Files:**
- Modify: `d:\IDC\index.html:16-19`, `d:\IDC\index.html:33-50`, `d:\IDC\index.html:72-75`, `d:\IDC\index.html:133-155`
- Modify: `d:\IDC\404.html:5,22`
- Test: `d:\IDC\tests\security.test.mjs`

- [ ] **Step 1: Add failing test `S31` (`<label for=`, `aria-live="polite"`, `touch-action:manipulation`, `overscroll-behavior:contain`, `preconnect`, and `…` in `404.html`) in `d:\IDC\tests\security.test.mjs`**
- [ ] **Step 2: Run test suite and watch `S31` fail (RED)**
- [ ] **Step 3: Implement `web-design-guidelines` accessibility, focus, form, touch, and typography fixes in `index.html` and `404.html`**
- [ ] **Step 4: Run test suite and verify `S31` passes (GREEN)**

---

### Task 4: Storage RLS Index Migration, `AGENTS.md` Performance Profile & Gender-Neutral Docs (`supabase-postgres-best-practices` + `writing-guidelines` + `speed-engineer`)

**Files:**
- Create: `d:\IDC\supabase\migrations\20261123000000_idc_storage_rls_index.sql`
- Create: `d:\IDC\AGENTS.md`
- Modify: `d:\IDC\SECURITY.md`
- Modify: `d:\IDC\SETUP.md`
- Modify: `d:\IDC\README.md`
- Modify: `d:\IDC\sw.js`
- Test: `d:\IDC\tests\security.test.mjs`

- [ ] **Step 1: Add failing tests `S32` (Storage RLS indexed `owner` filter), `S33` (`AGENTS.md` contains `## Performance profile`), and `S34` (`SECURITY.md` & `SETUP.md` are 100% gender-neutral and document `authorize-route`) in `d:\IDC\tests\security.test.mjs`**
- [ ] **Step 2: Run test suite and watch `S32`, `S33`, `S34` fail (RED)**
- [ ] **Step 3: Create `20261123000000_idc_storage_rls_index.sql` and `AGENTS.md`, update `SECURITY.md`, `SETUP.md`, `README.md`, and bump `sw.js` to `idc-v16`**
- [ ] **Step 4: Run full 62-check security suite + 5/5 E2E verification suite**
