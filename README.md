# IDC Digital Identity Wallet

IDC is an Arabic-first, mobile-friendly digital identity wallet. It brings a profile, documents, certificates, an emergency card, and a CV into one installable Progressive Web App.

## The Journey

IDC started as a static browser demo. The first pass exposed a few important gaps: an enhancement script was not being loaded, an embedded script tag stopped the app from parsing, and the project described simulated security as if it were active. The app now loads its image and QR features correctly, starts with an introduction, and clearly separates working features from setup that still needs a real backend.

The next step is a GitHub Pages frontend connected to Supabase. The repository now includes Supabase Auth integration, a database migration with row-level security, and two authenticated Edge Functions for encrypted vault writes and file uploads. These backend files are ready to deploy, but the live project URL and public API key have not yet been configured.

## Features

- Arabic RTL interface with an English display option.
- Animated first-visit welcome in Arabic or English, with signup, sign-in, and sample-preview paths.
- The intro follows the saved language choice or device language, with an on-screen Arabic/English toggle.
- PWA manifest, offline shell, and install prompt for mobile devices.
- Image attachment preview, PDF download, and emergency-card QR.
- Supabase email/password signup, email confirmation, sign-in, and password recovery.
- AES-256-GCM encryption of vault data in the browser before storage.
- Private Supabase Storage for encrypted PDF and JPG/PNG/WEBP attachments up to 5 MiB.
- Server-side JWT, payload-shape, file-size, filename, MIME, and encrypted-envelope checks.
- Row-level security that limits vault rows and Storage objects to their owner.

## Architecture

GitHub Pages serves the static frontend. Supabase provides authentication, Postgres, private Storage, and Edge Functions. The frontend uses the public `publishable` or `anon` key only; no service-role key belongs in this repository or browser code.

The browser derives a 256-bit vault key from the account password with PBKDF2-SHA-256 and a random salt. Vault JSON is encrypted with AES-256-GCM before it is sent to `secure-vault`; only the salt and ciphertext are accepted by that function. The authenticated user ID comes from the verified JWT, not from a client-supplied owner ID. Postgres RLS independently restricts reads and writes to that user.

Attachments are encrypted in the browser before upload. `secure-upload` requires a valid user session and checks the encrypted file's maximum size, UUID filename, MIME type, and IDC envelope header before storing it under the authenticated user's folder. RLS protects the private bucket as a second boundary. Images are downloaded and decrypted on the device for preview; PDFs are downloaded and decrypted for the user.

## Supabase Setup

1. Create a Supabase project.
2. In Authentication URL Configuration, set the GitHub Pages URL as the Site URL and add it to Redirect URLs. Enable email confirmation and set the server-side minimum password length to 12 characters.
3. Copy the Project URL and public `publishable` or `anon` key into [`supabase-config.js`](supabase-config.js):

   ```js
   window.IDC_SUPABASE_CONFIG = {
     url: "https://YOUR_PROJECT_REF.supabase.co",
     publishableKey: "YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY"
   };
   ```

4. Install the Supabase CLI, authenticate, and link this repository to the project:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   supabase functions deploy secure-vault
   supabase functions deploy secure-upload
   ```

5. If the Edge Functions do not receive `SUPABASE_ANON_KEY` automatically, configure the public project key in Edge Function secrets. Never use a service-role or secret key in the frontend.
6. In GitHub repository settings, enable Pages from the `main` branch and repository root. The `supabase/` directory is deployed with the Supabase CLI; GitHub Pages serves the root static files.

Until Supabase is configured, account signup and real-data persistence are disabled. The sample preview remains local and is for demonstration only.

## Security Boundaries

- Email validation in the browser improves feedback; Supabase Auth remains the authority for account creation, email confirmation, and passwords.
- Edge Functions verify the user session and validate request structure and limits. Because the vault and files are end-to-end encrypted, the server cannot inspect or sanitize their plaintext contents. Content moderation or malware scanning would require a separate design that does not expose protected plaintext.
- The 5 MiB attachment limit applies to the original file. The encrypted upload includes a small AES-GCM envelope overhead.
- SMS verification and two-factor authentication are not implemented in this version.
- Password recovery cannot restore an E2E vault without a password that derives the original key. The recovery flow refuses to replace the account password if the proposed password cannot decrypt the existing vault.
- The emergency QR is a separate sharing mechanism: its decryption key is in the URL fragment. Anyone with the complete QR/link can read the emergency fields selected by the owner.

Do not store real personal data until a Supabase project is configured, the migration is applied, both Edge Functions are deployed, and email confirmation is tested on the published GitHub Pages URL.

## Project Files

- [`index.html`](index.html): app UI, onboarding, profile, wallet, and browser validation.
- [`idc-plus.js`](idc-plus.js): emergency-card encryption, QR, image preview, and PWA installation.
- [`idc-intro.js`](idc-intro.js) and [`idc-intro.css`](idc-intro.css): first-visit welcome animation and language selection.
- [`idc-supabase.js`](idc-supabase.js): Supabase Auth, encrypted vault lifecycle, and encrypted attachment handling.
- [`supabase/migrations/20261027000000_idc_vault.sql`](supabase/migrations/20261027000000_idc_vault.sql): vault table, private bucket, grants, and RLS policies.
- [`supabase/functions/secure-vault/index.ts`](supabase/functions/secure-vault/index.ts): authenticated server-side vault payload validation and persistence.
- [`supabase/functions/secure-upload/index.ts`](supabase/functions/secure-upload/index.ts): authenticated encrypted file validation and Storage upload.
- [`SETUP.md`](SETUP.md): concise deployment steps.
