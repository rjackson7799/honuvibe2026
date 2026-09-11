# Hawaii Palms — gated homepage-concepts preview

**Status: DELIVERED 2026-09-10.** Mostly a delivery job: the preview itself is one
`client_previews` row plus Storage objects, with nothing of it in the repo. One piece of
product work came out of it — the gated password page can now show a per-client logo
(`185858a`), which is a real code change and shipped through the normal gate.

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
| Contents | `index.html` chooser → `concept-a.html` (7.14 MB), `concept-b.html` (7.66 MB), `dashboard.html` (3.29 MB), `logo.png` (52 KB) |

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

## Branding the password page (`185858a`)

The client asked for their logo on the login screen as well as the chooser. The login page is
`renderPasswordPage()` in `lib/previews/gate.ts` — shared by every gated preview — so it was
built as a **convention, not a hardcode**: ship a `logo.png` at an export's storage root and
that preview's password page shows it. No column, no migration.

Design notes worth keeping:
- The logo is **inlined as a base64 data URI**, not linked. A viewer at the password page has
  no gate cookie, so any URL back into the route would 401 them.
- CSP gained `img-src data:` — and only `data:`. A remote `img-src` would let a preview page
  phone home, which is the thing these previews must never do.
- `safeLogoDataUri()` allowlists `data:image/(png|jpeg|webp);base64,…` and **rejects SVG**,
  which can carry script. The value is not HTML-escaped; the anchored allowlist (no quotes,
  angle brackets or whitespace in the character class) is what makes that safe.
- The unauthenticated **401 path is not behind the rate limiter** (only POST is). An uncached
  read there would let anyone drive one Storage read per request, so there are two guards: a
  per-instance TTL cache **and** single-flight, so a burst of concurrent misses collapses to
  one download. HEAD skips the lookup (it discards the body); the 429 response omits the logo
  because that path *is* the limiter and so cannot be bounded by it.

An adversarial review caught the single-flight gap — the original cache only bounded
*sequential* floods, and the test proving it was sequential too, so it would have passed with
the protection absent. Both were fixed; the new concurrency test was verified to fail without
the guard (8 concurrent requests → 8 downloads) before being accepted.

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
| `dashboard.html` | 200, 3,291,815 bytes — byte-exact |
| `logo.png` (authed) | 200, 53,242 bytes, `image/png` |
| Logo on the login page | inlined data URI decodes **byte-identical** to the local file, 560×207 |
| CSP on prod | `default-src 'none'; img-src data:; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'` |

Gate for `185858a`: type-check ✅, build ✅, gate tests 49/49 ✅. The 28 failures in
`lib/progress/*` are a **pre-existing** red from unrelated uncommitted work already in the
tree — that diff does not touch `lib/progress`, and only its own five files were staged.

## The image-slot saga — and the verification lesson

The first three exports shipped **stock AI photography** instead of the school's real photos,
and I reported them as correct twice before Ryan caught it by comparing the live page to his
editor. Both mistakes are worth remembering.

**Mistake 1 — the wrong question.** I verified by probing whether images from the project's
`.image-slots.state.json` appeared in the bundle. They did, so I called it fixed. But the
author had *replaced* those photos: matching the old bytes proved the export still carried the
**superseded** images. The `true` I read as success was the failure.

**Mistake 2 — trusting the tool's success output.** A re-upload reported ✓ on every file while
the gate kept serving the previous export (see the cacheControl fix above).

**The check that actually works** (`scratchpad/resolve-slots.mjs`): follow the render path —
`<image-slot id=… src=<uuid>>` → the bundler's `"<uuid>":{"mime":…,"data":"<base64>"}` resource
map → decode → build a contact sheet with `sharp` → **look at it**. Run it against the SERVED
file, not the local one. Some slots bypass markup entirely: Concept B's polaroid stack reads
`src: (window.__BST || [])[k]` from an inlined data-URI array, so it needs its own check.

**Root cause of the stale images:** Claude Design keeps a derived `export-src-<name>.html`
whose baked `src` uuids froze at bake time, while the editor renders from *live* slot state.
So the editor looked right, the export was wrong, and re-exporting reproduced it byte-for-byte
(same resource set, only UUID ordering differed). The fix is to re-bake, not to re-export.

## Final state

Concept A: 21 slots filled, real photos throughout; only `a-pg-hero` empty.
Concept B: 26 slots + 2 polaroid photos; `b-pg-hero`, `b-m-exp3` and the third stack position
empty — all confirmed not visible in practice.

Known, deliberate, and disclosed to the client on the chooser page: the story sections carry
**fabricated testimonials** (invented names, quotes and cities). Concept B's polaroids are also
keyed by stack position rather than story index, so three photos cycle against five stories —
acceptable in a mockup, must be fixed before launch.

`lead_id` is NULL — `studio_leads` is empty on prod, so the skill's lead-wiring step was a no-op.

## Skill note

`studio-client-preview` templates the send-to-client link as `honuvibe.ai/...`, which 307s to
`www.honuvibe.ai`. Worth updating the skill to use `www` directly.
