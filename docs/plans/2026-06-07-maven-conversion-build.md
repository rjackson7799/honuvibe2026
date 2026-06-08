# Maven-Informed Conversion Build — Plan (hardened v3)

> Working copy of the approved plan. Source strategy: `docs/strategy/2026-06-07-maven-competitive-analysis-v2.md`.

## Context

Following the Maven competitive analysis and two rounds of third-party review, the approved scope is the **Tier-1, revenue-now, on-brand** recommendations.

**Decision lens (locked):** conversion/revenue now · strictly on-brand (no scarcity/urgency) · flank-first (lead with the bilingual / founder / practice moat; borrow Maven's brand-neutral mechanics).

**Guiding principle:** each phase ships ONE visible conversion improvement with minimal dependencies. Heavy phases are split; content is collected before engineering; only one new table this round.

**Operating contract:** build + self-verify each sub-phase (`pnpm verify` + dev/visual check), pausing only at **CHECKPOINTS**. Direct-to-`main`, one revertible commit per sub-phase, each gated by green `pnpm verify` + additive/reversible migrations.

---

## Step 0 — Publish analysis v2  ✅ (`docs/strategy/2026-06-07-maven-competitive-analysis-v2.md`)

## Step 0.5 — Content intake (BEFORE content-dependent phases)
Collect real assets from Ryan up front: 3 permissioned testimonials + Vertice case facts; org-page value props/proof/CTA; free-lesson material; one Workbench before/after example. See `docs/strategy/content-intake.md`.

---

## P0 — Money path + funnel spine *(first; gates everything; no new tables)*
- Checkout validation (written test matrix): anon → enroll → auth → redirect-back-to-checkout; USD cents vs JPY zero-decimal; idempotent webhook enrollment (`unique(user_id, course_id)`); already-enrolled guard; bilingual confirmation.
- Analytics taxonomy doc first (`docs/analytics-events.md`), then 5-event spine in `lib/analytics.ts`: `course_enroll_cta_click(slug)`, `checkout_started`, `checkout_completed`, `org_inquiry_submitted`, (`free_sample_started` later). Non-PII props.
- Server-side: `checkout_started` at session creation, `checkout_completed` from webhook. Outbound-nav-safe client tracking (`sendBeacon`).
- CHECKPOINT: Stripe test-mode keys; Plausible goals.

## P1a — Proof core
- DB `045_proof_artifacts.sql`: bilingual quote/title/role/org, person_name, person_image_url, logo_url, organization_url, rating, metrics_json, artifact_type, proof_source, course_id FK, permission booleans, permission_notes, is_published/is_featured/display_order. Base table admin-only; sanitized public view `proof_artifacts_public` (column-gated).
- Admin Proof CRUD (mirror Workbench) + AdminNav entry + `lib/proof/{actions,queries,validation}.ts`.
- `ProofStories` async server component reading the view; published-count 0 → fall back to existing `<HomeTestimonials/>`. No `dangerouslySetInnerHTML`.
- revalidatePath: `/[locale]`, `/learn`, `/learn/[slug]`.
- Tests: `lib/proof/validation.test.ts`, `supabase/tests/proof_rls.test.ts`.
- CHECKPOINT: Ryan pastes 3 real testimonials.

## P1b — Proof placements + logo wall + Vertice case
- ProofStories / permissioned LogoWall on `/learn` + course pages; Vertice one-page case; SmashHaus excluded.

## P1c — "For Organizations" page (higher-ACV; reuses inquiries)
- Canonical `/organizations` (+ `/learn/organizations` redirect). One promise/proof/CTA. Routes to `partnership_inquiries` via service-role route. Migration `046_partnership_inquiry_source.sql` widens CHECK enum + zod + labelizer. Abuse controls (honeypot + rate-limit + email norm + unique).
- CHECKPOINT: approve org copy + JP.

## P2 — Course completeness + conversion-copy QA (checklist-driven)
- Publishing checklist (`docs/`); objection-mapping copy (format + dates-as-facts + risk reversal + price/included + proof point) via `messages/*.json` with JP parity; format badges; "Which path is right for me?" chooser.
- CHECKPOINT: fill course fields; approve copy + JP.

## P3a — Free-sample landing + capture (conditional on P0 funnel data)
- Productized free-sample landing; Beehiiv capture + double-opt-in nurture ladder; honeypot + rate-limit. No new table, no `provisionMagicLink`.
- CHECKPOINT: free-lesson content + Beehiiv segment.

## P3b — Static Workbench before/after
- Static, PII-scrubbed component; no-PII/secrets publish checklist.
- CHECKPOINT: pick + approve example.

---

## Testing & feedback
- Additive migrations; ProofStories empty-fallback; one revertible commit per sub-phase, gated by green `pnpm verify`.
- Gates: `pnpm verify:fast` + `pnpm lint` in dev; `pnpm verify` at sub-phase done; `validation.test.ts` per feature.
- RLS: `proof_artifacts` + partnership_inquiries CHECK → `supabase/tests/proof_rls.test.ts`; run via committed `scripts/rls-test.*` (scripted 022/025 rename→start→test→restore, try/finally).
- i18n parity + revalidatePath enumeration are per-phase checklist items.
- Autonomy boundary: everything except CHECKPOINTS (Stripe test keys, real content + permissions, course fields, Beehiiv segment, Plausible goals, final visual sign-off, `test:rls` if Docker unavailable).

## Verification recipe
```
pnpm type-check && pnpm lint && pnpm test:run && pnpm build
node scripts/rls-test.mjs   # P1a DB
pnpm dev                    # QA: /admin/proof, /organizations
```
