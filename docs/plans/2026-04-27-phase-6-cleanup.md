# Phase 6 — Marketing Rebuild Cleanup

> Executable phase doc for the umbrella [docs/plans/2026-04-26-marketing-rebuild.md](2026-04-26-marketing-rebuild.md). Closes the last ⏳ row.

## Context

Phases 0–5 shipped a parallel `<MarketingShell>` surface for `/`, `/learn`, `/explore`, `/about`, `/contact`, `/partnerships`. The legacy dark chrome (`Nav`, `footer.tsx`, `HonuCompanion`) null-routes on those paths but still ships in the bundle, and five marketing routes (`/build`, `/community`, `/resources`, `/newsletter`, `/become-an-instructor`) are dead-but-undeleted. Phase 6 retires those routes (with redirects), sweeps the components they orphan, removes the negative-margin compensation hack in `<MarketingShell>`, and locks the `ConditionalMain` padding decision to the legacy public-but-non-marketing surface only.

The goal is end-of-rebuild green: no zombie routes, no dead components, no margin compensation hack, no double-rendered chrome.

## Decisions locked in

| Topic | Choice |
|---|---|
| `/newsletter/[slug]` archive permalinks | Delete the whole `app/[locale]/newsletter/` dir; redirect `/newsletter` AND `/newsletter/:slug*` → `/#newsletter`. Issue archive SEO loss accepted. |
| Existing redirects pointing at deleted destinations | Rewrite `/tools, /toolkit, /stack` (+ `/ja/...`) to terminate at `/learn` directly; rewrite `/emails, /archive` (+ `/ja/...`) to terminate at `/#newsletter`. No two-hop chains. |
| Sweep scope | **Wide**: delete `components/sections/{community,about,contact,exploration,learn}/*` and `components/{build,resources,newsletter}/*` plus the umbrella plan's named top-level `components/sections/*.tsx` candidates. KEEP: `cta-strip.tsx`, `legal/legal-page.tsx`, `honuhub/*`, `exploration/tech-icon.tsx`. |
| Commit shape | Two commits. **A**: redirects + route deletions + component sweep + barrel + i18n cleanup. **B**: `<MarketingShell>` margin removal + `ConditionalMain` gate + `shell.test.tsx` flip + plan-doc update. (HonuCompanion gate already in place — verified, no code change.) |

## Pre-flight

```
pnpm type-check
pnpm test:run
```

Baseline: 338 tests / 35 files / type-check ✓ (verified 2026-04-27 pre-Phase-6).

## Commit A — redirects, route deletions, component sweep

### A.1 — Extend `next.config.ts` redirects

[next.config.ts](../../next.config.ts) — extend the existing `redirects()` async function. All entries `permanent: true` (308). next-intl middleware passes the full path through to Next's redirect layer, so register both `/path` and `/ja/path` variants explicitly.

**Add (12 entries):**

```ts
{ source: '/build', destination: '/explore', permanent: true },
{ source: '/ja/build', destination: '/ja/explore', permanent: true },
{ source: '/community', destination: '/about#aloha', permanent: true },
{ source: '/ja/community', destination: '/ja/about#aloha', permanent: true },
{ source: '/resources', destination: '/learn', permanent: true },
{ source: '/ja/resources', destination: '/ja/learn', permanent: true },
{ source: '/newsletter', destination: '/#newsletter', permanent: true },
{ source: '/ja/newsletter', destination: '/ja/#newsletter', permanent: true },
{ source: '/newsletter/:slug*', destination: '/#newsletter', permanent: true },
{ source: '/ja/newsletter/:slug*', destination: '/ja/#newsletter', permanent: true },
{ source: '/become-an-instructor', destination: '/partnerships', permanent: true },
{ source: '/ja/become-an-instructor', destination: '/ja/partnerships', permanent: true },
```

**Modify destinations:**

| Source | Old → New |
|---|---|
| `/tools, /toolkit, /stack` (+ /ja) | `/resources` → `/learn` |
| `/emails, /archive` (+ /ja) | `/newsletter` → `/#newsletter` |

### A.2 — Delete legacy route directories

```
rm -rf app/[locale]/build
rm -rf app/[locale]/community
rm -rf app/[locale]/resources
rm -rf app/[locale]/newsletter
rm -rf app/[locale]/become-an-instructor
```

### A.3 — Sweep newly-orphaned components

| Path | Action | Reason |
|---|---|---|
| `components/sections/hero-section.tsx` | DELETE | Old home hero |
| `components/sections/hero-background.tsx` | DELETE | Only consumed by hero-section |
| `components/sections/mission-strip.tsx` | DELETE | Old home strip |
| `components/sections/honuhub-feature.tsx` | DELETE | Old home strip (distinct from sections/honuhub/*) |
| `components/sections/featured-courses.tsx` | DELETE | Old home strip |
| `components/sections/exploration-preview.tsx` | DELETE | Old home strip |
| `components/sections/social-proof.tsx` | DELETE | Old home strip |
| `components/sections/partner-strip.tsx` | DELETE | Old home strip |
| `components/sections/newsletter-signup.tsx` | DELETE | Old home strip |
| `components/sections/ryan-bio-strip.tsx` | DELETE | Old home strip |
| `components/sections/CTAStrip.tsx` | DELETE | Only consumed by exploration/explore-bottom-cta |
| `components/sections/cta-strip.tsx` | **KEEP** | Used by /glossary and /glossary/[slug] |
| `components/sections/community/` | DELETE all 7 | Only consumed by deleted /community |
| `components/sections/about/` | DELETE all | Replaced by components/marketing/about/* |
| `components/sections/contact/` | DELETE all | Replaced by components/marketing/contact/* |
| `components/sections/exploration/tech-icon.tsx` | **KEEP** | Used by lib/tech-items.tsx + components/partners/vertice-page-content.tsx |
| `components/sections/exploration/*` (rest + index.ts) | DELETE | Replaced by components/marketing/explore/* |
| `components/sections/learn/library-hero.tsx` | DELETE | Zero importers |
| `components/sections/legal/legal-page.tsx` | **KEEP** | Used by /privacy, /terms, /cookies |
| `components/sections/honuhub/*` | **KEEP** | Used by /honuhub |
| `components/build/` (10 files) | DELETE entirely | Only consumed by deleted /build |
| `components/resources/` (5 files) | DELETE entirely | Only consumed by deleted /resources |
| `components/newsletter/` (4 files) | DELETE entirely | Only consumed by deleted /newsletter |
| `__tests__/components/resources/*` | DELETE all | Components gone |
| `__tests__/components/newsletter/*` | DELETE all | Components gone |

After deletions, `components/sections/exploration/` should contain only `tech-icon.tsx` (no barrel — direct imports already exist).

### A.4 — Prune `components/sections/index.ts` barrel

The barrel re-exports 10 deleted files. After sweep, **delete the file**. Verified: `legal/legal-page.tsx` and `honuhub/*` are imported via direct paths.

### A.5 — Prune i18n namespaces

[messages/en.json](../../messages/en.json) and [messages/ja.json](../../messages/ja.json):

- **Top-level `newsletter`** namespace (~line 129) — orphaned. Remove.
- **`build` sub-namespace** (~line 399) — orphaned. Remove.
- **Top-level `community`** namespace (~line 1525) — orphaned. Remove.
- **`nav.{build, community, resources}`** keys (lines 8/10/12) — **KEEP**. Still consumed by legacy `components/layout/nav.tsx` shown on dark public routes.

For each candidate namespace: grep `useTranslations\('<ns>'\)` and `getTranslations\('<ns>'\)` repo-wide. If zero hits remain post-deletion, drop from both locales.

### A.6 — Verify Commit A

```
pnpm type-check
pnpm test:run             # 338 - 6 deleted resource/newsletter tests = ~332
pnpm next build
```

Manual curl pass (12 paths):

```bash
for path in /build /community /resources /newsletter /newsletter/foo /become-an-instructor \
            /ja/build /ja/community /ja/resources /ja/newsletter /ja/newsletter/foo /ja/become-an-instructor; do
  curl -sI "http://localhost:3000$path" | grep -E "^(HTTP|Location):"
done
```

## Commit B — shell margin removal + ConditionalMain gate + plan-doc update

### B.1 — HonuCompanion (no code change)

[components/ocean/honu-companion.tsx:45](../../components/ocean/honu-companion.tsx) already returns null on `isMarketingPathWithLocale(pathname)`. Verify in browser walk; document in verification log.

### B.2 — Remove negative-margin hack

[components/marketing/shell.tsx](../../components/marketing/shell.tsx) line 24: drop `-mt-14 md:-mt-16` from `cn()`. Update JSDoc to drop the "compensates" paragraph; replace with one-liner about activating `--m-*` tokens.

### B.3 — Extend `ConditionalMain` to skip padding on marketing routes

[components/layout/conditional-nav.tsx](../../components/layout/conditional-nav.tsx): import `isMarketingPathWithLocale`; widen `noNavPadding` to `isAuthShellRoute(pathname) || isMarketingPathWithLocale(pathname)`. Legacy public surface (e.g. /honuhub, /blog, /glossary, /privacy) keeps `pt-14 md:pt-16` for the dark Nav.

### B.4 — Update tests

[__tests__/marketing/shell.test.tsx](../../__tests__/marketing/shell.test.tsx) — flip the margin assertion to `not.toContain('-mt-')`.

Optionally add a `ConditionalMain`-padding regression test (mock `usePathname` for `/blog` vs `/learn`, assert `pt-14` presence/absence).

### B.5 — Update umbrella plan

[docs/plans/2026-04-26-marketing-rebuild.md](2026-04-26-marketing-rebuild.md):

- Flip Phase 6 row to ✅ done with verification date.
- Append a verification-log row.
- Reference this doc.

### B.6 — Verify Commit B

```
pnpm type-check
pnpm test:run
pnpm next build
```

Browser walk (EN + JP, 1440px and 375px):

- Marketing routes: `MarketingNav` flush to viewport top, no top gap, `HonuCompanion` invisible.
- Legacy public routes (/honuhub, /blog, /glossary, /privacy): legacy Nav with `pt-14` clear, `HonuCompanion` visible after scroll.
- Auth shell (/learn/dashboard, /learn/vault): unchanged.

## Out of scope / known follow-ups

- `components/layout/nav.tsx` line 7 still has `/build` link + `nav.{build,community,resources}` keys. Legacy dark Nav, click-through works via redirects. Rework deferred.
- `components/layout/footer.tsx` still links to `/community`, `/newsletter`. Same reasoning.
- `components/partners/smashhaus/SmashHausLanding.tsx:895` has `<Link href="/build">`. SmashHaus gated per memory; address when partner page goes live.
- `/honuhub` keeps current dark design with `<HonuCompanion>` visible — intentional per umbrella plan.
- Course detail `/learn/[slug]` still dark — known mode-flip risk #5, deferred.
