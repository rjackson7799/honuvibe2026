# Studio Care Billing — slice 6A of the engagement spine

> **STATUS: rev 2 — DRAFT, awaiting Ryan's review. NOT BUILT.** Rev 2 rewrites the data model after a
> third-party review of rev 1 found **five blockers**, all verified against the code (see "What rev 2
> changed"). Rev 1's central mistake was believing this slice needed no new table; it needs one, and most
> of the blockers dissolve once it exists.
>
> **(rev 1 scope, unchanged.)** Scope was settled in a brainstorm on
> 2026-09-10: build the core recurring loop plus the balance-paid gate; **defer pause/resume, mid-flight
> price changes and a client-facing cancel button to a later 6B** (see "Explicitly not this unit"). Execute
> in a FRESH session per CLAUDE.md.
>
> **Prod schema state: 067, 074, 075 and 077 are applied** — 077 verified by query on 2026-09-10
> (`send_engagement_invoice` answers `P0001 invoice_not_found` rather than `PGRST202`). **Re-verify with a
> query before executing; do not trust this line.** That habit has caught a missing migration twice now.
>
> **Migration number: 078.** 077 is the last committed. Re-check `ls supabase/migrations` at execution
> time and take the next free number if 078 has gone.
>
> **Sequencing note.** Slice 5's `pnpm test:rls` has still never run and its balance path has never
> executed in production. The first real client reaches slice 5 *before* slice 6. Verifying slice 5 is
> better value than building this — say so again before starting.

## Context

Acceptance already writes `care_mrr` onto the engagement (074), the proposal already tells the client
about a care plan, and `engagement_invoices` already reserves `kind = 'care_month'` with an unused
`stripe_subscription_id` (075). **Nothing collects any of it.** That is the same gap that justified slice
5 — the system making a promise it has no code to keep — one layer further out: recurring revenue the
platform describes, records the price of, and cannot charge.

Intended outcome: project ships → balance paid → **Start care plan** → the client puts a card on file once
→ Stripe charges monthly on its own → each payment lands as a `care_month` invoice row, with failures
flagged loudly and cancellation an explicit act.

**There are zero care clients today** (prod holds one engagement at `discovery`). This is built because
the attach points are already load-bearing and half-built, not because anyone is waiting. That is also why
6B is deferred: every one of its features is a guess until a real care client makes a real request.

## What rev 2 changed - third-party review triage

Eleven findings on rev 1, five of them blockers. Each was checked against the code before being taken or
rejected, and the file:line that settled it is quoted. **Rev 1's root error was decision 7's corollary that
this slice needed no new table**; blockers 1, 3, 4, 5 and 8 are all downstream of that one mistake.

| # | Finding | Verified? | Resolution |
|---|---|---|---|
| 1 | Nowhere to store a subscription before its first payment. | **YES.** `stripe_subscription_id` lives on invoice rows, and rev 1 created no invoice until payment, so `record_engagement_care_subscription` had nowhere to write and the first payment could not resolve an engagement. | **TAKEN** - `engagement_care_subscriptions`, alive from the moment a plan starts. |
| 2 | The proposed paid insert violates existing constraints. | **YES.** `engagement_invoices_status_shape_ck` (`075:114-120`) requires `sent_at`, `paid_at` AND non-null `stripe_payment_intent_id` for `paid`; `label` is NOT NULL. Rev 1 supplied none of them and named no Stripe invoice id for replay. | **TAKEN** - every field specified, plus a `stripe_invoice_id` column and partial unique index. |
| 3 | `care_started_at`/`care_ended_at` mean something else. | **YES.** `067:618-632` writes them on entering/leaving the care **stage**. An active subscriber moved back to `launch` reads as "care ended" while Stripe keeps charging. | **TAKEN** - billing lifecycle moves to the new table; those columns are never read as billing state. |
| 4 | Idempotency and pending-start recovery asserted, not designed. | **YES.** Rev 1 borrowed `<attempt>` from slice 5 with no column behind it. | **TAKEN** - `mint_attempt` + session columns on the plan row, and all five sequences tabulated. |
| 5 | The first payment can be permanently lost. | **YES.** Rev 1 said `not_found` -> "log and drop", and Stripe does not guarantee ordering. | **TAKEN** - `not_found` becomes a **retryable** non-2xx so Stripe redelivers; an unresolvable care invoice becomes `needs_attention`, never a silent drop. |
| 6 | "No unpaid invoice" does not prove settlement. | **YES**, and this codebase already knows it - `invoice-selection.ts:188` refuses to claim full settlement after a refunded deposit. | **TAKEN** - the gate is restated affirmatively, with `total_build = 0`, partial refunds and void-and-reissue decided explicitly. |
| 7 | The invoice UI will not absorb care rows "for free". | **YES, both halves.** `ProposalInvoicesBlock.tsx:163` builds `liveById` from `[deposit, balance]` only; and `selectBandState`'s settled fallback returns `deposit_paid` for **any** non-balance row, so a care payment would tell the client "Deposit received". | **TAKEN** - care is excluded from the one-time band and given its own surface; the strips take care rows explicitly. |
| 8 | Cancellation semantics unresolved. | **YES** - rev 1 said "when Stripe confirms" and stopped there. | **TAKEN** - cancel at period end, two phases, with dashboard-cancel and DB-failure recovery spelled out. |
| 9 | The hazard description is inaccurate. | **YES - and this one was my error.** `resolveSubscriptionTier` returns undefined for an inline price and the handler returns before granting anything (`webhooks.ts:511-519`), so there is no free Vault tier. `deleted` does not call `resolveSubscriptionUser` at all. | **TAKEN** - the hazard is restated accurately (account creation, **customer remapping**, misclassified payments), `deleted` is covered on its own terms, and `invoice.paid` moves into the first guard milestone. |
| 10 | "Active" and "retrying" need provider-backed state. | **YES.** `?care=started` is user-editable and can precede the webhook - the same class of defect slice 5 fixed for `?paid=`. | **TAKEN** - the query param is UX only; every state claim reads the plan row, which is written from Stripe's subscription status. |
| 11 | Inventory and gates incomplete. | **YES.** Dispatch lives in `app/api/stripe/webhook/route.ts` (a `case` block) and rev 1's "complete" file list omitted it. | **TAKEN** - file list and verification extended; observing a real second billing cycle becomes a release requirement. |

## THE HAZARD THIS UNIT MUST NOT SHIP

`customer.subscription.created|updated|deleted` and `invoice.paid` are **already subscribed on the live
endpoint and already handled** - for Vault/community subscriptions. `created`, `updated` and `invoice.paid`
all begin with `resolveSubscriptionUser(supabase, customerId)` (`lib/stripe/webhooks.ts:460-494`), which:

1. matches `users.stripe_customer_id = customerId`; and failing that
2. **retrieves the Stripe Customer and calls `findOrCreateUserByEmail`** - creating a platform account from
   the customer's email - and then **writes that care customer id onto the user row**.

**Corrected in rev 2 - rev 1 overstated this.** Rev 1 claimed an unguarded care subscription would grant a
free Vault tier. It would not: `resolveSubscriptionTier(priceId)` returns undefined for an inline care
price, and the handler logs and returns before touching entitlements (`webhooks.ts:511-519`). Saying
otherwise makes the guard look like fearmongering, which is how guards get deprioritised. The real harm is
narrower and still unacceptable:

- **Unsolicited account creation.** A studio client who never signed up gets a HonuVibe user row.
- **Customer remapping - the worst of the three.** If that client *is* already a Vault member,
  `users.stripe_customer_id` is overwritten with the **care** customer id. Their real subscription's future
  webhooks then resolve against the wrong customer, so a genuine Vault renewal or cancellation can silently
  stop being applied to them. This breaks a paying member's account from a studio-side action.
- **Misclassified payments.** `invoice.paid` resolves a user before it classifies the invoice, so a care
  charge can be recorded against the platform's payment path.

`deleted` is different and must be handled separately: it does **not** call `resolveSubscriptionUser` - it
queries and updates `users` directly by customer id. The guard has to cover it on its own terms.

**The guard is the first thing built and the first thing tested**, and `invoice.paid` is inside the first
milestone, not a later one. Every handler returns early on an engagement-tagged subscription *before* any
user resolution, exactly as slice 4 did for `checkout.session.completed` via `isEngagementInvoiceSession`.
The tag is subscription metadata - never an inference from price, amount or email.

## Locked decisions

Settled with Ryan 2026-09-10.

| # | Decision | Consequence |
|---|---|---|
| 1 | **Stripe Subscription, not a monthly manual invoice.** Stripe charges the card each month on its own. | No recurring chore, therefore no forgotten month. The alternative reused slice 5 almost entirely and was rejected because a monthly human step is exactly the failure this spine keeps designing out. |
| 2 | **The client authorizes via Checkout in `mode: 'subscription'`, from the proposal page.** Same `hv_engp_` cookie, same tokened entry email, same mint-route shape, same immutable-params + idempotency discipline. | One client surface, not two. Keeps the standing rule that **no durable payment URL ever sits in an inbox**. Rejected: Stripe-hosted invoices (breaks that rule and puts client copy outside the bilingual system) and dashboard-only setup (card details out of band). |
| 3 | **Care cannot start until the project is AFFIRMATIVELY settled.** Not "nothing unpaid" - rev 2 restates it as positive evidence, because "nothing unpaid" also passes when nothing was ever issued, when everything was voided, and when money was refunded. | A client cannot drift onto a monthly plan while still owing for the build. The exact predicate, and the `total_build = 0` / partial-refund / void-and-reissue cases, are in the Data model. |
| 4 | **Closing or losing an engagement is REFUSED while a care subscription is active.** Ryan cancels the plan explicitly, then closes. | Nothing silently keeps charging a card after the relationship ends; nothing silently ends revenue either. Also keeps Stripe calls out of the stage trigger — **a Postgres trigger cannot call Stripe**, so auto-cancel-on-close is not implementable there without leaving a closed engagement attached to a live subscription when the API call fails. |
| 5 | **Stripe owns dunning; the app owns telling Ryan.** Stripe runs its retry schedule and card-expiry mail. The app writes a `needs_attention` event on the first failure and shows a coral strip. | Free, well-tested, already localized retries — plus the one thing Stripe cannot do, which is make Ryan look at his own panel. |
| 6 | **A price change is a NEW PROPOSAL, not an edit.** `care_mrr` came from an accepted proposal that 074 froze as a contract. | Consistent with slice 5's existing rule that "a change order is a new proposal". This removes most of 6B: no subscription-item update, no proration decision, no divergence between the signed document and the live price. **Confirm this before building** — it is the one decision here that constrains a future unit. |
| 7 | **One `care_month` INVOICE row per `invoice.paid`** - and, from rev 2, **one PLAN row from the moment a plan starts**. The invoice table still records only money that moved; the plan row records the subscription itself. | Preserves 075's rule that the money table records billing *events*, while giving the subscription somewhere to live before its first payment - the absence of which was rev 1's root error. `uq_engagement_invoices_one_live` already excludes `care_month`, so many invoice rows per engagement are legal by construction. |

## Data model - migration `078_studio_care_billing.sql`

**Rev 2: this slice needs a new TABLE, not just a column.** Rev 1 tried to hang a subscription off the
existing invoice rows and created five blockers at once - there was nowhere to record a subscription before
its first payment, no attempt/session bookkeeping behind the idempotency key it claimed, no home for a
pending start, no cancellation state, and no billing lifecycle distinct from the engagement's stage
timestamps. One table fixes all five.

### `engagement_care_subscriptions` (new)

One row per care plan **attempt**, alive from the moment Ryan starts a plan - before any money moves.
Cancelled and abandoned rows are kept, so a restarted plan never destroys its predecessor's history.

| Column | Notes |
|---|---|
| `id`, `engagement_id`, `proposal_id` | `proposal_id` is NOT NULL and `ON DELETE RESTRICT`: a care plan is billed against a specific accepted offer, and decision 6 makes a price change a new proposal. |
| `status` | `pending_start` -> `active` -> (`past_due`) -> `canceling` -> `ended`, plus `abandoned`. CHECK-enumerated. |
| `amount`, `currency` | Snapshotted from `care_mrr` at start, never read live afterwards. `amount >= 50` (the Stripe minimum, the same floor 075 enforces). |
| `recipient_email` | Snapshotted, as 075 does for invoices. |
| `stripe_customer_id` | Set when Checkout completes. |
| `stripe_subscription_id` | NULL until the subscription exists. |
| `mint_attempt`, `stripe_checkout_session_id`, `checkout_session_expires_at` | The 075 mint bookkeeping, verbatim - this is what the idempotency key `engagement_care:<plan row>:<attempt>` actually keys on. |
| `started_at`, `current_period_end`, `cancel_requested_at`, `ended_at` | **Billing** lifecycle, distinct from the stage timestamps. |

**One live plan per engagement, enforced by the DB rather than by a predicate:**

```sql
CREATE UNIQUE INDEX uq_care_sub_one_live ON public.engagement_care_subscriptions (engagement_id)
  WHERE status IN ('pending_start','active','past_due','canceling');
CREATE UNIQUE INDEX uq_care_sub_stripe ON public.engagement_care_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE UNIQUE INDEX uq_care_sub_session ON public.engagement_care_subscriptions (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
```

A status-shape CHECK in 075's `CASE` form (SQL `AND` is not a guaranteed short-circuit): `active` requires
`stripe_subscription_id` and `started_at`; `ended` requires `ended_at`; `canceling` requires
`cancel_requested_at`.

RLS: one `*_admin_all` policy, no anon/member policy - the 067/074/075 posture. The client reaches care
only through the service-role route that has verified the `hv_engp_` cookie.

### Why NOT `care_started_at` / `care_ended_at` (blocker 3)

`067:618-632` sets `care_ended_at` whenever an engagement **leaves the care stage**, and clears it on
re-entry. Those are *operational* timestamps about where the work is, and they are wrong for billing in
both directions:

- an active subscriber moved from `care` back to `launch` for more work reads as "care ended" while Stripe
  keeps charging - so the close-refusal and the already-active check would both pass, permitting a second
  subscription and a silent close;
- re-entering `care` after a genuine cancellation clears `care_ended_at`, resurrecting a plan that does not
  exist.

**Those columns are left exactly as they are and are never read as billing state.** Every billing question
is answered by `engagement_care_subscriptions.status`. Decision 4's refusal reads the table, not the stage.

### `engagement_invoices` - one new column (rev 2 correction)

Rev 1 said "no change". That was wrong twice:

1. **`engagement_invoices_status_shape_ck` (075:114-120) requires every `paid` row to carry `sent_at`,
   `paid_at` AND a non-null `stripe_payment_intent_id`**, and `label` is NOT NULL. Rev 1's insert would have
   failed the CHECK on the first real payment. The care row therefore sets: `sent_at` = the Stripe invoice's
   period start, `paid_at` = now, `stripe_payment_intent_id` = the invoice's payment intent, `label` =
   `Care - <title> (<Month Year>)`, `pct_of_build` = NULL, and `stripe_subscription_id`.
2. **Replay protection needs durable Stripe identity.** `uq_engagement_invoices_payment_intent` exists and
   helps, but the natural key for a recurring charge is the Stripe *invoice*:

```sql
ALTER TABLE public.engagement_invoices ADD COLUMN stripe_invoice_id text;
CREATE UNIQUE INDEX uq_engagement_invoices_stripe_invoice
  ON public.engagement_invoices (stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
```

The unique index - not a SELECT-then-INSERT - is what makes replay safe under concurrent deliveries.

Still unchanged: no new event kinds (`invoice_paid` / `invoice_payment_failed` / `invoice_issued` all
exist), and `uq_engagement_invoices_one_live` already excludes `care_month`, so many rows per engagement are
legal by construction.

### RPCs

All `SECURITY DEFINER`, `SET search_path`, `REVOKE ALL ... FROM PUBLIC, anon, authenticated`,
`GRANT EXECUTE ... TO service_role`.

**`begin_engagement_care_checkout(p_proposal_id uuid, p_token_hash text)`** - lock engagement -> proposal,
then:

1. terminal stage -> `not_open`; stage not in (`launch`,`care`) -> `not_billable_yet`.
2. Re-validate the presented token hash, revocation and expiry on the **locked** proposal row, plus
   `status = 'accepted'` - the 074 credential rule, verbatim.
3. `care_mrr` null or `< 50` -> `no_care_plan`.
4. **Settlement gate, affirmative** (below) -> `balance_outstanding`.
5. **Reserve or reuse the plan row in the same transaction**: reuse an existing `pending_start` row and bump
   `mint_attempt`, otherwise insert one. `uq_care_sub_one_live` makes two simultaneous starts resolve to one
   winner and one `23505` the caller maps to `already_active`. The reservation is what gives the idempotency
   key something real to key on.
6. Return the plan row id, `mint_attempt`, and only immutable values.

**`record_engagement_care_started(p_plan_id uuid, p_attempt int, p_customer_id text, p_subscription_id text, p_current_period_end timestamptz)`** - CAS on
`(status = 'pending_start' AND mint_attempt = p_attempt)`, mirroring `record_engagement_invoice_checkout`.
Also writes `engagements.stripe_customer_id` when unset. Idempotent on the same subscription id.

**`record_engagement_care_payment(p_subscription_id text, p_stripe_invoice_id text, p_payment_intent_id text, p_amount int, p_currency text, p_period_start timestamptz, p_period_end timestamptz)`** -
the only writer of a `care_month` row. Resolves the plan by `stripe_subscription_id`; validates amount and
currency against the snapshot and raises `care_amount_mismatch` on a mismatch (075's discipline); inserts
the invoice with every field the shape CHECK demands; moves `past_due` back to `active`; updates
`current_period_end`. **Returns `not_found` as a distinct, RETRYABLE verdict** - see below.

**`request_engagement_care_cancel(p_plan_id uuid)`** and
**`record_engagement_care_cancelled(p_subscription_id text, p_ended_at timestamptz)`** - the two phases,
below.

**`tg_engagements_stage_sync`** - entering `lost`/`closed` while a row exists in
(`pending_start`,`active`,`past_due`,`canceling`) -> `RAISE EXCEPTION 'care_plan_active'`. A refusal, not a
sweep: the trigger cannot call Stripe, so preventing the inconsistent state is the only safe move.
Everything else in the function, including 077's `lost`-only invoice voiding, is copied verbatim.

### The settlement gate, stated affirmatively (blocker 6)

Rev 1 said "no live deposit or balance outside (paid, refunded)". That passes when **nothing was ever
issued**, when everything was **voided**, and it counts a **refund as settled** - which this codebase
already knows is false (`invoice-selection.ts:188` refuses to claim full settlement when the deposit was
refunded). So the gate is affirmative:

> For the accepted proposal being billed: a live `deposit` invoice exists and is `paid` with
> `amount_refunded` null-or-zero, **and** either no live `balance` exists (a 100% deposit) or the live
> `balance` is `paid` with `amount_refunded` null-or-zero.

Edge cases, decided rather than left to the predicate: `total_build = 0` (a performance-only offer)
**satisfies the gate with no invoices at all**, because there was never anything to collect; any partial
refund **fails** it; a void-and-reissue is judged on the live rows only. Anything not expressible here is a
deliberate override for a later unit, never a silent pass.

### Webhook ordering - the first payment must not be lost (blocker 5)

Stripe does not guarantee delivery order, so `invoice.paid` can arrive **before**
`record_engagement_care_started` has run. Rev 1 said "log and drop", which silently discards a real payment
on a real card.

Instead: a care-tagged invoice whose subscription is not yet known returns **`not_found`, and the route
replies non-2xx so Stripe redelivers** on its own backoff. Stripe retries for up to ~3 days, far longer than
the gap between two webhooks from one event burst. A care-tagged invoice still unresolvable once Stripe
stops retrying becomes a `needs_attention` event - never a silent drop.

Stale events from a **superseded** subscription are rejected by identity, not recency: every care handler
resolves through `uq_care_sub_stripe`, so an event carrying an old subscription id can only ever touch that
old row, and a write that would move an `ended` row is refused.

### Checkout recovery - the five sequences (blocker 4)

| Sequence | Behaviour |
|---|---|
| Two simultaneous starts | `uq_care_sub_one_live` picks one winner; the loser's `23505` maps to `already_active`. One plan row, one subscription. |
| Session created, then the process dies | The plan row is already `pending_start` with the session id recorded. The next start reuses that row and bumps `mint_attempt`, so the abandoned session expires unused. |
| Client abandons Checkout | The row stays `pending_start`; `checkout.session.expired` (already subscribed) moves it to `abandoned`, freeing the live slot. |
| Engagement closes after authorization but before Checkout completes | Decision 4's refusal blocks the close while a `pending_start` row exists, so this cannot arise. |
| An OLD Checkout completes after a replacement start | The completion carries the old session id, which no longer matches the row's current `stripe_checkout_session_id`; the CAS fails, and the resulting orphan subscription is cancelled at Stripe and flagged `needs_attention`. **An orphaned success here is an ongoing monthly charge, so it is flagged, never merely logged.** |

### Cancellation, precisely (blocker 8)

**Cancel at period end, not immediately.** The client paid for the current month and keeps it; that is both
fairer and avoids a proration/refund decision this slice does not want.

- `request_engagement_care_cancel` sets `status = 'canceling'` and `cancel_requested_at`, and returns the
  `stripe_subscription_id`. **It does NOT set `ended_at`** - a failed Stripe call must never leave the DB
  claiming care ended while the card is still charged.
- The action calls Stripe with `cancel_at_period_end: true`, bound to **that exact subscription id**.
- `customer.subscription.deleted` (already subscribed) fires when the period actually ends, and
  `record_engagement_care_cancelled` sets `status = 'ended'` and `ended_at`. Only then may the engagement be
  closed.
- **Stripe-success/DB-failure:** the subscription is scheduled at Stripe but the row still says `canceling`
  - which is exactly what `deleted` will later reconcile, so this self-heals.
- **Cancelled in the Stripe dashboard instead:** the same `deleted` handler runs, so the row reconciles
  without the app ever being asked.
- **Repeated requests** are idempotent on `canceling`.

## Surfaces

### Care must NOT flow through the one-time payment surfaces (blocker 7)

Rev 1 claimed care rows would join the existing invoice UI "for free". They would not, and one of the two
failures is client-facing:

- `ProposalInvoicesBlock.tsx:163` builds `liveById` from `[deposit, balance]` **only**, and its
  failed-payment detection requires a `sent` row - which a care charge never has. A failed care payment
  would be invisible, which is exactly the money-silently-missing shape this spine keeps designing out.
- `pickLatestSettled` filters on **status only, not kind**, and `selectBandState`'s settled fallback
  returns `deposit_paid` for any non-`balance` row. So the month a care payment lands, the client's
  proposal page would read **"Deposit received"**. Wrong, and confusing at exactly the wrong moment.

Both are fixed head-on: **`pickLatestSettled` excludes `care_month`** (the one-time band describes the
project, and care is not part of it), and the admin strips take care rows from the plan row plus its
invoices rather than from the deposit/balance pair. Both get a regression test named after this finding.

### Admin - `/admin/studio/engagements/<id>` (EN only)

`ProposalInvoicesBlock.tsx` gains a **Care** cell below Balance, driven by the plan row.

| Care state | Cell | Buttons |
|---|---|---|
| `care_mrr` null or 0 | not rendered | - |
| no plan, settlement gate unmet | `$650.00/mo - not started (balance outstanding)` | **Start care plan** disabled |
| no plan, before `launch` | `$650.00/mo - not started` | **Start care plan** disabled, *"Available once the engagement reaches Launch"* |
| no plan, eligible | `$650.00/mo - not started` | **Start care plan** (emails the client a tokened invite) |
| `pending_start` | `$650.00/mo - invite sent Sep 20, card not on file yet` | **Resend care invite**, **Cancel invite** |
| `active` | `$650.00/mo - active since Sep 22 - 3 payments - next Dec 22` | **Cancel care plan** (inline confirm) |
| `past_due` | `$650.00/mo - LAST PAYMENT FAILED Dec 22, Stripe is retrying` (coral) | as active |
| `canceling` | `$650.00/mo - cancels Dec 31` | - |
| `ended` / `abandoned` | `$650.00/mo - ended Dec 31 - 4 payments` | **Start care plan** (a new row, same customer) |

### Client - the accepted band on `/proposal/<id>` (EN/JA, **JA flagged for native review**)

Care is the first *ongoing* thing this page has shown, so it renders as its own band **below** the one-time
precedence rather than inside it: a settled project can carry a care plan, and both facts are true at once.

**The care band respects the same gates as the admin button** - it is not offered before `launch`, nor
while the settlement gate is unmet. Rev 1's "start whenever you're ready" would otherwise invite a client
to start a plan the RPC then refuses.

| Situation | Band | Button |
|---|---|---|
| eligible, no plan | *"Your care plan is $650.00 per month - ongoing support and improvements."* | **Start care plan** |
| `pending_start` + `?care=started` | *"Thank you - we're confirming your card with Stripe. This page will show the plan as active once it's done."* | none |
| `active` | *"Care plan active since {date}. You're billed $650.00 monthly. Reply to your email to make changes."* | none |
| `past_due` | *"We couldn't take this month's payment. Stripe will retry, or reply to your email and we'll sort it out."* | none |
| `canceling` | *"Your care plan ends on {date}."* | none |
| `ended` | *"Your care plan ended on {date}."* | none |

**`?care=started` is UX only and proves nothing** (blocker 10) - it is user-editable and can arrive before
the webhook. It selects between "confirming" and the real state; every factual claim comes from the plan
row, which is written from Stripe's own subscription status. The Stripe statuses map as:
`incomplete`/`trialing` -> `pending_start`; `active` -> `active`; `past_due`/`unpaid` -> `past_due`;
`canceled` -> `ended`. **`incomplete_expired` -> `abandoned`.**

No client-facing cancel this unit (deferred to 6B) - the band says to reply to the email, which is the
conversation a studio retainer should end with.

### The care route - `app/api/engagement/proposal/[id]/care/`

A **new path**, unlike slice 5's deliberate reuse, because it mints a genuinely different thing
(`mode: 'subscription'`) and no deployed client calls it - so there are no stale tabs to break and none of
slice 5's judgment call 4 applies.

Everything else is slice 5's route verbatim: UUID check -> rate limit -> `Sec-Fetch-Site` -> honeypot ->
`authorizeProposalSession` -> `begin_engagement_care_checkout` (which reserves the plan row) -> params from
only the returned immutable columns -> create under `engagement_care:<plan row>:<attempt>` -> record ->
`{url}`, `no-store`. `success_url` is `.../proposal/<id>?care=started`.

### Stripe params

`mode: 'subscription'`, `customer` when the engagement already has one (so a restart reuses the card on
file) else `customer_email`, and an **inline recurring price** - `price_data: { currency, unit_amount,
recurring: { interval: 'month' }, product_data: { name } }` - because `care_mrr` is negotiated per client
and fixed Price objects would mean one per client forever.

**`subscription_data.metadata` carries `{ checkout_kind: 'engagement_care', engagement_id, proposal_id,
care_plan_id }`.** It must be on `subscription_data.metadata` (which lands on the **Subscription**), not
only on the Session - `customer.subscription.*` events never see Session metadata. This is the tag the
guard reads.

Unchanged and untouched: the API version and SDK pin, `payment_method_types`, `allow_promotion_codes`.

## Explicitly not this unit — 6B

| Not building | Why now | Attach point |
|---|---|---|
| **Pause / resume** | Designing for a request no client has made. The right mechanics differ for "skip one month" vs "hold indefinitely", and the first real request will say which. | Stripe `pause_collection`; no schema needed. |
| **Mid-flight price change** | Decision 6 makes it a new proposal, which may remove the need entirely. | — |
| **Client-facing cancel** | Turns a retention conversation into a silent revenue loss. Revisit when cancel emails become a burden. | The care band already has the copy slot. |
| **Annual / multi-month terms** | `interval: 'month'` only. | `price_data.recurring.interval`. |
| **Care deliverables or SLA tracking** | Money only, this unit. | 4B's deliverables table. |
| **Reminders / dunning of our own** | Stripe owns it (decision 5). | — |

## Build order

- [ ] **1 - The hazard guard FIRST, and it covers four handlers not three.**
  `isEngagementCareSubscription` + early returns in `subscription.created`, `subscription.updated`,
  `subscription.deleted` (which does **not** use `resolveSubscriptionUser` and needs its own treatment) and
  **`invoice.paid`** - written before any care code exists to trigger them. A care-tagged event must
  provably never create a user, remap `users.stripe_customer_id`, or insert a platform payment.
- [ ] **2 - Migration 078 + RLS suite.** `engagement_care_subscriptions` with its three partial unique
  indexes and status-shape CHECK, `engagement_invoices.stripe_invoice_id` + its unique index, the five
  RPCs, and the stage-sync refusal. `pnpm test:rls` green.
- [ ] **3 - Invoice-selection + admin surface corrections (blocker 7).** Exclude `care_month` from
  `pickLatestSettled`; widen the admin strips. These are edits to SHIPPED slice-5 code, so they land with
  their regression tests before anything new depends on them.
- [ ] **4 - Stripe params + care route** (`lib/stripe/engagement-care.ts`, mirroring `engagement-invoice.ts`).
- [ ] **5 - Webhook care handlers** - start recording, payment recording (with the retryable `not_found`),
  failure flagging, cancellation reconciliation. Includes the `invoice.payment_failed` dispatch.
- [ ] **6 - Admin Care cell + Start/Cancel actions + the `care_invite` email variant.**
- [ ] **7 - Client care band + copy (EN/JA).**
- [ ] **8 - Gate -> review -> commit -> SUBSCRIBE `invoice.payment_failed` -> APPLY 078 -> push.**

## Gates

`pnpm verify` + `pnpm test:rls`. The pre-existing unrelated red is `lib/progress/{actions,queries}.test.ts`
(28 failures: 9 + 19) — **verify that count at execution time; it may have been fixed.** Every test file
this unit adds or touches is green, the full suite shows only those, they are listed by file in the ship
report, and Ryan says "continue" before the commit.

**Apply 078 BEFORE the deploy, and subscribe `invoice.payment_failed` before it too.** 077 shipped
code-first and sat unapplied for three days with the calling UI live — the Send balance button called a
function that did not exist, and nothing surfaced it because the cell renders from invoice rows. Twice now
(074, 077). Apply first.

The webhook precedent is just as sharp: `charge.refunded` had a handler in code for months while the live
endpoint was never subscribed to it, so the handler never ran once
([[project_charge_refunded_never_subscribed]]). **A handler existing in code proves nothing about the
provider being configured to call it** — verify the subscription in the Stripe dashboard, not the repo.

## Verification

### RLS suite - `supabase/tests/engagement_care_rls.test.ts` (new)

- **The guard, by effect not by mock:** a care-tagged payload through each of the four handlers leaves
  `users` **row-count unchanged**, leaves every `users.stripe_customer_id` unchanged, and inserts no
  `payments` row. Includes the nastiest case: **a studio client whose email already belongs to a Vault
  user** - their `stripe_customer_id` must not be repointed.
- **Start gates:** before `launch` -> `not_billable_yet`; settlement unmet -> `balance_outstanding`; no
  `care_mrr` -> `no_care_plan`; terminal stage -> `not_open`; wrong/revoked/expired token -> `forbidden`;
  second start while live -> `already_active` (via `uq_care_sub_one_live`, not a predicate).
- **The settlement gate, case by case:** paid deposit + paid balance passes; paid deposit + unpaid balance
  fails; **partially refunded deposit + paid balance FAILS**; nothing ever issued FAILS; all-voided FAILS;
  `total_build = 0` PASSES with no invoices.
- **Decision 4:** stage -> `closed` with a live plan -> `care_plan_active`, engagement unchanged; and
  **with a `pending_start` row too**, not just `active`. After `ended`, the same move succeeds.
- **Blocker 3 regression:** an `active` plan, engagement moved `care` -> `launch` -> the plan is still
  `active`, closing is still refused, and a second start is still refused. Then `launch` -> `care` again
  does **not** resurrect an `ended` plan.
- **Payment recording:** one `care_month` row + one `invoice_paid` event per `invoice.paid`, with every
  field the shape CHECK demands; a REPLAY of the same `stripe_invoice_id` writes nothing (proven against
  the unique index, under **concurrent** delivery); twelve months produce twelve rows and never trip
  `uq_engagement_invoices_one_live`; a mismatched amount raises `care_amount_mismatch`.
- **Blocker 5 - ordering:** `invoice.paid` delivered BEFORE the subscription is recorded returns a
  retryable verdict and writes nothing; redelivered after recording, it succeeds exactly once.
- **Blocker 4 - the five sequences**, each asserted: simultaneous starts, crash after session creation,
  abandonment/expiry, close-during-authorization, and an old Checkout completing after a replacement.
- **Cancellation:** `request_engagement_care_cancel` alone does NOT set `ended_at`; only the `deleted`
  reconciliation does. Repeated requests are idempotent. A dashboard-side cancel reconciles identically.
- **Grants:** every new RPC is `service_role`-only; anon and authenticated are denied the table outright.
- **Hygiene:** the 64-hex / `checkout.stripe.com` scan after start, payment, failure and cancel.

### Unit tests

| File | Pins |
|---|---|
| `lib/stripe/webhooks.care-guard.test.ts` (new) | **The hazard.** All four handlers, given a care-tagged subscription, return before `resolveSubscriptionUser` - spied and asserted **not called** - and `deleted` is covered on its own path since it never calls it. Given a Vault subscription, behaviour is byte-identical to today. |
| `lib/stripe/engagement-care.test.ts` (new) | `mode:'subscription'`; inline `price_data.recurring.interval === 'month'`; **`subscription_data.metadata.checkout_kind === 'engagement_care'`** (on the Subscription, not just the Session); `customer` reused when present; JPY as whole yen; determinism for the idempotency key; never `payment_method_types` / `allow_promotion_codes`. |
| `app/api/engagement/proposal/[id]/care/route.test.ts` (new) | Slice 5's 13 route assertions re-proven for this path, plus `balance_outstanding` -> 409 with Stripe never called, and a `pending_start` reuse bumping `mint_attempt` rather than creating a second row. |
| `app/api/stripe/webhook/route.test.ts` | `invoice.payment_failed` is dispatched; a retryable care `not_found` returns **non-2xx**; a Vault `invoice.payment_failed` changes nothing (do not start flagging Vault dunning in this unit). |
| `lib/studio/engagement/invoice-selection.test.ts` | **Blocker 7:** a paid `care_month` row is NOT returned by `pickLatestSettled`, and `selectBandState` never classifies care as `deposit_paid`. |
| `components/admin/ProposalInvoicesBlock.test.tsx` | The Care cell's nine states; a failed care payment renders its strip **without any `sent` row existing**. |
| `components/proposal/copy.test.ts` | The six new care keys in EN **and** JA. |
| `lib/studio/engagement/care-actions.test.ts` (new) | The invite's delivery contract, reusing slice 5's shape: rotation failure, provider failure and stamp failure each report rather than throw; a resend that rotated then failed clears the stamp. |

### Browser smoke - local stack only

Slice 5's recipe, Stripe **test** mode, `stripe listen`. **There is no browser automation on this machine**
- SSR'd pages are verified over HTTP with the session cookie, and the ship report must say so rather than
implying a browser pass. See the Release requirement below for month two.

## Judgment calls worth a second look

1. **A new `/care` route instead of reusing `/deposit`.** Slice 5 kept its path for stale-tab
   compatibility; here there are no deployed clients, so the honest name is free.
2. **The customer lives on `engagements`, not `users`.** The whole hazard is that an engagement client is
   not a platform user. Reversal would mean creating accounts for clients — do not.
3. **Care is offered at `launch`, not only at `care`.** Lets Ryan line the plan up as the project ships.
   Reversal: one value in the RPC's stage test.
4. **Cancel is two-phase.** More code than one call, but a one-phase cancel that fails at Stripe leaves
   the DB saying care ended while the card is still charged.
5. **No row at subscription creation.** A subscription is an intent; the money table records events.

## Files - the complete list

**New**
- `supabase/migrations/078_studio_care_billing.sql`
- `supabase/tests/engagement_care_rls.test.ts`
- `lib/stripe/engagement-care.ts` (+ `.test.ts`)
- `lib/stripe/webhooks.care-guard.test.ts`
- `app/api/engagement/proposal/[id]/care/route.ts` (+ `.test.ts`)
- `lib/studio/engagement/care-actions.ts` (+ `.test.ts`)
- `components/proposal/ProposalCareButton.tsx` (+ `.test.tsx`)

**Modified**
- `lib/stripe/webhooks.ts` - **the guard**, plus the care handlers
- **`app/api/stripe/webhook/route.ts`** - dispatch `invoice.payment_failed`, and return **non-2xx** for a
  retryable care `not_found` (blocker 5). Rev 1 omitted this file from a list it called complete; the
  dispatch is a `case` block here, not in `webhooks.ts`.
- `lib/studio/engagement/invoice-selection.ts` (+ test) - **exclude `care_month` from `pickLatestSettled`**
  (blocker 7)
- `components/admin/ProposalInvoicesBlock.tsx` (+ test) - the Care cell; strips take care rows
- `components/proposal/copy.ts` (+ test) - six care keys, EN + JA
- `app/[locale]/proposal/[id]/page.tsx` - the care band
- `lib/studio/engagement/emails.ts` (+ test) - a `care_invite` variant
- `lib/admin/types.ts` - `EngagementCareSubscription`, `stripe_customer_id`, `stripe_invoice_id`

**Never touched:** 075's and 077's RPCs except the amended sweep; the Vault/community subscription path
beyond the guard; `lib/stripe/client.ts` (API version and SDK pinned - **do not bump**); the `payments`
table; `lib/progress/`; migrations 065/068-073.

## Release requirement (blocker 11)

**A second real billing cycle must be observed before this is called done.** For a recurring-billing slice,
"the first charge worked" verifies almost nothing - the whole point is month two. Use a **Stripe test
clock** to advance a test-mode subscription through a second period and assert a second `care_month` row
with a distinct `stripe_invoice_id`. If test clocks prove impractical in the local setup, that is a blocking
finding to report, not a line in the "owed" list.
