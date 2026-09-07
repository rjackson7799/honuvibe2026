# Studio Deposit + Build Kickoff — slice 4 of the engagement spine

> **STATUS: rev 2 APPROVED — SLICE A SHIPPED 2026-09-06 (`5c06299`); SLICE B SHIPPED 2026-09-06 (`c949f4f`, pushed).**
> Migration 075 ships with slice A and must be applied on prod BEFORE the deploy lands (the 062/074 precedent);
> slice B carries no migration. Slices 1–3 are shipped and live: spine `22e2c59`, discovery `dc89408`,
> proposal `612e1e9` + `fb6cf45`. **CORRECTION 2026-09-06: only 067 was on prod — 074 was NEVER
> applied**, found when 075 failed with `42P01: relation "public.engagement_proposals" does not
> exist`. While it was missing, `/admin/studio/engagements/<id>` 500'd for every engagement. Apply
> **074 then 075** in the dashboard. Verify a prod migration by querying prod, never by trusting a note.
>
> **Verification record (2026-09-06, local stack).**
> - Slice A: `pnpm type-check` clean · `pnpm test:run` 1699 passed / 28 failed — the 28 are ONLY the
>   pre-existing unrelated `lib/progress/{actions,queries}.test.ts` red (9 + 19) · `pnpm build` exit 0
>   (379 routes; `/api/engagement/proposal/[id]/deposit` listed) · `pnpm test:rls` 27 files / 496 tests green
>   (`engagement_invoices` 39 new, incl. all three two-connection races).
> - Slice B: `pnpm type-check` clean · `pnpm test:run` 1722 passed / same 28 · `pnpm build` exit 0 ·
>   `pnpm test:rls` unchanged 496. New unit files: `deliverable-seed` 6, `EngagementDeliverablesPanel` 9,
>   `EngagementStageControl` 10 (that file did not exist before).
> - Smoke ran over HTTP against the LOCAL stack in Stripe TEST mode — there is no browser automation on the
>   build machine, so the plan's fallback applies. Observed end to end: issue 50% of $875 → 43750/43750 with
>   the snapshotted recipient; the real Stripe session carried $437.50, the truncated label, `client_reference_id`,
>   exactly the six metadata keys and DYNAMIC payment methods (card/klarna/link/cashapp/amazon_pay — proof
>   `payment_method_types` was never pinned); two clicks returned the SAME session id; paid → band flips,
>   list row `· deposit paid`, Void disabled with the refund tooltip; replay → one `invoice_paid`; a different
>   PI → `invoice_duplicate_payment` with the row unchanged; partial ¥20,000 then full → two `invoice_refunded`,
>   then void succeeds and the view's deposit slot empties; `/ja` + JPY rendered ¥66,000 with no decimals and a
>   `ja` Stripe session; rate limit 429 after 6, cross-site 403, honeypot `{ok:true}` with no URL, `no-store`.
>   Slice B: the real seeder over the real stored snapshot dropped a heading, a paragraph and a duplicate and
>   stripped bold; the guard filled `delivered_at` and PRESERVED it through an ordinary edit; the view read
>   2 open of 3. The panel's click paths and all six gate branches are covered by tests, not a browser.
>
> **Two deviations from the plan's letter, both deliberate:**
> 1. `translateDbError` and `rotateProposalToken` live in a NEW plain module `lib/studio/engagement/proposal-internals.ts`
>    rather than being exported from `proposal-actions.ts`: a `'use server'` file may only export async functions
>    (so a synchronous `translateDbError` is a build error), and exporting a helper that takes a `SupabaseClient`
>    would publish it as an action endpoint — the rule `proposal-notify.ts` already documents. `resendProposalLink`
>    calls the extracted helper and its behaviour is unchanged.
> 2. `handleEngagementInvoiceRefunded` THROWS on a genuine RPC error (so Stripe retries) instead of falling through
>    as "not our charge", which would have left a real refund recorded only inside Stripe. Raised by review.
>
> **Two defects the work surfaced and fixed, beyond the plan:**
> - The mint route filtered the deposit lookup to `status = 'sent'`, which made the RPC's `already_paid` verdict
>   unreachable: a stale tab clicking Pay after paying got "temporarily unavailable" instead of "already paid —
>   reload". It now selects the live deposit by `voided_at IS NULL` and lets the RPC own the verdict (409).
>   Found by the smoke, not by the tests.
> - Slice B's inline row controls were 36px/12px (below CLAUDE.md's 44px / 16px minimums) and its uncontrolled
>   inputs were keyed on `id` alone, so they never re-synced after a `router.refresh()`. Both found by review.
>
> **Owed:** Ryan applies 075 on prod BEFORE the deploy; adds `checkout.session.async_payment_succeeded`,
> `async_payment_failed` and `expired` to the Stripe webhook endpoint (test AND live); turns on Stripe receipts
> if a client receipt is wanted. Then a prod link pass with a real deposit in test mode first, a browser pass on
> the deliverables panel and the launch-gate confirm, and a JA NATIVE REVIEW of the `copy.ts` band keys,
> `sendDepositRequestEmail` and the reworded `proposal-terms.ts` payment lines.
>
> **Original status:** rev 2 APPROVED (Ryan, 2026-09-06). Written 2026-09-06 from the brainstorm settled
> with Ryan on 2026-09-05/06 (Q1–Q10 below); rev 2 incorporates the adversarial review round (19 findings, 19
> incorporated, 0 rejected). Execution prompt: `docs/plans/2026-09-06-studio-deposit-kickoff-execution.md`
> (runs in a fresh session, slice A then slice B). Slices 1–3 are shipped and live:
> spine `22e2c59`, discovery `dc89408`, proposal `612e1e9` + `fb6cf45` (+ docs `001777f`); migrations 067
> and 074 are on prod.
>
> **Rev 2 (2026-09-06)** — what changed after review: the one-live-invoice uniqueness is on **`voided_at IS
> NULL`**, so a voided invoice that is paid late can never collide with a re-issued one (a 23505 in the
> webhook would have made Stripe retry into a wall while the money sat unrecorded); a **second real payment**
> on the same invoice (a konbini/bank-transfer voucher that lands after a card payment) is detected as
> `duplicate_payment` and flagged, never swallowed as a replay; a session that completed **unpaid** marks the
> invoice `awaiting_async_payment_at` and blocks re-arming until it succeeds or fails; the Checkout params
> are built **only from immutable invoice columns** (the recipient email is snapshotted at issue) so the
> idempotency key can never see drifting params, and a Stripe `idempotency_error` re-arms and retries once;
> **"Request deposit" rotates the proposal token and the deposit email carries the tokened entry URL** (the
> `sendProposalInvite` mould) — a manually-accepted proposal has no token, a 45-day token may have expired,
> and the client may pay from a different browser; `async_payment_succeeded` reaches **only** the engagement
> handler (the course/partner fulfilment must not run twice); the Checkout label truncates the title; the
> deposit email's delivery state is a **column** (`invoice_email_sent_at`) plus a `notification_failed`
> event, because `engagement_events` is append-only; a partial-then-full refund updates the cumulative
> `amount_refunded`; `int → bigint` in the split; the formatting helper is `STABLE`; `expire_…` became
> `rearm_engagement_invoice_checkout`; `mark_paid` on a missing invoice is a 200 + admin email, not a 500;
> the deliverables trigger preserves `delivered_at` on ordinary edits; race test (1)'s construction is
> corrected; anchors and copy fixed. Judgment calls 2, 4, 5 restated; 10–11 added.
>
> **Migration number: 075.** 074 is the last committed; 065 and 068–073 are untracked, unrelated files on
> disk — never touch them, nor any of the ~132 unrelated uncommitted entries. Re-check `ls supabase/migrations`
> and `git status` at execution time; if 075 has been taken, take the next free number and update every
> reference in this plan.
>
> Decisions in "Locked decisions" were settled with Ryan during the brainstorm and should not be re-litigated
> during execution. The calls most likely to be wrong are flagged at "Judgment calls worth a second look".
>
> **For agentic workers:** a fresh session executes this plan from an execution prompt written in the slice-B
> prompt's shape (`docs/plans/_EXECUTION_TEMPLATE.md` lineage). Steps use `- [ ]` syntax in "Build order".

## Context

Slice 3 ends at the moment of agreement: the client clicks Accept on `/proposal/<id>`, one RPC writes the
money onto the engagement and moves it to `build`, and Ryan gets an email. The proposal's own terms then
promise something the system cannot yet do: *"The build investment is due on acceptance, via a payment link
Ryan sends. Work starts once it is received."* (`lib/studio/engagement/proposal-terms.ts:36`, and `:59`
"Ryan sends the payment link"). Today that link is a Payment Link Ryan builds by hand in the Stripe
dashboard, and nothing on the engagement record knows whether it was paid.

Meanwhile `build` and `launch` are stages with a button and no content. The spine plan reserved
`engagement_deliverables` for exactly this ("a panel that renders at build/launch"), and the accepted
proposal's **scope section** already lists, in Ryan's own words, what will be delivered.

This unit closes both gaps without opening a new client surface:

- **(a) Deposit / first invoice.** An `engagement_invoices` table (kind `deposit | balance | care_month`;
  integer minor units + currency; Stripe ids; status `draft | sent | paid | refunded | void`). Ryan issues
  the deposit from the **accepted** proposal with one click, choosing 50% (default) or 100%. The client pays
  through a **Stripe Checkout Session minted on demand** behind the **existing** proposal cookie (`hv_engp_`,
  no new token). The accepted band on `/proposal/<id>` shows "Pay the deposit →" while unpaid and "Deposit
  received {date}" after. The **webhook** is the truth: it marks the invoice paid, writes `invoice_paid`
  (`needs_attention`) and emails Ryan. No client account, no card on file, no subscriptions.
- **(b) Build kickoff.** An `engagement_deliverables` table (title, phase `build | launch`, status
  `planned | in_progress | delivered | accepted`, `due_on`, `delivered_at`, `notes_md`) seeded by Ryan from
  the accepted proposal's scope bullets (no AI), a deliverables panel at build/launch, and a **soft** launch
  gate: leaving `build` while build-phase deliverables are undelivered warns and asks for one extra confirm,
  never blocks.

Intended outcome: accept → deposit issued → deposit paid → deliverables listed → launch, all recorded on
`/admin/studio/engagements/<id>`, with the client never leaving the one proposal page they already have.

## Locked decisions

Settled with Ryan 2026-09-05 (Q1) and 2026-09-06 (Q2–Q10). Do not revisit during execution.

| # | Decision | Consequence |
|---|---|---|
| 1 | **Scope = deposit/first invoice + build kickoff.** Rejected: deposit-only; deliverables + win tracker; meeting processing. **Care billing is explicitly NOT this unit.** | Two tables, one migration. `care_mrr → Stripe subscription` has an attach point (decision 8) and nothing more. |
| 2 | **Deposit = 50% of `total_build` (default) or 100%, from an allowlist. No typed amounts.** Rounding: deposit = round-half-up in minor units; balance = total − deposit so they sum exactly. JPY is whole yen already. `total_build = 0` (performance/hybrid) → nothing to invoice, button disabled. Stripe minimums ($0.50 / ¥50 — both **50 minor units**) enforced in the RPC and as a table CHECK. | `87500 → 43750 / 43750` ($437.50 each); `132000 → 66000 / 66000` (¥66,000 each); `87501 → 43751 / 43750`. At 100% one `deposit` row for the full amount and **no balance row**. At 50% the `balance` row is created as `draft` and **never sent this slice** (attach point). The seeded terms for **new** proposals are reworded so future PDFs stay truthful; already-accepted PDFs promise full-on-acceptance (judgment call 1). |
| 3 | **Manual trigger: Ryan clicks "Request deposit" on the accepted row.** Not automatic on accept. | The percentage is chosen at click time. `accept_engagement_proposal` (074:850-905) is **untouched**. |
| 4 | **Delivery = the accepted band on `/proposal/<id>` + one client email. The `hv_engp_` cookie is reused; no new token *type*, no invoice page.** Rev 2: "Request deposit" **rotates** the proposal token (the `resendProposalLink` path, which slice 3 already uses on accepted rows) and the deposit email carries the tokened **entry URL**, exactly as `sendProposalInvite` does. | The same session type that authorised accepting authorises paying. A manually-accepted proposal has no token, a 45-day token may have expired, and the client may pay from another browser — rotating on issue covers all three with one path. No **payment** URL is ever in an email. A separate `/invoice/<id>` page (different payer) is an attach point. |
| 5 | **Stripe object = a Checkout Session minted on demand** from the band's button via a cookie-authenticated route, **not** a durable Payment Link on the row. | Sessions expire; a leaked proposal link never exposes a durable payment URL. Idempotency key per `(invoice_id, mint_attempt)`; metadata `{checkout_kind:'engagement_invoice', engagement_id, invoice_id, currency}`; `client_reference_id = invoice_id`; `customer_email` from the engagement contact; `locale` from the proposal; success back to the proposal page with `?paid=1` (UX only); no `payment_method_types`; fulfil only when `payment_status ≠ 'unpaid'`; handle `checkout.session.async_payment_succeeded` / `async_payment_failed` / `expired`; **the Stripe API version is NOT bumped** (`2026-02-25.clover` stays; see "Explicitly not this unit"). |
| 6 | **Paid changes:** invoice → `paid` + `paid_at` + payment intent id; `invoice_paid` event (`needs_attention`); Ryan emailed; band flips. **Stage untouched** (accept already moved it); **`won_at` untouched** (067 rule). **Void of the acceptance voids `draft|sent` invoices in the same transaction and is REFUSED while a `paid` invoice exists** (the RPC returns `reason:'invoice_paid'`; the server action throws *"A paid deposit exists. Refund it in Stripe first, then void."*) — refund in the Stripe dashboard first, then void. No force flag. **`refunded` is a status** (set by `charge.refunded`), and a refunded invoice can be voided. `checkout.session.expired` re-arms the mint; a session that completed **unpaid** (delayed method) marks the invoice awaiting and blocks a second mint; `async_payment_failed` clears that, writes an `invoice_payment_failed` event (`needs_attention`) and the band offers Pay again; a second real payment is `invoice_duplicate_payment` (`needs_attention` + Ryan emailed), never a silent replay. | The ledger can always be mirrored in Stripe: there is no DB state that says "never existed" while money sits in Stripe, and no payment Stripe took is ever absorbed as a no-op. |
| 7 | **Deliverables = manual rows + a non-AI "Seed from proposal scope" helper (review-first). Soft launch gate. Client does NOT see deliverables.** Status flow `planned → in_progress → delivered → accepted` with backwards moves allowed; `delivered_at` maintained by trigger. | No model call, no drafting state. The scope's top-level markdown bullets become editable candidate rows Ryan confirms. Leaving `build` for `launch|care|closed` with open build-phase deliverables shows a confirm listing them; it never blocks. AI extraction and client visibility are attach points. |
| 8 | **Care billing attach point reserved, nothing runs:** `kind` CHECK includes `'care_month'`; a nullable `stripe_subscription_id text` column exists unused. | The future care unit is code-only if it keeps "one invoice row per billing event". No Price, no subscription, no cron, no care event kinds. |
| 9 | **Locale:** band states + client deposit email EN/JA in the proposal's locale (**JA flagged for native review**); admin panel, deliverables panel, launch-gate copy and Ryan's notification stay **EN**. Checkout `locale` follows the proposal. | Amounts render via `formatMinorUnits` (`lib/studio/engagement/format.ts:56`) — `$437.50` / `¥66,000` in both locales. |
| 10 | **Tests = three layers, all required before commit:** (1) `supabase/tests/engagement_invoices_rls.test.ts` on the `withPg` harness (RLS, RPCs, uniqueness, rounding, minimums, void/refund rules, the terminal sweep, three two-connection races); (2) a webhook unit test with **signed fixture events** (`stripe.webhooks.generateTestHeaderString`) for all five event types, the branch-before-guard order, `payment_status:'unpaid'` not fulfilling, replay no-op, no raw event body in events; (3) the proposal browser smoke extended end to end (EN + `/ja`). The lib/progress rule (below) applies unchanged. | See "Verification". |

## Data model — migration `075_studio_invoices_deliverables.sql`

Two new tables, one new guard trigger, one amended RPC (`void_engagement_proposal_acceptance`), one amended
trigger (`tg_engagements_stage_sync`), seven new RPCs plus one STABLE formatting helper, one constraint
swap (eight event kinds), one replaced view (six columns appended). RLS on both tables: a single `*_admin_all` policy (`USING (public.is_admin())
WITH CHECK (public.is_admin())`), **no anon or member policy** — the client reaches its invoice only through a
service-role route that has verified the cookie, and Stripe reaches it only through the signature-verified
webhook. Identical posture to 067/074. Every function: `SECURITY DEFINER`, `SET search_path = ''`,
`REVOKE ALL … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role`.

### `engagement_invoices`

| Column group | Columns |
|---|---|
| identity | `id`, `created_at`, `updated_at`, `engagement_id → engagements ON DELETE CASCADE`, `proposal_id → engagement_proposals ON DELETE CASCADE` (a `care_month` row of a later unit may carry `NULL`; this slice always sets it) |
| what | `kind CHECK IN ('deposit','balance','care_month') NOT NULL`, `pct_of_build smallint CHECK (pct_of_build IS NULL OR pct_of_build BETWEEN 1 AND 100)` — set for deposit/balance (50/50 or 100), NULL for care_month; `label text CHECK 1..200 NOT NULL` (what the client sees on Checkout: "Deposit — <business, truncated to 150> (50%)") |
| money | `currency CHECK IN ('USD','JPY') NOT NULL`, `amount int NOT NULL CHECK (amount >= 50)` — integer minor units in `currency`; the `>= 50` CHECK is the Stripe minimum for **both** currencies ($0.50 = 50 cents, ¥50 = 50 yen) and also excludes zero |
| recipient | **`recipient_email text CHECK (NULL or 3..320)`** — the engagement's contact email **snapshotted at issue**, immutable; the only email the Checkout `customer_email` and the deposit email ever use (review finding 3: params under one idempotency key must never drift) |
| status | `status CHECK IN ('draft','sent','paid','refunded','void') NOT NULL DEFAULT 'draft'` |
| lifecycle | `sent_at`, `paid_at`, `refunded_at`, `voided_at`, `void_reason text CHECK NULL or 1..1000`, **`invoice_email_sent_at timestamptz`** (stamped by the action on provider success — the `notification_sent_at` idiom; mutable) |
| Stripe | `stripe_checkout_session_id text`, `checkout_session_expires_at timestamptz`, **`awaiting_async_payment_at timestamptz`** (set when a session completed with `payment_status = 'unpaid'`; blocks re-arming; cleared by `async_payment_failed`), `mint_attempt int NOT NULL DEFAULT 0 CHECK (>= 0)`, `checkout_count int NOT NULL DEFAULT 0`, `stripe_payment_intent_id text`, `amount_refunded int CHECK (NULL or >= 0)`, **`stripe_subscription_id text`** (decision 8 — unused) |
| shape CHECKs | `engagement_invoices_status_shape_ck` (CASE form): `draft` → `sent_at IS NULL AND paid_at IS NULL AND stripe_payment_intent_id IS NULL`; `sent` → `sent_at IS NOT NULL AND paid_at IS NULL`; `paid` → `sent_at IS NOT NULL AND paid_at IS NOT NULL AND stripe_payment_intent_id IS NOT NULL`; `refunded` → the `paid` shape plus `refunded_at IS NOT NULL AND amount_refunded IS NOT NULL`; `void` → `voided_at IS NOT NULL AND void_reason IS NOT NULL`; `ELSE false`. (A `void → paid` row carries both `voided_at` and `paid_at`; the `paid` branch permits that on purpose.) `engagement_invoices_pct_shape_ck`: `(kind = 'care_month') = (pct_of_build IS NULL)`. `engagement_invoices_session_shape_ck`: `(stripe_checkout_session_id IS NULL) = (checkout_session_expires_at IS NULL)`. |

Indexes: `uq_engagement_invoices_one_live ON (proposal_id, kind) WHERE voided_at IS NULL AND kind IN
('deposit','balance')` — one live deposit and one live balance per proposal. **`voided_at IS NULL`, not
`status <> 'void'`** (review finding 1): a voided invoice whose 24-hour session is paid afterwards becomes
`void → paid` but keeps `voided_at`, so it can never collide with the deposit Ryan re-issued after the void —
that collision would have been a 23505 inside the webhook, a 500, three days of Stripe retries and money
nobody recorded. `care_month` rows are many and excluded. `uq_engagement_invoices_session ON (stripe_checkout_session_id)
WHERE … IS NOT NULL`; `uq_engagement_invoices_payment_intent ON (stripe_payment_intent_id) WHERE … IS NOT
NULL` (the webhook's idempotency key — `idempotency-requires-identity`); `idx_engagement_invoices_engagement
ON (engagement_id, created_at DESC)`; `idx_engagement_invoices_proposal ON (proposal_id)` (FK index).
`trg_engagement_invoices_updated_at` via `tg_set_updated_at()`.

**Guard — `tg_engagement_invoices_guard` (BEFORE UPDATE).** `engagement_id`, `proposal_id`, `kind`,
`currency`, `amount`, `pct_of_build`, `label`, `recipient_email` are immutable always
(`invoice_identity_immutable`). Transitions are enumerated: `draft→sent`, `draft→void`, `sent→paid`,
`sent→void`, `paid→refunded`, `refunded→void`, **`void→paid`** (the money-arrived-after-void case, decision
6 — the RPC flags it), any status to itself (`refunded→refunded` is how a partial refund grows into a full
one); everything else RAISEs `invoice_transition_invalid` (in particular `paid→void`, `paid→sent`,
`refunded→paid`). Once `paid_at` is set, `paid_at` and `stripe_payment_intent_id` are immutable
(`invoice_payment_locked`); `amount_refunded` may only grow (`invoice_refund_shrunk`).

### `engagement_deliverables`

| Column group | Columns |
|---|---|
| identity | `id`, `created_at`, `updated_at`, `engagement_id → engagements ON DELETE CASCADE`, `proposal_id uuid → engagement_proposals ON DELETE SET NULL` (which accepted proposal seeded it; NULL for hand-added rows) |
| content | `title text CHECK 1..200 NOT NULL`, `phase CHECK IN ('build','launch') NOT NULL DEFAULT 'build'`, `status CHECK IN ('planned','in_progress','delivered','accepted') NOT NULL DEFAULT 'planned'`, `due_on date`, `delivered_at timestamptz`, `notes_md text CHECK (NULL or <= 4000)`, `sort_order int NOT NULL DEFAULT 0` |
| shape CHECK | `engagement_deliverables_delivered_shape_ck`: `(status IN ('delivered','accepted')) = (delivered_at IS NOT NULL)` |

Indexes: `idx_engagement_deliverables_engagement ON (engagement_id, phase, sort_order)`;
`idx_engagement_deliverables_proposal ON (proposal_id)`. `trg_engagement_deliverables_updated_at`.

**Guard — `tg_engagement_deliverables_guard` (BEFORE INSERT OR UPDATE).** `engagement_id` immutable on
UPDATE. Every status move is allowed (decision 7: one operator, backwards moves are corrections) — the
trigger owns **`delivered_at`** so the shape CHECK can never be violated by a caller: when
`NEW.status IN ('delivered','accepted')` it sets `NEW.delivered_at := COALESCE(NEW.delivered_at,
CASE WHEN TG_OP = 'UPDATE' THEN OLD.delivered_at END, now())` — an ordinary edit (title, notes, due date)
that omits or nulls `delivered_at` on an already-delivered row keeps the original timestamp (review finding
13); when `NEW.status IN ('planned','in_progress')` it sets `NEW.delivered_at := NULL`. This is `transition-allowlist-as-data` with an
all-pairs allowlist and one derived column — the mechanism is kept so a later unit can narrow it in one place.

### Event kinds — added by constraint swap, found through the catalog

Same `DO $$ … conkey … $$` block as 074:340-353 (find the one CHECK covering `kind` by `pg_constraint.conkey`,
assert exactly one, drop by name), then `ADD CONSTRAINT engagement_events_kind_check CHECK (kind IN (…))`
listing the sixteen 067 kinds and twelve 074 kinds **verbatim**, then the eight new ones:

`invoice_issued`, `invoice_paid`, `invoice_payment_failed`, `invoice_duplicate_payment`,
`invoice_refunded`, `invoice_voided`, `deliverables_seeded`, `deliverable_delivered`.

`needs_attention = true` on `invoice_paid` (Ryan starts the build), `invoice_payment_failed` (a delayed
payment method bounced — the client may need a nudge), `invoice_duplicate_payment` (a second real payment
landed on an already-paid invoice — Ryan must refund the named payment intent in Stripe) and
`invoice_refunded` (money left; the acceptance probably needs voiding). The TS twin `ENGAGEMENT_EVENT_KINDS`
(`lib/studio/engagement/types.ts:18-47`) gains the same eight; `KIND_LABELS`
(`components/admin/EngagementTimeline.tsx:15-44`) gains eight labels (`Invoice issued`, `Invoice paid`,
`Payment failed`, `Duplicate payment`, `Invoice refunded`, `Invoice voided`, `Deliverables seeded`,
`Deliverable delivered` — "Invoice", not "Deposit", because the same kinds label the 100% "build investment"
case). The RLS suite asserts **every** TS kind (36) inserts, proving the twenty-eight survived, and that
exactly one CHECK covers `kind` afterwards.

**Never in `engagement_events.data`:** a Stripe event body, a Checkout URL, a card detail, an email address.
Allowed: invoice id, kind, amount, currency, pct, session id, payment intent id, a curated reason code.

### Lock order — engagement → proposal → invoice, one rule for every writer

- `issue_engagement_deposit`: lock engagement → lock proposal → (insert invoices).
- `begin_engagement_invoice_checkout`: read the invoice's `engagement_id`/`proposal_id` **without a lock** →
  lock engagement → lock proposal → lock invoice → **re-validate the token hash and every status after all
  three locks are held** (`authorize-under-the-lock`).
- `mark_engagement_invoice_paid`: same three locks, same order; the webhook is a client of this RPC.
- `mark_engagement_invoice_refunded`: find the invoice by payment intent without a lock → same three locks.
- `void_engagement_proposal_acceptance` (amended): lock engagement → lock proposal → **lock that
  proposal's non-void invoices `ORDER BY created_at FOR UPDATE`** → decide.
- `tg_engagements_stage_sync` terminal sweep (amended): the engagement row is already locked by the UPDATE
  that fired it; it locks the open proposals (074), then **locks the parent proposals of every `draft|sent`
  invoice `ORDER BY version FOR UPDATE`** (the accepted proposal is not in 074's open loop, so it is locked
  here), then voids the invoices (`sweep-revalidate-under-lock`).
- `record_engagement_invoice_checkout`, `rearm_engagement_invoice_checkout` and
  `mark_engagement_invoice_awaiting_async` touch **only** the invoice row (single-row lock, CAS on
  `mint_attempt` / session id) — a single-row lock cannot participate in a cycle with the rule above. Same
  reasoning as 074's `touch_engagement_proposal_open`.
- Deliverables are written by plain service-role statements from server actions (no RPC): a single-row
  UPDATE/INSERT on `engagement_deliverables` takes no engagement or proposal lock.

Void-vs-webhook, double webhook delivery and mint-vs-void are **two-connection tests** in the RLS suite
(`two-session-concurrency-test-layer`), each asserting the loser sees a clean verdict, never a deadlock.

### RPCs — all `SECURITY DEFINER`, `SET search_path = ''`, `service_role` EXECUTE only

- **`issue_engagement_deposit(p_proposal_id uuid, p_pct int) RETURNS jsonb`** — (1) read `engagement_id`
  without a lock (`proposal_not_found`); (2) lock engagement; RAISE `engagement_terminal` if
  `stage IN ('lost','closed')`; (3) lock proposal; RAISE `proposal_not_accepted` unless `status = 'accepted'`;
  (4) RAISE `invoice_pct_invalid` unless `p_pct IN (50,100)`; (5) RAISE `invoice_nothing_to_bill` if
  `total_build = 0`; (6) RAISE `invoice_already_issued` if a `deposit` row with `status <> 'void'` exists
  for the proposal — the test is **`voided_at IS NULL`**, matching the partial unique index, which is the
  backstop → 23505; (7) arithmetic in **bigint** (review finding 10 — `int * int` overflows above
  ¥21,474,836): `v_deposit := ((v_p.total_build::bigint * p_pct + 50) / 100)::int` (integer division on
  positive ints = round half up), `v_balance := v_p.total_build - v_deposit`; RAISE `invoice_below_minimum`
  if `v_deposit < 50` **or** (`p_pct < 100 AND v_balance < 50`) — a deposit whose balance could never be
  billed is refused now, not discovered later; (8) `v_email := NULLIF(btrim(v_e.client_contact_email), '')`
  — RAISE `invoice_recipient_required` if NULL (the action already checks; the RPC is the authority); INSERT
  the `deposit` row `status='sent', sent_at=now(), pct_of_build=p_pct, recipient_email=v_email, label=…` in
  `v_p.currency`; (9) if `p_pct < 100` INSERT the `balance` row `status='draft', pct_of_build = 100 - p_pct,
  recipient_email=v_email`; (10) event `invoice_issued` (actor `admin`, `needs_attention=false`), summary
  `Deposit requested: $437.50 (50% of $875.00) — v2`, data `{invoice_id, kind:'deposit', amount, currency,
  pct, balance_invoice_id|null}` — **no `emailed` key**: `engagement_events` is append-only (067
  `tg_engagement_events_append_only`), so email delivery is recorded on the row and by a second event (see
  `issueDeposit`); RETURN `{invoice_id, balance_invoice_id, amount, currency}`. The label is built in SQL:
  `format('%s — %s (%s%%)', <Deposit|Build investment>, left(v_e.title, 150), p_pct)` — `left(…, 150)` keeps
  a 200-char title inside the 200-char label CHECK and Stripe's 250-char product name (review finding 6); the
  formatted money in the summary uses a small **`STABLE`** helper `public.engagement_format_minor(amount int,
  currency text)` added by 075 (`to_char` depends on `lc_numeric`, so it is not honestly IMMUTABLE; nothing
  indexes it): USD `'$' || to_char(amount / 100.0, 'FM999,999,999,990.00')`, JPY `'¥' || to_char(amount,
  'FM999,999,999,990')` — matching the TS formatter for the two currencies we have. `REVOKE ALL … FROM
  PUBLIC, anon, authenticated` like every other function; it is called only inside the RPCs.
- **`begin_engagement_invoice_checkout(p_invoice_id uuid, p_token_hash text) RETURNS jsonb`** — the
  cookie-authenticated mint's DB half. Locks engagement → proposal → invoice, then: engagement terminal →
  `{applied:false, reason:'not_open'}`; token re-validation on the **locked proposal row** exactly as
  074's accept (`p_token_hash IS NULL OR access_token_hash IS NULL OR mismatch OR token_revoked_at IS NOT NULL
  OR token_expires_at <= now()` → `{applied:false, reason:'forbidden'}`); proposal `status <> 'accepted'` →
  `not_open`; invoice `status = 'paid'|'refunded'` → `already_paid`; `status <> 'sent'` → `not_open`;
  **`awaiting_async_payment_at IS NOT NULL` → `{applied:false, reason:'payment_pending'}`** (review finding
  2: a konbini/bank-transfer voucher is outstanding — minting a second session would invite a second real
  payment). Then the re-arm rule: if `stripe_checkout_session_id IS NOT NULL AND checkout_session_expires_at
  <= now() + interval '60 seconds'` → `mint_attempt := mint_attempt + 1`, clear the session columns. RETURN
  `{applied:true, attempt: mint_attempt, amount, currency, label, recipient_email, engagement_id,
  proposal_id, locale}` — **only immutable invoice/proposal columns**, so two clicks under one idempotency key
  always build identical params (review finding 3).
- **`record_engagement_invoice_checkout(p_invoice_id uuid, p_attempt int, p_session_id text, p_expires_at
  timestamptz) RETURNS jsonb`** — single-row lock; CAS: `status = 'sent' AND mint_attempt = p_attempt` else
  `{applied:false}` (a void or a concurrent re-arm won — the session Stripe created for a losing attempt just
  expires unused); sets `stripe_checkout_session_id`, `checkout_session_expires_at`, `checkout_count + 1`.
  No event (a mint is not a business fact; `checkout_count` is the counter).
- **`rearm_engagement_invoice_checkout(p_invoice_id uuid, p_session_id text DEFAULT NULL) RETURNS jsonb`**
  (rev 2, replaces `expire_…`) — single-row lock; `{applied:false}` unless `status = 'sent'` **and**
  `awaiting_async_payment_at IS NULL` **and** (`p_session_id IS NULL OR stripe_checkout_session_id =
  p_session_id`); clears the session columns and bumps `mint_attempt`. Two callers: the `checkout.session.
  expired` handler (with the session id — a stale event for a session already replaced matches nothing), and
  the mint route after a Stripe `idempotency_error` (with `NULL` — force a fresh key, then retry once). No
  event.
- **`mark_engagement_invoice_awaiting_async(p_invoice_id uuid, p_session_id text, p_clear boolean) RETURNS
  jsonb`** (rev 2) — single-row lock; `p_clear=false` (from `completed` with `payment_status='unpaid'`):
  `{applied:false}` unless `status='sent'` and the session matches; sets `awaiting_async_payment_at =
  now()`. `p_clear=true` (from `async_payment_failed`): clears it so the client can pay again. No event
  from the set path; the failed path's event is written by the handler (below).
- **`mark_engagement_invoice_paid(p_invoice_id uuid, p_session_id text, p_payment_intent_id text,
  p_amount_total int, p_currency text) RETURNS jsonb`** — the webhook's write. Three locks (`proposal_id` may
  be NULL on a future care row — lock the engagement then skip the proposal lock when NULL). Then, in order:
  (0) invoice not found → `{applied:false, reason:'not_found'}` (the engagement was deleted and the cascade
  took the invoice — the webhook logs and emails Ryan, 200, review finding 9); (1) if `status IN
  ('paid','refunded')`: when `p_payment_intent_id IS NOT DISTINCT FROM stripe_payment_intent_id` →
  `{applied:false, reason:'already_paid'}` (replay, `completed` + `async_payment_succeeded` for the same
  payment — no-ops); when it **is a different payment intent** → INSERT `invoice_duplicate_payment` (actor
  `system`, `needs_attention=true`, summary `A SECOND payment of $437.50 landed on an already-paid invoice —
  refund pi_… in Stripe`, data `{invoice_id, amount, currency, payment_intent_id, session_id,
  original_payment_intent_id}`) and RETURN `{applied:false, reason:'duplicate_payment', …}` — the webhook
  emails Ryan (review finding 2: a voucher paid days after a card payment must never be swallowed as a
  replay);
  (2) RAISE `invoice_amount_mismatch` if `p_amount_total <> amount OR upper(p_currency) <> currency`
  (defensive: the price is server-set and promotion codes are off, so this only fires on tampering or a
  Stripe-side change — the webhook catches it, writes `invoice_payment_failed` with
  `reason:'amount_mismatch'`, and returns 200 so Stripe does not retry into the same wall); (3) `v_was_void
  := status = 'void'`; UPDATE `status='paid', paid_at=now(), stripe_payment_intent_id, stripe_checkout_session_id
  = COALESCE(…, p_session_id), awaiting_async_payment_at = NULL`; (4) event `invoice_paid` (actor `client`, `needs_attention=true`), summary
  `Deposit received: $437.50` — or, when `v_was_void`, `Payment received on a VOIDED invoice: $437.50 — refund
  it in Stripe` — data `{invoice_id, kind, amount, currency, payment_intent_id, session_id, on_void}`; RETURN
  `{applied:true, engagement_id, kind, amount, currency, on_void}`. **Stage and `won_at` are not touched.**
- **`mark_engagement_invoice_refunded(p_payment_intent_id text, p_amount_refunded int) RETURNS jsonb`** —
  find the invoice by payment intent without a lock (`{applied:false, reason:'not_found'}` — the charge
  belongs to a course, not to us; the caller falls through to the existing enrollment branch); three locks;
  `status IN ('draft','sent','void')` → `{applied:false, reason:'not_paid'}`; `status = 'refunded' AND
  p_amount_refunded <= amount_refunded` → `{applied:false, reason:'already_refunded'}` (a replay); otherwise
  (`paid`, or `refunded` with a **larger** cumulative `charge.amount_refunded` — a partial refund followed by
  the rest, review finding 8) UPDATE `status='refunded', refunded_at=COALESCE(refunded_at, now()),
  amount_refunded=p_amount_refunded`; event `invoice_refunded` (actor `system`, `needs_attention=true`),
  summary `Deposit refunded: ¥30,000 of ¥66,000 (partial) — void the acceptance if the deal is off` /
  `… ¥66,000 of ¥66,000 (full) …`, data `{invoice_id, amount, amount_refunded, currency, partial:
  p_amount_refunded < amount}`.
- **`void_engagement_proposal_acceptance(p_proposal_id uuid, p_reason text)` — CREATE OR REPLACE, body from
  074:915-975 verbatim plus one block** between the `not_accepted` check and the reason check: lock the
  proposal's invoices `WHERE proposal_id = v_p.id AND status <> 'void' ORDER BY created_at FOR UPDATE`; if any
  has `status = 'paid'` → `RETURN jsonb_build_object('applied', false, 'reason', 'invoice_paid')` (the action
  maps it to *"A paid deposit exists. Refund it in Stripe first, then void."*); after the proposal UPDATE, for
  each locked `draft|sent|refunded` invoice: UPDATE `status='void', voided_at=now(), void_reason='Acceptance
  voided: ' || v_reason` and INSERT `invoice_voided` (actor `admin`, data `{invoice_id, kind, amount,
  currency, reason:'acceptance_voided'}`). The 074 return shape is preserved (`stage_reverted`), plus
  `invoices_voided: n`.
- **`tg_engagements_stage_sync` — CREATE OR REPLACE, body from 074:374-453 verbatim plus one block** inside
  the terminal branch after the proposal loop (074:374-453 is the function as it stands): lock the parent
  proposals of every `draft|sent` invoice of the engagement (`SELECT id FROM engagement_proposals WHERE id IN (SELECT DISTINCT proposal_id FROM
  engagement_invoices WHERE engagement_id = NEW.id AND status IN ('draft','sent')) ORDER BY version FOR
  UPDATE`), then loop those invoices `ORDER BY created_at FOR UPDATE`: `status='void', voided_at=now(),
  void_reason = format('Engagement marked %s', NEW.stage)` + one `invoice_voided` event (actor `system`) per
  row. **`paid` and `refunded` rows are untouched** — a closed care plan keeps its money history. Reopening
  does not undo it; Ryan re-issues explicitly (the void freed the slot).

### The view — `engagement_list`, replaced

`CREATE OR REPLACE VIEW` may only **append**, so six columns go **after** `proposal_first_opened_at`
(074:509): `deposit_invoice_id, deposit_status, deposit_amount, deposit_paid_at` from
`LEFT JOIN LATERAL (SELECT … FROM engagement_invoices i WHERE i.engagement_id = e.id AND i.kind = 'deposit'
AND i.status <> 'void' ORDER BY i.created_at DESC LIMIT 1)`, and `deliverables_open_count`,
`deliverables_total_count` (`count(*) FILTER (WHERE status IN ('planned','in_progress') AND phase = 'build')`
and `count(*)` from a second LATERAL). Keep `security_invoker = true`. `EngagementListItem`
(`lib/admin/types.ts:388-427`) gains the same six; `proposalLabel` (`components/admin/EngagementRow.tsx:51`)
appends ` · deposit paid` / ` · deposit due` to the Accepted label from them.

### Rollout — apply 075 on prod BEFORE deploying (the 062/074 precedent)

Everything is additive: two new tables, RPCs and triggers nothing calls yet, an amended void RPC whose new
branch only fires when invoice rows exist, an amended sweep that finds no rows, a constraint swap that is a
superset, and view columns appended after the ones the shipped list reads. Applying first means no interval
in which the workspace page or the webhook queries a table that does not exist. The migration header says so;
the ship report states the order. Post-migration verification queries (tables + RLS + one policy each; the
shape constraints by name; the eight RPC grants + the helper = `service_role` + `postgres` only; six new view columns;
exactly one kind CHECK containing `invoice_paid`; the three triggers armed) follow 074's tail.

## Surfaces

### Admin — `/admin/studio/engagements/<id>` (EN only)

**The accepted state of `EngagementProposalPanel`** (`components/admin/EngagementProposalPanel.tsx:491-527`)
gains a **Deposit** row in the `<dl>` and one button, both driven by a new `invoices` prop (the engagement's
invoices, newest first) rendered by a new small component `components/admin/ProposalDepositBlock.tsx`:

| Deposit state | `<dl>` "Deposit" cell | Button row |
|---|---|---|
| no live deposit row | `Not requested` | **Request deposit** (primary) — disabled with title *"Nothing to invoice on a performance offer"* when `total_build = 0`; disabled with *"Add a client contact email first"* when the contact email is missing (the client email is part of the action) |
| `sent` | `$437.50 (50%) requested Sep 6 · not paid` + `checkout opened 2×` when `checkout_count > 0`; `Deposit email sent Sep 6` or **`Deposit email not sent — resend`** (coral) from `invoice_email_sent_at` | **Resend deposit email** (ghost — rotates the link again) · the existing **Void acceptance** now voids it too |
| `sent` with `awaiting_async_payment_at` | `… · payment started (bank transfer / konbini), awaiting confirmation` | as `sent`; the client cannot mint a second session meanwhile |
| `paid` | `$437.50 (50%) paid Sep 7 ✓` + `Balance $437.50 not yet billed` when a `balance` row exists | **Void acceptance** is disabled with title *"Refund the deposit in Stripe first"* (the RPC enforces it) |
| `refunded` | `$437.50 refunded Sep 9 (of $437.50)` or `¥30,000 of ¥66,000 refunded (partial)` in coral | **Void acceptance** enabled; **Request deposit** enabled again after a void (slot freed) |
| a `sent` row whose `invoice_payment_failed` event is the latest invoice event | `… · last payment attempt failed` in coral | as `sent` |
| any row with an open `invoice_duplicate_payment` event | a coral strip above the `<dl>`: *"A second payment landed on this invoice — refund pi_… in Stripe"* | — |

"Request deposit" opens an inline confirm (not `window.confirm` — it has a choice): two radio pills **50%**
(preselected) / **100%**, the computed deposit and balance in the proposal's currency (from
`lib/studio/engagement/invoice-math.ts`, the TS twin of the RPC's arithmetic), the recipient email, a line
*"Sends a fresh proposal link — any open tab will ask the client to reopen from the email"*, and **Request**.
The action `issueDeposit(proposalId, pct)` runs, in order: (1) RPC `issue_engagement_deposit`; (2) **rotate
the proposal token** via a helper `rotateProposalToken(admin, proposal)` **extracted from `resendProposalLink`**
(`proposal-actions.ts:563-599` — the same UPDATE: new hash, `token_expires_at` +45 d, `token_revoked_at`
NULL, `valid_until` never shortened; `delivery_method` stays as is; the existing function calls the helper
too, so behaviour is unchanged there); (3) `sendDepositRequestEmail` with the **tokened entry URL** (the
plaintext exists once, in this send — the slice-3 rule); (4) on provider success `UPDATE engagement_invoices
SET invoice_email_sent_at = now()`; on failure INSERT `notification_failed` (actor `system`, summary `Deposit
email to <email> FAILED — resend from the proposal panel`, data `{invoice_id, emailed:false}`) exactly as
`emailProposalLink`'s failure branch does (`proposal-actions.ts:446-466`). `resendDepositEmail(invoiceId)`
= steps 2–4. Rotation on every issue/resend is deliberate (review finding 4): a manually-accepted proposal
has **no** token (074 allows `delivery_method='manual'` with `access_token_hash IS NULL` on an accepted
row), a token may have passed its 45 days, and the client may pay from another device — one path covers all
three, and the page already tells a stale tab to reopen from the email.

**New panel `components/admin/EngagementDeliverablesPanel.tsx`**, inserted in the workspace `panels` array
(`app/[locale]/admin/studio/engagements/[id]/page.tsx:106-131`) between the proposal panel and the
timeline, rendered when `engagement.stage IN ('build','launch','care','closed')` **or** any deliverable row
exists. Two groups (Build / Launch), each row: title (inline-editable on click), a status pill cycling
`planned → in_progress → delivered → accepted` via a small `<select>` (backwards allowed), `due_on` date
input, `delivered_at` shown when set, a notes disclosure (`notes_md`, plain textarea), delete with confirm.
Header actions: **Add deliverable** (title + phase), and **Seed from proposal scope** — enabled only while
the panel has **zero** rows and an accepted proposal exists; it calls `previewDeliverablesFromScope
(engagementId)`, which returns the candidate titles, shows them as an editable checklist (uncheck to drop,
edit inline), and **Add N deliverables** calls `addDeliverables(engagementId, rows)` and writes one
`deliverables_seeded` event (`data: {count, proposal_id, version}`). A status move into `delivered`
writes `deliverable_delivered` (`data: {deliverable_id, title, phase}`); other moves write no event.

**The soft launch gate** lives in `EngagementStageControl` (`components/admin/EngagementStageControl.tsx`),
which gains an optional prop `openBuildDeliverables: { count: number; titles: string[] }` (the page computes
it from the deliverables it already fetched). In `handleActive`, when `current === 'build'` and the target is
`launch | care`, and `count > 0`: `window.confirm` — *"3 build deliverables are not delivered yet: Homepage
redesign, Booking flow, Analytics setup. Move to Launch anyway?"* (titles truncated to five + "…"). The same
check runs in `handleClose`. Cancel does nothing; OK calls `setEngagementStage` unchanged. **No server-side
check**: the gate is a reminder, and 067's stage trigger stays the only stage authority.

`StatusBadge` (`components/admin/StatusBadge.tsx`) gains `paid` (teal), `void` (muted), `planned` (muted),
`delivered` (teal); `refunded`, `sent`, `draft`, `accepted`, `in_progress` already exist.

### Client — the accepted band on `/proposal/<id>` (EN/JA, JA flagged)

`app/[locale]/proposal/[id]/page.tsx:107-116` chooses the band by status; the accepted branch (line 108)
becomes a switch on the **live deposit invoice**, fetched alongside the proposal through the same
service-role client (`authorizeProposalSession` already returns it): the newest `deposit` row for the
proposal with `status <> 'void'`, or none.

| Invoice | Band (`components/proposal/copy.ts`, new keys) | Extra |
|---|---|---|
| none / void | the existing `acceptedBand` — unchanged | — |
| `sent` | tone teal, title `Accepted`, body `Accepted by {name} on {date}. Your deposit of $437.50 is ready to pay — work starts once it is received.` | `components/proposal/ProposalDepositButton.tsx` (client): **Pay the deposit →** (48 px, teal) → `POST /api/engagement/proposal/<id>/deposit` → on `{url}` `window.location.assign(url)`; inline errors for 429 / 403 / 409 (`already_paid` → *"This deposit has already been paid — reload."*; `payment_pending` → *"A payment for this deposit is already in progress — once Stripe confirms it, this page will show it as received."*) / 502 / 503, honeypot field. Below it, 12.5 px: *"You'll pay on Stripe's secure page. We never see your card details."* |
| `sent` with `awaiting_async_payment_at` | tone teal, title `Accepted`, body `Your payment is in progress. Once Stripe confirms it, this page will show the deposit as received.` | **no button** (the RPC would refuse anyway) |
| `sent` and `?paid=1` in the URL | same as `sent`, but body `Thank you. Once Stripe confirms your payment, this page will show the deposit as received.` and **no button** | UX only, worded for both instant and delayed methods (review finding 17): the webhook is the truth. A reload without the query shows the real state. |
| `paid` | tone teal, icon ok, title `Deposit received`, body `Accepted by {name} on {date}. Deposit of $437.50 received on {paid_at}. Ryan will be in touch about kickoff.` | no button |
| `refunded` | tone coral, title `Deposit refunded`, body `The deposit of $437.50 was refunded on {date}. Reply to the email you received if you have questions.` | no button |

Cancel from Stripe returns to the proposal page with no query (the `sent` band, button intact). The PDF link,
the document and everything else on the page are unchanged.

### Routes

- **`POST /api/engagement/proposal/[id]/deposit`** — copied from the accept route's shape
  (`app/api/engagement/proposal/[id]/accept/route.ts:51-107`), in order: UUID check → rate limit
  `tryConsume('engp-deposit:<ip>', 6, 15 min)` (a mint costs a Stripe call; six per quarter hour is generous
  for one human) → `isCrossSite` → JSON body `{company_url?}` honeypot (silent fake `{ok:true}`) →
  `authorizeProposalSession(id)` (403 / 410 `link_expired` / 503) → find the live `sent` deposit invoice for
  the proposal (`404 no_invoice` if none) → RPC `begin_engagement_invoice_checkout(invoice.id,
  presentedTokenHash)` → map `applied:false` (`forbidden` 403, `already_paid` 409, `payment_pending` 409,
  `not_open` 409) → `stripe.checkout.sessions.create(params, { idempotencyKey:
  'engagement_invoice:<invoice_id>:<attempt>' })` with params built **only** from the RPC's returned
  immutable columns → on a Stripe **`idempotency_error`** (params differed under a reused key — should be
  impossible now, kept as a belt): RPC `rearm_engagement_invoice_checkout(invoice.id, NULL)` then **retry
  once** with the new attempt; a second failure → 502 → RPC `record_engagement_invoice_checkout(invoice.id,
  attempt, session.id, new Date(session.expires_at * 1000))` (its `applied:false` is logged, not surfaced —
  the session still works and expires) → `{url: session.url}` 200, `no-store`. Any other Stripe error → 502
  `checkout_unavailable`, logged with the Stripe request id only. `customer_email` is passed only when
  `recipient_email` matches a basic `^[^\s@]+@[^\s@]+\.[^\s@]+$` (review finding 18 — the engagement form
  validates on write, but older rows are not re-validated).
- **`POST /api/stripe/webhook`** (`app/api/stripe/webhook/route.ts:47-80`) — three new cases in the
  dispatcher, **all engagement-only**: `checkout.session.async_payment_succeeded` →
  `handleCheckoutAsyncPaymentSucceeded(session)`, which calls `fulfillEngagementInvoiceCheckout` **only when
  `metadata.checkout_kind === 'engagement_invoice'`** and otherwise logs and ignores — it must **not** route
  into `handleCheckoutCompleted`, whose partner branch re-runs `fulfillPartnerMembership` on every call and
  whose subscription branch re-sends the welcome email (`lib/partner-checkout/fulfill.ts:133-148`, review
  finding 5); `checkout.session.async_payment_failed` → `handleCheckoutAsyncPaymentFailed(session)`;
  `checkout.session.expired` → `handleCheckoutExpired(session)`. The three new handlers live in
  `lib/stripe/webhooks.ts` and return immediately for any other `checkout_kind` (course/partner sessions
  keep today's behaviour of being ignored for those events). **Prod checklist:** the Stripe dashboard
  webhook endpoint must have the three event types added — the code ignores events it is not subscribed to,
  so forgetting this leaves delayed payments unfulfilled. Stated in the ship report.
- **The accept route, the enter route, the PDF route** — unchanged.

### Emails — appended to `lib/studio/engagement/emails.ts`

- **`sendDepositRequestEmail({locale, email, contactName, businessName, amount (pre-formatted), pct,
  entryUrl, linkExpiresOn, version})`** — to the client, in the proposal's locale. Heading *"Your deposit for
  {business} is ready to pay"*; one paragraph with the amount and the percentage; CTA **Open your proposal →**
  pointing at the **tokened entry URL** (`/api/engagement/proposal/enter/<token>` — the `sendProposalInvite`
  mould, `emails.ts:244-330`; the plaintext token's one appearance; **never** a Stripe URL); a line *"This
  link is personal to you and opens until {linkExpiresOn}. You'll pay on Stripe's secure page; we never see
  your card details."*; Ryan's sign-off. JA copy flagged for native review. Returns `{ok, providerId?,
  error?}` like `sendProposalInvite`.
- **`sendInvoicePaidAdminNotification({businessName, contactName, contactEmail, kind, amount, currency,
  pct, version, variant: 'paid' | 'paid_on_void' | 'duplicate_payment' | 'not_found', paymentIntentId,
  engagementUrl})`** — to Ryan. Subjects: `Deposit received — {business} ({amount})`; `⚠ Payment on a VOIDED
  invoice — {business}` (refund in Stripe); `⚠ DUPLICATE payment — {business} ({amount})` (refund the named
  payment intent); `⚠ Payment for a deleted engagement ({amount}, pi_…)` (nowhere left to record it — refund
  or reconcile by hand). Reuses `accentBanner` + `detailsTable`.
- **`lib/studio/engagement/invoice-notify.ts`** — `notifyInvoicePaid(admin, invoice, engagement, proposal)`,
  the `proposal-notify.ts` mould: plain server module, best-effort, writes `notification_sent` /
  `notification_failed`; the durable signal is the `needs_attention` event the RPC wrote. Called from the
  webhook handler **after** the RPC commits (the webhook is not a Next route with `after()`, so it awaits the
  send but never lets an email failure turn into a 500 — Stripe would retry and re-hit the no-op RPC anyway).

## Stripe integration

Read `lib/stripe/webhooks.ts`, `app/api/stripe/webhook/route.ts` and `app/api/stripe/checkout/route.ts:124-151`
before touching any of it; the stripe-best-practices skill (payments + security references) was applied here.

### The session (`lib/stripe/engagement-invoice.ts`, pure builder + tested)

```ts
// buildEngagementInvoiceSessionParams(input): Stripe.Checkout.SessionCreateParams
// `input` is exactly the RPC's returned immutable columns — nothing is read live.
{
  mode: 'payment',
  client_reference_id: invoice.id,
  customer_email: recipientEmailIfValid ?? undefined,   // the SNAPSHOTTED recipient_email; omitted when null/malformed
  line_items: [{ quantity: 1, price_data: {
    currency: invoice.currency.toLowerCase(),           // 'usd' | 'jpy'
    unit_amount: invoice.amount,                        // minor units: cents, or whole yen (zero-decimal)
    product_data: { name: invoice.label },              // "Deposit — Hawaii Palms (50%)"
  }}],
  metadata: { checkout_kind: 'engagement_invoice', engagement_id, invoice_id, proposal_id, currency, locale },
  locale: proposal.locale,                              // 'en' | 'ja'
  success_url: `${origin}${localePrefix}/proposal/${proposal.id}?paid=1`,
  cancel_url:  `${origin}${localePrefix}/proposal/${proposal.id}`,
  // NO payment_method_types (dynamic payment methods — the Stripe rule).
  // NO allow_promotion_codes / discounts — the amount must equal the row.
  // NO expires_at — Stripe's 24 h default; the row stores session.expires_at from the response.
  // NO integration_identifier — needs API ≥ 2026-03-25.dahlia; we stay on 2026-02-25.clover.
}
```

`origin` is `process.env.NEXT_PUBLIC_SITE_URL` first, then the request `origin` header — the reverse of the
course route — because the idempotency key demands **identical params on replay** and a header-derived
origin could differ between two clicks (www vs apex). Every other param comes from immutable invoice and
proposal columns (`amount`, `currency`, `label`, `recipient_email`, `locale`, ids), so no edit Ryan makes
between two clicks can change them (review finding 3). The request `{ idempotencyKey }` is
`engagement_invoice:${invoice.id}:${attempt}`: Stripe replays the same session for 24 h for that key, so a
double click returns the same URL without a second session, and a re-arm (expiry or `idempotency_error`)
changes the key.

### The webhook branch (`lib/stripe/webhooks.ts:35-47` precedent — runs BEFORE the user_id/course_id guard)

```ts
// STEP 0 (new, above the partner branch): engagement invoice.
if (session.metadata?.checkout_kind === 'engagement_invoice') {
  await fulfillEngagementInvoiceCheckout(supabase, session);   // lib/stripe/engagement-invoice.ts
  return;
}
```

`fulfillEngagementInvoiceCheckout(supabase, session)`: (1) `invoice_id = metadata.invoice_id ??
client_reference_id` — reject with a logged error if not a UUID; (2) **`if (session.payment_status ===
'unpaid')`** → RPC `mark_engagement_invoice_awaiting_async(invoice_id, session.id, false)` and **return** — a
delayed payment method's `completed` event arrives unpaid; the row now refuses to mint a second session
until `async_payment_succeeded` or `async_payment_failed` arrives (review finding 2); (3) `payment_intent`
id from string-or-object; (4) RPC `mark_engagement_invoice_paid(invoice_id, session.id, paymentIntentId,
session.amount_total, session.currency)`; (5) `applied:false` by reason: `already_paid` → return quietly
(replay); `duplicate_payment` → `notifyInvoicePaid(…, 'duplicate_payment')` and return (the RPC wrote the
event); `not_found` → `notifyInvoicePaid(…, 'not_found')` and return (200 — review finding 9: there is no row
to retry into); RAISE `invoice_amount_mismatch` → insert `invoice_payment_failed` (actor `system`,
`needs_attention`, `data: {invoice_id, reason:'amount_mismatch', session_id, amount_total, currency}`) and
**return** (200 — retrying cannot help); any other error → **throw** (500 → Stripe retries; the RPC is a
no-op on the retry that succeeds); (6) on `applied:true` load the rows and `notifyInvoicePaid(…, on_void ?
'paid_on_void' : 'paid')` (errors logged). **No `payments` row is written** — `payments` is user-keyed
(008/038, `user_id` FK + `auth.uid()` RLS) and `engagement_invoices` is the ledger. **No Plausible event** —
the client pages are analytics-free by decision (slice B).

`handleCheckoutAsyncPaymentSucceeded(session)`: engagement-only guard, then `fulfillEngagementInvoiceCheckout`
(its `payment_status` is `paid` here, so it goes straight to the RPC).

`handleCheckoutAsyncPaymentFailed(session)`: engagement-only; RPC `mark_engagement_invoice_awaiting_async
(invoice_id, session.id, true)` (clears the pending flag so the client can pay again) and insert
`invoice_payment_failed` (actor `system`, `needs_attention`, `data: {invoice_id, reason:
'async_payment_failed', session_id}`) — the row stays `sent` and the band offers Pay again; no email (the
attention flag is enough for a rare event).

`handleCheckoutExpired(session)`: engagement-only; RPC `rearm_engagement_invoice_checkout(invoice_id,
session.id)`; no event.

`handleChargeRefunded` (`lib/stripe/webhooks.ts`, existing): **one new block right after `paymentIntentId`
is resolved and before the `payments` update**: RPC `mark_engagement_invoice_refunded(paymentIntentId,
charge.amount_refunded)`; on `applied:true`, `not_paid` or `already_refunded` → **return** (it was ours;
`notifyInvoiceRefunded` is **not** built — the `needs_attention` event is the signal; judgment call 7); on
`not_found` fall through to today's code unchanged.

### What is stored, and what never is

| Stored | Never stored |
|---|---|
| session id, session expiry, `awaiting_async_payment_at`, payment intent id, amount, currency, `amount_refunded`, `mint_attempt`, `checkout_count`, the snapshotted `recipient_email` | the Checkout **URL** (durable payment link), any card/payment-method detail, the customer id, the raw event body, the receipt URL (Stripe emails receipts if enabled in the dashboard — a prod checklist line) |

### Idempotency, replay, ordering

- Stripe retries and duplicate deliveries: `mark_engagement_invoice_paid` is a no-op on `paid|refunded`
  **for the same payment intent** (`already_paid`); a **different** payment intent is a real second payment
  → `duplicate_payment`, flagged and emailed, never silently absorbed. The partial unique index on
  `stripe_payment_intent_id` is the backstop.
- `completed` (unpaid) → `async_payment_succeeded`: first sets `awaiting_async_payment_at` (mint blocked),
  second fulfils. `completed` (paid) → `async_payment_succeeded` (some methods send both): second is
  `already_paid`.
- The one remaining double-payment window: the 60 s re-arm leaves the old session payable for under a
  minute while a new one exists. Two real payments in that window → the second is `duplicate_payment`
  (flagged, refunded by hand). Judgment call 5.
- `expired` arriving after a re-arm already happened (the route's 60 s rule): the RPC's session-id match
  fails → `applied:false`, nothing changes. A session that completed unpaid never emits `expired`.
- `charge.refunded` before `checkout.session.completed` (impossible for a card, possible in theory for
  async methods): `not_paid` → no-op; the refund is then visible only in Stripe. Flagged in judgment calls.
- Partial refund then the rest: two `charge.refunded` events with a growing cumulative `amount_refunded`;
  the second updates the row (`refunded → refunded`); a true replay of either is `already_refunded`.
- Webhook signature verification is unchanged (`constructEvent` with `STRIPE_WEBHOOK_SECRET`); the new unit
  test signs fixtures with `stripe.webhooks.generateTestHeaderString` against a test secret.

## Abuse, privacy, hygiene

Identical posture to slice 3, with the invoice-specific deltas:

- **What a leaked proposal link can now do:** open a Checkout Session and **pay Ryan's invoice**. That is
  the one new power, and it is benign — paying someone else's deposit harms the payer, not the client, and
  the amount is fixed server-side. It cannot change the amount, see a card, or reach any other invoice. It
  can burn `checkout_count` and Stripe test/live sessions up to the rate limit — harmless. Revoke still wins
  any race: the token is re-validated inside `begin_engagement_invoice_checkout` on the locked proposal row.
- **The deposit email carries a tokened entry link** — the same exposure as every proposal/questionnaire
  invite since slice 2 (a 256-bit token, stored only as sha256, 45-day expiry, revocable, rotated on each
  send). It is not a payment URL: it opens the proposal page, where the holder can then mint a session.
- **What a leaked Checkout URL can do:** the same, for up to 24 h. It is returned only to the cookie holder
  over a `no-store` response and is never stored, emailed, logged or put in an event.
- Rate limits via `tryConsume` (in-memory per instance — the token is the real defence): deposit mint
  `6 / 15 min` per IP. Honeypot on the mint. `Sec-Fetch-Site` rejects `cross-site`. **No IP or user agent
  stored.**
- Client-typed input reaching Ryan: **none** — the mint carries no fields. Stripe collects the card.
- Ryan-typed input reaching the client: the engagement title inside the Checkout `product_data.name` and the
  deposit email (`escapeHtml`'d in the email; Stripe renders its own page).
- The RLS suite's 64-hex scan over `engagement_events.data` runs **after issue (including the token
  rotation), after mint and after paid**, and a new scan asserts no `data` value contains
  `checkout.stripe.com`.
- Webhook: signature-verified before parsing; the engagement branch trusts **only** `metadata.checkout_kind`
  + a UUID `invoice_id`, and the RPC re-derives everything else from the row.
- Emails: the deposit email links to the proposal page, never to Stripe; Ryan's notification carries the
  admin URL only.

## Explicitly not this unit

| Not building | Attach point |
|---|---|
| **Care billing** (`care_mrr` → Stripe subscription) | `kind = 'care_month'` is in the CHECK; `stripe_subscription_id` exists. A later unit adds a Price, `customer.subscription.*` handling scoped by metadata, and one `care_month` row per `invoice.paid`. |
| **Sending the balance invoice** | The `balance` row exists as `draft`. A later unit adds `send_engagement_invoice(p_invoice_id)` (draft → sent + the client email) and the band learns a second `sent` row; the mint route already selects by `kind`, so it generalises by parameter. |
| **Change orders / a second accepted offer** | Unchanged from the proposal plan; an invoice per change order is `kind = 'balance'` with its own `proposal_id`. |
| **Separate invoice page / different payer** | `/invoice/<id>` with its own token; the row already carries everything it needs, including `recipient_email`. |
| **Automatic refund of a duplicate payment** | `invoice_duplicate_payment` names the payment intent; a later action calls `stripe.refunds.create` from the admin strip. |
| **Client-visible deliverables / a project page** | `engagement_deliverables` is the source; a `/project/<id>` page behind the proposal cookie or a new token. |
| **AI "extract deliverables from scope"** | `previewDeliverablesFromScope` is the seam — swap the markdown-bullet source for a model call with review-first UI already in place. |
| **Refund automation / partial refund accounting** | Refunds are manual in the dashboard; `charge.refunded` records status + amount. A `refund_engagement_invoice` action calling `stripe.refunds.create` is the later shortcut. |
| **Stripe API version bump** (`2026-02-25.clover` → `≥ 2026-03-25.dahlia`, `integration_identifier`) | `lib/stripe/client.ts:11`; the bump touches `handleInvoicePaid`'s line parsing and is its own unit. |
| **Client receipt email from us** | Stripe's own receipts (dashboard setting) cover it. |
| **Automatic charging / card on file / subscriptions for the build** | Never in this design — the client pays a hosted Checkout each time. |
| **Hard launch gate / server-side gate** | The soft confirm is client-side; if a hard gate is ever wanted, it is a check in `setEngagementStage`, not a trigger (067 owns stage authority). |
| **Deliverable events for every status move** | Only `deliverables_seeded` and `deliverable_delivered`; a `deliverable_status_changed` kind is one CHECK entry away. |
| **Amending the terms of already-accepted PDFs** | The archived PDF is the artefact (slice 3 decision #10). |
| **Client account / login** | Never — spine decision #3. |
| **JP admin UI** | Admin is EN-only by repo convention. |

## Build order — one migration, two shippable slices

Medium: 2 tables, 2 guard triggers, 7 new RPCs + 1 helper, 1 amended RPC, 1 amended trigger, 1 view, ~9 lib modules,
4 admin components, 2 client components, 1 API route + 3 webhook cases, ~8 test files. Ship as **two
commits**, each independently verifiable and independently useful; migration 075 covers both.

**Rollout order:** apply 075 in the Supabase dashboard **before** deploying slice A (above). No runtime
compatibility shim.

### Slice A — the deposit: issued, paid through Stripe, recorded, notified

- [ ] **A1 · Migration + RLS suite (schema-first, green before any UI).** `supabase/migrations/075_studio_invoices_deliverables.sql` (both tables — the deliverables table ships in A so 075 is one migration) + `supabase/tests/engagement_invoices_rls.test.ts`. Run `pnpm test:rls` (duplicate 022/025 survey migrations temp-renamed, then restored) until green, including the three two-connection races.
- [ ] **A2 · Vocabulary + pure math.** `lib/studio/engagement/types.ts` (+8 kinds, `INVOICE_KINDS`, `INVOICE_STATUSES`, `DELIVERABLE_PHASES`, `DELIVERABLE_STATUSES`, `DEPOSIT_PCTS = [50, 100]`), `lib/admin/types.ts` (`EngagementInvoice`, `EngagementDeliverable`, six list columns), `lib/studio/engagement/invoice-math.ts` (+ test): `splitDeposit(totalBuild, pct) → {deposit, balance}` with round-half-up in integers, `STRIPE_MINIMUM_MINOR = 50`, `depositIssuable(proposal) → {ok} | {ok:false, reason}`.
- [ ] **A3 · Stripe builder + webhook handlers (+ tests).** `lib/stripe/engagement-invoice.ts`: `buildEngagementInvoiceSessionParams`, `idempotencyKeyFor(invoiceId, attempt)`, `isStripeIdempotencyError(err)`, `fulfillEngagementInvoiceCheckout`, `handleEngagementInvoiceAsyncSucceeded`, `handleEngagementInvoiceAsyncFailed`, `handleEngagementInvoiceExpired`, `handleEngagementInvoiceRefunded`; `lib/stripe/webhooks.ts` STEP 0 + the refund block + three exported handlers; `app/api/stripe/webhook/route.ts` three cases. Test: `lib/stripe/engagement-invoice.test.ts` (builder) + `__tests__/api/stripe-webhook-engagement-invoice.test.ts` (signed fixtures through the real route).
- [ ] **A4 · Emails + notify.** `emails.ts` two senders; `invoice-notify.ts`.
- [ ] **A5 · Admin actions + queries.** `proposal-actions.ts`: **export** `translateDbError` (it is module-private today, `proposal-actions.ts:146`) extended with the `invoice_*` RAISE names, extract `rotateProposalToken(admin, proposal, now)` from `resendProposalLink` (behaviour unchanged there), `voidProposalAcceptance` maps `reason:'invoice_paid'` to *"A paid deposit exists. Refund it in Stripe first, then void."*; `lib/studio/engagement/invoice-actions.ts` (`'use server'`: `issueDeposit`, `resendDepositEmail`); `lib/admin/queries.ts` (`getEngagementInvoices`).
- [ ] **A6 · Admin UI.** `ProposalDepositBlock.tsx`, the `invoices` prop through `EngagementProposalPanel`, the page fetch, `StatusBadge`, `EngagementTimeline` labels, `EngagementRow.proposalLabel` (+ test).
- [ ] **A7 · Client band + mint route.** `copy.ts` keys, `ProposalDepositButton.tsx` (+ test), the page's accepted branch, `app/api/engagement/proposal/[id]/deposit/route.ts`, `proposal-terms.ts` wording for new proposals.
- [ ] **A8 · Gates → review → commit → push** (below). Ryan applies 075 on prod **before** the push is deployed.

After A: Ryan clicks Request deposit, the client sees Pay, pays on Stripe, the webhook records it, Ryan is
emailed, the band flips, void is refused while paid.

### Slice B — build kickoff: deliverables + the soft gate

- [ ] **B1 · Actions + queries.** `lib/studio/engagement/deliverable-actions.ts` (`addDeliverables`, `updateDeliverable`, `deleteDeliverable`, `previewDeliverablesFromScope`) + `lib/studio/engagement/deliverable-seed.ts` (+ test): `scopeBulletsToDeliverables(issuedSnapshot) → {title}[]` using `parseProposalMarkdown` → `bullets` blocks → `blocksToText` per item, trimmed, ≤ 200 chars, empty dropped, de-duplicated. `lib/admin/queries.ts` `getEngagementDeliverables`.
- [ ] **B2 · UI.** `EngagementDeliverablesPanel.tsx` (+ test for the seed preview flow), the `panels` slot, `EngagementStageControl` `openBuildDeliverables` prop + confirm (+ test: confirm text, cancel = no call, OK = call).
- [ ] **B3 · Gates → review → commit → push.** No migration.

After B: Ryan seeds the scope, tracks delivery, and gets a warning when launching over open build items.

## Gates, stated without contradiction

Per CLAUDE.md the gate is `pnpm verify` (type-check → tests → build, `NODE_OPTIONS=--max-old-space-size=8192`)
+ `pnpm test:rls` green. The tree carries a **pre-existing, unrelated red** — `lib/progress/{actions,queries}
.test.ts`, 28 failures (9 + 19) from other work — that this unit must not touch. If it is still red at ship
time, the rule Ryan set for slice 2 applies: **every test file this unit adds or modifies is green, the full
suite shows only those 28 pre-existing failures, they are listed by file in the ship report, and Ryan says
"continue" before the commit.** If the other work has landed by then, the gate is fully green with no
exception. Type-check and build must be clean in either case.

Ship each slice per CLAUDE.md: gates → adversarial review (`requesting-code-review`, triaged with
`receiving-code-review`) → commit to `main` → push. Stage only this unit's files by path. **Prod:** 075 in the
dashboard on `zvfwtndbxshrtpwcwynw` **before** slice A deploys; add the three checkout event types to the
Stripe webhook endpoint; confirm Stripe receipts are on if a client receipt is wanted.

## Verification

**Gates:** as above. Local RLS needs the duplicate 022/025 survey migrations temp-renamed, then restored.
Local smoke runs against the **local stack only** (`.env.local` is production) with the slice-B environment
recipe (anon/service keys from `.env.test.local`, fixture admin `…aaa6@fixture.local`), bundled headless
shell, retry the first navigation after a cold compile. Stripe in **test mode** with `stripe listen
--forward-to localhost:3000/api/stripe/webhook` (the CLI's signing secret in `STRIPE_WEBHOOK_SECRET` for the
local run); the signed-fixture unit test is the fallback when the CLI is unavailable.

### Unit tests (`app` project, `*.test.ts` beside source)

| File | Pins |
|---|---|
| `lib/studio/engagement/invoice-math.test.ts` | `splitDeposit(87500, 50) = {43750, 43750}`; `(132000, 50) = {66000, 66000}`; `(87501, 50) = {43751, 43750}` (round half up, sums exactly); `(87500, 100) = {87500, 0}`; `(1, 50)` and `(60, 50)` → below minimum; `(0, *)` → nothing to bill; pct outside `[50,100]` rejected; results are integers for every input in a 0..10 000 sweep at both pcts. |
| `lib/stripe/engagement-invoice.test.ts` | Builder: `mode 'payment'`, `unit_amount` = row amount for USD (43750) and JPY (66000), `currency` lower-cased, **no `payment_method_types`**, **no `allow_promotion_codes`**, `client_reference_id` = invoice id, metadata keys exactly `{checkout_kind, engagement_id, invoice_id, proposal_id, currency, locale}`, `locale 'ja'` for a ja proposal, success URL `/ja/proposal/<id>?paid=1` and cancel `/ja/proposal/<id>` for ja, no prefix for en, origin from `NEXT_PUBLIC_SITE_URL`; **the same input twice yields deep-equal params** (idempotency safety); `idempotencyKeyFor` = `engagement_invoice:<id>:<attempt>`; `customer_email` omitted when null and when malformed (`'not-an-email'`), present for a valid address; `isStripeIdempotencyError` true for `{type:'StripeIdempotencyError'}` and false for a card error. |
| `__tests__/api/stripe-webhook-engagement-invoice.test.ts` | Through the real route with `STRIPE_WEBHOOK_SECRET` set to a test value and each fixture signed by `stripe.webhooks.generateTestHeaderString({payload, secret})`; the Supabase service client mocked via `vi.mock('@supabase/supabase-js')` returning a recording stub for `.rpc()` and `.from().insert()` (no existing webhook route test to copy — this file is the precedent). `completed` + `payment_status:'paid'` → paid RPC called with `(invoice_id, session.id, pi_…, 43750, 'usd')`, notify called with `'paid'`; `completed` + `'unpaid'` → **awaiting RPC `(invoice_id, session.id, false)`, no paid RPC**; `async_payment_succeeded` (engagement) → paid RPC; **`async_payment_succeeded` for a partner cohort session → neither the engagement RPC nor `fulfillCohortCheckout` is called**; paid RPC `already_paid` → 200, no notify, no event insert; paid RPC `duplicate_payment` → notify `'duplicate_payment'`, 200; paid RPC `not_found` → notify `'not_found'`, 200; RPC `invoice_amount_mismatch` → `invoice_payment_failed` inserted, 200; RPC other error → 500; `async_payment_failed` → awaiting RPC `(…, true)` + event insert, no paid RPC; `expired` → rearm RPC `(invoice_id, session.id)`; `charge.refunded` with a PI the refund RPC knows (`applied`, `not_paid` or `already_refunded`) → refund RPC, **enrollment branch not reached**; `not_found` → falls through to the enrollment lookup; a course session (`metadata.user_id/course_id`, no `checkout_kind`) → the engagement branch is **not** entered; a tampered signature → 400 before any handler; **no insert anywhere carries `event.data` or a `checkout.stripe.com` string**. |
| `components/proposal/ProposalDepositButton.test.tsx` | Renders 48 px teal button; POSTs to `/api/engagement/proposal/<id>/deposit`; on `{url}` assigns `window.location`; 429 / 403 / 409 `already_paid` / 409 `payment_pending` / 502 / 503 → the copy's messages; honeypot field present and empty; `?paid=1` and `awaiting` variants render no button. |
| `app/api/engagement/proposal/[id]/deposit/route.test.ts` | Stripe client mocked: first `create` rejects with `{type:'StripeIdempotencyError'}` → rearm RPC `(invoice_id, null)` called → second `create` with attempt+1 key → 200 `{url}`; two consecutive rejections → 502; a `StripeCardError`-shaped error → 502 without rearm; `begin` `payment_pending` → 409. |
| `lib/studio/engagement/deliverable-seed.test.ts` | Scope `- **Homepage** redesign\n- Booking flow\n\nA paragraph\n- Booking flow` → `['Homepage redesign', 'Booking flow']` (bold stripped, paragraph ignored, duplicate dropped); a 300-char bullet is truncated to 200; empty scope → `[]`. |
| `components/admin/EngagementStageControl.test.tsx` (+) | With `openBuildDeliverables {count:3, titles}` and `current 'build'`: clicking Launch calls `window.confirm` with the three titles; cancel → `setEngagementStage` not called; OK → called with `'launch'`; count 0 → no confirm; `current 'launch'` → no confirm; Close from build with open items → confirm. |
| `components/admin/EngagementRow.test.tsx` (+) | `proposalLabel` appends `· deposit due` for `deposit_status 'sent'`, `· deposit paid` for `'paid'`, nothing when null. |

### RLS suite — `supabase/tests/engagement_invoices_rls.test.ts`

Same harness, fixtures, `withPg`, teardown order (invoices/deliverables → proposals → briefs →
questionnaires → engagements → leads). A helper `acceptedProposal(leadId, {currency, totalBuild})` drives
`start_engagement` → questionnaire submit → brief → `create_engagement_proposal` → `issue_engagement_proposal`
→ `accept_engagement_proposal` (all existing RPCs) to reach the accepted state in one call.

- **RLS + grants:** anon and an ordinary user read 0 rows / denied from both tables; both cannot insert; the
  eight RPCs (`issue_engagement_deposit`, `begin_engagement_invoice_checkout`,
  `record_engagement_invoice_checkout`, `rearm_engagement_invoice_checkout`,
  `mark_engagement_invoice_awaiting_async`, `mark_engagement_invoice_paid`,
  `mark_engagement_invoice_refunded`, `void_engagement_proposal_acceptance`) and the helper
  `engagement_format_minor` are `service_role` + `postgres` only; the constraint swap left exactly one CHECK
  on `kind` and all 36 TS kinds insert.
- **Issue:** 50% on 87500 → deposit `sent` 43750 + balance `draft` 43750, pct 50/50, currency USD,
  `recipient_email` = the engagement contact on both rows, one `invoice_issued` event with **no `emailed`
  key**; 100% → one row 87500, no balance; JPY 132000 → 66000/66000; 87501 → 43751/43750; **total_build
  2,147,483,600 at 50% → 1,073,741,800 (no overflow)**; `total_build 0` → `invoice_nothing_to_bill`; pct 30
  → `invoice_pct_invalid`; second issue → `invoice_already_issued`; a 200-char engagement title → label ≤ 200
  and the insert succeeds; no contact email → `invoice_recipient_required`; on a `sent` (not accepted)
  proposal → `proposal_not_accepted`; on a lost engagement → `engagement_terminal`; deposit 40 on total 80 →
  `invoice_below_minimum`; the table CHECK rejects a direct insert of `amount 49`; `engagement_format_minor
  (43750,'USD') = '$437.50'`, `(66000,'JPY') = '¥66,000'`, `(87500,'USD') = '$875.00'`.
- **Re-issue after a void (constructed as: stage → `lost` voids the `sent` deposit via the sweep; reopen at
  `build`; issue again):** succeeds (the `voided_at IS NULL` slot is free) → D2 `sent`. **Then the old
  session pays:** `mark_paid(D1, S0, pi_a, 43750, 'usd')` → D1 `void → paid` with `on_void:true`, **no
  23505**, D2 still `sent`; both rows coexist (review finding 1).
- **Begin checkout:** correct hash → `applied:true, attempt 0`, payload carries amount/currency/label/
  `recipient_email`/locale/ids **and nothing read from the live engagement**; wrong hash / revoked / expired
  token → `forbidden`; on `paid` → `already_paid`; on `void` → `not_open`; **with `awaiting_async_payment_at`
  set → `payment_pending`** and no re-arm; with a stored session expiring in 30 s → attempt bumps to 1 and
  the session columns clear; with a stored session expiring in 2 h → attempt stays 0.
- **Record / rearm / awaiting:** record CAS passes on `(sent, attempt 0)`, fails (`applied:false`) on
  attempt 1 or on a `void` row; `checkout_count` increments; `uq_engagement_invoices_session` rejects the
  same session id on a second invoice. `rearm(id, S0)` on a row holding S0 → cleared, attempt 1; `rearm(id,
  S_other)` → `applied:false`; `rearm(id, NULL)` → cleared regardless; `rearm` while awaiting →
  `applied:false`. `awaiting(id, S0, false)` on `sent` holding S0 → set; on a mismatched session →
  `applied:false`; `awaiting(id, S0, true)` → cleared.
- **Mark paid:** `(sent)` → `paid`, `paid_at`, PI stored, `awaiting_async_payment_at` cleared,
  `invoice_paid` `needs_attention`, engagement `stage` and `won_at` **unchanged**; replay with the same
  session **and same PI** → `already_paid`, no second event; **same invoice, a different PI →
  `duplicate_payment`, one `invoice_duplicate_payment` event naming both PIs, row unchanged** (review
  finding 2); unknown invoice id → `not_found`; wrong amount → `invoice_amount_mismatch`, row unchanged;
  wrong currency → same; on `void` → `paid` with `on_void:true` in the event and the summary containing
  `VOIDED`; the guard rejects a direct `paid → void` and `paid → sent` (`invoice_transition_invalid`), a
  direct change of `paid_at` (`invoice_payment_locked`) and a direct change of `label`/`recipient_email`
  (`invoice_identity_immutable`); the PI unique index rejects a second row with the same PI.
- **Refund:** on `paid` with the full amount → `refunded`, `amount_refunded`, event `needs_attention`,
  `partial:false`; **with 30000 of 66000 → `refunded`, `partial:true`; then 66000 → row updated to 66000,
  `partial:false`, second event** (review finding 8); a replay of 66000 → `already_refunded`; on `sent` →
  `not_paid`; unknown PI → `not_found`; a direct UPDATE shrinking `amount_refunded` → `invoice_refund_shrunk`;
  a refunded invoice can be voided (`refunded → void`).
- **Void (amended):** with a `sent` deposit + `draft` balance → both `void`, two `invoice_voided` events,
  proposal `voided`, engagement back to `proposal`, 074's return shape intact + `invoices_voided: 2`; with a
  `paid` deposit → `{applied:false, reason:'invoice_paid'}` and **nothing changes** (proposal still
  `accepted`, money still on the engagement); with a `refunded` deposit → void succeeds.
- **Terminal sweep (amended):** stage → `lost` with a `sent` deposit → `void` with `void_reason 'Engagement
  marked lost'` + a `system` `invoice_voided` event; a `paid` deposit is untouched; reopening leaves it void.
- **Two-connection races (`withPg`):** (1) **void vs webhook**, both directions, each constructed the same
  way — connection X: `BEGIN; SELECT id FROM engagements WHERE id = $1 FOR UPDATE;` (holds the head of the
  lock order); connection Y issues its RPC, which blocks on the engagement lock; X then runs **its own** RPC
  inside the open transaction and `COMMIT`s; Y resumes. Direction (a): X = void, Y = `mark_paid` → X's void
  succeeds (invoice `void`), Y's `mark_paid` then sees `void` → `paid` with `on_void:true`. Direction (b): X
  = `mark_paid`, Y = void → X commits `paid`, Y's void returns `{applied:false, reason:'invoice_paid'}` and
  the proposal stays `accepted`. Neither direction deadlocks (both take engagement → proposal → invoice).
  (2) **double webhook** — two concurrent `mark_paid` with the same session and PI → exactly one
  `applied:true`, one `invoice_paid` event. (3) **mint vs void** (sequential, not concurrent — the CAS is the
  mechanism): `begin_checkout` returns attempt 0; void commits; `record_checkout` with attempt 0 →
  `applied:false` (row is `void`).
- **Deliverables:** RLS as above; insert `delivered` without `delivered_at` → the trigger fills it; move
  `delivered → planned` → `delivered_at` NULL; **UPDATE `title` on a `delivered` row with `delivered_at`
  omitted or NULL → the original `delivered_at` survives** (review finding 13); `engagement_id` change →
  `deliverable_identity_immutable`; a 201-char title is rejected; `ON DELETE SET NULL` from the proposal,
  `CASCADE` from the engagement.
- **Hygiene:** the 64-hex scan over `engagement_events.data` after issue, begin/record and paid; no `data`
  value contains `checkout.stripe.com`; the view's six new columns exist and read `deposit_status 'paid'`,
  `deposit_amount 43750`, `deliverables_open_count` after seeding two `planned` build rows.

### Browser smoke — the proposal smoke extended (EN, then `/ja`)

Continue from the slice-B smoke's step 9 (accepted as *Test Client*, 87500 USD):

1. **Admin, accepted row:** Deposit cell reads `Not requested`. Click **Request deposit** → the confirm shows
   `50%` preselected, `Deposit $437.50 · Balance $437.50`, the contact email, the "sends a fresh link" line.
   Click Request → cell reads `$437.50 (50%) requested <today> · not paid`; timeline shows `Invoice issued`
   with **no** needs-attention; the client email is in Resend's test log with a **tokened entry URL** (or the
   cell says *"Deposit email not sent — resend"* and a `notification_failed` line is in the timeline when
   Resend is unconfigured locally — expected); DB: two invoice rows (`sent` 43750, `draft` 43750, both with
   `recipient_email`), `engagements.stage` still `build`, the proposal's `access_token_hash` **changed**
   (rotation) and any tab holding the old cookie now shows "open from your email again".
2. **Client, private window, open the entry link from the email:** `/proposal/<id>` shows the accepted band
   with *"Your deposit of $437.50 is ready to pay"* and a 48 px **Pay the deposit →**. Click → the browser lands on
   `checkout.stripe.com` showing **$437.50**, "Deposit — RLS Fixture Proposal Biz (50%)", the contact email
   prefilled; DB: `stripe_checkout_session_id` set, `checkout_count 1`, `mint_attempt 0`. Back, click again
   → the **same** session id (idempotent replay), `checkout_count 2`.
3. **Pay** with `4242 4242 4242 4242` → redirected to `/proposal/<id>?paid=1` → the band reads *"Once Stripe
   confirms your payment…"* with no button. `stripe listen` forwards `checkout.session.completed`
   (`payment_status paid`) → reload without the query → **"Deposit received … $437.50 received on <today>"**.
   DB: `status paid`, `paid_at`, `pi_…`; event `invoice_paid` `needs_attention`; `engagements.won_at` and
   `stage` unchanged; Ryan's email in the log.
4. **Admin:** cell reads `$437.50 (50%) paid <today> ✓ · Balance $437.50 not yet billed`; **Void acceptance**
   disabled with the refund tooltip; list page shows `Accepted ✓ $875.00 · deposit paid`.
5. **Refund in the Stripe test dashboard** (full) → `charge.refunded` forwarded → cell reads
   `$437.50 refunded <today> (of $437.50)` in coral; band reads *"Deposit refunded"*; timeline `Deposit
   refunded` needs attention. **Void acceptance** enabled → void with a reason → deposit + balance `void`,
   engagement back to `proposal`, band on the client page → the existing "no longer open" card (token
   revoked by 074's void). **Request deposit** enabled again after re-accepting.
6. **Delayed-method path (fixture, not browser):** run the signed-fixture unit test — it is the smoke for
   `async_payment_*`, the `awaiting` band, `payment_pending` and `duplicate_payment`.
7. **Deliverables (slice B):** on the `build` engagement the panel shows *Seed from proposal scope* → the
   scope's bullets appear as an editable checklist → uncheck one, edit one → **Add N** → rows appear under
   Build as `planned`; timeline `Deliverables seeded`. Mark one `delivered` → `delivered_at` shown, timeline
   `Deliverable delivered`. Click **Launch** in the stage control → `window.confirm` lists the undelivered
   titles → Cancel leaves `build`; OK moves to `launch` (event `stage_changed` as before). Move back to
   `build`, mark all delivered, Launch → no confirm.
8. **`/ja` with the JPY proposal (132000):** Request deposit → `¥66,000 · ¥66,000`, no decimals anywhere;
   band in Japanese with `¥66,000`; Checkout page in Japanese showing ¥66,000; pay → `お支払い確認中` band →
   forwarded webhook → `¥66,000 を <date> に受領` band. Computed Noto Sans JP, lh 1.70, no justify.
9. **Headers:** `curl -sI` on `/proposal/<id>` still `no-store` · `no-referrer` · `noindex, nofollow`; the
   deposit route's response is `no-store`; a `POST` with `Sec-Fetch-Site: cross-site` → 403; the 7th mint
   in 15 min → 429.

## Judgment calls worth a second look

1. **50% default while every already-accepted PDF says "the build investment is due on acceptance".** Ryan
   chose 50% knowing this. New proposals get the reworded terms; for the handful of accepted proposals on
   prod the discrepancy is in the client's favour (they pay less now), and Ryan can choose 100% per
   engagement. Reversal: flip `DEPOSIT_PCTS` order and the radio default — one constant.
2. **`void → paid` is a legal transition, and the row keeps `voided_at`.** It exists so money that lands
   after a void is never invisible, and keeping `voided_at` is what keeps it out of the one-live slot so a
   re-issued deposit can coexist with it (rev 2). The cost is a status that reads oddly ("paid" on a voided
   acceptance) until Ryan refunds. Alternative: a separate `paid_after_void` status — more honest, one more
   CHECK value and band state. Chosen the smaller one; the event summary and Ryan's email shout.
3. **Refund flips status on any refund, partial or full, and a later refund grows `amount_refunded`.**
   Alternative: keep `paid` on a partial. Chosen so the band and the void rule change on any refund — Ryan
   decides what a partial means.
4. **Stripe's 24 h session expiry, not a shorter `expires_at`.** A leaked session URL can only pay Ryan's
   invoice, so the exposure is not a security risk; a shorter expiry would only add re-arm churn. The 24 h
   window is also what makes review finding 1's sequence (void → re-issue → old session pays) real, and rev
   2 handles it in the data model rather than by shortening the window. Reversal: `expires_at: now + 1h` in
   the builder (Stripe minimum 30 min).
5. **The mint re-arms on a 60 s margin server-side rather than trusting `checkout.session.expired`.** Belt
   and braces for a delayed webhook; the cost is that for under a minute two sessions are payable. Two real
   payments in that minute → the second is `duplicate_payment`, flagged and emailed, refunded by hand.
   Accepted as the residual risk; the alternative (never re-arm early, wait for `expired`) makes a missed
   webhook a permanent "Pay" button that leads to an expired Stripe page.
6. **The soft gate warns on `build → care` and `build → closed` too, not only `build → launch`.** Q7 said
   "launch"; skipping launch entirely with open build items is the same mistake in a different button. If
   Ryan wants launch-only, it is one condition in `EngagementStageControl`.
7. **No email on `async_payment_failed` or on refund** — `needs_attention` events only. Both are rare and
   Ryan reads the list daily. Reversal: two more senders in `emails.ts`.
8. **The deposit email links to the proposal page (tokened entry URL), not to Stripe.** One more click for
   the client, zero durable payment URLs anywhere. Reversal would contradict decision 5.
9. **Deliverable status moves write no event except `delivered`.** Keeps the timeline readable; a later
   audit need is one CHECK entry.
10. **"Request deposit" always rotates the proposal token.** Simplest path that reaches a manually-accepted
    client, an expired token and a second device alike, at the cost of invalidating an open tab (which the
    page already handles with "open from your email again"). Alternative: rotate only when the token is
    missing/expired/revoked and otherwise email a cookie-dependent `/proposal/<id>` link — fewer rotations,
    but the second-device case then fails. Chosen the one path.
11. **A session that completed unpaid blocks re-minting until Stripe reports success or failure.** For
    konbini the voucher can be valid for days, during which the client sees "your payment is in progress"
    and cannot switch to a card. Alternative: allow a second session and rely on `duplicate_payment` to
    catch double payment. Chosen prevention over detection; the client can reply to Ryan, who can refund/
    void by hand if they change their mind.

## Files — the complete list

**New**
- `supabase/migrations/075_studio_invoices_deliverables.sql`
- `supabase/tests/engagement_invoices_rls.test.ts`
- `lib/studio/engagement/invoice-math.ts` (+ `.test.ts`)
- `lib/studio/engagement/invoice-actions.ts`
- `lib/studio/engagement/invoice-notify.ts`
- `lib/studio/engagement/deliverable-actions.ts`
- `lib/studio/engagement/deliverable-seed.ts` (+ `.test.ts`)
- `lib/stripe/engagement-invoice.ts` (+ `.test.ts`)
- `__tests__/api/stripe-webhook-engagement-invoice.test.ts`
- `app/api/engagement/proposal/[id]/deposit/route.test.ts`
- `components/admin/ProposalDepositBlock.tsx`
- `components/admin/EngagementDeliverablesPanel.tsx` (+ `.test.tsx`)
- `components/proposal/ProposalDepositButton.tsx` (+ `.test.tsx`)
- `app/api/engagement/proposal/[id]/deposit/route.ts`

**Modified**
- `lib/studio/engagement/types.ts` (eight kinds + invoice/deliverable vocab), `proposal-terms.ts` (terms + next-steps wording for new proposals, EN/JA), `proposal-actions.ts` (`voidProposalAcceptance` maps `invoice_paid`; `translateDbError` exported + the `invoice_*` names; `rotateProposalToken` extracted from `resendProposalLink`), `emails.ts` (two senders)
- `lib/admin/types.ts`, `lib/admin/queries.ts` (`getEngagementInvoices`, `getEngagementDeliverables`)
- `lib/stripe/webhooks.ts` (STEP 0 branch, refund block, two exported handlers), `app/api/stripe/webhook/route.ts` (three cases)
- `app/[locale]/proposal/[id]/page.tsx` (accepted branch + invoice fetch), `components/proposal/copy.ts` (band keys EN/JA)
- `app/[locale]/admin/studio/engagements/[id]/page.tsx` (invoices + deliverables fetch, panel slot, gate prop)
- `components/admin/EngagementProposalPanel.tsx` (`invoices` prop, the block, the void tooltip), `EngagementStageControl.tsx` (+ `.test.tsx`), `EngagementTimeline.tsx` (labels), `StatusBadge.tsx`, `EngagementRow.tsx` (+ `.test.tsx`)

**Never touched:** `accept_engagement_proposal` and every other 074 RPC not named above; `lib/stripe/client.ts`
(API version); `app/api/stripe/checkout*/route.ts`; the `payments` table and its handlers' course branches;
anything under `lib/progress/`; migrations 065/068–073 and their suites; the ~132 unrelated uncommitted
entries.
