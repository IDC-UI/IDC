# Design Spec: Personal User URLs (`/IDC/<id>`), Anti-IDOR Authorization Middleware, Auto-QR & NFC Step-by-Step Guide, LinkedIn/User Links, and Bank Accounts

## 1. Intent & Why
IDC is built around a personal NFC smart card and a QR code fallback for devices without NFC. Each user needs a clean, permanent personal URL (`https://idc-ui.github.io/IDC/1111`) that:
1. Is **automatically generated** the first time they register, immediately producing a **downloadable QR Code** and a **Step-by-Step Guide** on how to program their physical NFC card to that URL.
2. **Automatically opens their full personal dashboard** when opened on their own authenticated device.
3. **Strictly blocks IDOR (Insecure Direct Object Reference) attacks** via a backend **Authorization Middleware** so that changing `/1111` to `/1112` in the URL never exposes another user's account, vault, bank accounts, or private data.
4. Supports **LinkedIn & personal links** per user and **Bank Accounts** (Bank name, Account number, IBAN, InstaPay).

## 2. Goals, Non-Goals, and Anti-Goals
- **Goals:**
  - Clean path routing (`https://idc-ui.github.io/IDC/<route_id>`) on GitHub Pages via `404.html` + `index.html` path resolution.
  - Database-backed route registry (`public.idc_user_routes`) with strict Row-Level Security (RLS) and an Edge Function Authorization Middleware (`supabase/functions/authorize-route/index.ts`).
  - Automatic QR Code generation + Step-by-Step NFC programming guide during first-time registration (`setup` screen) and on the user's profile/NFC page.
  - First-class support for **LinkedIn & Custom User Links** (`linkedin`, `links`) and **Bank Accounts** (`bank` — Bank Name, Account Number / IBAN / InstaPay) with full encryption inside the user's vault.
- **Non-Goals:**
  - Moving hosting away from `https://idc-ui.github.io/IDC/`.
- **Anti-Goals (Failure Conditions):**
  - Allowing any user or attacker to view another user's vault, private items, or bank details by changing the `<route_id>` in the URL (`IDOR`).
  - Exposing raw Supabase UUIDs or unencrypted vault data in public endpoints.

## 3. Chosen Approach (Approach 1)
We considered three approaches:
1. **Approach 1 (Selected): Supabase Edge Function Authorization Middleware + Postgres RLS + GitHub Pages `404.html` Clean-Path Router.**
   - *Why chosen:* Keeps `https://idc-ui.github.io/IDC/<id>` clean, enforces JWT ownership checks on the backend (`authorize-route` Edge Function + Postgres RLS), and requires no external server migration.
2. **Approach 2: Vercel Edge Middleware Migration.**
   - *Why rejected:* Changes the canonical GitHub Pages URL.
3. **Approach 3: Long HMAC-Signed Query URLs Only.**
   - *Why rejected:* Produces long URLs unsuitable for small NTAG213 (144-byte) NFC chips and human sharing.

## 4. Architecture & Component Design

### A. Clean User URLs (`/IDC/1111`) & GitHub Pages `404.html` Router
- When a browser requests `https://idc-ui.github.io/IDC/1111`, GitHub Pages serves `404.html`.
- `404.html` validates the path segment (`/IDC/<route_id>`), stores the requested `route_id` in `sessionStorage` (`idc_requested_route`), and redirects to `/IDC/?route=<route_id>`, where `index.html` uses `history.replaceState` to restore the clean path `/IDC/1111` in the browser address bar.
- Because `https://idc-ui.github.io/IDC/1111` is only ~34 bytes, it easily fits inside an **NTAG213 (144-byte)** NFC chip!

### B. Backend Authorization Middleware (`authorize-route` Edge Function + `public.idc_user_routes`)
- **Database Table (`public.idc_user_routes`)**:
  - `route_id text primary key check (route_id ~ '^[a-z0-9_-]{3,24}$')`
  - `user_id uuid not null unique references auth.users(id) on delete cascade`
  - `public_em jsonb not null default '{}'::jsonb` (ONLY the public responder emergency fields the owner explicitly opted to share; never vault ciphertext, never private items, never private bank accounts)
  - `card_gate jsonb not null default '{}'::jsonb` (Encrypted public-card blob locked by the owner's External Card Password)
  - `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`
  - **RLS Policies**:
    - Only the authenticated owner (`user_id = (select auth.uid())`) can `INSERT`, `UPDATE`, or `DELETE` their route row.
    - Direct table `SELECT` is revoked from `anon` and `authenticated`; all route lookups go through the rate-limited **`authorize-route`** Edge Function Middleware.
- **Edge Function Middleware (`supabase/functions/authorize-route/index.ts`)**:
  - Rate-limited via `withinRateLimit` (prevents route enumeration / brute-force scanning of `/1111`, `/1112`, etc.).
  - Accepts `{ action: "resolve" | "claim", route_id }`.
  - Extracts and verifies the caller's `Authorization: Bearer <JWT>` via `client.auth.getUser(token)`.
  - **Authorization Logic**:
    1. **Caller is the verified owner (`jwt.user.id === route.user_id`)**:
       - Returns `{ status: 200, role: "owner", route_id, authorized: true }`.
       - The app automatically opens the owner's personal workspace/vault (after local biometric or password unlock if the vault key is not yet in memory).
    2. **Caller is NOT the owner (e.g., another logged-in user who changed `/1111` to `/1112` in the URL, or an unauthenticated device scanning the NFC card)**:
       - If a different logged-in user tampered with the URL (`jwt.user.id !== route.user_id`), the middleware returns `role: "visitor_idor_blocked"`, strips any session privilege, displays an explicit **Security & Authorization Notice (`تنبيه أمان: هذا الرابط يخص حسابًا آخر — غير مصرح لك بفتح الحساب الكامل`)**, and restricts the view strictly to the **External Card Gate** (Emergency Responder Mode + External Card Password prompt).
       - If the `route_id` does not exist, returns `404 Not Found`.

### C. First-Time Registration: Auto-Generated URL + QR Code + Step-by-Step NFC Guide
- On first-time profile save (`psave()` -> `setup()` screen) and inside the **Emergency & NFC Card Studio (`الطوارئ و NFC`)**:
  1. **Personal URL Box**: Displays `https://idc-ui.github.io/IDC/<route_id>` with one-tap **Copy Link** and customizable `route_id` (defaults to a unique 4-to-6 digit code like `1111` or username slug).
  2. **Automatic QR Code**: Rendered automatically on screen as soon as the user finishes registration, with a **Download QR (PNG)** button for phones without NFC.
  3. **Step-by-Step NFC Card Programming Guide (`إزاي تبرمج كارت الـ NFC خطوة بخطوة على صفحة بياناتك`)**:
     - **Step 1**: Copy your personal short link (`https://idc-ui.github.io/IDC/1111`) or tap **"برمجة كارت NFC مباشرة"** (if on Android Chrome with Web NFC).
     - **Step 2**: For iPhone or any phone using **NFC Tools**: open *NFC Tools* → tap **Write** → **Add a record** → **URL / URI** → paste your personal link.
     - **Step 3**: Tap **Write** and hold the physical NFC card against the top-back of your phone for 1–2 seconds until it vibrates.
     - **Step 4**: Test by tapping the card: on your own phone it opens your account automatically; on anyone else's phone it opens your Emergency & External Password Gate!

### D. LinkedIn, Personal User Links, and Bank Accounts
1. **LinkedIn & Personal Links**:
   - Added to Profile (`S.p.linkedin`, `S.p.links`) and as document/item types (`linkedin: "LinkedIn"`, `link: "رابط شخصي"`):
     - Displayed on the back of the 3D IDC Identity Card and in Personal Info with clickable verified links.
2. **Bank Accounts (`حسابات البنك`)**:
   - New item category `bank: "حساب بنكي"` (with icon `account_balance`) and dedicated structured fields:
     - **Bank Name (`اسم البنك`)** (e.g., CIB, NBE, Banque Misr, QNB, InstaPay)
     - **Account Number / IBAN / InstaPay Address (`رقم الحساب / IBAN / عنوان InstaPay`)**
     - **Visibility Level (`القسم`)**: Defaults to **`خاصة (Private)`** (sealed inside the 3-password + Fingerprint Private Partition so no one scanning the card can see it), with the option to mark a receive-only IBAN/InstaPay as **`عامة (Public)`** if the user wants it visible when unlocking the card with the External Password.
