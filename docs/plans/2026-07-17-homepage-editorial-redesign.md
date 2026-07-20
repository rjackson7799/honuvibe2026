# Homepage Editorial Redesign — Concept 1 IA on the cream skin

**Date:** 2026-07-17 (rev 2, after external plan review)
**Status:** SHIPPED 2026-07-19 — built, adversarially reviewed, and merged to `main`.
Checkpoints resolved with the approved defaults (A: dev-only gated testimonial
fallback; B: softened bilingual copy — 1 of 28 published lessons lacks JP;
C: reused the live refund string + the live `learn.faq` cancel sentence in a
shared `billing_policy` namespace). `pnpm verify` is green for these changes in
isolation (922 tests, clean type-check, clean build); an unrelated untracked
banner WIP (`lib/marketing/*`) has a separate `revalidateTag` type error tracked
out-of-band. Pending Ryan: final visual browser acceptance (responsive widths,
live copy-button click, reduced-motion) + JP native copy review.
**Route:** `app/[locale]/page.tsx` (home, EN + `/ja`)

## Context

The current homepage converts worse than it could for two reasons: the full Vault
lesson embed (Customer Research Agent, prompt + example output) consumes ~40% of
the scroll and stalls momentum mid-page, and the page never enumerates what the
$99/mo membership actually contains. Ryan reviewed three design concepts and chose
the **Editorial cream** direction (Concept 1): keep the existing marketing skin,
adopt the concept's conversion IA — stats with a price anchor, a "One membership.
Everything inside." bento, a founder note, a bigger testimonial wall, and an FAQ.

Decisions locked during brainstorming + review:

- **Skin:** Editorial cream (current `--m-*` marketing tokens; no dark remap).
- **Lesson embed:** cut; replaced by a compact teaser card (title + one-liner +
  Copy Prompt) linking to `/learn#vault`.
- **Proof integrity (governs every proof surface):** nothing on the page may
  claim proof that isn't real and permissioned. Concretely: no decorative star
  ratings, no outcome claims attached to the learner count, testimonials only
  from published `/admin/proof` rows, logos only from logo-permissioned rows.
- **Entitlement honesty:** every bento tile must describe something included in
  the $99 Vault subscription (verified against `lib/access/checks.ts` — the
  `vault` tier includes Vault lessons + Community; Workbench and Study Paths are
  member features behind Vault/login; **live cohorts are a separate purchase**
  and must NOT be advertised as included).

## New page order

`app/[locale]/page.tsx` renders, in order:

1. `HomeHero` (**unchanged** — star row dropped from scope; no rating source exists)
2. `ProofBand` (extended: +2 stats, real logos)
3. `HomePersonaRouter` (restyle only)
4. `HomeMembershipBento` — **new**, replaces `HomeValueProps` + `HomeVaultSection`
5. `HomeFeaturedCourses` (unchanged)
6. `HomeOrgSection` (unchanged)
7. `HomeFounderNote` — **new**
8. `ProofStories` (grown into the wall)
9. `HomeFaq` — **new**
10. `HomeFinalCta` (unchanged except shared policy keys, see FAQ) → `MarketingNewsletter` → footer

## File-by-file

| File | Change |
|---|---|
| `app/[locale]/page.tsx` | New section order; swap imports |
| `components/marketing/proof-band.tsx` | +`6-in-1` and `$99/mo` stats; async conversion; wire `getPublishedLogos()`; drop "coming soon" placeholders |
| `components/marketing/home/membership-bento.tsx` | **New** — 6-tile bento + compact lesson teaser |
| `components/marketing/home/copy-prompt-button.tsx` | **New** — `'use client'` clipboard button (success/failure/a11y states) |
| `components/marketing/home/founder-note.tsx` | **New** — founder section |
| `components/marketing/home/proof-stories.tsx` | Fetch up to 9; 3-col grid wall; fallback per Checkpoint A |
| `components/marketing/home/home-faq.tsx` | **New** — 5-item accordion |
| `components/marketing/home/persona-router.tsx` | Restyle: Studio card gets the dark treatment |
| `components/marketing/home/index.ts` | Export new components; remove deleted ones |
| `components/marketing/home/value-props.tsx` | **Delete** |
| `components/marketing/home/vault-section.tsx` | **Delete** |
| `components/marketing/home/vault-lesson-mockup.tsx` | **Delete** (only imported by `vault-section.tsx` — verified) |
| `components/marketing/home/testimonials.tsx` | **Delete or keep** per Checkpoint A |
| `messages/en.json`, `messages/ja.json` | New `home.membership`, `home.founder`, `home.faq`, shared `billing_policy` namespaces; `proof_band` additions; prune dead keys |
| `__tests__/marketing/home/home-sections.test.tsx` (+ new test files) | See Verification |

## Section specs

### 1. Hero — no change
Star row cut after review: five gold stars with no aggregate-rating source is
decorative proof, which the proof-integrity rule forbids. The existing avatar row
+ "Join 1,400+ learners" line (backed by `TOTAL_LEARNERS`) already carries honest
proof. Revisit stars only if/when enough rated proof rows exist to compute a real
aggregate.

### 2. ProofBand — price anchor + real logos
- **Async conversion:** the component becomes `async function ProofBand(...)`
  using `getTranslations('proof_band')` from `next-intl/server` (it currently
  uses the sync `useTranslations` hook, which can't coexist with awaiting
  `getPublishedLogos()`).
- Stats array grows from 3 to 5: existing learners / lessons / EN·日本語, plus
  **"6-in-1" — one membership** (maps 1:1 to the six bento tiles, all verified
  included — see bento) and **"$99/mo" — cancel anytime** (price hardcoded in
  i18n exactly like the hero CTA already does).
- **Logo rendering contract** (rows from `getPublishedLogos()` —
  [lib/proof/queries.ts:52](../../lib/proof/queries.ts#L52), currently unused;
  every row already has a permissioned non-empty `logo_url`):
  - Render only rows with a non-empty `org` name (skip the rest — a nameless
    logo can't have meaningful alt text).
  - `logo_url` host must match the configured Supabase storage pattern
    (`*.supabase.co/storage/v1/object/public/**`, already in
    `next.config.ts` remotePatterns — admin uploads land there). Any other host
    → render the existing `Monogram` instead of `next/image` (prevents
    unconfigured-host runtime crashes; server-side check, no onError needed).
  - `next/image` alt = `org` name.
  - `organization_url` present and `https:` → wrap in `<a target="_blank"
    rel="noopener noreferrer">`; absent or non-https → render unlinked.
- Fallback: if zero renderable rows, keep the current hardcoded Vertice Society
  entry (it links to the live `/partners/vertice-society` page — verifiable, not
  invented) so the strip is never blank. Delete the dashed "coming soon"
  placeholders unconditionally.
- Guard: SmashHaus must not appear publicly until the deal closes — excluded as
  long as no SmashHaus proof row is published; do not seed one.

### 3. PersonaRouter — restyle only
Copy and routing unchanged. Third card (HonuVibe Studio) gets a dark card
treatment (dark surface, light ink) using existing marketing palette greens.

### 4. HomeMembershipBento — the value stack (new)
- Heading: overline "Six ways to learn · one place" + "One membership.
  <em>Everything inside.</em>" — reuse the `t.rich` italic-seafoam-serif `em`
  pattern from the deleted `vault-section.tsx` (EN italic serif, JA upright).
- Six tiles (2-col mobile → 3-col desktop bento, mixed surfaces per concept),
  **each verified against actual entitlements:**

  | Tile | Included in $99 Vault sub? |
  |---|---|
  | 1. Practical lesson library | ✅ `subscription_tier = 'vault'` grants Vault |
  | 2. Turn lessons into work (Workbench) | ✅ `/learn/vault/workbench` is Vault-gated |
  | 3. Guided journeys (Study Paths) | ✅ `/learn/paths` member feature guiding through Vault lessons |
  | 4. English & 日本語 | ✅ with softened copy — see Checkpoint B |
  | 5. **New lessons every month** | ✅ matches hero subhead's existing claim; replaces "Clinics & workshops," which is a **separate cohort purchase**, not included |
  | 6. Learn together (Community) | ✅ vault tier includes community (`hasCommunityAccess`) |

- Below the grid: **lesson teaser card** — overline "Peek inside a lesson",
  title "Building a Customer Research Agent", one-line description,
  `CopyPromptButton`, and a "See the full lesson →" link to `/learn#vault`.
  Prompt string moves from the kept `home.vault_section` keys to
  `home.membership.teaser`.
- **CopyPromptButton spec** (`'use client'`):
  - Render nothing-special when `navigator.clipboard` is unavailable: fall back
    to selecting the hidden prompt text / hide the button (feature-detect at
    mount; SSR renders the button, disabled until hydrated check passes).
  - On click: `navigator.clipboard.writeText(prompt)`; success → temporary
    "Copied ✓" state (~2s) + fire `trackEvent('prompt_copy', { source:
    'home_teaser', locale })` (snake_case, matching `newsletter_signup` /
    `course_enroll_click` convention) **only after successful copy**; rejection
    (permission denied) → brief "Couldn't copy" state, no event.
  - Status changes announced via an `aria-live="polite"` region; button keeps a
    stable accessible name.

### 5–6. FeaturedCourses / OrgSection — unchanged
Spacing only if needed between new neighbors.

### 7. HomeFounderNote (new)
Two-column: portrait left, text right (stacks on mobile).
- Portrait: existing `PhotoPlaceholder` primitive until Ryan supplies a real
  photo (**asset dependency — flag at ship time**).
- Overline "From the founder"; heading "I built HonuVibe because I needed it."
  (upright DM Serif per section-heading rule); 2–3 short paragraphs; signature
  "Ryan — Founder · EN/日本語"; chips ("Studio instructor", "Bilingual
  EN·日本語", "Built in Hawai'i" — **no retired Aloha tagline**); link to `/about`.

### 8. ProofStories — the wall
- `getPublishedTestimonials(9)` instead of 3.
- Layout: **uniform responsive 3-column grid** (1-col mobile → 2 → 3), row-major
  so visual order = DOM order = keyboard/screen-reader order. (CSS-columns
  masonry rejected in review: column-major reading order without compensating
  benefit; quote cards are similar enough in length.) Cards keep existing
  internals (stars from real `rating` values, quote, person); JP-quoted rows
  render JP on `/ja` as today.
- Heading: **"Proof from people putting AI to work."** The learner count stays
  in the stats band, grammatically separate from any outcome claim ("1,400+
  learners, all shipping more" rejected as an unsupported universal claim).
- Row-count behavior: ≥4 rows → wall; 1–3 rows → today's 3-card layout; 0 rows →
  per **Checkpoint A** below.

### 9. HomeFaq (new)
Heading "Real questions. *Straight answers.*" (same `em` treatment). Disclosure
widgets following the existing `learn-faq.tsx` pattern; keyboard operable, real
`aria-expanded` state; any open/close animation respects
`prefers-reduced-motion`. Five items: how does HonuVibe work / do I need
experience / is it really fully bilingual (wording per Checkpoint B) / who is it
for / can I cancel anytime.

**Policy source of truth:** cancellation ("cancel anytime; access runs through
the end of the paid period") and refund ("full refund within 14 days") are
distinct policies. Both strings move to a shared `billing_policy` i18n namespace
consumed by **both** `HomeFinalCta` and `HomeFaq`, so they can't drift apart.
**Checkpoint C:** Ryan confirms the exact wording against the Terms page and the
live Stripe subscription settings before ship.

## Pre-build checkpoints (Ryan)

- **Checkpoint A — testimonial fallback governance.** The hardcoded
  `HomeTestimonials` fallback bypasses the proof permission system. Options:
  **(recommended)** confirm the 3 hardcoded quotes are real + permissioned,
  enter them as published rows in `/admin/proof`, then delete
  `testimonials.tsx` and make the 0-row state render nothing (section hidden);
  or, if they can't be confirmed, delete the fallback outright. Either way the
  homepage ends up with a single governed proof path.
- **Checkpoint B — bilingual completeness.** "Every lesson in English and
  Japanese" ships only if the published Vault content actually has complete JP
  for every lesson; otherwise the tile/FAQ copy softens to "built bilingual —
  lessons in English and Japanese" without the universal quantifier. Quick
  audit query over vault items' `_jp` columns during build.
- **Checkpoint C — policy wording** (see FAQ above).
- **Checkpoint D — founder portrait** (non-blocking; placeholder ships).

## i18n

All new copy gets EN + JA keys mirroring the component tree
(`home.membership.*`, `home.founder.*`, `home.faq.*`, `billing_policy.*`,
`proof_band.*` additions). JA drafted in-session and **flagged for native
review** (standing convention). Delete `home.value_props` and unused
`home.vault_section` keys from both files. Add a small vitest that walks
`en.json`/`ja.json` and asserts identical key trees (none exists today; catches
the classic missing-JA-key regression).

## Tests & verification

Automated (all part of `pnpm verify`):
1. **Composition test:** homepage section order asserted against the new list.
2. **ProofBand:** async pattern — `render(await ProofBand({ vaultTotalCount: 42 }))`
   with `next-intl/server`'s `getTranslations` and `@/lib/proof/queries` mocked.
   Cases: multiple logos; row without `org` skipped; non-https/absent
   `organization_url` unlinked; non-Supabase `logo_url` host → monogram;
   zero rows → Vertice fallback.
3. **ProofStories:** 0 rows (per Checkpoint A outcome), 1–3 rows (grid), 4+
   rows (wall), and `/ja` quote fallback (`quote_jp` → `quote_en`).
4. **CopyPromptButton:** success path (copied state + event fired), rejection
   path (error state, no event), clipboard-unavailable path.
5. **HomeFaq:** keyboard toggling + `aria-expanded` assertions.
6. **Message parity:** EN/JA key-tree equality test.
7. Proof-query failure safety: queries already return `[]` on error (verified
   in `lib/proof/queries.ts`) — covered by the 0-row cases.

Gate & review:
8. `pnpm verify` (type-check → tests → build; build needs
   `NODE_OPTIONS=--max-old-space-size=8192`). No migration → no `test:rls`.
9. Independent adversarial review before commit (per repo workflow, via the
   code-review sub-agent), with explicit focus areas: proof integrity
   (no ungoverned proof can render), accessibility (FAQ, aria-live, links),
   responsive behavior, and regressions from the deleted components.

Browser smoke (implementer, before handoff — Ryan does final acceptance only):
10. `/` and `/ja` at ~320 / 375 / 768 / desktop widths: 5-stat band, bento,
    copy button actually copies (and its failure state), founder placeholder,
    wall/fallback states, FAQ open/close with keyboard, reduced-motion check,
    no horizontal scroll.
11. Lighthouse (mobile) pass against the repo's existing budgets — re-check
    after the wall/logos add images (LCP < 2.5s, page weight < 800KB).
12. Content audit: every advertised entitlement (six tiles, FAQ answers)
    cross-checked once more against the live product before ship.

Ship & rollback:
13. Ship per repo convention: stage only intentional files, **single commit
    directly to `main`, push** (deliberate repo workflow — no branches/PRs).
14. **Rollback boundary = that commit.** The change is purely presentational —
    no migration, no data writes — so `git revert <ship-commit>` fully restores
    the old homepage including the deleted components. No components kept
    around "just in case."
15. Prod deploy needs no manual Supabase step (no migration).

## Out of scope

- Founder portrait photo (placeholder ships; swap when provided).
- Authoring new proof rows / logos (done in `/admin/proof`, not in code).
- Any dark-theme homepage variant.
- JP native copy review (tracked, separate pass).
- Hero star ratings (revisit only with a real rating aggregate).
