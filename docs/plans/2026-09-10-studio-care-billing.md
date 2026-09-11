# Studio Care Billing — slice 6A of the engagement spine

> **STATUS: rev 1 — DRAFT, awaiting Ryan's review. NOT BUILT.** Scope was settled in a brainstorm on
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

## THE HAZARD THIS UNIT MUST NOT SHIP

`customer.subscription.created|updated|deleted` and `invoice.paid` are **already subscribed on the live
endpoint and already handled** — for Vault/community subscriptions. Every one of those handlers begins
with `resolveSubscriptionUser(supabase, customerId)` (`lib/stripe/webhooks.ts:460-494`), which:

1. matches `users.stripe_customer_id = customerId`; and failing that
2. **retrieves the Stripe Customer and calls `findOrCreateUserByEmail`** — it *creates a platform account*
   from the customer's email — then maps the subscription's price to a paid tier.

So an unguarded care subscription would **create a HonuVibe account for a studio client who never signed
up, and grant them a paid Vault tier for free.** An entitlement leak and unsolicited account creation, out
of one webhook.

**The guard is the first thing built and the first thing tested.** Every subscription-shaped handler
returns early on an engagement-tagged subscription *before* any user resolution, exactly as slice 4 did
for `checkout.session.completed` via `isEngagementInvoiceSession`. The tag is subscription metadata, not
an inference from price or email.

## Locked decisions

Settled with Ryan 2026-09-10.

| # | Decision | Consequence |
|---|---|---|
| 1 | **Stripe Subscription, not a monthly manual invoice.** Stripe charges the card each month on its own. | No recurring chore, therefore no forgotten month. The alternative reused slice 5 almost entirely and was rejected because a monthly human step is exactly the failure this spine keeps designing out. |
| 2 | **The client authorizes via Checkout in `mode: 'subscription'`, from the proposal page.** Same `hv_engp_` cookie, same tokened entry email, same mint-route shape, same immutable-params + idempotency discipline. | One client surface, not two. Keeps the standing rule that **no durable payment URL ever sits in an inbox**. Rejected: Stripe-hosted invoices (breaks that rule and puts client copy outside the bilingual system) and dashboard-only setup (card details out of band). |
| 3 | **Care cannot start until the project balance is settled.** One predicate in the RPC, reusing slice 5's `selectLatestSettledInvoice` / live-invoice read. | A client cannot drift onto a monthly plan while still owing for the build. |
| 4 | **Closing or losing an engagement is REFUSED while a care subscription is active.** Ryan cancels the plan explicitly, then closes. | Nothing silently keeps charging a card after the relationship ends; nothing silently ends revenue either. Also keeps Stripe calls out of the stage trigger — **a Postgres trigger cannot call Stripe**, so auto-cancel-on-close is not implementable there without leaving a closed engagement attached to a live subscription when the API call fails. |
| 5 | **Stripe owns dunning; the app owns telling Ryan.** Stripe runs its retry schedule and card-expiry mail. The app writes a `needs_attention` event on the first failure and shows a coral strip. | Free, well-tested, already localized retries — plus the one thing Stripe cannot do, which is make Ryan look at his own panel. |
| 6 | **A price change is a NEW PROPOSAL, not an edit.** `care_mrr` came from an accepted proposal that 074 froze as a contract. | Consistent with slice 5's existing rule that "a change order is a new proposal". This removes most of 6B: no subscription-item update, no proration decision, no divergence between the signed document and the live price. **Confirm this before building** — it is the one decision here that constrains a future unit. |
| 7 | **One `care_month` invoice row per `invoice.paid`.** No row is written at subscription creation — a subscription is an intent, not money. | Preserves 075's rule that the money table records billing *events*. `uq_engagement_invoices_one_live` already excludes `care_month`, so many rows per engagement are legal by construction. |

## Data model — migration `078_studio_care_billing.sql`

Smaller than 077 in behaviour, larger in schema: this is the first engagement slice that needs a new
column.

### `engagements.stripe_customer_id text` (new)

A subscription requires a Stripe Customer, and an engagement client **is not a platform user** — there is
no `users` row to hang it on, and creating one is precisely the hazard above. So the customer lives on the
engagement. Nullable, set once at care start, never cleared by a cancel (a re-started plan reuses the same
customer, so the client's card-on-file survives).

`CREATE UNIQUE INDEX … ON engagements (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL` — the
same partial-unique idiom 075 used for session and payment-intent ids.

### `engagement_invoices` — no change

`kind = 'care_month'`, `pct_of_build IS NULL` and `stripe_subscription_id` are all already there and
already constrained (075). The `(kind='care_month') = (pct_of_build IS NULL)` CHECK is satisfied by
construction. **No constraint swap, no new event kinds** — `invoice_issued` / `invoice_paid` /
`invoice_payment_failed` already exist and the timeline distinguishes care by summary, exactly as 077 did
for the balance.

### `begin_engagement_care_checkout(p_proposal_id uuid, p_token_hash text) RETURNS jsonb`

The care twin of `begin_engagement_invoice_checkout`, and the same authorize-under-the-lock shape. Lock
order **engagement → proposal**, unchanged.

1. Lock the engagement. `stage IN ('lost','closed')` → `{applied:false, reason:'not_open'}`.
2. `stage NOT IN ('launch','care')` → `not_billable_yet`. Care is offered at launch and during care.
3. Lock the proposal; re-validate the presented token hash, `token_revoked_at`, `token_expires_at` and
   `status = 'accepted'` — the 074 credential rule, verbatim.
4. `care_mrr IS NULL OR care_mrr = 0` → `no_care_plan`.
5. **`care_ended_at IS NULL AND stripe_subscription_id`-bearing live plan exists → `already_active`.**
6. **Decision 3:** any live `deposit` or `balance` invoice not in (`paid`,`refunded`) → `balance_outstanding`.
7. Return ONLY immutable columns — `engagement_id`, `proposal_id`, `care_mrr`, `currency`, `locale`,
   `recipient_email`, `stripe_customer_id`, and a label built from the title — so two clicks under one
   idempotency key build identical params.

### `record_engagement_care_subscription(p_engagement_id uuid, p_customer_id text, p_subscription_id text)`

Stores the customer and marks care live. Single-row lock (cannot participate in a lock cycle — the 075
rule). Idempotent: re-recording the same subscription id is a no-op `already_recorded`.

### `record_engagement_care_payment(p_subscription_id text, p_invoice_id text, p_amount int, p_currency text, p_period_start timestamptz)`

The webhook's writer, and the only thing that creates a `care_month` row.
- Resolve the engagement by `stripe_subscription_id`; not found → `{applied:false, reason:'not_found'}`
  (a Vault subscription reaching here is a bug, not an error — log and drop).
- **Replay-safe on the Stripe invoice id**, the same identity-backstop discipline 075 used for payment
  intents: a repeat of the same `invoice.paid` returns `already_recorded` and writes nothing.
- Insert `kind='care_month'`, `status='paid'`, `pct_of_build=NULL`, `paid_at=now()`, plus an
  `invoice_paid` event whose summary reads `Care: $650.00 — September 2026`.

### `cancel_engagement_care(p_engagement_id uuid) RETURNS jsonb`

The DB half of a cancel: clears nothing, records the intent, and returns the `stripe_subscription_id` for
the action to cancel at Stripe. Sets `care_ended_at` only once Stripe confirms (the app calls back through
`record_engagement_care_cancelled`), so a failed API call cannot leave the DB claiming care ended while
the card is still being charged.

### `tg_engagements_stage_sync` — one new refusal (decision 4)

Entering `lost` or `closed` while a live care subscription exists → `RAISE EXCEPTION 'care_plan_active'`.
This is a refusal, not a sweep: the trigger cannot call Stripe, so the only safe thing it can do is
*prevent the inconsistent state from existing*. Everything else in the function — including 077's
`lost`-only invoice voiding — is copied verbatim.

## Surfaces

### Admin — `/admin/studio/engagements/<id>` (EN only)

`ProposalInvoicesBlock.tsx` gains a **Care** cell below Balance. Same shape as the Balance cell.

| Care state | Cell | Buttons |
|---|---|---|
| `care_mrr` null or 0 | not rendered | — |
| no plan, balance outstanding | `$650.00/mo — not started (balance outstanding)` | **Start care plan** disabled, *"Settle the balance first"* |
| no plan, before `launch` | `$650.00/mo — not started` | **Start care plan** disabled, *"Available once the engagement reaches Launch"* |
| no plan, at `launch`/`care` | `$650.00/mo — not started` | **Start care plan** (sends the client the tokened invite) |
| invited, not yet subscribed | `$650.00/mo — invite sent Sep 20, card not on file` | **Resend care invite** |
| active | `$650.00/mo — active since Sep 22 · 3 payments · last $650.00 on Nov 22` | **Cancel care plan** (inline confirm) |
| payment failed (decision 5) | `… · LAST PAYMENT FAILED Dec 22 — Stripe is retrying` in coral | as active |
| cancelled | `$650.00/mo — ended Dec 31 · 4 payments` | **Start care plan** (a new plan, same customer) |

The duplicate-payment and failed-payment strips from slice 5 already key on *any* live invoice on the
proposal; `care_month` rows join that set for free.

### Client — the accepted band on `/proposal/<id>` (EN/JA, **JA flagged for native review**)

Care is the first *ongoing* thing this page has ever shown, so it gets its own band below the existing
one-time precedence rather than inside it: a settled project can carry a care plan, and both facts are
true at once.

| Situation | Band | Button |
|---|---|---|
| care offered, no plan | *"Your care plan is $650.00 per month — ongoing support and improvements. Start it whenever you're ready."* | **Start care plan** |
| `?care=started` | *"Thank you. Your care plan is active and you'll be billed $650.00 monthly."* | none |
| active | *"Care plan active since {date}. You're billed $650.00 monthly. Reply to your email to make changes."* | none |
| cancelled | *"Your care plan ended on {date}."* | none |

No client-facing cancel this unit (deferred to 6B) — the band says to reply to the email, which is the
conversation a studio retainer should end with.

### The care route — `app/api/engagement/proposal/[id]/care/`

A **new path**, unlike slice 5's deliberate reuse, because this mints a genuinely different thing
(`mode: 'subscription'`) and there is no deployed client calling it yet — so there are no stale tabs to
break and none of judgment call 4's reasoning applies.

Everything else is slice 5's route verbatim: UUID check → rate limit → `Sec-Fetch-Site` → honeypot →
`authorizeProposalSession` → `begin_engagement_care_checkout` → build params from only the returned
immutable columns → create under `engagement_care:<engagement>:<attempt>` → record → `{url}`, `no-store`.

`success_url` is `…/proposal/<id>?care=started`.

### Stripe params

`mode: 'subscription'`, `customer` (or `customer_email` on the first run, letting Stripe create one),
and an **inline recurring price** — `price_data: { currency, unit_amount: care_mrr, recurring: { interval:
'month' }, product_data: { name } }` — because `care_mrr` is negotiated per client and fixed Price objects
would mean one per client forever.

**`subscription_data.metadata` carries `{ checkout_kind: 'engagement_care', engagement_id, proposal_id }`.**
This is the tag the hazard guard reads, and it must be on `subscription_data.metadata` (which lands on the
**Subscription**), not only on the Session — `customer.subscription.*` events never see Session metadata.

Unchanged and untouched: the API version and SDK pin, `payment_method_types`, `allow_promotion_codes`.

## Webhook changes — `lib/stripe/webhooks.ts`

**Three of the four events are already subscribed and handled** (`customer.subscription.created`,
`updated`, `deleted`, and `invoice.paid`) — so most of this is branching inside handlers that exist.

**One event is genuinely new: `invoice.payment_failed`.** Verified absent — it is not in the nine events
the dispatcher handles, and the only matches in the tree are the *internal* event kind
`invoice_payment_failed` (underscore), which is a different thing. Decision 5 needs the Stripe event, so
**this unit requires a Stripe dashboard change: subscribe `invoice.payment_failed` on the live
destination.** That is the first dashboard change since slice 4, it must happen before the deploy, and it
belongs in the ship report's prod steps.

The happy accident: the *internal* kind `invoice_payment_failed` is already in the
`engagement_events.kind` CHECK (`lib/studio/engagement/types.ts:49`), so the failure flag needs **no
constraint swap** — the same dodge 077 used.

1. **`isEngagementCareSubscription(subscription)`** — true when `metadata.checkout_kind === 'engagement_care'`.
2. `handleSubscriptionCreated` / `Updated` / `Deleted`: **first line**, before `resolveSubscriptionUser`,
   return early on an engagement care subscription, routing to the care handlers instead. This is the
   hazard guard.
3. `invoice.paid`: branch on the parent subscription's metadata → `record_engagement_care_payment`.
4. `invoice.payment_failed`: a **new handler for a newly subscribed event** — branch on the parent
   subscription's metadata, write an `invoice_payment_failed` event with `needs_attention`, and let Stripe
   keep retrying (decision 5). A Vault-subscription failure must fall through to today's behaviour
   unchanged, which today means "nothing" — do not accidentally start flagging Vault dunning in this unit.

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

- [ ] **1 · The hazard guard FIRST.** `isEngagementCareSubscription` + early returns in all three
  subscription handlers + their tests, before any care code exists to trigger them. A care-tagged
  subscription must provably never reach `resolveSubscriptionUser`.
- [ ] **2 · Migration 078 + RLS suite.** The column, the index, four RPCs, the stage-sync refusal.
  `pnpm test:rls` green.
- [ ] **3 · Stripe params + care route** (`lib/stripe/engagement-care.ts`, mirroring `engagement-invoice.ts`).
- [ ] **4 · Webhook care handlers** — payment recording, failure flagging, cancellation.
- [ ] **5 · Admin Care cell + Start/Cancel actions + the care invite email variant.**
- [ ] **6 · Client care band + copy (EN/JA).**
- [ ] **7 · Gate → review → commit → APPLY 078 → push.**

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

### RLS suite — `supabase/tests/engagement_care_rls.test.ts` (new)

- **The guard:** a care-tagged subscription payload never resolves a user and never creates one — asserted
  against a `users` row count, not a mock call.
- **Start gates:** before `launch` → `not_billable_yet`; unpaid balance → `balance_outstanding`; no
  `care_mrr` → `no_care_plan`; terminal stage → `not_open`; wrong/revoked/expired token → `forbidden`;
  second start while active → `already_active`.
- **Decision 4:** stage → `closed` with a live plan → `care_plan_active`, and the engagement is unchanged.
  After cancel, the same move succeeds.
- **Payment recording:** one `care_month` row + one `invoice_paid` event per `invoice.paid`; a REPLAY of
  the same Stripe invoice id writes nothing; twelve months produce twelve rows and never trip
  `uq_engagement_invoices_one_live`.
- **Cancel is two-phase:** `cancel_engagement_care` alone does NOT set `care_ended_at`; only the
  confirmation does. A cancel whose Stripe call fails leaves care active and flagged.
- **Hygiene:** re-run the 64-hex / `checkout.stripe.com` scan after start, payment and cancel.

### Unit tests

| File | Pins |
|---|---|
| `lib/stripe/webhooks.care-guard.test.ts` (new) | **The hazard.** Each of the three subscription handlers, given a care-tagged subscription, returns before `resolveSubscriptionUser` — spied and asserted **not called**. Given a Vault subscription, behaviour is byte-identical to today. |
| `lib/stripe/engagement-care.test.ts` (new) | `mode:'subscription'`; inline `price_data.recurring.interval === 'month'`; **`subscription_data.metadata.checkout_kind === 'engagement_care'`** (on the Subscription, not just the Session); JPY as whole yen; determinism for the idempotency key; never `payment_method_types` / `allow_promotion_codes`. |
| `app/api/engagement/proposal/[id]/care/route.test.ts` (new) | Slice 5's 13 route assertions re-proven for this path, plus `balance_outstanding` → 409 and Stripe never called. |
| `components/admin/ProposalInvoicesBlock.test.tsx` | The Care cell's eight states, including the balance-outstanding disable and the coral failed-payment line. |
| `components/proposal/copy.test.ts` | The four new care keys in EN **and** JA. |

### Browser smoke — local stack only

Slice 5's recipe, Stripe **test** mode, `stripe listen`. **There is no browser automation on this
machine** — SSR'd pages are verified over HTTP with the session cookie, and the ship report must say so
rather than implying a browser pass. Stripe test clocks are the way to exercise a second month without
waiting thirty days; if that proves impractical, say the monthly recurrence was NOT observed.

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

## Files — the complete list

**New**
- `supabase/migrations/078_studio_care_billing.sql`
- `supabase/tests/engagement_care_rls.test.ts`
- `lib/stripe/engagement-care.ts` (+ `.test.ts`)
- `lib/stripe/webhooks.care-guard.test.ts`
- `app/api/engagement/proposal/[id]/care/route.ts` (+ `.test.ts`)
- `lib/studio/engagement/care-actions.ts` (+ `.test.ts`)

**Modified**
- `lib/stripe/webhooks.ts` — **the guard**, plus the care branches
- `components/admin/ProposalInvoicesBlock.tsx` (+ test) — the Care cell
- `components/proposal/copy.ts` (+ test) — four care keys, EN + JA
- `components/proposal/ProposalPayButton.tsx` or a sibling care button
- `app/[locale]/proposal/[id]/page.tsx` — the care band
- `lib/studio/engagement/emails.ts` (+ test) — a `care_invite` variant
- `lib/admin/types.ts` — `stripe_customer_id`

**Never touched:** 075's and 077's RPCs except the amended sweep; the Vault/community subscription path
beyond the guard; `lib/stripe/client.ts` (API version and SDK pinned — **do not bump**); the `payments`
table; `lib/progress/`; migrations 065/068–073.
