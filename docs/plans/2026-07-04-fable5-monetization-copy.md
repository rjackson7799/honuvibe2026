# Fable 5 Monetization Copy System — Courses · Vault · Studio (EN + JP)

## Context

Ryan has time-boxed access to **Fable 5** — a powerful but token-expensive, creative-writing-strong
model — **through July 7** (started 2026-07-04, ~3-day window). Goal: a **monetization push** across all
three revenue engines, unified in voice, with clear CTAs that resonate with two distinct buyers:

1. **Courses** — one-time purchase, embedded Stripe checkout (`/learn/[slug]` → `/checkout`).
2. **Vault memberships** — recurring subscription, hosted Stripe checkout ($49/mo, Community $29/mo).
3. **Studio design services** — `studio.honuvibe.ai` (`app/studio-site/**`), B2B lead-gen, EN-only.

Allocation principle for a scarce, expensive creative model: spend it only where work is **durable**
(keeps paying after July 7), **uniquely Fable** (creative + voice + native bilingual prose — not
code-reading, wiring, or bug-fixing), and **compounding** (leaves a voice guide + exemplars cheaper
models/humans extend later). **Intended outcome:** sharper, consistent English + native Japanese selling
copy across all three engines, banked as reusable assets, without burning the Fable window on work
cheaper models should do.

## The deliverable: a paste-ready brief pack

The deliverable is **not** one open-ended prompt Fable explores from scratch (that re-discovers the
codebase on the expensive model). It is a **pack of self-contained copy briefs — one per surface — built
on Opus** and stored in `docs/fable-briefs/`. Each brief contains: the exact current strings + file
locations, the specific conversion gaps, the governing voice rules, hard constraints, and the required
output format. Workflow: `/model` to Fable → paste one brief → receive copy → `/model` back to Sonnet for
wiring → repeat.

- **Fable writes prose only.** Discovery, wiring, bug-fixes, and verification are done by Opus or cheaper
  subagents (Haiku/Sonnet) — this is how "delegate to lower models" is honored.
- **JP is native draft, human-reviewed before production** (per `CLAUDE.md`: never machine-translate JP
  without review). Fable's native-JP writing is the scarce capability worth paying for.
- **English is a full rewrite + upgrade, not just the JP source.** Today's EN money-path copy comes from
  three unrelated sources (raw DB `description_en`, generic i18n labels, hardcoded checkout strings) with
  no unifying voice. The voice guide makes EN consistent; the briefs upgrade it. JP is written natively
  from the same guide, not translated off EN.

## Token guardrails

No model self-meters in real time and Claude Code has **no native burn-rate alert** — so the design *is*
the guardrail:
- **Checkpoint gates:** every brief ends with "stop, report what you produced, wait for go-ahead." Spend
  is bounded per paste; never an open-ended run.
- **`/usage`** between briefs (session cost, `d`/`w` toggle); **`/usage-credits`** monthly spend cap as a
  backstop; **statusline `context-window-usage`** for a live context meter.
- **`/model` back to Sonnet** for wiring/verify so Fable's rate applies only to writing turns.
- **Hard-cap alternative:** a literal token ceiling that halts exists only via the Workflow `budget`
  primitive (Opus-orchestrated, not paste-into-Fable) — available on request instead of the brief pack.

## Prerequisite (Opus/cheaper — must precede Vault copy): fix Vault data-integrity bugs

The exploration found broken Vault surfaces that no copy can sit on top of. Fix first (not with Fable):
- **Price contradiction:** `components/vault/VaultUpsellBanner.tsx:20` says **$99/month** vs **$49** everywhere else.
- **Stale urgency:** hardcoded "The Vault opens on April 15" in the same banner.
- **Corrupted JP:** mojibake string at `VaultUpsellBanner.tsx:28`.
- **Missing i18n keys:** `dashboard.vault_gate_{videos,guides,downloads,series}` referenced by
  `components/vault/VaultPremiumGate.tsx` don't exist in `en.json`/`ja.json` → render as raw keys.
- **Two hardcoded copy islands** (`VaultUpsellBanner.tsx`, `VaultUnlockModal.tsx`) outside i18n — move
  into `messages/*.json` so the new copy is localizable.
- **Browse-grid bug:** `components/vault/VaultBrowseGrid.tsx:153` forces `locked = true` for every card
  (even members) — flag/fix so members reach lessons.

## Deliverable 1 — Voice guide with TWO profiles — the compounding asset

Fable codifies the voice(s) into `docs/brand/voice-guide.md`, written first so it governs everything:
- **Profile A — HonuVibe education voice** (courses + vault): grounded in `CLAUDE.md` Hero Voice System
  (action vs. editorial), EN + JP, with the JP typography rules.
- **Profile B — HonuVibe Studio voice** (B2B design services): distinct sub-brand — coral accent,
  "proof not promises" confident-agency tone, EN-only for now. Studio is deliberately its own voice.
- Each profile: definitions, do/don't lines, 6–10 example headlines/CTAs.

## Deliverable 2 — Courses money-path copy (EN + JP)

Rewrite copy on the existing course-purchase path. Targets (Fable writes, Opus wires):
- **Detail page:** final CTA (`learn.final_cta_heading/sub`), enroll/urgency labels (`learn.enroll_now`,
  `spots_left`, `starts`), "How It Works" steps (`learn.how_step_1..4`), section headings — in
  `messages/en.json`/`ja.json` (`learn.*`).
- **Checkout** (`components/learn/CourseCheckoutSummary.tsx`, `checkout/page.tsx`): trust/reassurance +
  risk-reversal copy. Currently **hardcoded English** — Opus moves it into i18n (revive unused
  `learn.checkout.*`) so JP renders.
- **Stripe form** (`app/api/stripe/checkout-embed/route.ts` ~L115-144): add a compelling
  `product_data.description` (none today).
- **Post-purchase success moment:** the paid buyer lands on `CourseHub` which ignores `enrolled=true` —
  no confirmation. Fable writes it; Opus wires `CourseHub.tsx` to render it.
- **Friction fix (Opus):** `EnrollButton.tsx:78-84` sends a logged-out buyer to the course page, not
  `/checkout`, forcing a second click after login — repoint to checkout.

## Deliverable 3 — Vault membership copy (EN + JP)

After the prerequisite fixes. The polished sell surface is already bilingual; sharpen it + the paywall:
- **Marketing sell block** (`messages` — `learn.chapter_vault`, `comparison`, `start_tonight`, `faq`):
  value prop, free-vs-paid framing, $29/$49 anchoring, add social proof adjacent to the CTA (absent today).
- **Paywall touchpoints** (now in i18n after prereq): `VaultUpsellBanner`, `VaultUnlockModal`,
  `VaultPremiumGate` — the blocked-moment upgrade copy in EN + JP.

## Deliverable 4 — Studio copy (EN) — LIGHTER Fable touch

Studio copy is already the sharpest on the site, so **do not spend equal budget rewriting it.** Fable's
value here is targeted, not wholesale:
- **Voice profile B** applied as a light consistency pass on hero/services/CTA literals (all hardcoded in
  `components/marketing/studio/**`).
- **Write the missing proof copy** (durable): testimonial framing/templates and richer case-study
  narrative — the real gap is proof, not prose quality.
- **Flag for Ryan (not copy):** "30+ sites shipped" is unsubstantiated (only 3 case studies, one
  in-house); placeholder legal pages; 3 of 4 "industries" have no page (anchor-only, misleading nav).
  These are content/engineering decisions, surfaced not silently fixed.

## Deliverable 5 — Flagship course DB exemplar (EN + JP)

One flagship course's Supabase selling copy (`title_*`, `description_*`, `learning_outcomes_*`,
`who_is_for_*`, curriculum) rewritten to gold-standard as the template for the rest.
- **Step 0 (blocking):** Ryan names the flagship (or query the DB for the primary/most-enrolled published
  course). Applied via SQL/dashboard as **reviewed draft** — course copy is DB rows, not a deploy.

## Priority ladder (fits the 3-day window)

- **P1 (must):** Deliverable 1 (voice guide) → Deliverable 2 (courses) → Vault prereq fixes → Deliverable 3 (vault).
- **P2:** Deliverable 5 (flagship exemplar).
- **P3 (light):** Deliverable 4 (studio — voice pass + proof copy only).
- **Deferred (copy banked if capacity, components built later):** net-new persuasion sections that don't
  exist today — course-detail social-proof/FAQ/guarantee blocks; studio testimonials/logos component.

## Key files

- Courses: `app/[locale]/learn/[slug]/page.tsx`, `components/learn/{CourseDetailFinalCta,EnrollButton,CourseCheckoutSummary,CourseHub}.tsx`, `app/[locale]/learn/[slug]/checkout/page.tsx`, `app/api/stripe/checkout-embed/route.ts`
- Vault: `components/vault/{VaultUpsellBanner,VaultUnlockModal,VaultPremiumGate,VaultBrowseGrid}.tsx`, `components/billing/{SubscribeButton,VaultStatusCard}.tsx`, `app/api/stripe/subscribe/route.ts`, `lib/stripe/tiers.ts`, `components/marketing/learn/learn-chapter-vault.tsx`
- Studio: `components/marketing/studio/**` (all copy hardcoded here), `app/studio-site/pricing/page.tsx`, `lib/pricing.ts`
- Copy: `messages/en.json` + `messages/ja.json` (`learn.*`, `dashboard.vault_*`, `billing.*`)
- Course DB copy: `lib/courses/types.ts`, `getCourseWithCurriculum`
- Voice source: `CLAUDE.md` → new `docs/brand/voice-guide.md`

## Constraints

- Fable writes prose only; Opus/cheaper do reading, wiring, bug-fixes, verify. Don't burn the window on code.
- JP = native draft, human-reviewed before production. No machine translation.
- Vault/course DB copy edits are manual (SQL/dashboard on `zvfwtndbxshrtpwcwynw`), applied after deploy.
- Studio is EN-only (JP ships v1.1) — no JP work there this window.
- Use pnpm; commit to `main`, no branches; hooks must pass.

## Verification

- `pnpm verify` (type-check → tests → build); `pnpm verify:fast` inner loop. If i18n keys / DB touched,
  browser-smoke both locales.
- Browser smoke in **EN + JP** of each path: course detail → enroll (logged-out + logged-in) → checkout →
  test-mode Stripe purchase → confirmation; Vault sell → subscribe (hosted checkout) → paywall touchpoints;
  Studio home → services → pricing → Start-a-Project form submit.
- Confirm the Vault prereq bugs are gone: no $99, no "April 15", JP renders, no raw i18n keys.
- Stripe test-card runs for both course (embedded) and vault (subscription) checkouts.
- JP copy approved by Ryan/native reviewer before any production write. No "done" without the gate green.
