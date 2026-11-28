# Direct LinkedIn & Hourly Temporary Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the user's saved LinkedIn profile URL directly in one tap (prompting once if unset) and generate self-contained `#s=...` temporary external links for 4h / 7h / 24h (or custom hours) scoped to CV only, Public Profile only, or Both.

**Architecture:** `idc-plus.js` provides `window.idcOpenLinkedIn(forceEdit)` (validating/normalizing `https://` URLs and saving `S.p.linkedin`) and `window.IDCTempShare` (`openModal()`, `buildLink(scope, hours)`, `parseHash(hash, nowMs)`, and external `#s=...` read-only view before auth). `index.html` and `idc-settings.js` wire the Home quick-actions, Personal Info row, CV page, and Settings sharing screen to these entry points, while `idc-supabase.js` persists `tempShare` metadata safely inside the vault snapshot.

**Tech Stack:** Vanilla ES5/ES6 JavaScript, WebCrypto/UTF-8 Base64URL (`idc-plus.js`), HTML5/CSS3 custom properties, Node test runner (`tests/security.test.mjs`), Python Playwright/HTTP E2E (`tests/webapp_e2e_verify.py`).

**Spec:** `docs/superpowers/specs/2026-11-28-linkedin-and-temp-share-design.md`

## Global Constraints

- Tier S performance profile (`AGENTS.md`): zero extra database queries, zero base64 photos in `#s=...`.
- 100% gender-neutral Arabic & English copy (`writing-guidelines`, enforced by `S23`).
- Strict `https://` URL validation on LinkedIn and personal links (reject `javascript:`, `data:`, `http:` or malformed URLs).
- Never include `private` or `secret` items, bank cards, or full National ID in `#s=...`.
- Dark/Light theme parity (`#0f1426` / `#151B30`), `:focus-visible`, `aria-live="polite"`, `prefers-reduced-motion`.

## Review Focus

1. `javascript:alert(1)` or bare `linkedin.com/in/user` entered as LinkedIn URL -> `javascript:` is rejected with an error; bare `linkedin.com/in/user` is normalized to `https://linkedin.com/in/user`.
2. Expired `#s=...` link (`nowMs > exp`) -> `IDCTempShare.parseHash` returns `{ expired: true, data: null }` and UI renders expiration notice with zero profile/CV fields leaked.
3. Scope isolation (`cv` vs `profile` vs `both`) -> `cv` excludes personal phone/governorate profile card fields unless part of CV items, `profile` excludes CV sections, and neither ever includes `private`/`secret` vault items or full `nid`.
4. Custom hours out of range (`0`, `-5`, `NaN`, `9999`) -> clamped/validated cleanly to `1..168` hours (up to 7 days).
5. Corrupted or tampered `#s=not-valid-base64` hash -> fails closed (`{ invalid: true, data: null }`) without throwing uncaught exceptions.

---

### Task 1: Direct LinkedIn Profile Flow & URL Sanitizer

**Files:**
- Modify: `idc-plus.js`
- Modify: `index.html`
- Modify: `idc-settings.js`
- Test: `tests/security.test.mjs`

**Interfaces:**
- Produces:
  - `window.idcNormalizeHttpsUrl(raw)` -> returns normalized `https://...` string or `""` if invalid/unsafe.
  - `window.idcOpenLinkedIn(forceEdit)` -> if `!forceEdit` and valid `S.p.linkedin`, opens URL via `window.open(url, "_blank", "noopener,noreferrer")`; otherwise opens modal to save/update `S.p.linkedin`.

- [x] **Step 1: Write failing tests `S38` and `T10` in `tests/security.test.mjs`**
- [x] **Step 2: Run `node --experimental-strip-types tests/security.test.mjs` to verify RED**
- [x] **Step 3: Implement `idcNormalizeHttpsUrl` & `idcOpenLinkedIn` in `idc-plus.js`, wire Home `.qa` + Personal Info clickable link + edit button in `index.html`, and wire Settings Connected Accounts LinkedIn action in `idc-settings.js`**
- [x] **Step 4: Verify tests pass**

---

### Task 2: Hourly Temporary Share (`#s=...`) for CV / Profile / Both

**Files:**
- Modify: `idc-plus.js`
- Modify: `index.html`
- Modify: `idc-settings.js`
- Modify: `idc-supabase.js`
- Modify: `sw.js`
- Test: `tests/security.test.mjs`

**Interfaces:**
- Produces:
  - `window.IDCTempShare.buildLink(opts)` (`opts = { scope: "cv" | "profile" | "both", hours: number, nowMs?: number }`) -> `{ url, exp, scope, hours }`.
  - `window.IDCTempShare.parseHash(hashStr, nowMs)` -> `{ active: boolean, expired?: boolean, invalid?: boolean, data: object | null }`.
  - `window.IDCTempShare.openModal(defaultScope)` -> opens modal with scope selector (`cv` / `profile` / `both`), hour presets (`4`, `7`, `24`) + custom hours (`1–168`), active link copy/share, and replace option.

- [x] **Step 1: Write failing tests `S39` and `T11` in `tests/security.test.mjs`**
- [x] **Step 2: Run `node --experimental-strip-types tests/security.test.mjs` to verify RED**
- [x] **Step 3: Implement `window.IDCTempShare` + `#s=...` external viewer in `idc-plus.js`, add triggers in `index.html` (Home `.qa` + `hCV`/`pcv`) and `idc-settings.js` (`share` screen), bump `sw.js` to `idc-v18`**
- [x] **Step 4: Run `node --experimental-strip-types tests/security.test.mjs` and `python tests/webapp_e2e_verify.py` to verify GREEN**
- [x] **Step 5: Commit and push to `origin main`**
