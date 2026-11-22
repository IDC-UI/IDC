# Personal User URLs (`/IDC/<id>`), Anti-IDOR Authorization Middleware, Auto-QR & Step-by-Step NFC Guide, LinkedIn/Links & Bank Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement clean per-user URLs (`/IDC/1111`), a backend Authorization Middleware (`authorize-route` Edge Function + Postgres RLS table `idc_user_routes`) that auto-opens the owner's dashboard while blocking IDOR attacks (`403`), automatic QR code generation + a step-by-step NFC programming guide on first registration and profile pages, plus LinkedIn/personal links and Bank Accounts (`IBAN / InstaPay`).

**Architecture:**
1. **Database & Backend Middleware (`supabase-postgres-best-practices`)**: `public.idc_user_routes` table with RLS (`(select auth.uid())` initPlan caching) + `supabase/functions/authorize-route/index.ts` JWT & rate-limited ownership middleware.
2. **Clean URL Router (`404.html` + `idc-plus.js`)**: Intercepts `/IDC/<route_id>`, preserves the clean URL via `history.replaceState`, and enforces both server-side (`authorize-route`) and client-side anti-IDOR authorization guards.
3. **Onboarding Auto-QR & Step-by-Step NFC Guide + LinkedIn/Links + Bank Accounts (`index.html`, `idc-plus.js`, `idc-settings.js`)**: Auto-generates the user's short URL and downloadable QR code on first registration (`setup` screen) and inside `الطوارئ و NFC`, displays a 4-step NFC card programming guide, and adds `linkedin`, `link`, and `bank` (defaulting to `private` 3-password vault) to profile and documents.

**Tech Stack:** Supabase Postgres (RLS, PL/pgSQL), Deno Edge Functions (`supabase-js@2.118.0`), Vanilla ES2022 PWA, WebCrypto (`AES-256-GCM`), Node.js Test Runner (`tests/security.test.mjs`), Python/Chrome E2E Verification (`tests/webapp_e2e_verify.py`).

**Spec:** `d:\IDC\docs\superpowers\specs\2026-11-22-user-routes-auth-links-bank-nfc-design.md`

## Global Constraints

- All existing 48 security & gender-neutral copy checks in `d:\IDC\tests\security.test.mjs` must pass plus new checks `S24`–`S28` and behavioral anti-IDOR tests `T9a`–`T9c`.
- Every new Arabic string must be 100% gender-neutral (no feminine-only imperatives matching `femRe` in `S23`).
- Edge Function `authorize-route` must pin `npm:@supabase/supabase-js@2.118.0`, verify JWT via `auth.getUser`, enforce rate limiting via `withinRateLimit`, and use the shared CORS allow-list (`gate`, `reply`).

## Review Focus

- **IDOR URL Tampering (`/IDC/1111` -> `/IDC/1112` while logged in as user `1111`):** Must never expose user `1112`'s vault or private session; must show the IDOR security notice and restrict access to the external card gate.
- **First-Time Registration (`psave` -> `setup`):** Must immediately display the user's auto-generated short URL (`/IDC/<id>`), rendered QR code, Download QR button, and the 4-step NFC programming guide.
- **Bank Accounts Default Privacy:** Creating a `bank` item must support storing Bank Name, IBAN / Account Number / InstaPay, and default to `private` when added from the wallet or bank quick action.

---

### Task 1: Database Table `public.idc_user_routes` & Backend Authorization Middleware (`supabase/functions/authorize-route/index.ts`)

**Files:**
- Create: `d:\IDC\supabase\migrations\20261122010000_idc_user_routes.sql`
- Create: `d:\IDC\supabase\functions\authorize-route\index.ts`
- Modify: `d:\IDC\tests\security.test.mjs`

- [ ] **Step 1: Add failing tests `S24` and `S25` in `d:\IDC\tests\security.test.mjs`**
- [ ] **Step 2: Run `node --experimental-strip-types d:\IDC\tests\security.test.mjs` and watch `S24`, `S25` fail (RED)**
- [ ] **Step 3: Create `20261122010000_idc_user_routes.sql` and `supabase/functions/authorize-route/index.ts`**
- [ ] **Step 4: Run test suite and verify `S24`, `S25` pass (GREEN)**

---

### Task 2: Clean Path Router (`404.html`) & Client/Server Anti-IDOR Middleware (`idc-plus.js` & `idc-supabase.js`)

**Files:**
- Create: `d:\IDC\404.html`
- Modify: `d:\IDC\idc-plus.js`
- Modify: `d:\IDC\idc-supabase.js`
- Modify: `d:\IDC\tests\security.test.mjs`

- [ ] **Step 1: Add failing tests `S26` and behavioral IDOR test `T9` in `d:\IDC\tests\security.test.mjs`**
- [ ] **Step 2: Run test suite and watch `S26`, `T9` fail (RED)**
- [ ] **Step 3: Create `404.html` and implement `window.IDCAuthMiddleware` in `idc-plus.js` + `idc-supabase.js`**
- [ ] **Step 4: Run test suite and verify `S26`, `T9` pass (GREEN)**

---

### Task 3: First-Time Registration Auto-QR, Step-by-Step NFC Programming Guide, LinkedIn/User Links & Bank Accounts (`index.html`, `idc-plus.js`, `idc-settings.js`, `sw.js`)

**Files:**
- Modify: `d:\IDC\index.html`
- Modify: `d:\IDC\idc-plus.js`
- Modify: `d:\IDC\idc-settings.js`
- Modify: `d:\IDC\sw.js`
- Modify: `d:\IDC\tests\security.test.mjs`
- Modify: `d:\IDC\tests\webapp_e2e_verify.py`

- [ ] **Step 1: Add failing tests `S27` (Auto-QR & NFC step-by-step guide) and `S28` (LinkedIn, user links & Bank Accounts) in `d:\IDC\tests\security.test.mjs`**
- [ ] **Step 2: Run test suite and watch `S27`, `S28` fail (RED)**
- [ ] **Step 3: Implement Auto-QR + NFC guide on `setup()` & `emPage()`, add `linkedin` / `link` / `bank` item types and profile fields, and bump `sw.js` to `idc-v15`**
- [ ] **Step 4: Run full security suite (`tests/security.test.mjs`), E2E suite (`tests/webapp_e2e_verify.py`), and real Chrome verification**
