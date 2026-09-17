# Kazuchika Okada — gated site + admin concept preview

**Status: DELIVERED 2026-09-15. REPOSITIONED 2026-09-17** — the client dropped the
wrestling angle so as not to be typecast as only a wrestler, and the preview was
rebuilt around an actor's portfolio. See "Repositioning" below; the original
delivery is kept for the record.

## What is delivered (current)

Claude Design bundles for Kazuchika Okada — an **actor's** site (film, television,
stage; representation by a talent agency) plus the admin tool behind it. A new
Studio prospect.

| | |
|---|---|
| Slug | `okada-5a5c1a2742` (unchanged — same link and password as before) |
| Link | `https://www.honuvibe.ai/api/preview/okada-5a5c1a2742` |
| Password | in the `client_previews` row — deliberately not written into the repo |
| Row id | `fd0f1b6a-79dc-45ee-8bae-bbdf2afcd13c` |
| Expires | **2026-10-31** (extend via `expires_at`) |
| Contents | `index.html` board → `site.html` (12.30 MB) + its five inner pages (`about`, `reel`, `credits`, `gallery`, `contact`); `admin.html` (9.55 MB) + `opportunities.html` (9.54 MB); `logo.png` (88 KB), `bg.jpg` (57 KB) — 11 objects |
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

## Assets (SUPERSEDED 2026-09-17 — see "Repositioning" below)

Both assets described here were retired with the wrestling angle. The swap-in
instruction below no longer applies: the backdrop is now the client's own
headshot, taken from the export itself.

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

---

## Repositioning (2026-09-17)

The client came back: **drop the wrestling angle** — they don't want him typecast
as only a wrestler. The new Claude Design export reframes him as a working actor
(film · television · stage; New York · Los Angeles · Tokyo; enquiries through a
talent agency). Nothing in the new home page references wrestling.

What changed, all inside the same slug so **the link and password did not move**:

| | Before | After |
|---|---|---|
| Site | wrestling site (appearances, record, history) | actor portfolio (reel, credits, gallery, about, contact) |
| Wordmark | `KAZUCHIKA` / `OKADA` + "THE RAINMAKER ・ レインメーカー", Zen Antique | `Kazuchika` / *`Okada`* italic, Bodoni Moda, kicker "FILM · TELEVISION · STAGE" |
| Login backdrop | generated arena / ring photo | the client's own headshot, poster-composed left-of-card on black |
| Board fonts / accent | Zen Antique + Zen Kaku Gothic New, `#c9a24a` | Bodoni Moda + Jost, `#c9a227` |
| Board copy | "hero, appearances, gallery, film & TV, history, record" | "the hero, a short about, the reel, selected credits, the gallery, and enquiries routed through representation" |
| Admin | unchanged | unchanged (client asked for this explicitly) |

**Retired from Storage** (deleted, not merely unlinked, so the old style cannot
surface from the new nav): `appearances.html`, `gallery.html`, `history.html`.
All three now 404 through the gate. `site.html` was overwritten by the new home.

The backdrop is no longer a generated stand-in — it is composed from the export's
own headshot (pure-black background, so it composites seamlessly) with the site's
own faint gold glow. The earlier generated arena image is gone.

### Inner pages — COMPLETE (2026-09-17, later the same day)

All five inner pages were exported and shipped: `reel.html`, `credits.html`,
`gallery.html`, `about.html`, `contact.html`. The site is now complete end to
end — 8 pages plus branding, 11 objects under the slug — and **every href in
every served page resolves to a shipped file** (checked against prod, not just
locally).

One gotcha worth keeping: the inner pages link the home page under its *project
page name*, `Okada Actor - Style A Nocturne.dc.html`, not `Okada Home.dc.html`.
Without that extra `links` entry the brand mark on all five pages would have
dead-ended. The manifest maps both names to `site.html`.

The board's notes were updated in the same pass — they no longer tell the client
the inner pages are still being built, and now point at the nav instead.

### Product work from this round

`scripts/prep-preview.mjs` now reports **mapped links whose target was never
exported**, not just unrenamed `.dc.html` siblings — the exact failure that would
otherwise reach the client as a dead nav item. Extracted as `danglingLinks()` and
unit-tested, including that a doctype, a mime type and stray base64 in a 12 MB
bundle do not masquerade as page links.

`render-wordmark.ps1` (skill asset) gained `-Line2Ttf` so a second line can be set
in a real italic face rather than a GDI+ synthesized slant, plus `-LineHeight`,
`-Line2Indent` and `-KickerAlpha` to match a client's own hero metrics.

### Verification (prod, after the swap)

| Check | Result |
|---|---|
| Login page | logo + backdrop present, zero wrestling references |
| Correct password | 303 + `HttpOnly; Secure` cookie |
| All 11 objects | 200, all byte-exact vs local |
| Every href in every served page | resolves to a shipped file |
| `appearances` / `gallery` / `history` | 404 — retired style is gone |
