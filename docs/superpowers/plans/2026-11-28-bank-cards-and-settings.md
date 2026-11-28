# Bank Cards Templates & Settings Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start real accounts with zero fake bank cards, let users clear/remove/edit cards and IBAN/InstaPay, render authentic Egyptian bank & fintech card designs (NBE, Banque Misr, CIB, QNB, Telda, Klivvr, Nexta, myFawry, InstaPay, etc.) from a unified vector template, and add a dedicated Banks & Payment Cards section in Settings.

**Architecture:** `idc-bank.js` defines `BANKS` (16 Egyptian banks & payment companies with custom palettes, patterns, and inline SVG logos) and network SVG badges (`meeza`, `VISA`, `Mastercard`), updates `ensureBankState()` so real accounts start with `cards: []`, and exposes `IDCBank.getProviders()`, `IDCBank.clearAllCards()`, `IDCBank.removeCardAt()`, and `IDCBank.saveIbanValues()`. `idc-settings.js` adds a top-level `banking` section and upgrades `SC.banks` to manage live `IDCBank` cards, IBAN/InstaPay, and balance privacy.

**Tech Stack:** Vanilla JavaScript, Inline SVG & CSS3 card skins, Node test runner (`tests/security.test.mjs`), Python HTTP E2E (`tests/webapp_e2e_verify.py`).

**Spec:** `docs/superpowers/specs/2026-11-28-bank-cards-and-settings-design.md`

## Global Constraints

- Real accounts (`!S.preview`) never auto-populate fake `Nile Bank` cards.
- Only `last4` digits are persisted; full 16-digit PAN and CVV are never stored.
- All logos and card art are self-contained CSS + inline SVG (strictly CSP-compliant and offline-ready).
- 100% gender-neutral Arabic & English copy (`S23`) and full English translation parity (`S40`).

## Review Focus

1. Existing user with legacy `"Nile Bank"` demo cards saved in `S.bk` -> `clearAllCards(true)` wipes `S.bk.cards` to `[]` and resets `sel = 0`.
2. Light-background gold/yellow cards (`bm` Visa Gold, `fawry` myFawry) -> apply dark-ink foreground class `.bk-ink-dark` so text and digits remain legible.
3. Custom bank selection (`bankId === "other"`) -> requires non-empty custom bank name and escapes it via `esc()`.
4. Card number validation -> accepts 16 digits (with or without spaces), strips spaces, stores only `.slice(-4)`.
5. Removing the last remaining card -> renders empty-state invitation cleanly without out-of-bounds `bk.cards[bk.sel]` errors.

---

### Task 1: Authentic Bank/Fintech Card Templates & Full Card/IBAN Management (`idc-bank.js`)

**Files:**
- Modify: `idc-bank.js`
- Test: `tests/security.test.mjs`

- [x] **Step 1: Write failing tests `S41` and `T13a`–`T13d` in `tests/security.test.mjs`**
- [x] **Step 2: Run `node --experimental-strip-types tests/security.test.mjs` to verify RED**
- [x] **Step 3: Implement 16-provider `BANKS` catalog, unified SVG chip/contactless/network/bank-logo card template, empty default cards for real users, `clearAllCards`, `removeCardAt`, `openIbanModal`/`saveIbanValues`, and provider selector in `idc-bank.js`**

---

### Task 2: Dedicated Banks & Payment Cards Section in Settings (`idc-settings.js`, `index.html`, `sw.js`)

**Files:**
- Modify: `idc-settings.js`
- Modify: `index.html`
- Modify: `sw.js`
- Test: `tests/security.test.mjs`

- [x] **Step 1: Add `banking` top-level topic and live `bk_cards` block in `idc-settings.js` (list & remove cards, clear all, add card, edit IBAN/InstaPay, toggle hide balance)**
- [x] **Step 2: Ensure any new labels in `index.html` are in `EN` and bump `sw.js` to `idc-v20`**
- [x] **Step 3: Run `node --experimental-strip-types tests/security.test.mjs` and `python tests/webapp_e2e_verify.py` to verify GREEN**
- [x] **Step 4: Commit and push to `origin main`**
