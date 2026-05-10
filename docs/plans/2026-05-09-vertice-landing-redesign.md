# Vertice Landing Page Redesign — Plan

**Date:** 2026-05-09
**Author:** Ryan + Claude
**Source design:** `docs/designs/Vertice_Standalone.html` (bundled Figma export — extracted to a 1,494-line React/Babel comp)
**Pattern reference:** SmashHaus partner landing — `components/partners/smashhaus/SmashHausLanding.tsx`, `app/[locale]/partners/smashhaus/page.tsx`
**Prior plan being superseded (visually):** `docs/plans/2026-03-01-vertice-landing-enhancements-design.md`

---

## Context

The current Vertice page (`/partners/vertice-society`) is a single split-panel layout that gates everything behind an access-code form. With Vertice Society's launch shifting toward a public, multi-tier offering, the design comp `Vertice_Standalone.html` repositions the page as a full marketing landing with three purchase tiers, instructor profiles, FAQ, Vault preview, and bilingual (JP+EN paired) copy. The new design follows the same "partner landing" pattern just established for SmashHaus, so this work also aligns Vertice with the partner-page convention.

**Key product changes (confirmed):**
- Public landing — no access-code gate; page becomes indexable.
- Three tiers go live: Community (¥2,800/mo), Vault ($199 self-paced), Live Cohort ($1,250).
- Bilingual JP+EN paired on the same page (both routes render identical content).
- Real instructor photos preserved (not the design's gradient initials).
- Slug stays at `/partners/vertice-society`.

---

## Final structure (12 sections, in order)

1. **Nav** — fixed, transparent → blur-on-scroll, co-brand lockup, JP/EN toggle (cosmetic — content is bilingual), "Student Login" CTA.
2. **Hero** — `🌊 EXCLUSIVE` badge, JP+EN headline with seafoam→lavender gradient italic accent, pain/urgency callout, two CTAs (Vault Access + Live Cohort), 5 stat chips, Vault dashboard mockup with floating "lifetime access" + "live cohort" chips.
3. **Contrast** — BEFORE / 3 MONTHS / AFTER three-column grid; 4 pain points → 4 outcomes.
4. **Capabilities** — 4 cards (Tools, Automate, Team, Build) with custom illustrations (`IllusTools`, `IllusAutomate`, `IllusTeam`, `IllusBuild`).
5. **Curriculum** — dark section (`#0A0612`), sticky-rail layout, 5-week list with hover states. Reuses existing `vertice.weekN.*` i18n week data; no factual change.
6. **Vault Preview** — 6 gradient cards (TEMPLATE / PROMPT / WORKFLOW / WALKTHROUGH / GUIDE). Initially seeded as design placeholders; later wired to `content_items` table once Vertice vault content lands (mirror SmashHaus fallback pattern).
7. **Pricing** — 3 cards (Community / Vault highlighted / Live Cohort). Vault card shows `$299 → $199` strikethrough with "Founding Member · 残り37名" sub-line. Live Cohort card shows pulsing "5/15開講 · 残り15席" badge.
8. **Instructors** — 3 cards (Ryan, Mizuho, Chiemi) — **photo variant**: replaces design's initial-gradient circle with `<Image>` from `/public/images/partners/instructors/{ryan,mizuho,chimi}.webp` framed by a soft seafoam ring; design's role/credentials/bio layout otherwise preserved.
9. **FAQ** — 9 accordion items, default-open on first. JP question + EN sub-question + JP body.
10. **OperatingCompany** — 5-row table (Company, Location, Partner, Program, Contact).
11. **FinalCTA** — purple/lavender gradient panel with concentric rings, HonuMark watermark, email input + button. Wires to `/api/newsletter/subscribe` with `source: 'vertice_partner_landing'` (mirrors SmashHaus).
12. **Footer** — dark co-brand variant, `Vertice·Society × HonuVibe.AI` lockup, JP+EN paired link grid, "Made in Hawaii with Aloha" line.

---

## Files to create

| File | Purpose |
|---|---|
| `components/partners/vertice/VerticeLanding.tsx` | Single client component (~1,400 lines) — all 12 sections + helper sub-components. Mirrors `SmashHausLanding.tsx` shape. |
| `components/partners/vertice/icons.tsx` | Inline SVGs: `IconArrow`, `IconPlay`, `IconCheck`, `IconX`, `IconSpark`, `IconChevron`, `IconWave`, `HonuMark`, `VerticeWordmark`, `CoBrandLockup`, `FloatingHonu`. |
| `components/partners/vertice/vertice.css` | All styles scoped under `.vertice-scope`. CSS custom properties for the seafoam/lavender palette + `floatA`/`floatB`/`pulseDot`/`drift` keyframes wrapped in `prefers-reduced-motion`. |
| `app/[locale]/partners/vertice-society/fonts.ts` | `next/font/google` imports for `Inter` (400/500/600/700/800), `Noto_Sans_JP` (400/500/700), `Instrument_Serif` (400 normal + italic). Exports CSS-var names. |

## Files to replace / modify

| File | Action |
|---|---|
| `app/[locale]/partners/vertice-society/page.tsx` | **Replace.** Set `robots: { index: true, follow: true }` (no longer private). Wrap render in `${inter.variable} ${notoJP.variable} ${instrumentSerif.variable}` div. Render `<VerticeLanding locale={locale} />` instead of `<VerticePageContent />`. Remove the `light-zone` wrapper since the new page manages its own background. |
| `components/partners/vertice-page-content.tsx` | **Delete** after the new component is verified rendering. |
| `components/partners/vertice-enroll-panel.tsx` | **Delete** — access-code flow retired. |
| `components/partners/vertice-teacher-profiles.tsx` | **Delete** — replaced by inline `Instructors()` section in new component. |
| `app/api/vertice/submit/route.ts` | **Keep for now.** Endpoint stays live so existing inbound code links (if any users have unsubmitted access codes) still resolve gracefully. Mark with a `// DEPRECATED` comment. Leave `vertice_leads` table untouched. Schedule full removal in a follow-up after 30 days of zero traffic. |

## Files NOT touched (intentionally preserved)

- `supabase/migrations/028_vertice_member.sql` and `users.is_vertice_member` flag — still used by Stripe discount logic for the cohort tier.
- `supabase/seed_vertice_partner.sql` — partner row remains; flip `is_public=true` if/when we want Vertice to appear on the public partners index.
- `lib/email/send.ts` `sendVerticeLeadConfirmation` / `sendVerticeLeadAdminNotification` — keep until `/api/vertice/submit` is fully removed.
- `components/layout/footer.tsx:57` — footer link points at `/partners/vertice-society`, no change.
- `/public/images/partners/vertice-crest.webp`, `course_cover.jpg`, `instructors/{ryan,mizuho,chimi}.webp` — instructor photos referenced in new layout; crest can render in OG image.

---

## Bilingual content strategy

The new layout renders **JP and EN copy together** in every section (per the design). This means:

- **No new i18n keys per copy line.** The vast majority of strings are baked into the component as `{ jp: '...', en: '...' }` pairs — same as `SmashHausLanding.tsx` keeps strings inline.
- **Existing `messages/{en,ja}.json` `vertice` namespace stays as-is** for now — it still backs the API confirmation emails and any admin views. We won't remove those keys.
- The locale toggle in the nav is cosmetic-only on this page (toggling it doesn't change rendered copy). On click, it routes to the other locale (`/partners/vertice-society` ↔ `/ja/partners/vertice-society`); both render the same bilingual page.

---

## CTAs & integrations

| CTA | Destination |
|---|---|
| Hero "Vault今すぐアクセス" + Pricing Vault card | Stripe Checkout (Vault $199 product — **needs creation**, see follow-ups) |
| Hero "ライブコホートを見る" + Pricing Live Cohort card | Stripe Checkout (existing $1,250 cohort product, `STRIPE_VERTICE_COUPON_ID` for `is_vertice_member` discount preserved). For non-members, use full price. |
| Pricing Community card | Stripe Checkout (Community ¥2,800/mo subscription — **needs creation**) |
| FinalCTA email submit | `POST /api/newsletter/subscribe` with `{ email, source: 'vertice_partner_landing' }` — already exists |
| Nav "Student Login" | `/login` (existing) |

Page-mount side effects (mirror SmashHaus):
- `setPartnerCookie('vertice-society')` — 30-day `hv_partner` cookie for Stripe attribution.
- `trackEvent('partner_landing_view', { partner: 'vertice-society' })`.
- Track `partner_cta_click` on each pricing card with `{ tier, partner }`.

---

## Stripe products to create (follow-up tickets, not blocking page launch)

Page can ship with the two new tiers' CTAs pointing at a placeholder `/partners/vertice-society/coming-soon` page until Stripe products exist. Recommended order:

1. **Vault $199 one-time** — Stripe product `vertice-vault-founding`. Founding-member coupon for first 100 buyers (limit via Stripe metadata + a Supabase counter).
2. **Community ¥2,800/mo** — Stripe subscription product `honu-community-monthly`. JPY zero-decimal — store yen directly.
3. **Live Cohort $1,250** — already exists; verify `STRIPE_VERTICE_COUPON_ID` still active for `is_vertice_member` users.

---

## Cohort date parameterization

Hard-coding "5/15開講 · 残り15席" will rot fast. Add a single source of truth:

```ts
// In VerticeLanding.tsx top of file
const COHORT = {
  startDate: '2026-05-15',
  startDateLabel: { jp: '5/15開講', en: 'Starts May 15' },
  seatsLeft: 15,
};
```

Renders pull from `COHORT`. Future cohorts: bump these three lines.

---

## Critical files to reference while building

- `components/partners/smashhaus/SmashHausLanding.tsx` — the canonical pattern to mirror (palette table, scoped CSS, illustration sub-components, `setPartnerCookie`, `trackEvent` plumbing, `FinalCTA` newsletter form).
- `components/partners/smashhaus/smashhaus.css` — scoping approach + `prefers-reduced-motion` wrapper.
- `app/[locale]/partners/smashhaus/page.tsx` — server-component shape with `generateMetadata`.
- `app/[locale]/partners/smashhaus/fonts.ts` — `next/font` setup for partner pages.
- `lib/analytics.ts` — `trackEvent` helper.
- `docs/plans/2026-05-05-smashhaus-landing-redesign.md` — the SmashHaus plan; same migration shape for Vertice.

---

## Verification checklist

1. **Visual parity** — render `/partners/vertice-society` and `/ja/partners/vertice-society` against `Vertice_Standalone.html` (open the design HTML in the browser side-by-side). Confirm all 12 sections, palette (#2DBFB0 seafoam, #9B87E0 lavender, #1A2B33 navy, #FDFBF7 canvas, #0A0612 dark curriculum), typography (Inter / Noto Sans JP / Instrument Serif italic), and all four illustrations (`IllusTools` / `IllusAutomate` / `IllusTeam` / `IllusBuild`).
2. **Mobile** — hero stacks (mockup below copy), pricing tiers stack 1-column, capability cards stack 1-column, curriculum sticky rail collapses, Final CTA padding shrinks. Run at 375 / 768 / 1280.
3. **Bilingual rendering** — every JP heading has its EN counterpart (italic Instrument Serif). Spot-check FAQ, pricing features, and stat chips.
4. **Animations** — `floatA`/`floatB` on hero chips, `pulseDot` on cohort badges, no jank. Toggle OS-level `prefers-reduced-motion` and confirm animations disable.
5. **CTAs**
   - Vault card → Stripe checkout (or `/coming-soon` if not yet wired).
   - Live Cohort card → Stripe checkout, with `is_vertice_member` discount applied for logged-in members.
   - Community card → Stripe checkout (or `/coming-soon`).
   - FinalCTA email submit → `/api/newsletter/subscribe`, success state renders, idempotent for already-subscribed.
6. **Analytics** — verify in Plausible test mode: `partner_landing_view`, `partner_cta_click` (per tier), `newsletter_signup` (with source).
7. **Cookie** — `hv_partner=vertice-society` set on mount; confirm in DevTools Application tab.
8. **Metadata** — `<title>`, OG image, `robots: { index: true, follow: true }` (page is now public). Confirm `view-source:` shows correct meta tags.
9. **Lighthouse mobile** — Performance ≥ 90, Accessibility ≥ 95 (focus-visible on all CTAs, contrast on dark curriculum section, alt text on instructor photos).
10. **Existing footer link** — `components/layout/footer.tsx:57` still navigates correctly to the new page.
11. **Old route artifacts** — `/api/vertice/submit` still responds 200 to existing leads (deprecated but not removed). Old components fully deleted (no orphan imports).
12. **Build & lint** — `pnpm build` clean, no TypeScript errors, no unused-import warnings from the deleted files.

---

## Build sequence (recommended)

1. Scaffold `components/partners/vertice/` folder + `fonts.ts` + replace `page.tsx` with a stub that renders `<div>Vertice WIP</div>` so the route loads.
2. Port the design's palette + scoped CSS into `vertice.css`.
3. Build sections top-to-bottom: Nav → Hero (with mockup) → Contrast → Capabilities (illustrations last) → Curriculum → VaultPreview → Pricing → Instructors (with photo swap) → FAQ → OperatingCompany → FinalCTA → Footer.
4. Wire `setPartnerCookie` + `trackEvent` calls.
5. Wire Stripe checkout links (or `/coming-soon` placeholder for tiers awaiting product creation).
6. Delete the three old `vertice-*.tsx` components + remove `light-zone` wrapper.
7. Run verification checklist.
8. Commit + push to main (per project git workflow).
