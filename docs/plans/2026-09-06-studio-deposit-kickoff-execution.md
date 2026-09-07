# Studio slice 4 — execution prompt

**How to use:** paste the block below into a fresh Claude Code chat opened in
`c:\Users\HCI\Desktop\Projects\HonuVibe_2026`. It executes the approved plan
`docs/plans/2026-09-06-studio-deposit-kickoff.md` (rev 2) as two commits.

---

```
You are EXECUTING slice 4 of the HonuVibe Studio engagement spine: "Accepted →
paid → build kickoff". Working directory:
c:\Users\HCI\Desktop\Projects\HonuVibe_2026. Fresh session by design. The plan
is complete and APPROVED — implement it faithfully, verify, ship two commits,
report. Do not redesign, do not re-litigate any locked decision.

---

STATE — settled before this session. A quick `git log -1`,
`ls supabase/migrations`, `git status --porcelain | wc -l` sanity check is
enough; do not re-derive.

- HEAD is 001777f (or later). Slices 1–3 are shipped and live: spine 22e2c59,
  discovery dc89408, proposal 612e1e9 + fb6cf45 (+ docs 001777f). Migrations
  067 + 074 are on prod.
- Next free migration is 075. 074 is the last committed; 065 and 068–073 are
  untracked, unrelated files on disk — never touch them or any of the ~132
  unrelated uncommitted entries. If 075 has been taken, take the next free
  number and update every reference in the plan.
- lib/progress/{actions,queries}.test.ts are red (28 failed: 9 + 19),
  unrelated. THE GATE RULE: every test file this unit adds or touches is
  green, the full suite shows ONLY those 28 failures, they are listed by file
  in the ship report, and Ryan says "continue" before each commit. If they
  have been fixed by other work, the gate is fully green with no exception.
- Stripe SDK is 20.4.1 pinned to API 2026-02-25.clover in lib/stripe/client.ts.
  DO NOT bump the version. No `integration_identifier` (needs ≥ 2026-03-25).

---

THE PLAN: docs/plans/2026-09-06-studio-deposit-kickoff.md (rev 2, APPROVED).
Read it in full before touching anything. Its sections are the spec:
Locked decisions (Q1–Q10) · Data model (migration 075: engagement_invoices +
engagement_deliverables, two guard triggers, the constraint swap adding eight
event kinds, the amended void RPC and terminal sweep, seven new RPCs + one
STABLE helper, engagement_list with six columns APPENDED) · Surfaces (admin
ProposalDepositBlock + EngagementDeliverablesPanel + the soft gate in
EngagementStageControl; the client band states; the deposit mint route) ·
Stripe integration (params built ONLY from immutable invoice columns,
idempotency key per (invoice_id, mint_attempt), STEP 0 webhook branch before
the user_id/course_id guard, engagement-only handlers for the three new
checkout events, the refund block) · Abuse/privacy/hygiene · Build order
(slice A then slice B) · Gates · Verification (unit table, RLS assertions,
browser smoke, click path with exact amounts) · Files.

The instruction set, in order of authority:
  1. CLAUDE.md (repo root): pnpm only, commit to main, no branches/PRs, hooks
     must pass, prod migrations are manual (0NN_*.sql in the dashboard on
     zvfwtndbxshrtpwcwynw).
  2. The plan above. Decisions in "Locked decisions" are final. "Judgment
     calls worth a second look" are decided — implement them as written.
  3. supabase/migrations/067_studio_engagement.sql and 074_studio_proposals.sql
     — every RPC/trigger you add matches their idioms exactly: SECURITY
     DEFINER, SET search_path = '', REVOKE ALL FROM PUBLIC/anon/authenticated
     + GRANT EXECUTE TO service_role, CASE-form jsonb CHECKs, 23505 → 409,
     one lock order (engagement → proposal → invoice), the catalog-driven
     kind-CHECK swap (074:340-353 — find by conkey, assert exactly one, drop
     by name, re-add as engagement_events_kind_check listing all 28 existing
     kinds VERBATIM plus the eight new ones), CREATE OR REPLACE VIEW appends
     only after proposal_first_opened_at (074:509). The amended
     void_engagement_proposal_acceptance (074:915-975) and
     tg_engagements_stage_sync (074:374-453) keep their bodies verbatim and
     add only the marked blocks.
  4. The code the plan cites — read each before editing: lib/stripe/webhooks.ts
     (partner branch :35-47 is the precedent), app/api/stripe/webhook/route.ts,
     app/api/stripe/checkout/route.ts:124-151, lib/studio/engagement/
     proposal-session.ts, app/api/engagement/proposal/[id]/accept/route.ts
     (the mint route copies its shape), proposal-actions.ts (translateDbError
     :146 — export it; resendProposalLink :563-599 — extract
     rotateProposalToken from it; emailProposalLink :446-466 — the failure
     event idiom), proposal-notify.ts + emails.ts (the notify/sender moulds),
     proposal-terms.ts:36/:59 (reword for NEW proposals only), app/[locale]/
     proposal/[id]/page.tsx:107-116, components/proposal/copy.ts,
     components/admin/EngagementProposalPanel.tsx:491-527,
     EngagementStageControl.tsx, app/[locale]/admin/studio/engagements/[id]/
     page.tsx (panels :106-131), EngagementTimeline.tsx KIND_LABELS,
     StatusBadge.tsx, lib/admin/types.ts, lib/admin/queries.ts,
     lib/studio/engagement/types.ts, proposal-markdown.ts (the seeder's
     bullet source), format.ts:56 (formatMinorUnits).
  5. supabase/tests/engagement_proposals_rls.test.ts — the harness the new
     engagement_invoices_rls.test.ts copies (fixtures, withPg, teardown order
     invoices/deliverables → proposals → briefs → questionnaires →
     engagements → leads).
  6. This is NOT the Next.js you know: read node_modules/next/dist/docs/ for
     any API you are unsure of (after(), route handlers, params as Promise).

SKILLS: superpowers:executing-plans (or subagent-driven-development if you
fan out — most of this is one unit; only A2/A3/A4 are independent of each
other) · superpowers:test-driven-development for every lib module (failing
test first) · stripe:stripe-best-practices (+ references/payments.md,
security.md) before writing the builder/webhook code · supabase:supabase-
postgres-best-practices before writing 075 · superpowers:requesting-code-
review + receiving-code-review for the pre-commit review · superpowers:
verification-before-completion before any "done" claim.

---

WORKFLOW

Phase 1 — Absorb. Read the plan fully, then the cited code. Re-check the
  migration number and the lib/progress red. Do not start writing until
  you can name every file in the plan's "Files" list and what it does.

Phase 2 — Slice A (the deposit), in the plan's A1→A7 order:
  A1 migration 075 + supabase/tests/engagement_invoices_rls.test.ts —
     schema-first, `pnpm test:rls` green (temp-rename the duplicate 022/025
     survey migrations, run, restore them) INCLUDING the two-connection races
     exactly as the plan constructs them (X holds `SELECT … FROM engagements
     … FOR UPDATE`, Y blocks, X runs its RPC and commits, Y resumes), the
     re-issue-after-void → old-session-pays case (no 23505), the
     duplicate_payment case, the partial-then-full refund case.
  A2 types + invoice-math (+ tests: 87500→43750/43750, 132000→66000/66000,
     87501→43751/43750, 87500@100→87500/0, minimums, bigint-safe).
  A3 lib/stripe/engagement-invoice.ts + webhooks.ts STEP 0 + refund block +
     three exported engagement-only handlers + the three dispatcher cases
     (+ builder test + the signed-fixture route test with
     stripe.webhooks.generateTestHeaderString; assert async_payment_succeeded
     for a partner cohort session calls NEITHER the engagement RPC NOR
     fulfillCohortCheckout).
  A4 emails.ts two senders + invoice-notify.ts.
  A5 export translateDbError, extract rotateProposalToken (resendProposalLink
     behaviour unchanged), invoice-actions.ts (issueDeposit = RPC → rotate →
     sendDepositRequestEmail with the tokened entry URL → stamp
     invoice_email_sent_at or insert notification_failed), voidProposalAcceptance
     maps reason 'invoice_paid', getEngagementInvoices.
  A6 ProposalDepositBlock + panel prop + page fetch + StatusBadge + timeline
     labels + EngagementRow.proposalLabel (+ test).
  A7 copy.ts band keys (EN + JA, JA flagged for native review in the report),
     ProposalDepositButton (+ test), the page's accepted branch, the mint
     route app/api/engagement/proposal/[id]/deposit/route.ts (+ route test:
     idempotency_error → rearm → retry once), proposal-terms.ts wording for
     new proposals.
  Then the gate (Phase 4), review (Phase 5), commit + push (Phase 6).

Phase 3 — Slice B (build kickoff), B1→B2: deliverable-seed.ts (+ test),
  deliverable-actions.ts, getEngagementDeliverables, EngagementDeliverablesPanel
  (+ test), the panels slot, EngagementStageControl openBuildDeliverables prop +
  confirm (+ test). No migration. Then gate → review → commit → push.

Phase 4 — Gate, per slice: `pnpm type-check` clean · `pnpm test:run` — every
  file this unit touched green, ONLY the 28 lib/progress failures remain,
  list them by file · `pnpm build` with NODE_OPTIONS=--max-old-space-size=8192,
  exit 0, the new routes listed (beware `| tail` masking exit codes and a
  stale .next/lock) · slice A also `pnpm test:rls` green (engagement_invoices +
  engagement_proposals + engagement suites). Browser smoke on the LOCAL stack
  only (.env.local is production): NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:
  54321 + anon/service keys from .env.test.local, fixture admin
  aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6@fixture.local, bundled headless shell,
  Stripe TEST mode with `stripe listen --forward-to
  localhost:3000/api/stripe/webhook` (its signing secret as
  STRIPE_WEBHOOK_SECRET for the run). Run the plan's smoke steps 1–5 and 8–9
  for slice A ($875 → $437.50 / $437.50; ¥132,000 → ¥66,000 / ¥66,000), step 7
  for slice B; step 6 is the signed-fixture test. Record what you actually
  observed; if the box cannot keep a browser alive, verify SSR'd pages over
  HTTP with the session cookie and say so.

Phase 5 — Review, per slice, before commit: dispatch a code-reviewer
  sub-agent (requesting-code-review) told to REFUTE the diff against the plan
  and 067/074 — lock order, the voided_at IS NULL uniqueness, duplicate
  payment, params-from-immutable-columns, engagement-only async handlers,
  no raw event body / Checkout URL / token in engagement_events, no
  payment_method_types, no allow_promotion_codes, no API bump. Triage with
  receiving-code-review: verify each finding before acting; reject with
  reasons where the plan already decided it.

Phase 6 — Ship, per slice: STOP and show Ryan the gate results (with the 28
  listed by file) — wait for "continue" — then stage ONLY this unit's files
  by path (never `git add -A`), commit to main with a
  `feat(studio): deposit invoice — …(slice 4A, 075)` /
  `feat(studio): build kickoff — deliverables + soft launch gate (slice 4B)`
  message ending in `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`,
  hooks must pass (no --no-verify), push. Slice A's ship report must say,
  in this order: (1) Ryan applies 075 in the dashboard on zvfwtndbxshrtpwcwynw
  BEFORE the deploy lands (062/074 precedent — it is additive), running the
  post-migration verification queries in 075's tail; (2) Ryan adds
  checkout.session.async_payment_succeeded, checkout.session.async_payment_failed
  and checkout.session.expired to the Stripe webhook endpoint (both test and
  live); (3) Stripe receipts on in the dashboard if a client receipt is
  wanted. Then update the plan's STATUS header with the commit SHAs and the
  verification record (the slice-3 plan's header is the format), and update
  the memory file project_studio_deposit_kickoff.md + its MEMORY.md line.

---

THINGS YOU MUST NEVER DO IN THIS SESSION
- Touch lib/progress/*, migrations 065/068–073, or any of the unrelated
  uncommitted entries. Use npm. Create branches or PRs. Skip hooks.
- Bump the Stripe API version or SDK. Pass payment_method_types or
  allow_promotion_codes. Store a Checkout URL, a card detail, a raw event
  body, or a plaintext token anywhere — DB, event, log, email.
- Route checkout.session.async_payment_succeeded into handleCheckoutCompleted
  (the partner branch would re-run). Write to the `payments` table for an
  engagement invoice. Fulfil on payment_status 'unpaid'.
- Touch accept_engagement_proposal, the stage anchors, won_at, or any 074
  RPC not named in the plan. Rewrite the void RPC or the sweep — copy the
  body, add the marked block.
- Re-open Q1–Q10 or any spine/proposal locked decision. Invent a hard launch
  gate, a client-visible deliverables page, automatic charging, a Payment
  Link, or an AI seeder.
- Claim done without the gate output in front of you. Commit before Ryan's
  "continue".

Report shape at the end of each slice:
  🚢 STUDIO SLICE 4A|4B — SHIPPED <sha> (pushed) | READY, awaiting "continue"
  Gate: type-check · test:run (N passed / 28 failed — lib/progress only:
        actions.test.ts 9, queries.test.ts 19) · build (exit 0, routes) ·
        test:rls (suites + counts) · browser smoke (steps run, what was seen)
  Review: <N findings · N fixed · N rejected (why)>
  Prod steps for Ryan (in order): <075 before deploy · Stripe endpoint events ·
        receipts>
  Owed: <Ryan's prod link pass with a real deposit in test mode first · JA
        native review of copy.ts band keys + sendDepositRequestEmail>
  Next: <slice B | plan header + memory updated>
```
