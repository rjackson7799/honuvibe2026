# Okada Kazuchika — gated site + admin concept preview

**Status: DELIVERED 2026-09-15** (code for the branded login shipped in the same
change — see "Product work" below).

## What was delivered

Two Claude Design bundles for Okada Kazuchika ("The Rainmaker", pro wrestler —
a management/press site plus the admin tool behind it), a new Studio prospect.

| | |
|---|---|
| Slug | `okada-5a5c1a2742` |
| Link | `https://www.honuvibe.ai/api/preview/okada-5a5c1a2742` |
| Password | in the `client_previews` row — deliberately not written into the repo |
| Row id | `fd0f1b6a-79dc-45ee-8bae-bbdf2afcd13c` |
| Expires | **2026-10-31** (extend via `expires_at`) |
| Contents | `index.html` board → `site.html` (13.94 MB), `admin.html` (9.55 MB); `logo.png` (75 KB), `bg.jpg` (184 KB) |
| Lead | `studio_leads` is empty on prod, so `lead_id` is NULL |

## Product work that came out of it

1. **Branded login backdrop.** The gate's password page now takes an optional
   `bg.jpg` at the export root (≤ 600 KB) and paints it full-bleed under a dark
   gradient overlay, in a glass card, alongside the existing `logo.png`
   convention. Same inlining rule as the logo (viewer has no cookie yet), same
   per-instance cache + single-flight (now keyed per file), same CSP — nothing
   remote can ever be added to that page. The page chrome was restyled to be
   brand-neutral (no green GitHub button) so the client's logo and photo carry
   the identity.
2. **`scripts/prep-preview.mjs`** — one command from a manifest to a ready
   export dir: title rewrite (`Bundled Page` → real), `robots noindex`,
   analytics strip, absolute-path warning, branding copy, and a generated
   **preview board** (`index.html`) with one panel per concept. Unit-tested.
3. **Skill rewrite** (`~/.claude/skills/studio-client-preview`): manifest-driven
   flow, `manifest.example.json`, and `render-wordmark.ps1` (renders a
   two-line wordmark + kicker to PNG with .NET — headless Chrome hangs on this
   machine; headless Edge works for screenshots).

## Assets

- **Wordmark**: rendered from the site's own type (Zen Antique for the name,
  Zen Kaku Gothic New 500 for the kicker; palette from the bundle's thumbnail
  SVG — cream `#f4f1ea`, gold `#c9a24a`, ink `#0a0a0c`).
- **Background**: Ryan's reference was a chat attachment (empty ring, gold
  light beams, crimson banners) that never reached disk, and it is neither in
  `~/Downloads` nor in either bundle's embedded images. A stand-in was
  generated (Higgsfield `gpt_image_2_5`, 1 credit) to match the brief. **To swap
  in the original:** save it as `bg.jpg` (≤ 600 KB, ~1920 px wide), replace the
  file in the export dir, re-run the upload script — no row change, no deploy.

## Prod steps performed

1. `scripts/prep-preview.mjs okada-preview.json okada-export` → 5 files.
2. `scripts/upload-preview.mjs okada-export okada-5a5c1a2742` → 5 objects.
3. Upsert into `client_previews` via the service-role REST endpoint.

## Verification (prod, before the branding deploy)

| Check | Result |
|---|---|
| Bare slug | 303 → `/index.html` |
| Entry, no cookie | 401 password page with the logo inlined (backdrop appears after deploy) |
| Correct password | 303 + `HttpOnly; Secure; SameSite=lax` cookie |

Post-deploy checks (backdrop on the login page, byte-exact `site.html` /
`admin.html` through the gate, `access_count`) are recorded below once run.

## Known / disclosed

- Both bundles are Claude Design exports from the same day as delivery; their
  embedded images were contact-sheeted and are the six real Okada photos, not
  stock.
- The board's notes tell the client that photos, dates and stats are
  placeholders and that mobile is a next-round refinement.
