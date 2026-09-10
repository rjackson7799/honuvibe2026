# Hawaii Palms — gated homepage-concepts preview

**Status: DELIVERED 2026-09-10.** No code diff — this was a delivery job, not a build.
Nothing was committed or deployed for it; the only prod changes are one `client_previews`
row and three Storage objects.

## What was delivered

Two homepage directions from a Claude Design file (`Hawaii Palms - Homepage Concepts.dc.html`)
for Hawaii Palms English School, a pre-deal Studio prospect (see the studio-client-preview skill).

| | |
|---|---|
| Slug | `hawaiipalms-homepage-14c59b5926` |
| Link | `https://www.honuvibe.ai/api/preview/hawaiipalms-homepage-14c59b5926` |
| Password | in the `client_previews` row — deliberately not written into the repo |
| Row id | `cb808f79-88fb-4700-ba33-200632772f64` |
| Expires | **2026-10-10** (extend via `expires_at`) |
| Contents | `index.html` chooser → `concept-a.html` (7.14 MB), `concept-b.html` (7.66 MB), `dashboard.html` (3.29 MB) |

Concept A is "Cinematic Editorial", Concept B is "Warm Tropical". Both carry a built-in
JP / KO / ES language switcher.

`dashboard.html` ("Hawaii Palms - Analytics Backend") is an 8-screen admin/analytics UI —
leads, program conversion, funnel, geography, Google Analytics. It is **not** a homepage
direction, so the chooser deliberately does not present it as "Concept C": it sits in its own
"Behind the site" section, in its own navy, described as coming with either concept.

## Why gated rather than quick

The earlier Hawaii Palms preview used quick mode and put ~24 MB of bundles into git
(`public/previews/HawaiiPalms-landing-preview-74506e6434/`, still live and untouched). Gated
mode keeps these two ~7–8 MB bundles in private Storage instead, so the repo gained nothing,
and it adds a real password plus view tracking. It also needs no deploy — the gate route has
been live since `13116f3`.

## Export handling (Claude Design, Sept 2026 format)

- **Standalone HTML** per page for delivery. Fonts and React are inlined behind a
  `__bundler/ext_resources` UUID manifest, so the `unpkg.com` / `fonts.googleapis.com`
  strings inside are provenance ids and a `preconnect` hint — not runtime fetches.
- **Project archive** is `.dc.html` canvas source plus `ja.js` / `ko-es.js` / `image-slot.js`.
  Useful as editable source; **not** client-servable — it renders a design canvas, not a site.
- Every export ships `<title>Bundled Page</title>`. Always rewrite it — it is the client's
  browser tab. A reusable prep script (title rewrite + robots meta, idempotent) was used.
- Separately-exported bundles have no cross-links, hence the hand-written `index.html` chooser.

## Prod steps performed

1. `scripts/upload-preview.mjs <dir> hawaiipalms-homepage-14c59b5926` → 3 objects.
2. Upsert into `client_previews` (via the service-role REST endpoint; the dashboard SQL
   editor is equivalent).
3. **Added `PREVIEW_GATE_SECRET` to Vercel** (Secret type, all 3 environments) **and
   redeployed.** It had never been set — every gated request 503'd until this. Setting the
   variable alone is not enough; it binds at deploy time.

## Verification (all against prod)

| Check | Result |
|---|---|
| Bare slug | 303 → `/index.html` |
| Entry, no cookie | 401 password page |
| Wrong password | 401 "Incorrect password." |
| Correct password | 303 + `HttpOnly; Secure; SameSite=lax` cookie |
| `index.html` | 200, 3,801 bytes |
| `concept-a.html` | 200, 7,143,389 bytes — byte-exact vs local |
| `concept-b.html` | 200, 7,659,157 bytes — byte-exact vs local |
| `access_count` | 1 — entry file only; the two concept fetches correctly did not bump it |

`pnpm verify` does not apply: there is no code diff.

## Still open

- **Render check in a real browser.** The bundles carry `design_doc_mode="canvas"` in their
  helmet; nothing in the file proves they render as finished homepages rather than a canvas.
  Confirm before sending to the client. Also confirm the browser tab reads
  "Hawaii Palms English School — Concept A/B" (static analysis found no `document.title` or
  head-mutation calls, so it should hold, but it is unverified visually).
- **Concept descriptions on the chooser page are placeholder copy** written from the concept
  names alone, not from seeing the designs. Correct them and re-upload.
- Optional: `lead_id` is NULL — `studio_leads` is empty on prod, so the skill's lead-wiring
  step was a no-op.

## Skill note

`studio-client-preview` templates the send-to-client link as `honuvibe.ai/...`, which 307s to
`www.honuvibe.ai`. Worth updating the skill to use `www` directly.
