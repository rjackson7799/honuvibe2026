# B4 — Studio pricing re-key + Build brief (migration 088)

**Status:** APPROVED by Ryan 2026-10-20 (D1–D13 as recommended; D13 moot, B3 and Unit 2a/2b shipped). **Migration renumbered 080 → 088** (B3 shipped as 087; 085–087 tracked, 084 is the untracked auth migration). Lines that record the 2026-10-15 state still say 080. **Revised 2026-10-15 after an in-session adversarial review:** all 14 findings were checked against the code and applied (see §11).
**Baseline:** `abf1eab` = `HEAD` = `origin/main` at planning time (`git fetch` 2026-10-15 showed nothing new). Unit 1 shipped as `16fb7d3`.
**Roadmap:** `docs/plans/2026-10-05-marketing-redesign-green.md` → "### B4", "### 3 — Build" (B4 must unblock it), Review amendments (B4: look CHECKs up from `pg_constraint`), Design flags, Verification. The 11 locked decisions stay closed. #3 is the one that matters here: Landing Page from $100 · Build from $1,500 (popular) · System from $2,500 · hosting & maintenance from $25/mo (required) · à la carte add-ons; legacy `starter→build`, `pro→system`, `ai_native→system`, display only; studio.honuvibe.ai reads the same `lib/pricing.ts`.
**Design:** `docs/design_2026_green/pages/04 Build.dc.html` (`tierDefs`, `services`, `TYPES`, `addons`, `FAQS` in `renderVals()`), `README.md` § 04 Build.

---

## 1. Why now, and dependencies

Unit 3 (the real `/build` page) needs three things that don't exist yet:
- published tier numbers in `lib/pricing.ts`;
- a brief API that takes a project *kind*, works without a company name, and tags its source;
- an admin and email surface that shows the kind.

B4 is the backend half. It touches no page in `app/[locale]`, so it ships on its own.

| Needs | State (verified 2026-10-15) |
|---|---|
| 0A / 0B / Unit 1 | Shipped. Home derives "Transparent tiers from {price}" from `studioFromPrice()` (`app/[locale]/page.tsx:51`), so B4 flips it from $500 to $100 with no Home edit (§5.1). |
| B1, B2 | Shipped (078, 079 on prod). Not touched by B4. |
| B3 / Unit 2 | Not shipped. **B4 does not depend on them**, and the roadmap's "2 → B4" order is a preference, not a dependency. B4 can land before or after them. |
| Parallel session (course-access migrations 068–073, plus 084) | Still untracked here. B4 does not depend on, renumber or touch them (§9). |

---

## 2. What prod and the code look like today (verified, not assumed)

### 2.1 Prod (`zvfwtndbxshrtpwcwynw`), read-only, 2026-10-15

**How I queried.** Every query used `supabase db query --linked` (CLI 2.100.1, Management API, with `SUPABASE_PROJECT_ID=zvfwtndbxshrtpwcwynw`). Every statement was a `SELECT` on `pg_constraint`, `information_schema`, `pg_proc`, `pg_class` or a `count(*)` / `group by` on the Studio tables. Nothing was written. The service key in `.env.local` was not needed.
- **Side effect to know about:** the CLI printed "Initialising login role…". The Management API path sets up its own temporary login role. That's the CLI's doing, not a schema or data change.

**The four tier CHECKs: exact names.** Each was found by definition (`ilike '%starter%'`), not guessed. All four are the Postgres auto-names.

| Table.column | `conname` on prod | Definition today |
|---|---|---|
| `leads.tier_interest` | `leads_tier_interest_check` | NULL or `starter, pro, ai_native, not_sure` |
| `studio_leads.project_type` | `studio_leads_project_type_check` | NULL or `starter, pro, ai_native, not_sure` |
| `engagements.tier` | `engagements_tier_check` | NULL or `starter, pro, ai_native` |
| `engagement_proposals.tier` | `engagement_proposals_tier_check` | NOT NULL, `starter, pro, ai_native` |

**Columns.**
- `leads.business_name` is `text NOT NULL`.
- `leads.project_kind` does **not** exist.
- `leads.source` is `NOT NULL` with **no CHECK**. Comment from 056: `discover | studio_form | studio_form_migrated | manual | prospecting`. So `build_brief` needs no constraint change.

**Live Studio data** (the "frozen snapshots" worry, measured):

| Table | Rows | Tier values |
|---|---|---|
| `leads` | 9 | 1 `ai_native` (discover, 2026-06-10, still `new`) · 5 `not_sure` (discover) · 3 NULL (1 manual, 2 prospecting) |
| `studio_leads` (retired by 047) | **0** | — |
| `engagements` | 1 | tier NULL, stage `discovery` |
| `engagement_proposals` | **0** | — |
| `engagement_invoices` | **0** | — |
| `discovery_sessions` | 6 | 1 has `computed_pricing.resolvedTier = 'pro'`; 5 unpriced |

- **No issued proposal or invoice exists on prod.** Every legacy-compatibility rule below is still built and tested, because Ryan could create proposals before B4 ships. §9 re-counts at ship time.
- `computed_pricing` is written by `app/api/discover/complete/[sessionId]/route.ts:53` and **read by nothing**. It's an audit blob, so the legacy `'pro'` in it is harmless.

**SQL that reads the tier.**
- `pg_proc`: only `start_engagement` (067:856–863). It copies `NULLIF(lead.tier_interest,'not_sure')` into `engagements.tier`, so a new-id lead produces a new-id engagement. That's why `engagements_tier_check` must widen.
- `accept_engagement_proposal` (074:887) writes `engagements.tier = proposal.tier`. Its body has no literal tier values.
- Views: `engagement_list` passes `e.tier` through unchanged. (`vault_downloads_browse` matched on "tier" too, but that's the Vault access tier, so it's unrelated.)

**Migration ledger.** Prod has **no** `supabase_migrations.schema_migrations` table (migrations are pasted by hand), so "080 is free on prod" can only be proven from state:
- `project_kind` is absent;
- all four CHECKs are still legacy-only.

Both hold. **080 has not been applied.** In the repo, `ls supabase/migrations` stops at 079 (tracked) plus untracked 065/068–073/084; no `080_*` exists, and no other plan claims 080.

### 2.2 Stripe: does anything key off tier ids? **No.**

- Studio invoices build Checkout with inline `price_data` → `product_data: { name: input.label }` and `unit_amount: input.amount` (`lib/stripe/engagement-invoice.ts:97-100`). The label is the invoice label, not a tier. No Stripe Price or Product object exists for any Studio tier.
- `lib/stripe/webhooks.ts:56` `metadata.tier` and `app/api/stripe/subscribe` `tier` are the **subscription** tiers (`community`/`vault`), not Studio tiers.
- No `STRIPE_*_PRICE` env var names a Studio tier (checked the `.env.local` key names).

### 2.3 Every consumer of `lib/pricing.ts` and of the tier ids

Found with grep for `'starter'|'pro'|ai_native|tier_interest|project_type|PRICING|AI_NATIVE_FROM|studioFromPrice|calculatePricing|ADDONS` across `app/ components/ lib/ supabase/ __tests__/`, then read file by file. The roadmap's list was incomplete: the rows marked **new** below are files it didn't name.

| # | File | What it does with tiers |
|---|---|---|
| 1 | `lib/pricing.ts` | `TierInterest`, `PricedTier`, `PRICING{starter,pro}`, `AI_NATIVE_FROM`, `studioFromPrice()`, `ADDONS`, `resolveNotSure()`→starter, `calculatePricing` (ai_native → custom), `answersToPricingInput` |
| 2 | `lib/studio/labels.ts` | `STUDIO_PROJECT_TYPE` (the public form's zod enum), `PROJECT_TYPE_LABEL` |
| 3 | `lib/discover/labels.ts` | `TIER_OPTIONS` (discovery intake) + `labelizeTier` |
| 4 | **new** `lib/questions.ts:414-426` | `q_tier` options `starter / pro / not_sure` |
| 5 | `lib/discover/derive.ts` | Answer map / lead → `calculatePricing` |
| 6 | `app/api/discover/start/route.ts:25,106` (HEAD line numbers; the dirty copy shifts `custom:` to 109) | zod enum; `custom: tier === 'ai_native'` (**file is dirty**, auth WIP) |
| 7 | **new** `app/api/discover/review/[sessionId]/route.ts:17` and `complete/[sessionId]/route.ts:16` | Row type literals; `complete` writes `computed_pricing` |
| 8 | `components/discover/LivePriceTotal.tsx` | `TIER_META{starter,pro}`, custom = "Studio AI-Native", "may fit Studio Pro" nudge |
| 9 | **new** `components/discover/CustomScopingStub.tsx` | "Studio AI-Native" copy |
| 9a | **new** `components/discover/QuestionCard.tsx:297` | "a site this size may fit Studio Pro" nudge |
| 10 | `components/marketing/studio/service-tiers.tsx` | `TIERS` from `PRICING.starter/pro` + `AI_NATIVE_FROM` (studio.honuvibe.ai home, `/pricing`, `/services`) |
| 11 | `components/marketing/studio/start-project-form.tsx` | `PROJECT_TYPES` select → `/api/studio-leads/submit` (studio `/contact`) |
| 12 | **new** `components/marketing/studio/studio-faq.tsx:24,28` | "Starter or Pro", "12 for AI-Native" |
| 13 | `app/studio-site/pricing/page.tsx:11,15-16` | Meta "from $500 Starter … AI-Native"; care terms "6-month minimum on Starter and Pro", "12-month minimum on AI-Native" |
| 14 | `app/studio-site/services/page.tsx:10` | Meta "Starter, Pro, and AI-Native" |
| 15 | **new** `app/studio-site/work/[slug]/page.tsx:19,36` | Case-study `tier: 'Studio AI-Native'` (display string) |
| 16 | `lib/studio/engagement/types.ts:15` | `EngagementTier = 'starter'\|'pro'\|'ai_native'` |
| 17 | `lib/studio/engagement/proposal-pricing.ts` | `BASE_LABELS`, `resolvedTier`, `buildUsdOffer`/`buildJpyOffer` (cast to starter\|pro), `buildCustomOffer` (hard-codes `ai_native`), `tierFor` |
| 18 | `lib/studio/engagement/proposal-schema.ts:36,59,129` | Three zod enums: inputs, offer, proposal input |
| 19 | `lib/studio/engagement/proposal-document.ts:141-145,207,338` | `BASE_LABELS_JA`, `issuedSnapshotSchema.tier` enum, the JA line-label skip for `ai_native` |
| 20 | `lib/studio/engagement/proposal-actions.ts:162` | `canonicalOffer`: `ai_native` → custom path |
| 21 | **new** `lib/studio/engagement/generator.ts:638` | `Tier: ${offer.tier}` into the AI drafting prompt |
| 22 | `components/admin/ProposalPricingForm.tsx` | Tier segment control, default `'starter'`, custom panel keyed on `ai_native`, YenRow label |
| 23 | **new** `components/admin/EngagementRow.tsx:13` and `app/[locale]/admin/studio/engagements/[id]/page.tsx:28` | Duplicate `TIER_LABELS` maps |
| 24 | `components/admin/StudioLeadRow.tsx` | `labelizeProjectType`, `SOURCE_LABELS`, `LOCALE_BEARING_SOURCES`, `full_name \|\| company` |
| 25 | **new** `lib/admin/types.ts:121-140` / `lib/admin/queries.ts:297,339` | `StudioLead.company: string` (aliases `business_name`; becomes nullable) |
| 26 | `lib/email/types.ts:144` + `lib/email/send.ts` (`sendStudioLeadConfirmation` :762, `sendStudioLeadAdminNotification` :802) | `projectTypeLabel`, `company` in body and subject (**file is dirty** in exactly these hunks). **At HEAD neither function escapes user input:** `fullName`, `company` and `message` go into HTML raw, and `templates.ts` `heading`/`paragraph`/`detailRow` don't escape. The escaping exists only in the uncommitted auth WIP |
| 27 | `app/api/studio-leads/submit/route.ts` | zod (`company` required, `project_type` enum), insert, email data. **A failed insert is only logged (:103-105):** the route still returns `{success:true}` and sends both emails |
| 28 | **new** `app/api/admin/studio-leads/[id]/audit/route.ts:63,101` and `lib/studio/audit/generator.ts:48,83,108` | Selects `id, business_name, industry, existing_url` (no `name`), then `business_name as string` → `neutralize(s)` calls `s.replace`. On null it throws inside the narrative `try` (`lib/studio/audit/run.ts:151-174`), so the audit ends `partial` / `narrative_failed`. It doesn't 500, but the narrative is lost |
| 29 | **new** `app/api/admin/studio-leads/[id]/outreach/route.ts:75` | `company: lead.business_name` into the outreach generator |
| 30 | **new** `app/[locale]/admin/studio/leads/[id]/page.tsx:18` | Title `${lead.company} — Studio Lead` ("null — Studio Lead" once nullable) |
| 31 | `lib/studio/engagement/lead-context.ts:58` | Already null-safe (`?? fallbackCompany`). No change |
| 32 | `components/marketing/home/*`, `app/[locale]/page.tsx` | Only `studioFromPrice()`. No change (§5.1) |

**Tests that pin today's values:**
- `lib/pricing.test.ts`
- `lib/discover/derive.test.ts`
- `lib/studio/engagement/{proposal-pricing,proposal-schema,proposal-document,generator}.test.ts`
- `components/admin/EngagementStageControl.test.tsx` (fixture `tier:'starter'`)
- `__tests__/marketing/home/home-sections.test.tsx:239` (computes from `studioFromPrice()`, so it self-adjusts)
- `supabase/tests/engagement_{rls,proposals_rls,invoices_rls}.test.ts` (fixtures insert `starter`/`pro` directly and through `create_engagement_proposal`)

**There is no `__tests__/api/studio-lead*-submit` test today.** The roadmap names one, but only `studio-lead-audit.test.ts` exists.

**Not affected** (grep hits on unrelated meanings of the words):
- "starter": `prompt-starter-kit`, the `home.panel_learn.starter` i18n key, `free-lesson` "starter" prompt.
- "tier": `content_items.tier` and the Stripe subscription tiers.

### 2.4 Working-tree hazards (none of this is B4's; never stage it)

Dirty files that B4 must also edit. B4's hunks get applied to their **HEAD** versions, exactly as Unit 1 did.

**Ownership (confirmed with the land-068-073 session, 2026-10-16; its plan is `docs/plans/2026-10-15-land-068-073.md`).** Both files belong to the **September 4 pre-launch hardening batch** (068–073), not the October auth work. That session will commit both, in separate commits, after Ryan reviews its plan:

- **`lib/email/send.ts` → its Commit C.**
  - Covers all 33 dirty hunks: hardening escaping and delivery changes (no auth work), plus a new required option on `sendEmail`.
  - That includes the escaping in `sendStudioLeadConfirmation` (~:768) and `sendStudioLeadAdminNotification` (~:810, ~:822).
  - **If C lands before B4:** B4's D9 escaping is already on HEAD. B4 rebases and keeps only its tier and label hunks in `send.ts`; drop B4's own escaping hunks. The escaping test in §7 stays, and should now pass against their code.
  - **If B4 lands first:** B4 commits the escaping itself (same `escapeHtml(...)` text). That session then hand-merges the Studio-lead lines, keeping both changes.
- **`app/api/discover/start/route.ts` → its Commit D**, the `DISCOVERY_ENABLED` launch gate.
  - Ships together: the route hunk (~:39), the untracked `lib/discover/availability.ts`, `app/app-site/discover/layout.tsx` and `__tests__/discovery-launch-gate.test.tsx`, and `lib/discover/session.ts`, plus migration 070 (real Discovery verification codes).
  - B4's zod and `custom:` hunks don't overlap, so whichever lands second rebases cleanly.
- **The gate is default-off.** After D deploys, `/api/discover/start` returns 503 unless `DISCOVERY_ENABLED` is exactly `'true'` in Vercel. **Ryan is deciding whether Discovery stays off.** That changes B4's discovery smoke test (§8.4) and the post-deploy check (§9 step 6).

**State of 068 and the migration numbers.**
- **068 is already applied on prod**, ahead of its code. Free enrollment is broken until that session's `lib/enrollments/actions.ts` deploys, so **its push should go first**. B4 is waiting on Ryan's D1–D13 anyway.
- 068 changes only the `users` self-update trigger and the `enrollments` insert path. None of 065 or 068–073 touch B4's tables (`leads`, `studio_leads`, `engagements`, `engagement_proposals`).
- That session confirms **080 is still B4's** next free number.

Dirty, but B4 does not touch them:
- `components/discover/IntakeGate.tsx`. B4 changes `lib/discover/labels.ts`, which IntakeGate imports.

Untracked, read-only for B4: 065, 068–073 and 084, plus `__tests__/discovery-*.test.ts*` (the parallel and auth work).

---

## 3. Design ↔ roadmap ↔ code disagreements (flagged)

| # | Source A | Source B / reality | Handling |
|---|---|---|---|
| F1 | Roadmap: `landing_page.ceiling: 1` | Design Landing Page card: "**Up to 5** designed and built pages" | D2 |
| F2 | Roadmap: `build.ceiling: 8` | Design is silent; old Pro was 12 | D2 |
| F3 | Roadmap: keep a custom path "keyed on `pricing_mode`" | `pricing_mode` is `fixed / performance / hybrid` (performance-fee terms) and has nothing to do with hand-quoting. Keying custom on it would break hybrid USD offers | D1: key custom on the tier |
| F4 | Roadmap: all three tiers `monthly: 25` | Old Pro was $75/mo, AI-Native from $200/mo. Design: "Hosting and maintenance **from** $25/month" | D3 |
| F5 | Roadmap: ADDONS + `form_building`, `lead_capture` | No prices anywhere (the design shows names only) | D7 |
| F6 | Design brief `TYPES` keys `website / webapp / mvp / docs / other` | Roadmap CHECK `website / web_app / mvp / documents / other` | Use the roadmap ids in the DB; Unit 3 maps its pill keys |
| F7 | Studio-site care terms "6-month minimum (12 for AI-Native)" | The design and the locked decision say only "from $25/mo, required" | D3 |
| F8 | Design brief: "A reply within two working days" | Studio confirmation email: "within one business day" | Out of B4 (Unit 3 copy). Flagged for consistency |
| F9 | Roadmap: test file `__tests__/api/studio-lead-*.test.ts` | Doesn't exist for submit | New file (§7) |
| F10 | Roadmap: `studio_leads.project_type` widen | Table has 0 rows and no writer since 047 | Widen anyway (cheap, keeps the four CHECKs symmetric) |

---

## 4. Decisions for Ryan (each with a recommendation)

**D1 — What "System" is.**
Recommend: **System is custom-quoted with a published floor of $2,500.** It takes over today's AI-Native path, and legacy `ai_native` (and `pro`, via the locked map) rides the same path.
- `PRICING.system = { build: 2500, monthly: 25, ceiling: null }` is the **floor**. `calculatePricing({tier:'system'})` returns `isCustom: true, resolvedTier: 'system'`, the same as AI-Native today.
- In admin, System opens the hand-typed offer panel ("from $2,500 is a floor hint").
- In the discovery tool, System routes to the scoping stub.
- `studioFromPrice()` still takes the minimum over `PRICING`, so it returns $100.
- Why: it keeps the code's shape (one custom path, keyed on the tier). It needs no new field inside the frozen `pricing` jsonb. And System (an MVP or AI workflow, pitch deck, docs, a month of support) is inherently scoped work.
- Alternative: System gets calculator-priced at $2,500, plus a `custom: true` flag on `PricedOffer` for hand quotes. That's more code, a new jsonb field and a schema change on frozen snapshots, and no live data needs it.

**D2 — Page ceilings** (the "may fit the next tier" nudge, never a meter).
Recommend `landing_page: 5`, `build: 12`, `system: null`.
- Five matches the design's published "Up to 5 pages" and old Starter.
- Twelve matches old Pro. Build's axis is data and integrations rather than page count, so a high ceiling avoids false nudges.
- The roadmap's 1 / 8 would nudge every two-page landing site toward Build.

**D3 — Monthly hosting and care terms.**
Recommend: every tier's calculator base is **$25/mo** (locked #3 says "from $25/mo, required"); add-ons add their own monthly as today.
- On studio.honuvibe.ai `/pricing`, replace the two minimum-term lines with:
  - "Hosting & maintenance from $25/mo, required on every build."
  - "Hosting covers hosting, security updates, backups and small fixes." (the design FAQ wording)
  - **Keep "6-month minimum"** for all tiers if that's still your policy; otherwise drop it.
  - Keep "Pay annually and save 10%" only if still true.
- Your call on the minimum.

**D4 — "Not sure" resolution.**
Recommend `not_sure → landing_page` (cheapest; today's rule is "start at the lowest tier, never force an upgrade").
- The nudge names the **next tier up** (`nextTier(t)`: Landing Page → Build, Build → System), never a fixed "Build". `recommendUpgrade` also fires on Build above 12 pages, so a fixed "may fit Build" would tell a Build client to move to Build. This applies in both places the nudge appears: `LivePriceTotal` and `QuestionCard.tsx:297`.
- Effect: the discovery tool's default estimate falls from $500 to $100 plus add-ons.

**D5 — Are legacy ids ever written again?**
Recommend: **never by app code going forward, with two deliberate, documented exceptions.**
- **Public intake APIs** (`/api/discover/start`, `/api/studio-leads/submit`): accept old ∪ new for this release, so a page cached before the deploy still submits. Run `normalizeTier()` **before insert**, so the DB only receives new ids.
- **Admin and proposal write schemas** (`proposalInputSchema`, the offer's tier): new ids only.
- **Read schemas** (`issuedSnapshotSchema`, `pricedOfferSchema` when parsing stored rows, `pricingInputSchema`): old ∪ new, forever. A frozen snapshot must always render.
- **Exception 1 — revise.** `reviseProposal` copies a frozen proposal's `tier` and `pricing` verbatim into a new draft (074 RPC). A revision of a pre-B4 proposal therefore starts life with a legacy tier. It re-prices to the mapped tier on its first save (D6). Don't normalize inside revise, because the copied pricing would then contradict its tier.
- **Exception 2 — accept.** `accept_engagement_proposal` writes the proposal's tier onto the engagement. Accepting a pre-B4 issued proposal writes its legacy tier. That's correct (it's what was agreed), and display maps it.
- **Closed: the third path the review found.** `markProposalReady` (`proposal-actions.ts:315`) and `issueProposal` (`:432`) work on the **stored** row: `buildIssuedSnapshot(p, …)` at `:452` never goes through `canonicalOffer` or the write schema, and the panel has no unsaved-changes guard (`EngagementProposalPanel.tsx:99,198,214`). Without a fix, a legacy draft (or a revision under Exception 1) could be marked ready and issued at its **old** price while the form shows the new one.
  - **Fix in B4:** both actions refuse when `p.tier` isn't a new id: "Save this proposal once to re-price it under the new tiers."
  - The draft/ready preview PDF may still render the legacy row (it's watermarked), which is fine.
  - Revise and accept stay the only legacy-write paths, as intended.
- **The CHECKs keep old ∪ new indefinitely.**
- **No data backfill.** It would touch one live lead. Issued snapshots can't be rewritten anyway (the 074 immutability trigger), so the read path has to handle legacy regardless. And "starter" is history worth keeping.

**D6 — Admin display of legacy rows.**
Recommend: one shared `studioTierLabel(id)`.
- New ids print the new name ("Build").
- Legacy ids print the mapped name plus a muted note: "Build (was Starter)".
- Used by the lead row, the engagement row and detail, and the pricing form. This replaces the three duplicate maps.
- **Client-facing documents never relabel.** An issued snapshot prints its frozen `base.label` ("Starter build"). The JA renderer still swaps a frozen EN base label for its JA twin, because `BASE_LABELS` and `BASE_LABELS_JA` keep the legacy keys.
- In the pricing form, a legacy draft opens with the **mapped** tier preselected (`normalizeTier(p.tier)`). Its first save re-prices it.
- Consequences to accept (locked map, flagged, not reopened):
  - a legacy `starter` draft goes from $500 to $1,500 on save;
  - a legacy `pro` draft (calculator-priced) becomes a System custom offer. **Its custom fields are pre-filled** from the stored offer (base, rush and lines as typed, so nothing is lost). But the base label is swapped to `BASE_LABELS.system` whenever it still equals `BASE_LABELS[legacyTier]`, so a System offer never goes out labelled "Pro build". Line labels stay as stored; under the custom rule, JA documents print them as typed. You can edit them before saving.
  - A legacy `ai_native` draft keeps its typed custom fields, the same as today.
- Prod has **0** proposals, so today this affects nothing.

**D7 — New add-ons `form_building`, `lead_capture`.**
Recommend: add both to `ADDONS` and the calculator (opt-in checkboxes, like `booking`).
- Starting numbers for you to accept or change: **Form building $150 one-time / $0 mo; Lead capture $150 one-time / $10 mo.**
- Each needs an EN value line plus a JA label and value in `LINE_LABELS_JA` (client documents).
- Also export a display list `STUDIO_ALA_CARTE = ['multilingual','ai_chat','form_building','lead_capture']` (the design's à-la-carte row order) for Unit 3. Every other existing add-on stays in the calculator unchanged.
- If you'd rather not price them yet, B4 ships the display list only and the two stay out of the calculator.

**D8 — Does a Build brief set `tier_interest`?**
Recommend **no**: briefs store `project_kind` and leave `tier_interest` NULL.
- A "website" can be a Landing Page or a Build, so kind isn't tier. You set the tier on the proposal.
- `start_engagement` then creates the engagement with tier NULL, which is today's behaviour for `not_sure` leads.
- Alternative: derive `website→landing_page`, `web_app→build`, `mvp→system`, `documents/other→NULL` (the design's tier cards do pair them).

**D9 — Brief API shape.**
Recommend: **extend the existing route**, not a new one:
- `source: z.enum(['studio_form','build_brief']).default('studio_form')`, written to `leads.source`.
- `project_kind`: optional enum of the five ids; **required when `source = 'build_brief'`** (zod refine).
- `company`: optional for every source (trimmed; empty → null). The studio.honuvibe.ai form keeps `required` client-side, so its leads still carry a company.
- `project_type`: optional, old ∪ new, normalized.
- Add a hidden honeypot field `hp`. When it's non-empty, return `{ success: true }` and drop the submission silently.
  - The route has no rate limit or captcha today, and Unit 3 puts it in the middle of `/build`.
  - A real rate limit is out of scope (§10).
- **A failed insert returns 500** (today it's logged and the route answers `{success:true}` and still emails, `route.ts:103-105`). If the insert fails, no email is sent.
  - Without this, a brief that hits a missing 088 (a NULL `business_name` or a `project_kind`) would be lost silently while the visitor sees success.
  - It also means §8.4's "200 → the lead exists" check actually proves the insert worked.
  - The `supabaseUrl && serviceRoleKey` missing-env branch keeps today's behaviour.
- **HTML-escape every user value in both Studio-lead emails** (`escapeHtml` already exists in `send.ts` and is used 31 times elsewhere at HEAD):
  - At HEAD, `fullName`, `company`, `message`, `referralSource` and the email go into the HTML raw. The confirmation goes to whatever address was submitted, so it can relay injected HTML from HonuVibe's domain.
  - Write it as `escapeHtml(data.company ?? '')` etc. That's the same text the uncommitted auth WIP uses, which also makes the §9 merge nearly trivial.
- Email: the admin notification gets a "Project kind" row and a "Source" row.
  - A null company row is **omitted**: `detailsTable` (`templates.ts:130`) drops empty and `—` values, so writing "—" would just drop the row anyway.
  - The subject falls back from company to the kind label (`[Studio] Web app — Kai Fixture`).
- The client confirmation email's wording is unchanged (it's already bilingual and says nothing tier-specific); it only gains the escaping.

**D10 — studio.honuvibe.ai copy re-key.**
Recommend: re-key it now so the two sites never show different tiers.
- `TIERS` becomes three cards (EN only, as the Studio site is) using the design's `tierDefs`:

  | Card | Price | Tagline | Includes | CTA |
  |---|---|---|---|---|
  | Landing Page | from $100 | "A landing page or informational site" | Up to 5 designed and built pages · Copy shaped with you · A contact form · Live on your domain | "Choose Landing Page" |
  | **Build** (featured, "Most projects") | from $1,500 | "Database-driven sites" | A site built on your own data… · Connected to your calendar, inbox or payments · Two rounds of changes · Handover walkthrough and files | "Choose Build" |
  | System | from $2,500 | "MVPs and workflows" | Everything in Build · An MVP or one AI workflow · Pitch deck and pro-forma financials · Team documentation · A month of support after launch | "Request a quote" |

  Each card adds the line "+ hosting from $25/mo".
- The FAQ answers change from Starter/Pro/AI-Native to the new names. The meta descriptions become "from $100 Landing Pages to custom Systems".
- The two case studies' `tier: 'Studio AI-Native'` becomes `'System'`.
- The `/contact` form's project-type select becomes Landing Page / Build / System / Not sure yet.
- Your sign-off on these EN strings is needed before commit (roadmap rule: copy sign-off per unit).

**D11 — Where tier and kind display names live.**
Recommend one registry in `lib/pricing.ts`, the same pattern as `lib/tracks.ts`, with EN + JA names:

| Id | EN | JA (machine-drafted) |
|---|---|---|
| `landing_page` | Landing Page | ランディングページ |
| `build` | Build | ビルド |
| `system` | System | システム |

- Kinds live in `lib/studio/labels.ts`:

  | Id | EN | JA (machine-drafted) |
  |---|---|---|
  | `website` | Website | ウェブサイト |
  | `web_app` | Web app | ウェブアプリ |
  | `mvp` | MVP | MVP |
  | `documents` | Business documents | ビジネス文書 |
  | `other` | Other | その他 |

- Why a registry: the admin UI, emails and proposal renderer are not next-intl surfaces, and proposal JA already lives in `lib`. Unit 3 renders the same names on `/build`, either from the registry or from its own `build` i18n namespace that mirrors it. Its choice; a unit test there can assert they match.

**D12 — The discovery tool (app.honuvibe.ai `/discover`).**
Recommend: re-key it.
- Intake `TIER_OPTIONS` and `q_tier` become Landing Page · Build · (System on the intake only) · Not sure / Recommend one.
- System at intake routes to `CustomScopingStub` (copy "System builds are custom…").
- `LivePriceTotal` shows the new names.
- A resumed session whose stored answer is `starter`/`pro` is normalized in `answersToPricingInput`. That's 6 sessions on prod, 5 never priced.
- Alternative: hide the tier question and always use `not_sure`. That's simpler, but it drops a signal you use today.

**D13 — When B4 ships relative to B3 / Unit 2.**
Recommend: as soon as it's approved and green. It touches neither B3's tables nor Unit 2's files. Unit 3 follows B4.

---

## 5. Scope by file

### 5.1 `lib/pricing.ts` (the re-key)

- **Vocabulary**
  - `STUDIO_TIERS = ['landing_page','build','system'] as const`, `StudioTier`.
  - `LEGACY_STUDIO_TIERS = ['starter','pro','ai_native'] as const`, `LegacyStudioTier`, `AnyStudioTier`.
  - `TierInterest = StudioTier | 'not_sure'` (write); `AnyTierInterest = AnyStudioTier | 'not_sure'` (read).
- **Mapping**
  - `LEGACY_TIER_MAP: Record<LegacyStudioTier, StudioTier> = { starter:'build', pro:'system', ai_native:'system' }`.
  - `normalizeTier(v: string | null | undefined): StudioTier | null`: new id → itself, legacy → mapped, `not_sure`, unknown or null → null.
  - `normalizeTierInterest(v)`: the same, but `not_sure` stays `not_sure`.
- **Prices and labels**
  - `PRICING = { landing_page:{build:100, monthly:25, ceiling:5}, build:{build:1500, monthly:25, ceiling:12}, system:{build:2500, monthly:25, ceiling:null} } as const` (D2/D3).
  - `HOSTING_MONTHLY = 25`.
  - `CUSTOM_TIERS: readonly StudioTier[] = ['system']`; `isCustomTier(t: AnyStudioTier)` checks `CUSTOM_TIERS.includes(normalizeTier(t))`.
  - `PricedTier = 'landing_page' | 'build'`.
  - **Delete `AI_NATIVE_FROM`.** Its consumers move to `PRICING.system` (the floor).
  - `STUDIO_TIER_META` (D11): EN/JA name and EN tagline; `studioTierLabel(id, { locale?, legacyNote? })` (D6).
- **Add-ons** (D7): `ADDONS` += `form_building`, `lead_capture`; `PricingAddons` += `formBuilding`, `leadCapture`; `STUDIO_ALA_CARTE` display list.
- **`studioFromPrice()`: unchanged code.** It now returns **100**: the minimum over `PRICING`, and `system.build` is a floor ≥ 100. Keep the function and its doc comment. Home's "Transparent tiers from $100" flips at the next prerender (the deploy).
- **`calculatePricing`**
  - Normalize `input.tier` first.
  - Custom tier → today's custom result with `resolvedTier: 'system'`.
  - `landing_page` / `build` → priced.
  - `not_sure`, unknown or garbage → `resolveNotSure()` → `landing_page` (D4), with the reason "Landing Page looks like the right fit…".
  - `recommendUpgrade` guards `ceiling !== null`.
  - `PricingResult.resolvedTier: PricedTier | 'system'`.
- **`answersToPricingInput`**: normalize both the answer and the intake tier.
- Update the header comment: the consumers list, and "System is custom-quoted from its floor".

### 5.2 Migration `supabase/migrations/088_studio_tier_rekey_and_brief.sql`

The header follows 079's style:
- Purpose. **APPLY TO PROD BEFORE PUSHING THE B4 CODE.**
- Expand-first is safe: every change widens. No reader breaks while old code runs against the new schema: old code writes only old ids, which stay legal; it never reads `project_kind`; and it always writes `business_name`.
- Rollback note.

```sql
BEGIN;

-- 1. Four tier CHECKs: find by column (the 075 pattern; pg_get_constraintdef
--    returns = ANY(ARRAY[...]) so never match on text), assert exactly one,
--    assert it is the name verified on prod 2026-10-15, drop, re-add old ∪ new.
DO $$ ... $$  -- one block per table/column:
--   leads.tier_interest            expect leads_tier_interest_check
--   studio_leads.project_type      expect studio_leads_project_type_check
--   engagements.tier               expect engagements_tier_check
--   engagement_proposals.tier      expect engagement_proposals_tier_check
-- If count <> 1 OR the name differs → RAISE (stop; don't guess).

ALTER TABLE public.leads ADD CONSTRAINT leads_tier_interest_check CHECK (
  tier_interest IS NULL OR tier_interest IN
  ('landing_page','build','system','not_sure',  'starter','pro','ai_native'));
ALTER TABLE public.studio_leads ADD CONSTRAINT studio_leads_project_type_check CHECK (
  project_type IS NULL OR project_type IN
  ('landing_page','build','system','not_sure',  'starter','pro','ai_native'));
ALTER TABLE public.engagements ADD CONSTRAINT engagements_tier_check CHECK (
  tier IS NULL OR tier IN ('landing_page','build','system',  'starter','pro','ai_native'));
ALTER TABLE public.engagement_proposals ADD CONSTRAINT engagement_proposals_tier_check CHECK (
  tier IN ('landing_page','build','system',  'starter','pro','ai_native'));

-- 2. Build brief.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS project_kind text NULL;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_project_kind_check;  -- makes a re-run a true no-op
ALTER TABLE public.leads ADD CONSTRAINT leads_project_kind_check CHECK (
  project_kind IS NULL OR project_kind IN ('website','web_app','mvp','documents','other'));
ALTER TABLE public.leads ALTER COLUMN business_name DROP NOT NULL;
COMMENT ON COLUMN public.leads.source IS
  'discover | studio_form | studio_form_migrated (047 backfill) | manual | prospecting | build_brief';
COMMENT ON COLUMN public.leads.project_kind IS 'Build brief project kind (088). NULL for non-brief leads.';

NOTIFY pgrst, 'reload schema';
COMMIT;
```

- **Re-running 088 is a no-op.** On a second apply, the guard finds the re-added constraints under their expected names and passes; the four drop/re-adds succeed; `project_kind` is skipped by `IF NOT EXISTS`; and its CHECK is dropped and re-added.
- **Same names, re-added.** The constraints keep their exact names, so the TS↔SQL parity test and any future lookup by name keep working.
- **Re-adding validates existing rows.** Every live value is in old ∪ new, so the re-add cannot fail on prod (9 leads, 1 engagement, 0 proposals).
- **The 074 immutability trigger is not involved.** Only an `UPDATE` fires it; a constraint change doesn't.
- **Locks.** Each `ALTER` takes a brief ACCESS EXCLUSIVE lock on a table with at most 9 rows.
- **No new table, function, view or policy.** So:
  - the default-privileges rule (memory `supabase-default-privileges-anon`: new tables auto-grant to anon) **does not apply**;
  - `leads` RLS stays `leads_admin_all` (admin only), and the brief insert uses the service role, as today.
- **Grants.** Adding a column under table-level grants needs nothing. Before applying, confirm prod has no column-level grants on `leads` (`select * from information_schema.column_privileges where table_name='leads'`), the 079 lesson.
- **Not in 088, on purpose:**
  - `start_engagement` still titles a company-less lead's engagement "Untitled engagement". The admin form requires a company before you can save a lead (`lead-actions.ts:108,118`), so you'll name the business while working the lead.
  - The function body stays untouched. That avoids re-pasting a long 067 RPC.
- **Rollback:**
  - Drop `leads_project_kind_check` and the `project_kind` column.
  - Re-add the four legacy-only CHECKs. That **fails if any new-id row exists**: first `UPDATE` those rows back through the inverse map, or leave the widened CHECKs in place, which is harmless.
  - `SET NOT NULL` on `business_name` only after back-filling NULLs.
  - Code rollback alone is safe while 088 stays.

### 5.3 Downstream code (every row of §2.3)

**Discovery**
- `lib/discover/labels.ts`: `TIER_OPTIONS` (D12) built from `STUDIO_TIER_META`; `labelizeTier` handles legacy via `studioTierLabel`.
- `lib/questions.ts`: `q_tier` options `landing_page` / `build` / `not_sure`.
- `lib/discover/derive.ts`: types become `AnyTierInterest`; normalization comes from `answersToPricingInput`.
- `app/api/discover/start/route.ts` (HEAD-based hunk):
  - zod: old ∪ new (D5);
  - insert `normalizeTierInterest(d.tier_interest)`;
  - `custom: isCustomTier(...)`.
- `app/api/discover/review|complete/[sessionId]/route.ts`: row types become `AnyTierInterest | null`.
- `components/discover/LivePriceTotal.tsx`:
  - `TIER_META` comes from the registry (`landing_page`, `build`);
  - the custom card reads "System";
  - the nudge reads "may fit Build".
- `components/discover/CustomScopingStub.tsx`: "Studio AI-Native" becomes "System" (EN only).
- `components/discover/QuestionCard.tsx:297`: the nudge uses `nextTier()` (D4).

**studio.honuvibe.ai**
- `components/marketing/studio/service-tiers.tsx`: D10 cards from `PRICING` and the registry, with no hardcoded numbers.
- `start-project-form.tsx`: options from the registry + `not_sure`. The form keeps `company` required client-side and posts no `source`.
- `studio-faq.tsx`, `app/studio-site/{pricing,services}/page.tsx`, `work/[slug]/page.tsx`: D3/D10 copy.

**Proposal spine**
- `lib/studio/engagement/types.ts`: `EngagementTier = AnyStudioTier` (stored values); `WritableEngagementTier = StudioTier`.
- `proposal-pricing.ts`:
  - `BASE_LABELS: Record<AnyStudioTier, string>`. Legacy keys keep 'Starter build' / 'Pro build' / 'AI-native build' **verbatim**, because issued snapshots compare against them.
  - New entries: 'Landing Page build', 'Build project', 'System build'.
  - `buildUsdOffer` / `buildJpyOffer` store `inputs.tier` normalized and cast to `PricedTier`.
  - `buildCustomOffer(currency, base, rush, lines, adjustment, tier: StudioTier = 'system')` writes `tier` and `inputs: { tier }`.
  - `tierFor` uses `isCustomTier`.
  - `AI_NATIVE_FROM` re-export → `SYSTEM_FROM = PRICING.system`.
- `proposal-schema.ts`:
  - `pricingInputSchema.tier` and `pricedOfferSchema.tier`: old ∪ new (reads).
  - Add-on keys += `formBuilding`, `leadCapture`. The object is strict, so the new keys must be declared.
  - `proposalInputSchema.tier`: **new only**. Its existing refine (offer.tier === tier) forces the offer to a new id too.
- `proposal-document.ts`:
  - `issuedSnapshotSchema.tier`: old ∪ new.
  - `BASE_LABELS_JA`: legacy keys kept, plus new ones (D11 JA, machine-drafted): ランディングページ制作 / ビルド制作 / システム制作.
  - `LINE_LABELS_JA` += `form_building` (フォーム作成 · お問い合わせや申込みフォームを設計・構築), `lead_capture` (リード獲得 · 見込み客の情報を逃さず集める).
  - Line 338: branch on the **stored** tier, **not** `isCustomTier`. Use `tier !== 'ai_native' && tier !== 'system'`.
    - `isCustomTier` normalizes `pro → system`.
    - So a frozen JA `pro` proposal (calculator-priced, with JA add-on labels) would lose those labels on the re-rendered web page (`app/[locale]/proposal/[id]/page.tsx:101`).
    - Its archived PDF keeps them, so the page and the PDF would disagree.
    - Rule: **renderers of stored documents never normalize.**
- `proposal-actions.ts`:
  - `canonicalOffer`: `isCustomTier(offer.tier)` → `buildCustomOffer(..., normalizeTier(offer.tier)!)`.
  - **Tier check:** after rebuilding, assert `fresh.tier === input.tier` for every branch. Today the JPY branch (`:171-178`) never checks it, and `contentPatch` writes `input.tier`, so a crafted payload could store a row whose tier and pricing disagree. A pre-existing gap, closed here because the function is open anyway.
  - `markProposalReady` and `issueProposal` refuse a legacy `p.tier` (D5, closed path).
  - Revise is unchanged (D5).
- `generator.ts:638`: `Tier: ${studioTierLabel(offer.tier)}`, so the model sees the name, not the id.
- `components/admin/ProposalPricingForm.tsx`:
  - Segment options `Landing Page · $100`, `Build · $1,500`, `System · from $2,500 (custom)`.
  - `initialDraft` tier = `normalizeTier(engagement.tier) ?? 'build'` (the popular tier; old default was the cheapest).
  - Custom panel keyed on `isCustomTier`; default base label `BASE_LABELS.system`.
  - `draftFromProposal` normalizes `p.tier` and fills the custom fields when `isCustomTier(p.tier)`, with the legacy base-label swap (D6).
  - YenRow label from the registry.
  - Add-on checkboxes += the two new ones (D7). **Also extend `PricingDraft.inputs.addons` (`:36`), `initialDraft` (`:59`) and the `draftFromProposal` mapping (`:88-94`)** with `formBuilding` / `leadCapture`. Those three places hard-code five keys, so otherwise reloading a saved draft drops the new add-ons, and the next save silently re-prices without them.
- `components/admin/EngagementRow.tsx`, `app/[locale]/admin/studio/engagements/[id]/page.tsx`: delete the local `TIER_LABELS` and use `studioTierLabel(t, { legacyNote: true })`.

**Leads and the brief**
- `lib/studio/labels.ts`:
  - `STUDIO_PROJECT_TYPE = [...STUDIO_TIERS, 'not_sure']`;
  - `STUDIO_PROJECT_TYPE_INPUT` = that plus the legacy ids (API zod only);
  - the label map covers legacy;
  - new `STUDIO_PROJECT_KIND`, `labelizeProjectKind`, `STUDIO_LEAD_SOURCES`.
- `app/api/studio-leads/submit/route.ts`: D9 (source, kind, optional company, normalized type, honeypot, insert `project_kind` and `source`, email labels). The `business_upgrade` refine is unchanged.
- `lib/admin/types.ts`: `StudioLead.company: string | null`, `project_kind: string | null`.
- `lib/admin/queries.ts` (`getStudioLeads`, `getStudioLeadById`): add `project_kind` to the explicit select.
- `components/admin/StudioLeadRow.tsx`:
  - `SOURCE_LABELS.build_brief = 'Build brief'`;
  - `LOCALE_BEARING_SOURCES` += `build_brief`;
  - a Kind cell/field;
  - display name chain `full_name || company || email || 'Untitled lead'`.
- `app/[locale]/admin/studio/leads/[id]/page.tsx`:
  - title falls back to `full_name` → "Studio Lead";
  - show Kind and Source in the detail header (wherever `project_type` shows today; the executor reads the file).
- `app/api/admin/studio-leads/[id]/audit/route.ts` + `outreach/route.ts`: `company = business_name ?? name ?? existing_url host ?? 'this business'`. Never pass null into `neutralize`.
  - **Add `name` to the audit route's select (`:63`)**, which today has no `name` column. Outreach already selects it (`:55`).
- `lib/email/types.ts`: `company: string | null`, `projectKindLabel`, `sourceLabel`.
- `lib/email/send.ts` (HEAD-based hunks; see §9 for the merge with the dirty WIP):
  - `escapeHtml(...)` on every user value in `sendStudioLeadConfirmation` and `sendStudioLeadAdminNotification` (D9);
  - admin notification gets the "Project kind" and "Source" rows;
  - the `Company` row is omitted when null (`detailsTable` filters it);
  - the subject falls back to the kind label.
- `app/api/studio-leads/submit/route.ts`: a failed insert returns 500 with no emails (D9).

---

## 6. i18n and copy (EN + JA)

- **`messages/*.json`: no change in B4.** The `build` namespace is Unit 3's.
- **New JA, all machine-drafted and flagged for native review:**
  - `STUDIO_TIER_META.ja`, `STUDIO_PROJECT_KIND` JA labels (D11);
  - `BASE_LABELS_JA` new keys;
  - `LINE_LABELS_JA.form_building` / `lead_capture` (these print on **client** JA proposals).
- **EN-only surfaces** (studio.honuvibe.ai, the discovery tool, admin, the admin email): EN strings only. That's the existing convention there, not a parity gap.
- **EN copy that needs your sign-off before commit:** the D10 card copy, the D3 care-terms lines, the FAQ answers, the two studio-site meta descriptions, `CustomScopingStub`, the `LivePriceTotal` nudge, and the D7 add-on value lines (EN): "Forms that collect exactly what you need" / "Capture every enquiry and follow up fast".

---

## 7. Tests

**Rewrite**
- `lib/pricing.test.ts`:
  - base tiers: Landing Page 5 pages → $100/$25, no nudge; 6 pages → nudge. Build → $1,500/$25. System → custom with `resolvedTier:'system'`.
  - `studioFromPrice() === 100 === PRICING.landing_page.build`.
  - add-ons, including the two new ones (D7).
  - `not_sure` / garbage → `landing_page`.
  - legacy `starter` → priced as Build; `pro`/`ai_native` → custom System.
  - `answersToPricingInput` normalizes both sources.

**New**
- `__tests__/lib/studio-tiers.test.ts`:
  - `normalizeTier` table (new, legacy, `not_sure`, null, garbage);
  - `studioTierLabel` with and without `legacyNote`, EN/JA;
  - every `StudioTier` has EN + JA names.
  - **parity:** parse `088_studio_tier_rekey_and_brief.sql`. Each of the four tier CHECKs must list exactly `STUDIO_TIERS ∪ LEGACY_STUDIO_TIERS` (∪ `not_sure` for the two lead tables), and `leads_project_kind_check` must equal `STUDIO_PROJECT_KIND`. Same pattern as `__tests__/lib/tracks.test.ts`.
- `__tests__/api/studio-leads-submit.test.ts`, with a mocked admin client and email:
  - studio-form post with company and legacy `project_type:'starter'` → insert `tier_interest:'build'`, `source:'studio_form'`, `project_kind:null`;
  - brief without company → `business_name:null`, `source:'build_brief'`, kind stored, `tier_interest:null` (D8);
  - brief without kind → 400;
  - bad kind → 400;
  - honeypot → 200 with no insert and no email;
  - **insert error → 500, and no email is sent**;
  - email data carries `projectKindLabel` and `company:null`;
  - **escaping:** a `full_name` of `<b>x</b>` arrives escaped in both rendered email bodies (assert on the HTML passed to the mocked `sendEmail`).
- `lib/studio/engagement/proposal-document.test.ts`, add the **legacy snapshot** case:
  - a stored v1 snapshot with `tier:'starter'`, `inputs.tier:'starter'` and `base.label:'Starter build'` passes `issuedSnapshotSchema`;
  - it renders EN 'Starter build' and JA 'スターター制作' unchanged;
  - an `ai_native` custom snapshot renders its typed labels with no JA line substitution;
  - **a JA `pro` snapshot** (calculator-priced, with `booking` and `ai_chat` lines) still renders the JA add-on labels. This guards against normalizing inside the renderer;
  - **a `system` custom snapshot** renders its typed labels, with no JA substitution.
  - These are the regression guard for frozen documents.
- **New action tests** (mock the admin client, in the style of the existing proposal-actions tests if any exist; otherwise a new `lib/studio/engagement/proposal-actions.legacy.test.ts`):
  - `markProposalReady` and `issueProposal` refuse a legacy-tier draft or ready row;
  - `saveProposal` rejects a JPY payload whose rebuilt tier ≠ `input.tier`.
- `ProposalPricingForm` round-trip: `draftFromProposal(p)` → `proposalInputFromDraft` keeps `formBuilding` / `leadCapture`.
- A legacy `pro` draft opens with System selected, the custom fields filled, and base label `BASE_LABELS.system`.

**Update**
- `lib/studio/engagement/proposal-pricing.test.ts`:
  - the click-path offer becomes `landing_page` ($100 base: rush $25, booking $250, AI chat $150, discount −$150);
  - recompute every expected cent figure from the calculator in the test (no new magic numbers);
  - `buildCustomOffer` defaults to `system`;
  - `buildUsdOffer({tier:'system'})` throws `OfferError`;
  - legacy `starter` inputs → tier `build`.
- `lib/studio/engagement/proposal-schema.test.ts`. **This will fail as written:**
  - `:13` builds `OFFER` with `tier:'starter'` (now a `build` offer);
  - the `:61` base row has `tier:'starter'`, which the new-only write schema rejects, so `:73` fails.
  - Move both to new ids, then add the read/write case: `proposalInputSchema` rejects `tier:'starter'` while `pricedOfferSchema` accepts it.
- `lib/studio/engagement/proposal-document.test.ts`. **This will fail as written:**
  - `:15`/`:23` mismatch (the offer becomes `build`, the row stays `starter`);
  - `:89` expects "Starter build" / "$500.00";
  - the JA case at `:128` depends on the base label.
  - Move the live-path fixtures to `landing_page` and recompute their figures from the calculator. The legacy expectations move into the frozen-snapshot cases above, built from literal stored JSON, never from `buildUsdOffer`.
- `generator.test.ts`: `:14,16` fixtures to new ids; `:107` `'Starter build: ¥75,000'` becomes the new base label. `lib/discover/derive.test.ts`: fixtures to new ids. Both get one legacy-input normalization case each.
- `components/admin/EngagementStageControl.test.tsx`: leave the `tier:'starter'` fixture as is (the type now allows it) and confirm it renders.
- `__tests__/marketing/home/home-sections.test.tsx`: no edit. It computes from `studioFromPrice()`; run it to confirm "$100".
- Admin row: a `StudioLeadRow` test for a null company (falls back to the name) and the Build brief source label. Add `components/admin/StudioLeadRow.test.tsx` if no row test exists.
- Audit/outreach: a null `business_name` reaches the generator as the fallback string (extend `__tests__/api/studio-lead-audit.test.ts`).

**RLS / DB** (hosted throwaway `kmmfssluqbcuhybfrsbn`, never prod)
- New `supabase/tests/studio_tier_rekey_rls.test.ts`:
  - **Constraints:** for each of the four columns, exactly one CHECK covers it, `conname` equals the expected name, every new and every legacy id inserts, and `'bogus'` → `23514`.
  - **Brief columns:**
    - `leads.project_kind` accepts the five ids and rejects bogus;
    - `business_name` NULL inserts;
    - anon cannot `select`/`insert` `leads` (RLS unchanged: `leads_admin_all`);
    - an authenticated non-admin cannot either.
  - **Spine:** `start_engagement` on a `landing_page` lead → engagement tier `landing_page`. `create_engagement_proposal` with `p_tier:'build'` succeeds. Accept → `engagements.tier = 'build'`.
- Existing `engagement_rls`, `engagement_proposals_rls`, `engagement_invoices_rls`: **no fixture changes.** Their `starter`/`pro` inserts are now the legacy-compatibility coverage. Run all three.

---

## 8. Verification

Everything runs in a **clean worktree** of `HEAD` plus exactly the B4 diff. Never in the dirty main tree (Unit 1's lesson).

1. **Worktree**
   - `git worktree add ../hv-b4 <HEAD>`, then apply the B4 patch.
   - Add a local, uncommitted `.npmrc` with `node-linker=hoisted`, then `pnpm install`.
   - Copy `.env.local` and `.env.test.local`.
2. **Gate** (`pnpm verify` split per memory; don't pipe through `tail`, which masks exit codes; clear a stale `.next/lock`):
   - `NODE_OPTIONS=--max-old-space-size=8192 pnpm type-check`
   - `pnpm vitest run --project app --maxWorkers=2` (no `NODE_OPTIONS`)
   - `NODE_OPTIONS=--max-old-space-size=8192 pnpm build`. The route table must still show `/[locale]` and `/[locale]/about` as `●` (B4 must not make Home dynamic, because `lib/pricing.ts` stays pure).
3. **`pnpm test:rls`**
   - Apply 088 to `kmmfssluqbcuhybfrsbn` first, through the IPv4 session pooler (`TEST_SUPABASE_DB_URL` overridden to `aws-0-ca-central-1.pooler.supabase.com:5432`, user `postgres.kmmfssluqbcuhybfrsbn`; this machine has no IPv6).
   - Then run the new suite plus the three engagement suites. About 16 min; never kill it mid-run (it leaves fixture engagements behind).
   - Also **apply 088 twice** on the throwaway project. The second run must succeed as a no-op (§5.2), and the constraint definitions must be identical before and after.
4. **Browser smoke** (`pnpm start` of the worktree build, headless playwright-core):
   - [ ] `http://localhost:3000/` and `/ja`: the Build panel and More-ways card read "Transparent tiers from $100". Console clean.
   - [ ] `http://studio.localhost:3000/`, `/pricing`, `/services`: three cards (Landing Page $100 · Build $1,500 featured · System from $2,500), "+ hosting from $25/mo", no "Starter/Pro/AI-Native" anywhere (`page.content()` grep). 375 px: no horizontal scroll.
   - [ ] `http://studio.localhost:3000/contact`: submit with a legacy-free type. 200, and the lead appears in `/admin/studio/leads` with tier "Build". Use the throwaway DB if `.env.local` points at prod; **never create a prod test lead without your OK**.
   - [ ] A brief `POST /api/studio-leads/submit` `{source:'build_brief', project_kind:'web_app', full_name, email, message}` (curl) → 200. In admin: Kind "Web app", Source "Build brief", company "—". Email logged (dev) with the "Project kind" row.
   - [ ] `http://app.localhost:3000/discover`: the intake shows the new tiers. Choosing System → scoping stub. Not sure → live estimate $100 + $25/mo.
     - If B4 is built on a HEAD **without** the parallel session's Commit D, the route is open.
     - If B4 is rebased onto Commit D, set `DISCOVERY_ENABLED=true` in the worktree's `.env.local` for this smoke only, or the intake 503s.
   - [ ] Admin pricing form on a throwaway engagement: the three segments, System → custom panel, JPY YenRow label, the two new add-on checkboxes. A legacy draft fixture opens preselected on the mapped tier.
   - [ ] Proposal preview PDF for a legacy `starter` fixture snapshot (EN and JA) renders its frozen labels.
5. **Adversarial review** (`requesting-code-review`, prompted to refute) over the B4 diff and 088. Triage with `receiving-code-review`, then re-run the gate.
6. **EN copy sign-off** (§6) before commit.

---

## 9. Ship sequence and rollback

**Parallel session.** Another session is landing 068–073 now. B4 never edits, renames or renumbers 065/068–073/084, and its gate runs from `HEAD`, not from the dirty tree.
- **Collision risk:**
  - Low on numbering: those files are 068–073/084, B4 is 080. The risk is only real if that session renumbers into 080–083.
  - Low on schema: `070_discovery_email_verification.sql` touches `leads` only through functions (`email_verified`), not `tier_interest` / `business_name` / `source`.
  - Medium on **files**: both B4 and the auth/discovery WIP edit `app/api/discover/start/route.ts` and `lib/email/send.ts`.

1. **Re-check at ship time:**
   - `git fetch && git log --oneline HEAD..origin/main`;
   - `ls supabase/migrations` on `origin/main`;
   - re-run the §2.1 prod counts (proposals by tier and status, engagements by tier) and the four `conname`s.
   - If `origin/main` moved (that session pushed first): rebase the B4 commit in the worktree onto `origin/main`, re-run the full §8.2 gate and the RLS suites on the rebased tree, and resolve any conflict in the two shared files keeping **both** changes.
   - If any proposal now exists on prod, re-read D6 and add its exact rows to the execution record.
   - **Expected case:** the land-068-073 session pushes first (its 068 code is overdue on prod).
     - If its Commit C is on `origin/main`, drop B4's escaping hunks from `send.ts` during the rebase (§2.4).
     - If its Commit D is there, the discovery smoke needs `DISCOVERY_ENABLED=true` locally (§8.4).
2. **Ryan applies `088_studio_tier_rekey_and_brief.sql`** in the dashboard SQL editor on `zvfwtndbxshrtpwcwynw`, **before** the code is pushed (expand-first). Verify by **querying prod**, never by trusting a note:
   - the four `conname`s with their widened definitions;
   - `leads_project_kind_check`;
   - `leads.business_name` `is_nullable = YES`;
   - `leads.project_kind` exists;
   - the column-privileges check (§5.2).
3. **Commit**
   - **If `origin/main` still equals local `main`** (Unit 1 method):
     - In the worktree, run `git add -A`, then `git diff --cached --binary <HEAD> > b4.patch`. A plain `git diff` **skips untracked files**, so it would silently leave out 088 and every new test.
     - In the main tree, run `git apply --cached b4.patch`.
     - Check `git diff --cached --stat`. It must list `supabase/migrations/088_studio_tier_rekey_and_brief.sql`, `__tests__/lib/studio-tiers.test.ts`, `__tests__/api/studio-leads-submit.test.ts` and `supabase/tests/studio_tier_rekey_rls.test.ts` (plus any other new test), and **no** auth/discovery WIP hunks.
     - Commit `feat(studio): B4 — tier re-key (landing_page/build/system) + Build brief (migration 088)`; push.
   - **If `origin/main` moved**: commit in the rebased worktree (detached HEAD, no branch) and `git push origin HEAD:main`. The main tree is then behind; leave its fast-forward to whoever reconciles the parallel session's untracked files, since `merge --ff-only` refuses to overwrite untracked copies. Don't stash, discard or `reset` the WIP.
4. Hooks must pass. No `--no-verify`.
5. **Bring the main tree's working copy in line** (Unit 1 step 5):
   - `git checkout -- <files that were clean>`;
   - For the two dirty files (`app/api/discover/start/route.ts`, `lib/email/send.ts`), **don't** use `git apply --3way`: it implies `--index`, and after the commit the index holds B4 while the file holds the WIP. The review reproduced it failing with "does not match index". Instead, do a file-level three-way merge:
     ```bash
     cp lib/email/send.ts /tmp-scratch/send.ts.wip          # back up the WIP first (scratchpad dir)
     git show HEAD~1:lib/email/send.ts > base.ts
     git show HEAD:lib/email/send.ts   > b4.ts
     git merge-file lib/email/send.ts base.ts b4.ts         # result = WIP + B4
     ```
     Do the same for `start/route.ts`. Because B4 writes the same `escapeHtml(...)` text the WIP uses (D9), `send.ts` should merge with at most a trivial conflict. Resolve it keeping both, then `git diff HEAD -- <file>` must show only the WIP's own hunks.
   - `git status` must show only the pre-existing unrelated changes.
6. **After deploy:**
   - `www.honuvibe.ai/` and `/ja` show "from $100" (curl and grep the HTML);
   - studio.honuvibe.ai `/pricing` shows the three tiers;
   - the app.honuvibe.ai discovery intake shows the new tiers. Only check this if Discovery is on (`DISCOVERY_ENABLED=true` in Vercel, Ryan's call); with the gate off, a 503 is expected and isn't a B4 failure;
   - one real brief from you through the curl in §8.4 (or wait for Unit 3) and confirm the admin row and the email.

**Rollback**
- Code: `git revert <sha>` and push. The widened CHECKs and the nullable `business_name` are harmless to old code, with two exceptions for brief leads created while B4 was live (NULL `business_name`):
  - old code's audit narrative fails (the audit ends `partial`, no 500);
  - the admin title reads "null — Studio Lead".
  - After a revert, run `UPDATE leads SET business_name = coalesce(name, email) WHERE business_name IS NULL`.
- A revert also drops the email escaping. Re-land the escaping on its own if B4 is reverted.
- Schema: §5.2 rollback, only if really needed.

---

## 10. Out of scope

- The `/build` page itself, its `build` i18n namespace, the brief form UI, the success panel copy and the "two working days" wording (Unit 3).
- Rate limiting or a captcha on `/api/studio-leads/submit` beyond the honeypot. Flagged: it becomes a prominent public form in Unit 3.
- A data backfill of legacy ids (D5) and tightening the CHECKs to new-only.
- `start_engagement` titling company-less leads (§5.2).
- Discovery-tool page/feature pricing beyond the tier re-key (the multilingual $500 setup on a $100 Landing Page is unchanged; flag for a later pricing pass).
- The dirty `DISCOVERY_ENABLED` gate and the auth/discovery WIP.
- Any Stripe change (none needed, §2.2).

## 11. Adversarial plan review (2026-10-15)

**Who and how:** an in-session reviewer, prompted to refute the plan. It was read-only; its only experiment was a scratch git repo reproducing the `--3way` failure. It returned 14 findings plus a line-number slip. **I re-checked each against the code before applying it, and all 15 hold.**

| # | Sev | Finding | Applied in |
|---|---|---|---|
| 1 | High | `git diff` patch skips untracked files, so 088 and the new tests would be missing from the commit | §9 step 3 |
| 2 | High (security) | Studio-lead emails don't escape user input at HEAD; escaping exists only in the not-release-ready WIP; `company` becoming nullable breaks the WIP's `escapeHtml(data.company)` | D9, §5.3, §7 |
| 3 | Med-high | Ready/issue work on the stored row, so a legacy draft could be issued at old prices without a save | D5, §5.3, §7 |
| 4 | Medium | `isCustomTier` in the document renderer would strip JA labels from frozen `pro` docs on the web page | §5.3, §7 |
| 5 | Medium | `git apply --3way` onto the dirty files fails ("does not match index") | §9 step 5 |
| 6 | Medium | Submit route swallows insert errors, losing briefs silently and making the smoke check meaningless | D9, §5.3, §7 |
| 7 | Medium | D6 vs §5.3 contradicted each other on legacy `pro` custom fields | D6 |
| 8 | Med-low | The re-run claim was wrong (42710 on the project_kind CHECK) | §5.2, §8.3 |
| 9 | Med-low | `QuestionCard.tsx:297` missing from the inventory; "may fit Build" is wrong for Build | §2.3, D4, §5.3 |
| 10 | Low-med | `proposal-schema` / `proposal-document` / `generator` tests will fail as written | §7 |
| 11 | Low | The pricing form's five hard-coded add-on keys would drop the new add-ons on reload | §5.3, §7 |
| 12 | Low | The audit route has no `name` in its select; null company degrades the audit, it doesn't crash | §2.3, §5.3, §9 rollback |
| 13 | Low | `detailsTable` filters `—`, so the Company row is omitted rather than shown | D9, §5.3 |
| 14 | Low (pre-existing) | `canonicalOffer` never checks tier consistency on the JPY branch | §5.3, §7 |
| — | Fact | `custom:` is line 106 at HEAD (109 only in the dirty copy) | §2.3 |

**Confirmed correct by the reviewer (tried and failed to refute):**
- **The four CHECKs:** they are the only SQL with literal tier values.
- **SQL objects:** `start_engagement` is null-safe; `engagement_list` needs no recreation; the 074 triggers are `BEFORE UPDATE` only.
- **Pricing:** `studioFromPrice()` returns 100 unchanged; `usdOfferMatchesCalculator` still holds.
- **Issued documents:** issued PDFs serve archived bytes.
- **Tests:** the RLS fixtures and the EngagementRow, invoice and home tests are unaffected.
- **Discovery data:** `computed_pricing` is never read; the answer route doesn't validate options, so cached legacy answers aren't rejected.

## Out-of-band (Ryan)

1. Answer D1–D13 (or "as recommended"). D3 (minimum term) and D7 (add-on prices) need your numbers or a yes to the defaults.
2. Sign off the EN copy in §6.
3. Apply 088 on prod before the push (§9 step 2).
4. Native JA review: the tier and kind names, `BASE_LABELS_JA`, and the two new `LINE_LABELS_JA` entries.
5. After deploy, spot-check studio.honuvibe.ai and the Home "from $100".
