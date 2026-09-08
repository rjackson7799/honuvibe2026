# Studio Balance Invoice — slice 5 of the engagement spine

> **STATUS: rev 3 — APPROVED, IN EXECUTION (2026-09-07).** Rev 2 was approved by Ryan on 2026-09-06
> after his 8-finding review (6 taken as written, 2 narrowed — see "What rev 2 changed"), and settled
> both open judgment calls: on `closed` the row survives but the CELL WORDING changes (judgment call 2),
> and the route keeps the `/deposit` path, with the rename deferred until a token-scheme change has
> already invalidated every open client tab (judgment call 4, reworded in rev 3).
>
> Rev 3 adds no new scope: it is rev 2 corrected against a third-party review whose 7 findings were each
> verified against the code before being taken or rejected (see "What rev 3 changed"). Slices 1–4 are
> shipped: spine `22e2c59`, discovery `dc89408`, proposal `612e1e9` + `fb6cf45`, deposit + kickoff
> `5c06299` + `c949f4f`.
>
> **Prod schema state: 067, 074 and 075 are all applied — RE-VERIFIED BY QUERY on 2026-09-07**, not by
> trusting this line: all four tables answer 200 on `zvfwtndbxshrtpwcwynw`, `begin_engagement_invoice_checkout`
> returns its own `{applied:false, reason:'not_found'}` verdict, and `send_engagement_invoice` is absent
> (PGRST202), confirming 077 has not been applied. 074 had once been missed — found when 075 failed with
> `42P01: relation "public.engagement_proposals" does not exist`. That habit is what caught the gap;
> keep it.
>
> **Prod holds ZERO engagements and ZERO invoices (queried 2026-09-07).** Two consequences worth stating
> before execution: the 077 repair will find **no candidates at all** (so it can neither restore nor
> abort), and the `success_url` rollout window under rev 3's finding 3 is **provably empty** — there is no
> live Checkout session anywhere to conflict with a changed parameter. Both remain implemented as
> designed, because the code outlives today's row count.
>
> **Migration number: 077.** 075 is the last committed; **076 is taken** by the untracked
> `076_business_upgrade_plans.sql` belonging to unrelated work in the tree. Re-check
> `ls supabase/migrations` at execution time and take the next free number if 077 has gone too.
>
> **Size, corrected.** Rev 1 called this "roughly a third of 4A". With invoice identity threaded through
> the client path, six new band states in EN and JA, and a real failure/concurrency contract for the send
> action, it is closer to **two-thirds of 4A**. Still one slice, but not a small one.

## What rev 2 changed

Two of these findings invalidate decisions rev 1 had locked, so the review is preserved here rather than
silently absorbed.

| # | Finding | Resolution |
|---|---|---|
| 1 | The close/reopen recovery fixed only one variant of the trap — and rev 1's rule **introduced a crash**: unpaid deposit + draft balance → close (voids the deposit, spares the balance) → reopen → Request deposit inserts a second balance → **23505** on `uq_engagement_invoices_one_live`. | **Taken, with a simpler fix that resolves both variants: on `closed`, void NOTHING.** `begin_engagement_invoice_checkout` already refuses while `stage IN ('lost','closed')`, so those invoices are *already inert* — voiding bought no safety and cost all recoverability. `lost` keeps 075's behaviour. Plus a one-time repair for rows a `closed` sweep already voided. |
| 2 | "Oldest unpaid" is not deterministic: `issue_engagement_deposit` inserts both rows in one transaction, so `now()` — and therefore `created_at` — is **identical**. The page and the route could pick different rows. | **Taken.** One shared selector ordered `sent_at, deposit-first, id`; both callers use the same function so they cannot diverge. |
| 3 | The payment request doesn't identify the invoice the client saw. Two tabs → the client is shown "pay the deposit" and charged the **balance**. `?paid=1` names no invoice either, so it can swallow the next one. | **Taken.** The button POSTs the invoice id it rendered; the server validates it and returns `stale_invoice` when it no longer matches. `?paid=1` becomes `?paid=<invoiceId>`. |
| 4 | Client paid/refunded selection underspecified; "newest paid" ≠ the deposit; reusing *"Deposit received … Ryan will be in touch about kickoff"* after the final balance payment is the wrong message. | **Taken structurally** — three distinct reads and per-kind copy. **Not taken:** splitting partial vs full refunded into separate states. 4A's deposit band already carries both in one sentence with the amounts; splitting it for the balance only would make the two kinds inconsistent for no client benefit. |
| 5 | The duplicate-payment and failed-payment strips filter on `deposit?.id` (`ProposalDepositBlock.tsx:113,122`), so the same events on a balance are silently invisible. | **Taken.** Both strips key on any live invoice and name which one. |
| 6 | The send action needs a failure and concurrency contract; `rotateProposalToken` CASes on `status` only (`proposal-internals.ts:126-127`), so concurrent rotations both succeed and the earlier email ships a dead token; and the balance email promises to name a deposit the plan allows to be unpaid. | **Taken, all three.** The rotation CAS fix repairs a live 4A defect, not just a balance-plan gap. |
| 7 | The route rename needs a deployment compatibility shim — an already-open page still calls `/deposit`. | **Taken as a reason to DROP the rename.** With finding 3 the route also gains an invoice id in its body, so a shim would have to accept the legacy body *and* fall back to server-selection — re-introducing exactly the ambiguity finding 3 removes, to serve a cosmetic rename. The path stays `/deposit` with a header comment; the **component** renames stay (no deployment surface). |
| 8 | Several proposed tests would not prove their guarantee. | **Taken, all four.** |

## What rev 3 changed — third-party review triage

Seven findings on rev 2. Each was checked against the code before it was taken or rejected; the file and
line that settled it is quoted. **Nothing here touches a locked decision** — two findings correct the
*rationale* under decision 2 and the *claim* under finding 6, both of which survive the correction.

| # | Finding | Verified? | Resolution |
|---|---|---|---|
| 1 | The historical repair can revive a superseded invoice (23505) or restore invoices on a `lost` engagement. | **YES, both.** `uq_engagement_invoices_one_live` is `(proposal_id, kind) WHERE voided_at IS NULL` (`075:141-143`), so restoring a row whose slot a re-issue has taken is a hard 23505 — a **failed migration**. And `stage` carries only a value CHECK, no transition allowlist (`067:144`), so `closed → lost` is legal; the sweep only voids `draft\|sent` (`075:1101`), so rows voided by the close keep `void_reason = 'Engagement marked closed'` and the repair would resurrect them on a dead deal. | **TAKEN.** The repair becomes preflight-then-restore: it restores only candidates whose live slot is **free** and whose engagement is **not `lost`**, counts the ambiguous ones separately, and RAISEs (aborting the migration cleanly, before any write) if any exist. Ambiguity stops for reconciliation instead of guessing. |
| 2 | The token-hash CAS does not serialize *delivery*: A rotates H0→H1 and pauses, B rotates H1→H2 and sends, A then sends its dead H1 link. Both CAS succeed. | **YES.** `rotateProposalToken` CASes on `status` alone (`proposal-internals.ts:126-127`); adding the hash CAS closes the *simultaneous-read* window only. | **TAKEN AS A CLAIM CORRECTION, not a lease.** The CAS still ships — it turns a silent double-rotate into a loud loser. But rev 2's claim that it fixes staggered rotation is withdrawn, and the narrower guarantee is stated instead: **only the newest link ever works**, which is already this system's deliberate semantics (`invoice-actions.ts:17-18`, and the client copy already says "Open the newest link from your email"). A durable lease across rotate+send is rejected as disproportionate for a single-operator panel where concurrency means Ryan in two tabs. |
| 3 | Changing `success_url` under an unchanged idempotency key can create a second live Checkout session during rollout; and the plan's scope says `lib/stripe/*` is untouched while the URL is built there. | **YES, both.** `success_url` is at `lib/stripe/engagement-invoice.ts:113` with three tests asserting `?paid=1` (`engagement-invoice.test.ts:89,94,105`) — a flat contradiction with the Files list. The conflict path is real: `route.ts:171-197` answers `idempotency_error` by re-arming and minting again **without expiring the first session**. | **SCOPE CONTRADICTION TAKEN** — `lib/stripe/engagement-invoice.ts` + its test move to Modified; the Never-touched line now says `lib/stripe/*` **except** that one URL. **The rollout window is accepted and documented, not engineered away:** the re-arm-mints-a-second-session behaviour predates this plan (075 judgment call 5), a duplicate payment is already detected, flagged `needs_attention` and — via finding 5 — now visible for balances too. Two cheap mitigations ship instead: the page keeps accepting the **legacy `?paid=1`** so a pre-deploy session's return still lands on a correct band, and the ship report tells Ryan to check for a live session before deploying. |
| 4 | "Closed invoices are inert" overstates: closing blocks new authorization but not an open session or a pending async payment. | **YES.** `begin_engagement_invoice_checkout` refuses on a terminal stage (`075:509-511`), but `mark_engagement_invoice_paid` locks the engagement and **never tests `stage`** (`075`, the mark-paid body) — money can still land after a close. | **RATIONALE CORRECTED; DECISION 2 UNCHANGED and in fact strengthened** — if money can still arrive on a closed engagement's invoice, keeping the row truthful matters *more*, not less. **Admin half TAKEN:** `sent` + `closed` is a state 075 could not produce and 077 now can, so **Resend balance email is suppressed on a terminal engagement** (the block already receives `engagement`). **Client half REJECTED:** adding a stage read to every client page load to pre-empt a 409 that already renders a sensible message is not worth it — `begin_…_checkout` returns `not_open`, which the button maps to a true sentence. |
| 5 | The refund-copy premise is factually wrong, "settled in full" is not established, and `paid_at` survives a refund. | **YES, all three.** `depositRefundedBand` takes only the original amount (`copy.ts:38-39`) and the page passes `deposit.amount` (`page.tsx:160`) — a **partial** refund currently reads as though the whole deposit went back. The admin cell does it correctly (`ProposalDepositBlock.tsx:51-54`); the client band does not. And the guard freezes `paid_at` once set, so a `refunded` row keeps it. | **TAKEN, all three — and this repairs a live 4A defect, like the CAS fix.** The band now receives **both** the refunded and the original amount, which keeps rev 2's rejection of a partial/full split intact (still one sentence, still consistent across kinds) while making that sentence true. "Settles the project in full" is claimed **only when the deposit is also `paid`**; otherwise the band says the balance was received. The email's deposit line keys on `status === 'paid'`, never on `depositPaidAt` alone. |
| 6 | The failure contract omits the post-commit reads, and a failed resend leaves a stale "email sent" stamp. | **YES, both.** `issueDeposit` performs three throwing reads *after* the RPC commits (`invoice-actions.ts:173-175`) — exactly the "told Ryan it failed while the invoice is live" failure the table was written to prevent. And `invoice_email_sent_at` is only ever set, never cleared (`invoice-actions.ts:129-133`). | **TAKEN.** The table gains a post-commit-read row returning the same `{sent:true, emailed:false}` shape, and a resend that **rotated the token but failed to deliver** now **clears `invoice_email_sent_at`**, so the panel's existing coral "not sent — resend below" branch tells the truth. A rotation that *failed* leaves the stamp alone — the old link still works, so the old email is still valid. |
| 7 | Keeping `/deposit` does not preserve old-tab compatibility: an old client omitting `invoice_id` gets a 400, which it renders as "temporarily unavailable". | **YES.** The deployed button maps 429/404/403/409 and falls through to `depositUnavailable` for everything else (`ProposalDepositButton.tsx:56-70`) — misleading for what is really a stale tab. | **TAKEN in the reviewer's shape, and it renames nothing** (judgment call 4 stands). An **absent** `invoice_id` → **409 `stale_invoice`**, which the deployed button already maps to `depositNotOpen` ("no longer open… reply to the email") — true and actionable. A **malformed** one → 400, since only a broken or hostile client sends that. The server still never picks an invoice, so decision 3 is intact. |

The reviewer's closing note is also taken and was a real gap: `depositButton` is the literal string
**"Pay the deposit →"** (`copy.ts:27`), so the balance band would have shipped a button telling the client
to pay a deposit. The button label becomes per-kind, and a test pins it.

## Context

Slice 4 made the deposit real. At the default 50% it also creates the **balance** row —
`status = 'draft'`, never sent, an explicit attach point. That leaves a hole the moment slice 4 is used:
**every engagement accrues a second half of the money the system cannot collect.** Ryan takes $437.50 of
$875.00 and leaves the platform for the rest. The terms shipped in 4A already tell the client how it ends
— *"Work starts once it is received; the balance is invoiced at launch"* — so the system currently makes
a promise it has no code to keep.

Intended outcome: deposit paid → build → launch → **Send balance** → the client pays it from the same
page → both rows `paid`, with no new client surface and no new payment mechanism.

## Locked decisions

Settled with Ryan 2026-09-06; **decisions 2 and 3 were amended by his review** and supersede rev 1.

| # | Decision | Consequence |
|---|---|---|
| 1 | **Manual send, gated on the engagement reaching `launch`.** Billable while `launch` **or** `care`; the RPC enforces it (`invoice_not_billable_yet`), the button mirrors it. No warning at `care`/`closed`. | Honours the terms without taking the moment out of Ryan's hands. `care` is included because a care plan that began before the balance went out still owes it. |
| 2 | **(AMENDED) On `closed` the terminal sweep voids NOTHING. On `lost` it voids `draft\|sent`, unchanged from 075.** | Rev 1 said "on closed, void `sent`, keep `draft`" — that stranded a *sent* balance and made re-issue crash. Voiding on close bought no protection worth the cost: the mint RPC refuses while the stage is terminal (`075:509-511`), so a closed engagement's invoices cannot be **newly authorized** either way. **(rev 3, precision:)** that is narrower than "inert" — an already-open Checkout session keeps working and `mark_engagement_invoice_paid` has **no stage test at all**, so money can still land after a close. That cuts *for* this decision, not against it: if a payment can still arrive, the invoice row must still be there and truthful to receive it (075 already handles `void → paid`, but a live row is the honest home for it). Closing is now fully reversible; `lost` still means the deal died and nothing is owed. |
| 3 | **(AMENDED) One payable invoice at a time, chosen by ONE shared selector and NAMED BY THE CLIENT.** The band renders a specific invoice; the button POSTs that invoice's id; the server validates it and refuses a stale one. | Rev 1 had the server pick "the oldest unpaid" independently on the page and in the route. With identical `created_at` values that is non-deterministic, and across two tabs it lets a client be shown one invoice and charged another. |
| 4 | **One email sender with a `variant`, not a second sender.** `sendDepositRequestEmail` → `sendInvoiceRequestEmail({ variant: 'deposit' \| 'balance', … })`. | Adds one paragraph per locale to the JA review debt instead of a whole message. |
| 5 | **Reuse the `invoice_issued` event kind.** No new kind, therefore **no constraint swap.** | Skips the fiddliest part of 075. The timeline distinguishes them by summary. |
| 6 | **No table change.** 077 adds one RPC, amends one trigger, and runs one repair. | 075 built `engagement_invoices` around an invoice id, so the money path already generalises. |

## Data model — migration `077_studio_balance_invoice.sql`

No new tables, columns or event kinds; **no constraint swap.** One RPC, one trigger amendment, one
one-time repair. Idioms per 067/074/075: `SECURITY DEFINER`, `SET search_path = ''`,
`REVOKE ALL … FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE … TO service_role`.

### `send_engagement_invoice(p_invoice_id uuid) RETURNS jsonb`

The `draft → sent` transition. Lock order **engagement → proposal → invoice**, the one rule every 075
writer follows.

1. Read `engagement_id`, `proposal_id` unlocked; not found → RAISE `invoice_not_found`.
2. Lock the engagement. `stage IN ('lost','closed')` → RAISE `engagement_terminal`.
3. `stage NOT IN ('launch','care')` → RAISE `invoice_not_billable_yet` (decision 1).
4. `proposal_id IS NULL` → RAISE `invoice_not_billable_yet`. Otherwise lock the proposal;
   `status <> 'accepted'` → RAISE `proposal_not_accepted`.
5. Lock the invoice, then return a **truthful verdict per status** — rev 1 returned `already_sent` for
   every non-draft, which lies about three of them (finding 8):

   | Invoice status | Verdict |
   |---|---|
   | `draft` | proceed |
   | `sent` | `{applied:false, reason:'already_sent'}` |
   | `paid` / `refunded` | `{applied:false, reason:'already_paid'}` |
   | `void` | `{applied:false, reason:'voided'}` |

6. `recipient_email IS NULL` → RAISE `invoice_recipient_required`.
7. `UPDATE … SET status='sent', sent_at=now(), updated_at=now()`.
8. Event `invoice_issued`, actor `admin`, `needs_attention=false`, summary
   `Balance requested: $437.50 (50% of $875.00) — v1` built with `engagement_format_minor`; data
   `{invoice_id, kind, amount, currency, pct}`, **no `emailed` key**.
9. `RETURN {applied:true, invoice_id, amount, currency}`.

`tg_engagement_invoices_guard` already permits `draft → sent` and already freezes identity — no guard
change.

### `tg_engagements_stage_sync` — 075's body verbatim, one predicate changed

```sql
-- 077: `lost` means the deal died — void draft AND sent, unchanged from 075.
-- `closed` means the work finished: void NOTHING. Those invoices are already
-- inert (begin_engagement_invoice_checkout refuses while the stage is
-- terminal), so voiding bought no safety and made closing unrecoverable — a
-- sent balance could never be re-sent, and a spared draft made re-issuing the
-- deposit crash on uq_engagement_invoices_one_live.
IF NEW.stage = 'lost' THEN
  … 075's PERFORM proposal-lock + voiding loop, verbatim …
END IF;
```

The proposal-locking `PERFORM` moves inside the same `lost` branch. Everything else in the function — the
lead mirror, `stage_changed`, the questionnaire revoke, 074's proposal-withdrawal loop, the attention
sweep — is copied **verbatim** and still runs for both terminal stages.

### One-time repair — rows a `closed` sweep already voided

Between 075 landing (2026-09-06) and 077, closing an engagement voided its unpaid invoices. Expected to
match **zero rows**, but that must be verified, not assumed.

**(rev 3 — hardened.)** Matching the void reason and an accepted proposal is not sufficient. Two
sequences reachable under 075 make a naive restore wrong, and the first one **fails the migration**:

- **The slot was re-taken.** issue → close (voids both) → reopen → *Request deposit* again. The re-issue
  found no live deposit and inserted a fresh deposit + balance. Restoring the originals puts two
  `voided_at IS NULL` rows in one `(proposal_id, kind)` slot → **23505 on
  `uq_engagement_invoices_one_live`**, i.e. a failed migration, not a bad row.
- **The deal later died.** close → *then* `lost`. `stage` has only a value CHECK, no transition allowlist
  (`067:144`), and the second sweep finds nothing in `draft|sent` to void, so the rows keep the older
  reason `'Engagement marked closed'`. A naive restore revives money owed on a lost deal.
- **Two candidates contest one slot** *(added during execution — the adversarial review found this, and it
  was a hole in the finding-1 fix itself).* close → reopen → reissue → close again. Both voided rows now
  sit in the same `(proposal_id, kind)` slot and **neither sees a live row**, so a live-row test alone
  reads both as unambiguous and a single UPDATE un-voids the pair — **the same 23505, reached without any
  live row being involved.** The preflight therefore also flags `slot_contested`: a slot holding more than
  one candidate cannot be resolved without knowing which row Ryan meant.

So the repair **preflights, restores only unambiguous candidates, and refuses to guess** — an ambiguous
row aborts the migration before any write, for reconciliation by hand.

```sql
DO $$
DECLARE
  v_row       record;
  v_restored  int;
  v_ambiguous int;
BEGIN
  -- A CANDIDATE is a row a `closed` sweep voided on a still-accepted proposal.
  -- It is UNAMBIGUOUS only when its live slot is still free and its engagement
  -- has not since gone `lost` (see the two sequences above).
  CREATE TEMP TABLE _077_candidates ON COMMIT DROP AS
  SELECT i.id,
         i.kind,
         i.sent_at,
         e.stage,
         EXISTS (SELECT 1 FROM public.engagement_invoices o
                  WHERE o.proposal_id = i.proposal_id
                    AND o.kind        = i.kind
                    AND o.voided_at IS NULL)          AS slot_taken,
         (e.stage = 'lost')                           AS deal_lost
    FROM public.engagement_invoices  i
    JOIN public.engagement_proposals p ON p.id = i.proposal_id
    JOIN public.engagements          e ON e.id = i.engagement_id
   WHERE p.status      = 'accepted'
     AND i.status      = 'void'
     AND i.void_reason = 'Engagement marked closed';

  -- Preflight: name every candidate before touching anything.
  FOR v_row IN SELECT * FROM _077_candidates ORDER BY id LOOP
    RAISE NOTICE '077 candidate % (kind=%, stage=%, slot_taken=%, deal_lost=%)',
                 v_row.id, v_row.kind, v_row.stage, v_row.slot_taken, v_row.deal_lost;
  END LOOP;

  SELECT count(*) INTO v_ambiguous FROM _077_candidates WHERE slot_taken OR deal_lost;
  IF v_ambiguous > 0 THEN
    -- Abort the whole migration. Nothing has been written yet, and guessing
    -- here either crashes on the unique index or revives a dead deal.
    RAISE EXCEPTION
      '077 repair: % ambiguous candidate(s) — reconcile by hand, then re-run. See the NOTICEs above.',
      v_ambiguous;
  END IF;

  -- The guard has no void -> draft/sent transition (correctly — this is a
  -- migration-time repair, not something the app may ever do), so it is
  -- disabled for exactly this statement, inside the migration transaction.
  ALTER TABLE public.engagement_invoices DISABLE TRIGGER trg_engagement_invoices_guard;

  WITH repaired AS (
    UPDATE public.engagement_invoices i
       SET status      = CASE WHEN i.sent_at IS NULL THEN 'draft' ELSE 'sent' END,
           voided_at   = NULL,
           void_reason = NULL,
           updated_at  = now()
      FROM _077_candidates c
     WHERE c.id = i.id
     RETURNING 1)
  SELECT count(*) INTO v_restored FROM repaired;

  ALTER TABLE public.engagement_invoices ENABLE TRIGGER trg_engagement_invoices_guard;
  RAISE NOTICE '077 repair: restored % invoice(s) voided by a closed sweep', v_restored;
END $$;
```

Deliberately narrow: only `void_reason = 'Engagement marked closed'` (never `lost`, never an acceptance
void, whose reason is `'Acceptance voided: …'` — `075:991`), only where the proposal is still `accepted`,
and only where the slot is free and the deal is alive. **Read the NOTICEs** — a non-zero restore count
means an engagement was closed with money outstanding and is worth a look; an EXCEPTION means the
migration wrote nothing and needs a human.

### What does NOT change

Every other 075 RPC, `tg_engagement_invoices_guard`, all four indexes, `engagement_list`, and the entire
`lib/stripe/*` webhook path. `void_engagement_proposal_acceptance` already refuses while **any** invoice
on the proposal is `paid`, so a paid balance blocks it today.

## The shared selector — `lib/studio/engagement/invoice-selection.ts` (new)

Findings 2 and 3. One module, used by the proposal page **and** the pay route, so they cannot disagree.

```ts
/**
 * The invoice the client may pay right now, or null.
 *
 * Ordering is `sent_at, deposit-first, id` — NOT created_at.
 * issue_engagement_deposit inserts the deposit and the balance in ONE
 * transaction, so now() and therefore created_at are IDENTICAL on both rows;
 * ordering by it is non-deterministic and the page and the route could pick
 * different invoices. sent_at is genuinely ordered (the deposit is `sent` at
 * issue, the balance only at send) and the two remaining keys make it total.
 */
export async function selectPayableInvoice(
  db: SupabaseClient, proposalId: string,
): Promise<EngagementInvoice | null>;

/** The live deposit row, for the "deposit already received" framing. */
export async function selectDepositInvoice(
  db: SupabaseClient, proposalId: string,
): Promise<EngagementInvoice | null>;

/** The newest live invoice in a terminal money state, for the closing bands. */
export async function selectLatestSettledInvoice(
  db: SupabaseClient, proposalId: string,
): Promise<EngagementInvoice | null>;
```

Three reads, not one (finding 4): the payable row drives the button, the deposit row drives the "already
received" sentence, and the settled row drives the paid/refunded bands when nothing is payable. Rev 1's
"newest paid" was wrong twice — it could not describe a refund, and with tied timestamps it was not
necessarily the deposit.

**Plus one pure function, so the precedence is testable (rev 3).** The band precedence is six new states
on top of 4A's five, and it currently lives inside an `async` server component that no unit test can
reach. The module therefore also exports

```ts
/** Which band the client sees, from rows already fetched. Pure — no I/O. */
export function selectBandState(input: {
  payable: EngagementInvoice | null;
  deposit: EngagementInvoice | null;
  settled: EngagementInvoice | null;
  paidParam: string | null;   // `?paid=<id>`, or the legacy `'1'`
}): BandState;
```

`page.tsx` does the three reads and renders whatever `selectBandState` returns, so every state — including
the legacy `?paid=1` and the "settles in full" gate — is pinned by a fast unit test instead of by a
browser pass this machine cannot perform.

## Surfaces

### Admin — `/admin/studio/engagements/<id>` (EN only)

`ProposalDepositBlock.tsx` → **`ProposalInvoicesBlock.tsx`**. The `<dl>` gains a Balance cell:

| Balance state | Cell | Buttons |
|---|---|---|
| none (100% deposit) | not rendered | — |
| `draft`, before `launch` | `$437.50 — not billed yet` | **Send balance** disabled, *"Billable once the engagement reaches Launch"* |
| `draft`, engagement `closed`/`lost` | `$437.50 — not billed (engagement closed)` — a fact, not a to-do (judgment call 2) | none; the RPC refuses on a terminal stage |
| `draft`, at `launch`/`care` | `$437.50 — not billed yet` | **Send balance** |
| `sent` | `$437.50 billed Sep 20 · not paid` (+ `checkout opened 2×`); `Balance email sent Sep 20` or **`Balance email not sent — resend below`** (coral) | **Resend balance email** |
| `sent`, engagement `closed`/`lost` (rev 3) | as `sent` | **none** — see below |
| `sent` + `awaiting_async_payment_at` | `… · payment started, awaiting confirmation` | as `sent` |
| `paid` | `$437.50 paid Sep 22 ✓` | — |
| `refunded` | `$200.00 of $437.50 refunded Sep 25 (partial)` in coral | — |

**Resend is suppressed on a terminal engagement (rev 3).** `sent` + `closed` is a state 075 could never
produce — the sweep voided it — and decision 2 now creates it deliberately. Resending there would email a
client a fresh link to pay an invoice `begin_engagement_invoice_checkout` will refuse. So **both** resend
buttons (deposit and balance) are hidden while `stage IN ('lost','closed')`, with the cell explaining why.
The block already receives `engagement`, so this costs one predicate and no new read.

**The two alert strips become per-invoice (finding 5).** `ProposalDepositBlock.tsx:113` and `:122`
currently filter `invoice_id === deposit?.id`, so a duplicate or failed payment on a balance is invisible
— money you would never be told about. Both now match **any live invoice on the proposal** and name it:
*"A second payment landed on the **balance** — refund pi_… in Stripe"*.

### Client — the accepted band on `/proposal/<id>` (EN/JA, **JA flagged for native review**)

Driven by the three selectors. Precedence: a payable invoice wins; otherwise the latest settled one;
otherwise the plain accepted band.

| Situation | Band | Button |
|---|---|---|
| deposit payable | 4A's wording, unchanged | Pay |
| balance payable, deposit `paid` | *"Deposit of $437.50 received on {date}. The balance of $437.50 is now due."* | Pay |
| balance payable, deposit **not** paid | the plain payable body — **never claims a deposit was received** | Pay |
| payable + `awaiting_async_payment_at` | 4A's pending body, per kind | none |
| `?paid=<id>` matches the payable row | 4A's thanks body, per kind | none |
| legacy `?paid=1` with a payable row (rev 3) | the same thanks body — a pre-deploy Stripe session still returns here | none |
| nothing payable, latest settled is the **balance** `paid`, deposit also `paid` | *"The balance of $437.50 was received on {date}. Thank you — that settles the project in full."* | none |
| nothing payable, latest settled is the **balance** `paid`, deposit **not** `paid` (rev 3) | *"The balance of $437.50 was received on {date}. Thank you."* — **never claims full settlement** | none |
| nothing payable, latest settled is the **deposit** `paid` | 4A's `depositPaidBand`, unchanged | none |
| latest settled `refunded` | the refunded band, per kind, with **both** the refunded and the original amount | none |

New copy keys (EN + JA): `balanceDueBand`, `balanceDueAfterDepositBand`, `balancePendingBand`,
`balanceThanksBand`, `balancePaidBand`, `balancePaidInFullBand`, `balanceRefundedBand`, plus the per-kind
button label `balanceButton`.

**Two corrections to 4A the refunded row depends on (rev 3, finding 5).** Rev 2 rejected splitting
partial from full refunded on the grounds that "4A's deposit band already carries both in one sentence
with the amounts". It does not: `depositRefundedBand` takes a single amount (`copy.ts:38-39`) and the page
passes `deposit.amount`, the **original** (`page.tsx:160`) — so a partial refund currently tells the
client the whole deposit came back. The admin cell gets this right (`ProposalDepositBlock.tsx:51-54`); the
client band never did.

The split stays rejected — the fix is to make the one sentence true, not to add a second band. Both bands
(deposit and balance) now receive `amount_refunded` **and** `amount` and read *"$200.00 of $437.50 was
refunded on {date}"*, collapsing to the full-refund wording when they are equal. Consistency across kinds
is preserved, which was the actual reason for the rejection.

Second: **"settles the project in full" must be earned.** A refunded deposit followed by a paid balance
would otherwise announce full settlement while only half the money is held. The claim is therefore gated
on the deposit being `paid` as well; otherwise the band stops at "received". `selectLatestSettledInvoice`
alone cannot establish settlement, and the page already reads the deposit for the "already received"
sentence, so this costs nothing.

`ProposalDepositButton.tsx` → **`ProposalPayButton.tsx`**, now taking an `invoiceId` prop and POSTing it.
It gains one outcome: **409 `stale_invoice`** → *"This page is out of date — reload it to see what's
due."*

**The label must follow the kind (rev 3).** `depositButton` is the literal string `'Pay the deposit →'`
(`copy.ts:27`), so without this the balance band ships a button telling the client to pay a deposit. The
button takes a `kind` and picks `depositButton` or the new `balanceButton` (*"Pay the balance →"* /
*"残金のお支払いに進む →"*); a test pins the visible label for both kinds.

### The pay route — path unchanged at `app/api/engagement/proposal/[id]/deposit/`

**Deliberately NOT renamed** (finding 7 / judgment call 4). A header comment states that it mints for any
payable invoice and why the path still says `deposit`.

The body gains `invoice_id`. The route no longer chooses:

1. Validate `invoice_id`. **Absent → 409 `stale_invoice`; present but not a UUID → 400** (rev 3,
   finding 7). The split is the whole of the deployment shim: the already-deployed button sends no
   `invoice_id` and maps an unrecognised status to *"Payments are temporarily unavailable"*
   (`ProposalDepositButton.tsx:56-70`), which is false — that tab is stale, not broken. It **does**
   map 409 to `depositNotOpen` ("no longer open… reply to the email you received"), which is true and
   actionable, so an old tab gets a real answer with zero change to already-shipped client code. A
   malformed id keeps its 400: only a broken or hostile client sends one. The server still never
   selects an invoice on the client's behalf — decision 3 is intact, because "absent" is answered with
   a refusal, not a guess.
2. `selectPayableInvoice(supabase, proposal.id)` — the same call the page made.
3. **If it is null, or its id ≠ the posted id → 409 `stale_invoice`.** This is the whole of finding 3:
   the client is charged only for the invoice it displayed. It also covers a UUID from another proposal,
   since the selector is scoped to this one.
4. Everything else — rate limit, `Sec-Fetch-Site`, honeypot, cookie auth,
   `begin_engagement_invoice_checkout`, the idempotency key, the `idempotency_error` → rearm →
   retry-once path, the 403/404/409/502 mapping, `no-store` — **unchanged**.

`success_url` becomes `…?paid=<invoiceId>` so the thank-you band binds to the invoice actually paid
instead of swallowing the next one.

**Where that lives, and the rollout window it opens (rev 3).** The URL is built in
`lib/stripe/engagement-invoice.ts:113`, not in the route — so that file and its test (which assert
`?paid=1` at `:89`, `:94`, `:105`) are **Modified**, and the "never touched `lib/stripe/*`" line is
narrowed to exclude exactly this one string. Changing it also changes the Checkout params under an
**unchanged** idempotency key (`invoice:attempt`), so an invoice that already has a live pre-deploy
session and is clicked again after the deploy raises `idempotency_error`; `route.ts:171-197` answers that
by re-arming and minting a **second** session without expiring the first.

That window is **accepted and documented, not engineered away.** Re-arm-mints-a-second-session predates
this plan (075 judgment call 5 accepted the residual double-pay window), and a second payment is already
detected by `mark_engagement_invoice_paid`, flagged `invoice_duplicate_payment` with `needs_attention`,
and — via finding 5 — now visible on the panel for a **balance** as well as a deposit. Two cheap
mitigations ship instead of a session-expiry mechanism:

- the page keeps accepting the **legacy `?paid=1`** (treating it as "the payable invoice was just paid",
   4A's exact behaviour), so a pre-deploy session that completes after the deploy still lands on a correct
  band rather than a stale one;
- the ship report tells Ryan to check for a live Checkout session before deploying — realistically zero
  or one row.

### Emails and the send action

`sendDepositRequestEmail` → **`sendInvoiceRequestEmail`** with `variant: 'deposit' | 'balance'`. Shared:
the tokened entry URL, the expiry line, the Stripe-secure line, the sign-off, `escapeHtml` throughout.
The balance variant names the deposit **only when the deposit's status is `paid`** — the plan permits
sending a balance before the deposit is paid, so the copy must not assume otherwise. **(rev 3:)** the
condition is the *status*, not a non-null `depositPaidAt` as rev 2 had it — the guard freezes `paid_at`
once set and permits `paid → refunded`, so a **refunded** deposit still carries a `paid_at` and would
have been described to the client as received.

**`sendBalanceInvoice(invoiceId)` — the failure contract (finding 6).** Four operations, three failure
boundaries. The invoice is `sent` the moment the RPC commits; nothing after that may tell Ryan it isn't:

| Fails at | State | What the action returns |
|---|---|---|
| the RPC | nothing changed | throws the translated error |
| **a post-commit read** (invoice / proposal / engagement) — rev 3 | **`sent`**, no email attempted | `{ sent: true, emailed: false, reason: 'lookup_failed' }` + a `notification_failed` event — never a throw |
| the rotation | **`sent`**, old token | `{ sent: true, emailed: false, reason: 'link_rotation_failed' }` + a `notification_failed` event → the panel shows *"Balance billed — the email did not go out. Resend below."* |
| the email | **`sent`**, token rotated | same shape, `reason: 'email_failed'` |
| the `invoice_email_sent_at` stamp | `sent`, emailed | logged only — the email did go out |

Rev 1 would have thrown after a committed RPC, telling Ryan it failed while the invoice was live.

**The post-commit reads were the hole (rev 3, finding 6).** `issueDeposit` performs three *throwing*
reads after its RPC commits (`invoice-actions.ts:173-175`) — precisely the failure this table exists to
prevent, simply not listed. The balance path routes them through the same contract: the issuance result
is captured from the RPC's own return and survives every later failure.

**A failed resend must not leave a truthful-looking stamp (rev 3).** `invoice_email_sent_at` is only ever
set, never cleared (`invoice-actions.ts:129-133`), so *email sent → resend rotates the token → resend
fails* leaves the panel reporting a successful delivery whose link is now dead. So a resend that
**rotated the token and then failed to deliver clears the stamp**, handing the panel's existing coral
*"Balance email not sent — resend below"* branch the truth. A resend whose **rotation** failed leaves the
stamp alone: the old token still works, so the earlier email is still valid. The stamp therefore means
"the current link has been delivered", not "an email once went out".

**The rotation CAS is fixed — this repairs a live 4A defect.** `rotateProposalToken` currently CASes on
`.eq('status', p.status)` alone (`proposal-internals.ts:126-127`), so two rotations that read the same
row both succeed and the first email ships a token that is already dead. It gains a CAS on the previous
hash: `.eq('access_token_hash', p.access_token_hash)` when one exists, `.is('access_token_hash', null)`
when the proposal was accepted manually. The loser gets *"The link changed underneath you — reload and
resend."*

**What that CAS does and does not buy (rev 3).** It closes the *simultaneous-read* window: two rotations
built from the same observed hash can no longer both commit. It does **not** serialize rotation-plus-send
as one operation — with staggered reads (A rotates H0→H1 and stalls, B reads H1 and rotates to H2, A then
sends its H1 link) both CAS operations legitimately succeed and A's email carries a dead token. That
residual is **accepted, not fixed**, because it is already this system's stated semantics: every issue and
every resend rotates on purpose (`invoice-actions.ts:17-18`), only the newest link ever works, and the
client copy already says so in both locales (`depositForbidden`, `forbiddenBody`). A durable lease across
rotate-and-send would be real machinery to serialize an operator clicking Resend in two tabs; the honest
guarantee is the narrow one, and the tests pin the narrow one.

## Explicitly not this unit

| Not building | Attach point |
|---|---|
| **Care billing** | `kind = 'care_month'` is in the CHECK, `stripe_subscription_id` unused. `send_engagement_invoice` is generic. |
| **A payments list on the client page** | Decision 3 — one payable at a time. |
| **Partial or custom balance amounts** | The split is fixed at issue; `amount` is immutable by guard. A change order is a new proposal. |
| **Reminders / dunning** | No cron, no chase emails. |
| **Renaming the pay route** | Finding 7. The path stays `/deposit`; only the components are renamed. |
| **Separate partial/full refunded bands** | Finding 4, declined for 4A parity. |
| **Un-voiding invoices from the app** | The 077 repair is one-time and migration-time. The guard still has no `void → draft` transition, and should not. |

## Build order — one slice

- [ ] **1 · Migration + RLS suite (schema-first).** `077_studio_balance_invoice.sql` (the RPC, the sweep
  amendment, the repair) + the `engagement_invoices_rls.test.ts` additions below. `pnpm test:rls` green
  (022/025 survey migrations temp-renamed, then restored).
- [ ] **2 · The shared selector + its test.** `invoice-selection.ts` — written first because the page,
  the route and their tests all depend on it. Test the **tied-`created_at` fixture explicitly**.
- [ ] **3 · Email + actions.** `emails.ts` rename + `variant` + the conditional deposit line;
  `invoice-actions.ts` `sendBalanceInvoice` / `resendInvoiceEmail` with the failure contract;
  `proposal-internals.ts` the rotation CAS fix + `invoice_not_billable_yet` / `invoice_not_found` in
  `translateDbError`. (`already_sent`, `already_paid` and `voided` are verdicts, not DB errors — the
  action maps them, the way `voidProposalAcceptance` maps `invoice_paid`.)
- [ ] **4 · Admin UI.** `ProposalInvoicesBlock.tsx` + the Balance cell + the per-invoice strips; the
  import in `EngagementProposalPanel.tsx`.
- [ ] **5 · Client band + route.** `copy.ts` keys (EN + JA); `ProposalPayButton.tsx` with `invoiceId`;
  the page's three selectors and band precedence; the route's `invoice_id` + `stale_invoice` +
  `?paid=<id>`.
- [ ] **6 · Gate → review → commit → push.** Ryan applies 077 on prod **before** the push deploys, and
  reads the repair NOTICE.

## Gates

`pnpm verify` + `pnpm test:rls`. The tree carries a pre-existing unrelated red —
`lib/progress/{actions,queries}.test.ts`, 28 failures (9 + 19). **The rule Ryan set for slices 2–4
applies: every test file this unit adds or modifies is green, the full suite shows only those 28, they
are listed by file in the ship report, and Ryan says "continue" before the commit.**

From slice 4's execution: a killed dev server leaves a stale `.next` lock that fails the next build with
"Another next build process is already running" — `rm -rf .next` clears it. Never pipe `pnpm build`
through `tail`; it masks the exit code.

## Verification

### RLS suite — additions to `supabase/tests/engagement_invoices_rls.test.ts`

- **Send gates:** at `build` → `invoice_not_billable_yet`; at `launch` → `applied:true`, row `sent`, one
  `invoice_issued` whose summary starts `Balance requested:` and whose data has no `emailed` key; at
  `care` → allowed; on `lost`/`closed` → `engagement_terminal`; voided proposal → `proposal_not_accepted`;
  unknown id → `invoice_not_found`; service-role-only grant.
- **Truthful verdicts (finding 8):** second send → `already_sent`; on a `paid` row → `already_paid`; on a
  `refunded` row → `already_paid`; on a `void` row → `voided`. Four distinct assertions, not one.
- **The amended sweep, both branches:** with a `sent` deposit and a `draft` balance → **`closed` voids
  NEITHER** (zero `invoice_voided` events); → **`lost` voids both** (two events). Then the two recovery
  sequences the review named:
  - paid deposit + **sent** balance → close → reopen at `launch` → the balance is still `sent` and
    `begin_engagement_invoice_checkout` succeeds;
  - **unpaid** deposit + draft balance → close → reopen → `issue_engagement_deposit` refuses cleanly with
    `invoice_already_issued` (the live deposit was never voided), **and no 23505**. This is the crash
    rev 1 would have shipped.
- **The repair block (rev 3 — the ambiguity cases are the point):** hand-construct a `void` balance with
  `void_reason = 'Engagement marked closed'` on an accepted proposal, run the repair, assert it returns
  to `draft`; the same for a row with `sent_at` set, asserting it returns to **`sent`** (both branches of
  the CASE, not just one). Assert a row voided with `'Engagement marked lost'` and one voided by an
  acceptance void (`'Acceptance voided: …'`) are **untouched**. Then the two sequences that make a naive
  restore wrong: **slot re-taken** — void by close, then insert a live replacement of the same
  `(proposal_id, kind)`, and assert the repair **RAISEs and writes nothing** (not a 23505); and **deal
  later lost** — void by close, move the stage to `lost`, and assert the same. Finally assert the guard
  is **re-enabled** afterwards by attempting a forbidden `void → sent` through the app path.
- **Paid balance blocks the void (finding 8):** the fixture must have the **balance as the only `paid`
  invoice** — deposit `sent` or voided, balance `paid`. Rev 1's fixture had both paid, so it would have
  passed against an implementation that only ever checked deposits.
- **Concurrency, two-connection `withPg` (finding 8), not sequential double-clicks:** send-vs-close,
  send-vs-void, and two simultaneous sends of the same invoice → exactly one `applied:true`, one event,
  no deadlock.
- **Hygiene:** re-run the 64-hex / `checkout.stripe.com` scan after the balance is sent and paid.

### Unit tests (`app` project)

| File | Pins |
|---|---|
| `lib/studio/engagement/invoice-selection.test.ts` (new) | **The tied-`created_at` fixture: deposit and balance with byte-identical `created_at`, both `sent` → the deposit is returned, deterministically, across repeated calls.** Then: only a balance `sent` → the balance; nothing `sent` → null; a voided row is never returned; `selectDepositInvoice` ignores kind `balance`; `selectLatestSettledInvoice` returns a `refunded` row (which "newest paid" could not). |
| `app/api/engagement/proposal/[id]/deposit/route.test.ts` | All 13 existing assertions still pass. **Plus: posting the deposit's id while the balance is the payable row → 409 `stale_invoice`, and Stripe is never called** (the two-tab regression); posting a valid id mints for exactly that invoice; a UUID from another proposal → 409 `stale_invoice`; **a missing `invoice_id` → 409 `stale_invoice`** (rev 3 — the old-tab shim, NOT a 400) and a **malformed** one → 400. |
| `components/proposal/ProposalPayButton.test.tsx` | Existing assertions; POSTs the `invoiceId` prop; 409 `stale_invoice` → the reload message; **the visible label follows `kind`** — "Pay the deposit →" vs "Pay the balance →" (rev 3). |
| `lib/stripe/engagement-invoice.test.ts` (rev 3) | The three `?paid=1` assertions become `?paid=<invoiceId>` in both locales and on the origin fallback; **every other param — line items, metadata, locale, `cancel_url`, the idempotency key — is asserted unchanged**, since they are what the untouched webhook path reads. |
| `components/admin/ProposalInvoicesBlock.test.tsx` (new) | The Balance cell's eight states — including **`draft` on a `closed` engagement reading "not billed (engagement closed)", not "not billed yet"** (judgment call 2); Send balance disabled before `launch`, enabled at `launch`/`care`, absent when terminal; no Balance cell at 100%; **a duplicate-payment event on the BALANCE renders the strip and names the balance** (finding 5); the same for a failed payment. |
| `lib/studio/engagement/emails.test.ts` (new) | Subject and heading differ per variant; the CTA is the **entry URL, never a Stripe URL**; **the balance variant omits the "deposit received" sentence when the deposit is not `paid`** — including the rev 3 case of a **`refunded` deposit that still carries `paid_at`**. |
| `lib/studio/engagement/invoice-actions.test.ts` (new, rev 3 — finding 6) | The failure contract, one test per boundary: a post-commit read failure, a rotation failure, a provider failure and a stamp failure each return `{ sent: true, emailed: false }` with the right `reason` and **never throw** once the RPC has committed; a resend that rotated then failed **clears `invoice_email_sent_at`**, while one whose rotation failed **leaves it set**. |
| `lib/studio/engagement/proposal-internals.test.ts` (rev 3 — finding 2) | Two rotations built from the **same observed hash**: exactly one commits, the loser gets the reload message. The staggered case is documented, not asserted — it is accepted behaviour, and a test asserting it would pin a guarantee this plan does not make. |
| `components/proposal/copy.test.ts` (rev 3 — finding 5) | The refunded band names **both** the refunded and the original amount and reads as a partial when they differ; `balancePaidInFullBand` is used only when the deposit is also `paid`; both locales have every new key. |

### Browser smoke — local stack only

Slice 4's recipe (local Supabase, Stripe **test** mode, `RESEND_API_KEY` blanked, fixture admin). **There
is no browser automation on this machine.** SSR'd pages are verified over HTTP with the session cookie;
that cannot exercise the client button, real browser navigation, or the two-tab case (finding 8). Those
three are covered by the unit tests above, and the ship report must **say so explicitly rather than
implying a browser pass**.

> **EXECUTION RECORD, 2026-09-07 — NEITHER THE RLS SUITE NOR THE SMOKE COULD RUN.** Both need the local
> Supabase stack, which needs Docker, and Docker Desktop's privileged `com.docker.service` is **Stopped**
> on this machine; starting it requires elevation that a non-interactive session cannot obtain
> (`Cannot open com.docker.service service on computer '.'`). No local Postgres exists either (`psql`,
> `pg_ctl`, `initdb` all absent), so **migration 077 has never been executed and its SQL has never been
> parsed by a Postgres** — it was reviewed statically only. The steps below and the whole RLS section
> above are therefore **OWED, not done**. Ryan: start Docker Desktop (accept the UAC prompt), then
> `pnpm test:rls` with the duplicate 022/025 survey migrations temp-renamed and restored after. Treat a
> green RLS run as a gate on the *prod migration*, not merely on the merge.

1. Deposit issued and paid; admin shows `Balance … not billed yet` with **Send balance disabled**.
2. Move to `launch`; Send balance → cell reads `billed <today> · not paid`; a second `Invoice issued`
   whose summary starts `Balance requested:`; the proposal's `access_token_hash` changed.
3. Client from the fresh entry link: *"Deposit of $437.50 received … The balance of $437.50 is now due."*
   Mint → the Stripe session shows **$437.50** and `Balance — <business> (50%)`; a second click returns
   the **same** session id; `success_url` carries `?paid=<balance invoice id>`.
4. Signed `checkout.session.completed` → balance `paid`, band reads *"…settles the project in full"*,
   admin shows both rows paid, stage and `won_at` unchanged.
5. **Both recovery sequences over HTTP:** close an engagement with a `sent` balance → nothing voided →
   reopen → still payable. Close one with an unpaid deposit + draft balance → reopen → Request deposit
   refuses cleanly with `invoice_already_issued`, **no 23505**.
6. `/ja` with the JPY proposal: `¥66,000` in the balance band and on Checkout, no decimals.
7. **Read the 077 repair NOTICE** on prod and report the count.

## Judgment calls worth a second look

1. **`care` is billable, not just `launch`.** Reversal: one value in the RPC's stage test.
2. **`closed` voids nothing, and the CELL SAYS SO (settled 2026-09-06).** Keeping the row is not
   negotiable — rev 1 proved that voiding on close is what creates the trap. But the complaint about it
   was never about the data, it was about the word *"yet"*: `Balance … not billed yet` on a
   two-years-closed engagement reads like an open task. So the fix is in the presentation, not the
   schema: **on a `closed` engagement the Balance cell reads `$437.50 — not billed (engagement closed)`**,
   which is a statement of fact rather than a nag, and the Send balance button is already hidden there
   (the RPC refuses on a terminal stage). One conditional in `ProposalInvoicesBlock`. Recoverability is
   kept, the false to-do is gone, and reopening restores the normal wording because the stage drives it.
3. **Reusing `invoice_issued`.** The timeline reads `Invoice issued` twice, distinguished by summary. A
   `balance_sent` kind costs one CHECK entry plus a constraint swap.
4. **The route keeps the `/deposit` path while the components are renamed (settled 2026-09-06).**
   Deliberate asymmetry, and the one place this plan tolerates a name that undersells what the code does.
   A third option was considered and rejected: rename to `/pay` and leave a `/deposit` **tombstone** that
   always returns 409 `stale_invoice`. It is tempting — an old tab genuinely IS stale, so "reload" is the
   honest answer, and unlike a shim it never guesses an invoice. It was rejected on the realistic failure
   mode: a tombstone carries a removal chore, removal chores do not get done, and two routes where one
   belongs is *more* confusing to the next reader than one honestly-commented route. The header comment
   is cheaper and permanent.
   **When the rename becomes cheap (rev 3, reworded):** rev 2 said a later page-shape change "already
   forces every open client page to reload". It does not — a deployed tab keeps running its old
   JavaScript until someone reloads it, and nothing on the server can make it. What a new **token
   scheme** does do is invalidate every old tab's credential, so those tabs are already dead and the
   rename breaks nothing that still worked. That is the moment to take it. Until then the shim in step 1
   is what serves old tabs, and it is one branch.
5. **The repair disables a trigger for one statement.** Narrow, inside the migration transaction, and it
   reports its count. The alternative (adding a `void → draft` transition to the guard) would leave a
   permanent hole in the state machine to serve a one-time fix.
6. **No reminder when a `sent` balance goes unpaid.** Same call 4A made for the deposit.

## Files — the complete list

**New**
- `supabase/migrations/077_studio_balance_invoice.sql`
- `lib/studio/engagement/invoice-selection.ts` (+ `.test.ts`)
- `components/admin/ProposalInvoicesBlock.test.tsx`
- `lib/studio/engagement/emails.test.ts`

**Renamed** (git mv, then edit)
- `components/admin/ProposalDepositBlock.tsx` → `components/admin/ProposalInvoicesBlock.tsx`
- `components/proposal/ProposalDepositButton.tsx` → `components/proposal/ProposalPayButton.tsx`
  (+ `.test.tsx`)

**Modified**
- `supabase/tests/engagement_invoices_rls.test.ts`
- `lib/studio/engagement/emails.ts`, `invoice-actions.ts`, `proposal-internals.ts` (**the rotation CAS
  fix here also repairs 4A's `resendProposalLink`**)
- `components/admin/EngagementProposalPanel.tsx` (import + prop name)
- `components/proposal/copy.ts` (six balance keys, EN + JA)
- `app/[locale]/proposal/[id]/page.tsx` (three selectors, band precedence, `?paid=<id>`)
- `app/api/engagement/proposal/[id]/deposit/route.ts` (+ `route.test.ts`) — **path unchanged**
- `lib/stripe/engagement-invoice.ts` (+ `.test.ts`) — **rev 3, `success_url` only.** Rev 2 listed this
  under "never touched" while also requiring `?paid=<invoiceId>`; the URL is built at `:113` and pinned
  by three tests, so the contradiction is resolved in favour of naming the file.

**Never touched:** every 075 RPC except the amended sweep; `lib/stripe/*` **except the one `success_url`
string above** — in particular the entire webhook path, `buildEngagementInvoiceSessionParams`'s line
items, metadata and idempotency key, and `lib/stripe/client.ts` (API version and SDK pinned); the
`payments` table; `engagement_list`; slice 4B's deliverables; `lib/progress/`; migrations 065/068–073/076.
