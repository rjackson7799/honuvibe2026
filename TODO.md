# TODO

Tracker for deferred / parked development work. Plan docs in [docs/plans/](docs/plans/) are the source of truth for detail; this file is just a top-level index of what's outstanding.

---

## Vault product opportunities — selected direction

These ideas extend the Vault from a content library into a system that helps members produce measurable business and career outcomes. The first four are the selected product direction; implementation should proceed one reviewed plan at a time.

- [x] **1. Business Upgrade Plans — LEAD FEATURE.** The local MVP is built with assessment, recommendations, measurable plans, admin authoring, and four launch drafts. Native Japanese review, visual QA, hosted migration, and feature enablement remain rollout gates. Implementation record: [docs/plans/2026-09-06-business-upgrade-plans.md](docs/plans/2026-09-06-business-upgrade-plans.md).
- [ ] **2. Done-With-You Workflow Builder.** Guide a member from a lesson to a finished prompt, SOP, automation brief, or reusable workflow for their own business. Design this after Business Upgrade Plans establishes the member context and plan model.
- [ ] **3. Business Brain.** Let members maintain reusable, structured context about their business, audience, offers, voice, tools, and goals so Vault activities can be personalized without re-entering the same information. The Business Upgrade MVP should create only the minimum safe profile foundation needed for this future feature.
- [ ] **4. Industry Implementation Packs.** Curated, bilingual combinations of lessons, templates, prompts, and workflows for specific industries. Use the upgrade project template model where practical rather than creating a second content system.

Additional high-value opportunities to revisit after the first four have usage evidence:

- [ ] **Async expert review.** Members submit a bounded artifact for practical feedback from an instructor or Studio specialist.
- [ ] **Monthly implementation missions.** Time-boxed, community-supported challenges that end in a useful business deliverable.
- [ ] **Career proof portfolio.** Convert completed projects into sanitized case studies and evidence of applied AI skills for job seekers and independent professionals.
- [ ] **AI impact tracker.** Record time saved, revenue influenced, costs reduced, and workflows improved across completed upgrades.
- [ ] **AI tool decision concierge.** Recommend tools from a maintained evaluation framework based on use case, budget, language, and risk.
- [ ] **Vault-to-Studio implementation bridge.** Turn a member's approved plan or workflow into a scoped request for HonuVibe Studio when they want it built for them.

The audio/podcast lesson concept remains tracked under **Vault content model — follow-ups** below and can support every track without becoming a separate learning path.

---

## Vault content model — follow-ups (Phase 4 / polish)

**Plan:** [docs/plans/2026-05-20-vault-content-model-and-admin-design.md](docs/plans/2026-05-20-vault-content-model-and-admin-design.md)
**Status:** Phases 1–3f shipped (commits 77db68a → aab9ca0). The six type sections (Video / Workshop / Article / Template / Tool / Prompt Pack), the access boundary (migrations 040 + 041), and the publish gates are live in production.

Outstanding items:

- [ ] **Show actual instructor profile photos on Vault cards.** Keep the resource artwork as the card background/thumbnail, and add the assigned instructor's circular profile image, name, and optional title in the card footer to make the experience more personal. Pull from the existing instructor profile record; use initials as the fallback when no photo is available. Account for consistent square cropping and multiple-instructor resources in the final design.
- [ ] **Build the first Tool widget.** Registry [lib/vault/tools/registry.ts](lib/vault/tools/registry.ts) is empty; Tool entries are forced to draft state until one is registered. Candidates from the original brainstorm: `prompt-builder`, `jp-en-translator`, `ai-cost-calculator`. Each widget gets its own brainstorm.
- [ ] **Decommission `library_videos`.** Migrate any still-relevant rows into `content_items` (as `video` type), then drop the old [app/[locale]/admin/library/](app/[locale]/admin/library/) admin form. The two systems have lived in parallel since Phase 1 of the original spec.
- [ ] **Drag-to-reorder for prompt pack rows.** Currently up/down arrow buttons in [components/admin/VaultPromptListEditor.tsx](components/admin/VaultPromptListEditor.tsx). Wire a real dnd library when prompt packs routinely have >10 entries.
- [ ] **i18n for renderer chrome.** Per-type renderer strings ("Live session:", "Recorded:", "Copy prompt", "Copy all", model chip labels, paywall empty states) are inline in components rather than `messages/*.json`. Move to i18n when JP localization gets a polish pass.
- [ ] **Confirm Vault pricing.** Design doc says $99/mo, current marketing copy in [messages/en.json](messages/en.json) references $49. Confirm before publishing any subscriber-facing copy for the new content types.
- [ ] **Sanity audit on uploaded markdown.** `rehype-sanitize` runs on the public renderer with default rules; we may want to expand allowed embed/iframe sources (YouTube, CodeSandbox, Figma) for embedded media in article bodies.
- [ ] **Audio / Podcast type.** Not in the original 6. Add when Ryan starts producing audio — likely cheap (reuse video chrome with audio-only embed).

---

## INS-4 — Instructor portal dashboard, earnings, tax forms

**Plan:** [docs/plans/2026-04-17-instructor-marketplace.md](docs/plans/2026-04-17-instructor-marketplace.md) (lines 332–410)
**Status:** Partial — `/instructor/payouts` slice shipped (af866b2). Remainder parked.

Remaining work:

- [ ] **Tax forms backend** — migration `instructor_tax_forms` table + RLS, private Supabase Storage bucket `instructor-tax-forms`
- [ ] `app/api/instructor/tax-forms/route.ts` (upload + list)
- [ ] `app/api/admin/tax-forms/[id]/verify/route.ts` (admin verify/reject)
- [ ] **Earnings queries** in `lib/instructor-portal/queries.ts` — `getInstructorEarnings`, `getInstructorMonthlyEarnings`, `getLatestTaxFormStatus`; extend `getInstructorCourses` with per-course earnings
- [ ] **Dashboard `/instructor`** — replace redirect at `app/[locale]/instructor/page.tsx` with real summary (lifetime earnings per currency, this-month delta, tax-form gate banner)
- [ ] `/instructor/earnings` — monthly breakdown table
- [ ] `/instructor/courses` — add per-course earnings column
- [ ] `/instructor/profile` — edit own `instructor_profiles` fields
- [ ] `/instructor/tax-forms` — W-9 / W-8BEN upload UI
- [ ] `/instructor/settings` — payout preferences placeholder (real wiring in INS-7)
- [ ] Components: `EarningsSummary.tsx`, `EarningsTable.tsx`, `TaxFormStatus.tsx`
- [ ] Update `app/[locale]/instructor/layout.tsx` nav (earnings / profile / tax-forms / settings)
- [ ] Gate `app/[locale]/admin/payouts/instructors/page.tsx` "ready to pay" by `instructor_tax_forms.status = 'verified'`

---

## Trigger-gated (do not build until trigger fires)

### INS-5 — Ratings & reviews
**Trigger:** 5+ instructor-taught courses live on platform.
**Plan:** [docs/plans/2026-04-17-instructor-marketplace.md](docs/plans/2026-04-17-instructor-marketplace.md) lines 413+

### INS-6 — Student–instructor Q&A + dispute handling
**Trigger:** 20+ active instructors.
**Plan:** [docs/plans/2026-04-17-instructor-marketplace.md](docs/plans/2026-04-17-instructor-marketplace.md) lines 460+

### INS-7 — Stripe Connect migration
**Trigger:** Manual CSV payouts become a time sink.
**Plan:** [docs/plans/2026-04-17-instructor-marketplace.md](docs/plans/2026-04-17-instructor-marketplace.md) lines 524+
Replaces manual payouts; delegates KYC + 1099-NEC generation to Stripe.

---

## Partner-owned content — Phase 2 & 3 (deferred)

**Phase 1 status:** Complete (a1cfd26).
**Phase 1 plan:** [docs/plans/2026-05-04-partner-owned-content-phase1-design.md](docs/plans/2026-05-04-partner-owned-content-phase1-design.md)

### Phase 2 — Partner instructor program
Elevate community members to instructor role with partner-side review workflow.

### Phase 3 — 3-way revenue split + monthly active-user invoicing
HonuVibe invoices partners (e.g. SmashHaus) for active users; partners collect member-side revenue separately.

---

## Customized partner-student experience (parked)

Today partner students (SmashHaus, Vertice) see the same site as standard students except for:
- Vertice 40% Stripe discount (`users.is_vertice_member` flag)
- "Presented by {Partner}" badges on owned courses/vault items (visible to everyone)

To build a real customized experience would require:
- Identity link: `users.partner_id` populated via invite link / email domain / partner-issued code at sign-up
- Gated or discounted access to partner-owned content for linked students
- Co-branded dashboard surface
- RLS policies on `enrollments` / `content_items` if access is gated

No plan doc yet. Revisit after Phase 2/3 of partner-owned content lands.
