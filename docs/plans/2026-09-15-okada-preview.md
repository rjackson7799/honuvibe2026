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

---

## Design concept B added (2026-09-20)

A second design direction for the public site, delivered into the **same slug** —
link and password unchanged. The board now offers a choice rather than a single
site: **Direction A — Nocturne** (the existing Bodoni Moda / Jost, black-and-gold
concept) and **Direction B — Mincho** (Zen Old Mincho / Zen Kaku Gothic New, warm
black, credits led on the first screen), plus the unchanged admin.

Concept B ships eight pages — home, reel, credits, about, skills, gallery, press,
contact — under `-b` file names (`site-b.html`, `reel-b.html`, …) so nothing in
concept A had to move. Concept A's files are **byte-identical to what was already
live**, except `site.html`, which is +4 bytes: its `<title>` changed from "Site
concept" to "Design concept A". Verified by comparing prep output against the
sizes reported by Storage, file by file, before uploading.

Two pages are new to B and have no counterpart in A: **skills** (physicality and
range — choreographed combat, stunt readiness, live performance at scale) and
**press**.

### The Contact nav was mis-wired in the export — patched at delivery

B's Claude Design export pointed the Contact nav item at four different wrong
targets, and only the gallery page linked the real contact page:

| Page | Exported `href` |
|---|---|
| Home, Contact | `#top` |
| Skills | `#enquiries` |
| Press | `#interviews` |
| Reel, Credits, About | the **home page** |
| Gallery | correct |

Seven of eight pages would have reached the client with a Contact link that went
nowhere or to the wrong page, and `danglingLinks()` could not catch it — three of
them pointed at a page that *is* shipped, just the wrong one.

Fixed at delivery by `C:/work/okada/fix-contact-links.mjs`, which stages corrected
copies into `C:/work/okada/src-b/` and rewrites only the anchor whose text is
`Contact` (the sole element in the bundle with that text — 2 per page, nav and
footer; 14 rewrites across 7 pages; deltas of 6–44 bytes per file confirm nothing
else moved). The contact page's own nav item is left alone.

**The durable fix is re-baking the links in Claude Design** — the editor is still
the source of truth and still has the bug. Re-export, then re-run the fix script
(idempotent) or drop it once the export is correct.

### Disclosed on the board

- The **EN / 日本語 switch in B's header is not wired** — `href="#top"`, and the
  bundle carries no Japanese body copy. The board note says so explicitly rather
  than letting the client read it as a working bilingual site.
- B's credits are real screen credits (`My Dad Is a Heel Wrestler`, `99.9 Criminal
  Lawyer`, `Keishicho Outsider`, `Yakuza 6`). The wrestling-titled film is a
  *credit*, not a positioning — B frames combat and stunt work under "Physicality
  & Range", i.e. craft, which holds the 2026-09-17 repositioning.

### Working folder was rebuilt from prod

`C:/work/okada/` no longer existed. It was reconstructed from the live preview
rather than guessed: `logo.png` and `bg.jpg` downloaded from Storage with the
service key, and the two board webfonts (`bodoni-latin.woff2`, `jost-latin.woff2`)
**extracted from the data URIs inside the live `index.html`** — so the regenerated
board is typographically identical to the one the client already saw. The skill's
`manifest.example.json` is the real previous manifest, which is what made the
concept-A half of the rebuild exact.

### Contents now

19 objects: board + A (`site` + 5 inner) + B (`site-b` + 7 inner) + admin
(`admin`, `opportunities`) + `logo.png` + `bg.jpg`.
