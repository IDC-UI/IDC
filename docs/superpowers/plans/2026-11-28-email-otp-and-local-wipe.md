# Email OTP Password Recovery, Recovery Key & Local-Only Wipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable in-app Email OTP password recovery (`verifyOtp` with zero external `localhost` redirects), zero-data-loss vault recovery via Recovery Key or in-app Biometrics, and local-device-only wipe after 5 failed password attempts while preserving cloud database data.

**Architecture:** `idc-supabase.js` adds `wipeLocalDeviceOnly()` (triggered on 5 failed password attempts without touching `idc_vaults` on Supabase), `doVerifyResetOtp()` (`client.auth.verifyOtp` for 6–8 digit Email OTPs), binary Base64URL `IDCRecoveryEnvelope` (`"IDCR"` magic header wrapping `vaultKey` under a PBKDF2-derived Recovery Key so `ciphertext` stays strictly `[A-Za-z0-9_-]+`), `doF3()` recovery with Recovery Key or explicit fresh-vault confirmation, and `idcChangePasswordInApp()` for users already unlocked via Fingerprint. `index.html`, `idc-settings.js`, and `supabase/config.toml` wire the OTP UI, Settings Password/Recovery Key screens, English translations, and production `site_url`.

**Tech Stack:** Vanilla JavaScript, WebCrypto (`AES-256-GCM` + `PBKDF2`), `@supabase/supabase-js@2.118.0`, Node VM test suite (`tests/security.test.mjs`), Python HTTP E2E (`tests/webapp_e2e_verify.py`).

**Spec:** `docs/superpowers/specs/2026-11-28-email-otp-and-local-wipe-design.md`

## Global Constraints

- Never delete or overwrite remote `idc_vaults` on failed login attempts — wipe ONLY local client storage (`localStorage` + `IndexedDB`).
- Keep `ciphertext` 100% Base64URL (`/^[A-Za-z0-9_-]+$/`) so `secure-vault` Edge Function accepts it with zero backend schema changes.
- Maintain backwards compatibility with existing v1 `IDCrypto.enc` vaults that do not yet have an `"IDCR"` header.
- 100% gender-neutral Arabic & English copy (`S23`) and full English dictionary coverage (`S40`).

## Review Focus

1. Existing v1 vault without `"IDCR"` header -> `decryptVaultPayload` detects missing `[73,68,67,82]` prefix and decrypts directly via `IDCrypto.dec(ciphertext, vaultKey)`.
2. 5 wrong login attempts -> wipes `idc_local_vaults_v2` and local caches, keeps `throttled` back-off message with `جرّب بعد`, and makes 0 calls to delete/upsert remote `idc_vaults`.
3. Email OTP verification -> tries `verifyOtp({ email, token, type: "recovery" })` first; if Supabase returns error (e.g. OTP sent via `signInWithOtp`), falls back cleanly to `type: "email"`.
4. `doF3` without Recovery Key when remote vault exists -> explains clearly that old E2E vault needs the Recovery Key, OR allows setting the new password if the user checks explicit confirmation `#resetVaultConfirm`.
5. Unlocked user via Fingerprint (`currentUser && vaultKey` in memory) -> `idcChangePasswordInApp(newPw, confirmPw)` re-keys `vaultSalt` + `vaultKey`, updates Supabase Auth password, and persists re-encrypted vault without asking for the forgotten old password.

---

### Task 1: TDD Tests (`S42` & `T14a`–`T14d`) in `tests/security.test.mjs`

- [x] **Step 1: Add `verifyOtp` hook in `boot()` and write `S42` + `T14a`–`T14d`**
- [x] **Step 2: Run `node --experimental-strip-types tests/security.test.mjs` to verify RED**

---

### Task 2: Core Auth, OTP, Recovery Key Envelope & Local Wipe (`idc-supabase.js`, `supabase/config.toml`)

- [x] **Step 1: Set `site_url` and `additional_redirect_urls` to `https://idc-ui.github.io/IDC/` in `supabase/config.toml`**
- [x] **Step 2: Implement `wipeLocalDeviceOnly()`, `IDCRecoveryEnvelope`, `idcEnsureRecoveryKey()`, `doVerifyResetOtp()`, enhanced `doF3()`, and `idcChangePasswordInApp()` in `idc-supabase.js`**

---

### Task 3: UI Wiring & Translations (`index.html`, `idc-settings.js`, `sw.js`)

- [x] **Step 1: Update `f1` / `f2` / `f3` auth screens and `EN` translations in `index.html` for Email OTP + Recovery Key / Reset option**
- [x] **Step 2: Wire Settings `Change password` (`idcChangePasswordInApp` — no old password needed when already unlocked!) and `Recovery Key` screen in `idc-settings.js`, and bump `sw.js` to `idc-v22`**
- [x] **Step 3: Run `node --experimental-strip-types tests/security.test.mjs` and `python tests/webapp_e2e_verify.py` to verify GREEN**
- [x] **Step 4: Commit and push to `origin main`**
