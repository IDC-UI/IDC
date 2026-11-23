# IDC — Agent & Engineering Guidelines

## Performance profile
- Tier: S  (decided 2026-11-23)
- Expected users (6 months): 100–1,000
- Biggest growing tables: `idc_vaults` (items & logs), `storage.objects` (`idc-vault` encrypted attachments), `idc_user_routes`, `idc_rate_limits` (~10k–100k rows/year)
- Freshness needs: Within 1 minute for general updates; immediate for Emergency data on NFC card scan
- Images: Avatars, logos, and encrypted document/certificate photos (resized & compressed to WebP client-side before encryption)
- Infra budget: Free tier only (GitHub Pages + Supabase Free Tier — no Redis or paid image CDN)
- Always use the `speed-engineer` skill when touching DB queries/schema, lists, data fetching, images or loading states.

## Writing & UI Standards
- All Arabic and English copy must remain 100% gender-neutral (`writing-guidelines`).
- Follow `web-design-guidelines` and `frontend-design` for dark/light theme parity (`#0f1426` / `#151B30`), keyboard `:focus-visible`, `aria-live="polite"`, and reduced-motion support.
- Run `node --experimental-strip-types tests/security.test.mjs` and `python tests/webapp_e2e_verify.py` before claiming completion (`verification-before-completion`).
