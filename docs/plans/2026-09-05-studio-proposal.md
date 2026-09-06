# Studio Proposal — slice 3 of the engagement spine

> **STATUS: rev 2 APPROVED — SLICE A SHIPPED 2026-09-06 (`612e1e9`); SLICE B SHIPPED 2026-09-06 (`fb6cf45`, pushed).** Migration 074 applied on prod by Ryan BEFORE the slice-A push; slice
> B carries no migration. Slices 1 (`22e2c59`) and 2 (`dc89408`) are shipped and live; migration 067 is on prod.
>
> **Slice B verification record (2026-09-06, local stack):**
> - [x] `pnpm type-check` clean · `pnpm test:run` 1612 passed / 28 failed — the 28 are ONLY the pre-existing
>   unrelated `lib/progress/{actions,queries}.test.ts` red (9 + 19) · `pnpm build` exit 0 (485 pages; the page,
>   enter, accept and client PDF routes listed) · `pnpm test:rls` engagement_proposals 45 + engagement 55 green.
> - [x] Unit files: proposal-session (8: prefix ≠ questionnaire's, A's cookie ≠ B, wrong/length-mismatched secret,
>   revoked 403, expired 410, presentedTokenHash = sha256(cookie)) · ProposalAcceptForm (8, incl. 410 link_expired
>   vs expired) · conditional-nav (+6) · vercel-analytics (+1).
> - [x] Browser smoke (bundled headless shell, local stack, 67/67): EN steps 5 (link issue, valid_until = HST today
>   + 30, email sent, `proposal_sent` with no 64-hex, admin sha), 7 (private window → `/proposal/<uuid>`, robots
>   meta, chromeless, byte-identical client PDF + filename, Viewed 1×, second open = no second event, 375 px table
>   scroll / 16 px input / 48 px Accept), 8 (revise → reload = "open from your email again", old link = "replaced"
>   403, v2 link), 9 (revoke with the form open → RPC `forbidden` + the card; resend → accept as Test Client →
>   "recorded"; build / 87500 / 6500 / won_at / lead won / `proposal_accepted` + `stage_changed`; Ryan's
>   notification stamped; stale tab → "already accepted"; admin Accepted ✓), 12 (resend on accepted says
>   "accepted"; revoke → page + PDF 403, agreement untouched). JA/JPY: create → link → `/ja/proposal/<uuid>`
>   (bare path 307s to /ja), computed Noto Sans JP, lh 1.70, ls 0.032 em, no justify, yen without decimals, JA
>   PDF byte-identical with wrapped Japanese; step 12 (valid_until yesterday via the DB → expired band, accept →
>   410 `expired`; resend → HST today + 30, old link 403, new link works; accept as テスト 太郎 → build / 132000 /
>   9800 JPY). No `plausible.io/api/event` beacon and no `/_vercel/insights` request from any client page.
>   `next start` (prod build): `no-store, max-age=0` · `no-referrer` · `noindex, nofollow` on both prefixes.
> - [x] Adversarial review: 0 Critical · 1 Important (link-expired vs proposal-expired 410 collapsed — split) ·
>   9 Minor (6 fixed; 3 rejected as the plan's explicit wording: resend reuses `proposal_sent`, the RPC's
>   `emailed: null` + failure-only second line, the "replaced" copy for withdrawn rows).
> - [ ] Owed by Ryan: prod pass sending a real proposal link to himself and accepting it; native review of the
>   JA strings in `components/proposal/copy.ts`, the entry route's `COPY`, and `sendProposalInvite` in `emails.ts`
>   (plus the slice-A list below).
>
> **Slice A verification record (2026-09-06, local stack):**
> - [x] `pnpm type-check` clean · `pnpm test:run` 1590 passed / 28 failed — the 28 are ONLY the pre-existing
>   unrelated `lib/progress/{actions,queries}.test.ts` red (Ryan's slice-2 rule) · `pnpm build` exit 0 (485
>   pages, both new API routes listed) · `pnpm test:rls` engagement_proposals 45 + engagement 55 green.
> - [x] Unit files: proposal-pricing (9) · proposal-schema (8) · proposal-markdown (6, incl. HTML/PDF parity)
>   · proposal-document (9) · format (+2) · generator C3 (9) · EngagementRow proposalLabel (+5).
> - [x] RLS suite: RLS + grants + bucket · constraint swap (28 TS kinds insert, exactly one CHECK) · hard gate
>   incl. brief_stale · uniqueness/slots incl. proposal_already_accepted · 7×7 matrix · shape CHECKs · issue
>   CAS · accept (wrong/revoked/rotated/expired hash → forbidden, two-connection revoke race, two concurrent
>   accepts) · lock-order races (accept vs revise, vs Lost, vs void) · void · terminal sweep · drafting claim +
>   finalize CAS · token hygiene · touch.
> - [x] Click path in a real browser (bundled headless shell) on the local stack, EN: steps 1–6, 8, 9 (as
>   MARK ACCEPTED), 10 (void → revise → Pro → manual issue → mark accepted: 337500 / 11500), 11; JA/JPY:
>   steps 2–4 (yen inputs, decimal yen refused, no decimals anywhere, JA AI draft with CJK and no yen amount,
>   JA PDF band/copy/wrapping) + manual issue. DB checked after every accept/void (contract_value, care_mrr,
>   stage, won_at, leads.sales_stage). 74/74 checks.
> - [x] Slice B: link delivery, the client page/routes, the chrome/analytics edits, the /proposal browser
>   smoke, click-path steps 5 (link), 7, 9 (revoke race + accept via the page), 12, 13 (link parts) — see the
>   slice B record above.
> - [ ] Owed by Ryan: prod browser pass with a real engagement; native review of the JA strings in
>   `proposal-terms.ts`, `proposal-document.ts` (doc copy + JA line labels), and the panel's JA-facing copy.
>
> **Rev 2 (2026-09-05)** — incorporates external review round 1. What changed: acceptance can now be
> **voided** (an audited correction path; rev 1 promised one that the guards made impossible); **one lock
> order** (engagement → proposal) across create / issue / accept / void / the terminal sweep; the client
> accept **re-validates the token inside the RPC** on the locked row; an explicit **issuance** step freezes
> everything the client sees — content *and* identity fields — into `issued_snapshot` and archives the exact
> PDF, shared by link delivery and manual PDF delivery; the `kind` CHECK is found through `pg_constraint.conkey`,
> not a text match on a reconstructed definition; AI drafting uses a **conditional claim + run id + input
> version** and content saves are blocked while a run is live; `rush` is an explicit offer line and the
> click-path arithmetic is corrected (US$875 / $65, not $2,850); accepted-link access is refreshable and
> revocable independently of the frozen agreement; the brief gate validates **ownership and freshness**;
> transitions are enumerated in the DB and saves carry optimistic concurrency; the price detector is stated as
> a **heuristic with human review as the control**; `valid_until` can only be extended; one markdown block
> parser gives page/PDF/preview parity by construction; the view carries open counters; the accept
> notification moves into slice A; 074 is **applied before** the slice-A deploy.
>
> Decisions in "Locked decisions" were settled with Ryan during the brainstorm and should not be
> re-litigated during execution. The calls most likely to be wrong are flagged at "Judgment calls worth a
> second look" — those are the ones to argue with on review.

## Context

The engagement spine has a `proposal` stage and nothing behind it. Today the stage is a button: Ryan
advances an engagement from `discovery` to `proposal` by hand, writes the proposal somewhere else, emails a
PDF, and clicks `Build` when the client says yes. The DB already treats that click as the win
(`won_at`, the `won` mirror on the lead), so the *moment of revenue recognition* is a manual stage change
with no record of what was sold, at what price, in which currency, or who agreed to it.

Everything the proposal needs already exists on the engagement: the submitted questionnaire (pinned
`answer_snapshot`), the brief (`exec_summary_md`, `working_md`, `not_working_md`, `opportunities_md`,
`confidence_note`, and the always-present `digest_md`), the lead's audit summary, the client contact +
locale, and `tier`. `lib/pricing.ts` is the single numeric source of truth for Starter/Pro/add-ons/rush;
`engagements` already carries `currency` / `contract_value` / `care_mrr` as integer minor units waiting for
a writer.

This unit builds the proposal: a **versioned `engagement_proposals` record** priced by Ryan from
`lib/pricing.ts`, whose narrative Claude drafts from the brief *after* the price is set, which Ryan edits,
marks ready and **issues** (freezing exactly what the client will see), which reaches the client as a
**tokenized, no-account page with the archived PDF and an explicit Accept** — or as that same archived PDF
emailed by hand — and whose acceptance is **one transaction** that writes the money onto the engagement and
moves it to `build`, letting the existing trigger recognise the win. A mistaken acceptance has an audited
**void**.

Intended outcome: from a submitted questionnaire to a signed-off, priced engagement without leaving
`/admin/studio/engagements/<id>`, with the contract value on the record the day it is agreed and the exact
document that was agreed kept forever.

## Locked decisions

Settled with Ryan 2026-09-05. Do not revisit during execution.

| # | Decision | Consequence |
|---|---|---|
| 1 | **Scope = Proposal.** Meeting processing, data handoff and deliverables are later units. | The `proposal` stage becomes real; nothing else in the skill's workflow is implemented here. |
| 2 | **One priced offer per proposal.** No client-chosen options. | `contract_value` is one number. A different tier is a *revision* (new version), not a second option on the page. |
| 3 | **Price first, then AI narrative.** | Ryan prices in a form backed by `lib/pricing.ts`; Claude drafts the narrative sections *seeing* the computed price as context and is told never to state the investment. A code heuristic catches the offer's own amounts; **Ryan's review before `ready` is the control** (see C3). |
| 4 | **Tokenized page + PDF + click-accept.** Plus an admin "Mark accepted" for a signed PDF / verbal yes. | The discovery cookie exchange is copied for `/proposal/<id>`; the archived PDF is served behind the same cookie; Accept = typed name + checkbox, recorded with time and actor. Both accept paths converge on one RPC. |
| 5 | **Real data: hard gate on a brief, soft gate on a provisional flag.** | Creating a proposal requires a `submitted` questionnaire **and** a `completed\|partial` brief *for that submission* (server-side). Ryan must declare `data_basis`: `client_records` or `provisional`. Provisional stamps the skill's "to be confirmed against your records" footnote on the document and an amber strip in admin. No CSV parser this unit. |
| 6 | **Pricing modes `fixed \| performance \| hybrid`; performance fields optional.** | `performance`/`hybrid` require the skill's checklist as structured fields (rate, what it applies to, what counts as a qualifying new customer, reporting cadence, payment timing). `contract_value` records **only the fixed portion**. |
| 7 | **Accept auto-moves to `build` and writes the money.** No client Decline button. **Rev 2: acceptance can be voided by Ryan**, with a reason, in an audited RPC. | One RPC: proposal → `accepted`, engagement `tier`/`currency`/`contract_value`/`care_mrr` set, stage → `build` if still `discovery\|proposal`, `proposal_accepted` event with `needs_attention`, Ryan emailed. Void clears the money, returns a `build` stage to `proposal`, and frees the slot for a corrected version. |
| 8 | **JPY = manual yen per line, USD shown as reference.** | `lib/pricing.ts` stays USD-only. For a JPY offer Ryan types every yen figure (base, lines, rush, adjustment) beside the computed USD; no FX constant, no conversion, no rounding rule. |
| 9 | **Re-issue = new row.** `version` increments; **one open proposal per engagement** (`draft\|ready\|sent`); revise supersedes the open one; **one `accepted` per engagement**, and **no new proposal while one is accepted** (void first). | Same idiom as briefs. Change orders / a second accepted offer are a later unit (attach point below). |
| 10 | **Issue freezes the document; after `sent` the content is immutable.** Revise = new version. | `issue_engagement_proposal` pins `issued_snapshot` (content **and** the identity fields the cover shows) and archives the exact PDF. A DB trigger enforces immutability and the allowed transitions, so "what the client saw is what was accepted" is an invariant. Fixing a typo on an issued proposal means a v2 — deliberate: the client has the old one as a PDF. |
| 11 | **One language per proposal** (`locale` copied from the engagement at creation). | Decision #4 of the spine plan, applied. JA copy (page chrome, emails, default terms) ships **flagged for native review**. Admin stays EN. |
| 12 | **Proposal validity is a date** (`valid_until`, set at issue, default +30 days), separate from the 45-day link token, and **can only be extended**. | The page refuses a client Accept after `valid_until` with "this proposal has expired — reply to Ryan"; Resend extends both; the admin path may accept late on purpose. The printed date is the live column, the one client-visible field allowed to change — and only forward. |

Next free migration number is **074** — 067 is the last committed; the working tree holds uncommitted,
unrelated 065 and 068–073. Re-check `ls supabase/migrations` and `git status` at execution time; if 074 has
been taken, take the next free number and update every reference in this plan.

## Data model — migration `074_studio_proposals.sql`

One new table, one private storage bucket, five RPCs, two new triggers, one amended trigger, one constraint
swap, one replaced view. RLS: a single `engagement_proposals_admin_all` policy (`USING (public.is_admin())
WITH CHECK (public.is_admin())`), **no anon or member policy** — the client reaches the proposal only through
a service-role route that has verified the cookie (an RLS predicate cannot see a cookie). Identical posture
to the five 067 tables.

### `engagement_proposals`

| Column group | Columns |
|---|---|
| identity | `id`, `created_at`, `updated_at`, `engagement_id → engagements ON DELETE CASCADE`, **`version int NOT NULL CHECK >= 1`**, `locale CHECK IN ('en','ja')`, `title CHECK 1..200` |
| status | `status CHECK IN ('draft','ready','sent','accepted','voided','superseded','withdrawn')` default `draft` |
| concurrency | **`content_version int NOT NULL DEFAULT 1`** — bumped by the guard trigger on every content change; optimistic-concurrency token for saves, the AI run's input version, and the issue CAS |
| offer | `currency CHECK IN ('USD','JPY')`, `tier CHECK IN ('starter','pro','ai_native') NOT NULL`, `pricing_mode CHECK IN ('fixed','performance','hybrid')` default `fixed`, **`pricing jsonb NOT NULL`** (the priced offer, zod-owned), **`total_build int NOT NULL CHECK >= 0`**, **`total_monthly int NOT NULL CHECK >= 0`** (minor units in `currency`; real columns so the accept RPC copies them without parsing JSON), `performance_terms jsonb` |
| basis | **`data_basis CHECK IN ('client_records','provisional') NOT NULL`**, `brief_id uuid → engagement_briefs ON DELETE SET NULL`, `valid_until date` |
| document | **`sections jsonb NOT NULL`** — exactly seven `{key, title, body_md}` in a fixed order (zod-owned) |
| AI drafting | `drafting_status CHECK IN ('none','generating','completed','failed')` default `none`, `drafting_started_at`, `drafted_at`, **`drafting_run_id uuid`**, **`drafting_input_version int`**, `drafting_error CHECK (IS NULL OR IN ('timeout','provider_error','malformed_output','emitted_price','stale_input','missing_key','internal'))` (the 067 `tailoring_error` idiom — curated codes only), `drafting_model_id`, `drafting_pipeline_version`, `source_snapshot jsonb` |
| issuance | **`issued_snapshot jsonb`**, **`issued_pdf_path text`**, **`issued_pdf_sha256 text`**, `sent_at`, `delivery_method CHECK IN ('link','manual')` |
| token | `access_token_hash`, `token_issued_at`, `token_expires_at`, `token_revoked_at`, `open_count int NOT NULL DEFAULT 0`, `first_opened_at`, `last_opened_at` |
| acceptance | `accepted_at`, `accepted_by_name CHECK <= 200`, `accepted_via CHECK IN ('client','admin')`, `notification_sent_at` |
| void | `voided_at`, `void_reason CHECK 1..1000` |
| retirement | `withdrawn_at`, `superseded_at`, `superseded_by uuid → engagement_proposals` |

**Why `total_*` are columns and `pricing` is jsonb.** The accept RPC must copy two integers onto the
engagement; parsing jsonb in plpgsql for that is a bug farm. The breakdown is a document-shaped blob nobody
queries by line. The two are pinned by `engagement_proposals_totals_match_ck`, in the **`CASE` form** (SQL
`AND` is not a guaranteed short-circuit and `::int` raises on non-numeric text):

```sql
CHECK (
  CASE WHEN jsonb_typeof(pricing) = 'object'
        AND jsonb_typeof(pricing -> 'total_build') = 'number'
        AND jsonb_typeof(pricing -> 'total_monthly') = 'number'
       THEN (pricing ->> 'total_build')::int = total_build
        AND (pricing ->> 'total_monthly')::int = total_monthly
       ELSE false END
)
```

Follow migration 066's stated policy for the rest of the interior: *jsonb interiors are bounded by zod at the
write sites*. SQL guards shape and count only: `sections` is an array of length 7; `performance_terms`,
`issued_snapshot`, `source_snapshot` are objects when present.

**Shape CHECKs**, stated once so the RPCs, the actions and the tests agree:

- `engagement_proposals_mode_shape_ck` — `(pricing_mode = 'fixed') = (performance_terms IS NULL)`.
- `engagement_proposals_status_shape_ck` —
  `draft`/`ready` require **no** `issued_snapshot`, no `sent_at`, no token;
  `sent` requires `issued_snapshot`, `issued_pdf_path`, `issued_pdf_sha256`, `sent_at`, `delivery_method`,
  `valid_until`, **and** (`delivery_method = 'manual'` OR `access_token_hash IS NOT NULL`);
  `accepted` requires everything `sent` requires plus `accepted_at`, `accepted_by_name`, `accepted_via`;
  `voided` requires everything `accepted` requires plus `voided_at`, `void_reason`;
  `superseded` requires `superseded_at`; `withdrawn` requires `withdrawn_at`.
- `engagement_proposals_drafting_anchor_ck` — `generating` requires `drafting_started_at`,
  `drafting_run_id`, `drafting_input_version`; `failed` requires `drafting_error`.

**Indexes** (the 060/066 single-flight idiom, `23505 → 409`):

- `uq_engagement_proposals_version UNIQUE (engagement_id, version)`
- `uq_engagement_proposals_one_open ON (engagement_id) WHERE status IN ('draft','ready','sent')`
- `uq_engagement_proposals_one_accepted ON (engagement_id) WHERE status = 'accepted'` — `voided` frees it.
- `uq_engagement_proposals_one_drafting ON (engagement_id) WHERE drafting_status = 'generating'` — belt; the
  conditional claim (C3) is the braces.
- `uq_engagement_proposals_token_hash ON (access_token_hash) WHERE access_token_hash IS NOT NULL`
- `idx_engagement_proposals_engagement_version ON (engagement_id, version DESC)`

### Storage — bucket `engagement-documents`

A **new private bucket**, created in 074 the way 047 created `discovery-assets` (`INSERT INTO storage.buckets
(id, name, public) VALUES ('engagement-documents','engagement-documents',false) ON CONFLICT DO NOTHING`), with
**no storage policies** — only the service role reads or writes it. Object path
`proposals/<engagement_id>/<proposal_id>-v<version>.pdf`. Not reusing `discovery-assets`/`discovery-logos`
(047): those are the Build It AI funnel's client-upload buckets with their own lifecycle; a studio contract
artefact does not belong beside them, and a separate bucket costs one INSERT. Flagged below.

### Event kinds — added by constraint swap, found through the catalog

`engagement_events.kind` is an inline column CHECK, so its name is Postgres-generated. **`pg_get_constraintdef`
returns a reconstruction**, typically `= ANY (ARRAY[…])`, never the original `IN (…)` — so a text match is
wrong. 074 finds the constraint by **the column it covers** and asserts exactly one match:

```sql
DO $$
DECLARE v_name text; v_count int;
BEGIN
  SELECT count(*), min(c.conname) INTO v_count, v_name
    FROM pg_constraint c
   WHERE c.conrelid = 'public.engagement_events'::regclass
     AND c.contype = 'c'
     AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_attribute a
                            WHERE a.attrelid = c.conrelid AND a.attname = 'kind' AND NOT a.attisdropped)];
  IF v_count <> 1 THEN
    RAISE EXCEPTION '074: expected exactly one CHECK on engagement_events.kind, found %', v_count;
  END IF;
  EXECUTE format('ALTER TABLE public.engagement_events DROP CONSTRAINT %I', v_name);
END $$;
ALTER TABLE public.engagement_events ADD CONSTRAINT engagement_events_kind_check CHECK (kind IN (
  -- the sixteen 067 kinds, verbatim, then:
  'proposal_drafted','proposal_ai_drafted','proposal_ai_failed','proposal_ready','proposal_back_to_draft',
  'proposal_sent','proposal_opened','proposal_accepted','proposal_acceptance_voided',
  'proposal_withdrawn','proposal_superseded','proposal_revoked'
));
```

Twelve new kinds. `needs_attention = true` on `proposal_accepted` (Ryan must kick off the build),
`proposal_acceptance_voided` (the money just came off the record) and `proposal_ai_failed` (Ryan must click
Re-draft), mirroring `brief_failed`. `notification_sent` / `notification_failed` are reused. The TS twin
`ENGAGEMENT_EVENT_KINDS` gains the same twelve; the RLS suite asserts **every** TS kind inserts (proving the
sixteen old ones survived the swap) and that exactly one CHECK covers `kind` afterwards. The suite runs
against a local stack that applied 067 first, so this *is* the upgrade test.

### Lock order — one rule for every writer

**Engagement first, then proposal(s).** Every RPC and trigger below follows it, and the tests race them:

- `create_engagement_proposal`: lock engagement → lock the superseded proposal.
- `issue_engagement_proposal`: lock engagement → lock proposal.
- `accept_engagement_proposal`: read the proposal's `engagement_id` **without a lock** → lock engagement →
  lock proposal → **re-check every status after both locks are held**.
- `void_engagement_proposal_acceptance`: same order.
- `tg_engagements_stage_sync` terminal sweep: the engagement row is already locked by the UPDATE that fired
  it; it then updates proposals.
- `touch_engagement_proposal_open` and the finalize CAS touch **only** the proposal row (no engagement
  lock) — a single-row lock cannot participate in a cycle with the rule above.

Accept-vs-revise, accept-vs-Lost and accept-vs-void are **two-connection tests** in the RLS suite (the
`withPg` harness from `engagement_rls.test.ts`), each asserting the loser sees a clean status verdict, not a
deadlock error.

### Two triggers worth their weight

- **`tg_engagement_proposals_guard` (BEFORE UPDATE)** — decision #10 and the transition rules as one
  mechanism. `engagement_id` and `version` are immutable always. Then, in order:
  1. **Transitions are enumerated.** Allowed `OLD.status → NEW.status`: `draft→ready`, `ready→draft`,
     `ready→sent`, `sent→accepted`, `accepted→voided`, `{draft,ready,sent}→withdrawn`,
     `{draft,ready,sent}→superseded`, and any status to itself. Anything else RAISEs
     `proposal_transition_invalid` — in particular `sent→ready`, `accepted→sent`, `voided→anything`.
  2. **Content columns** (`title, locale, currency, tier, pricing_mode, pricing, total_build, total_monthly,
     performance_terms, data_basis, sections, brief_id`) may change **only while `OLD.status IN
     ('draft','ready')`**, else RAISE `proposal_content_locked`; **and not while a drafting run is live**
     (`OLD.drafting_status = 'generating' AND NEW.drafting_status = 'generating'` → RAISE
     `proposal_drafting_in_progress`; the finalize RPC's own UPDATE flips the status in the same statement
     and passes). A content change while `OLD.status = 'ready'` requires `NEW.status = 'draft'` (RAISE
     `proposal_ready_content_change` otherwise) — substantive edits return to draft, by construction. On any
     content change the trigger sets **`NEW.content_version := OLD.content_version + 1`** itself.
  3. **Once issued** (`OLD.status IN ('sent','accepted','voided')`): `issued_snapshot`, `issued_pdf_path`,
     `issued_pdf_sha256`, `sent_at`, `delivery_method` are immutable; `valid_until` may only move **later**
     (`NEW.valid_until >= OLD.valid_until`, else RAISE `proposal_validity_shortened`).
  4. **Once accepted** (`OLD.status IN ('accepted','voided')`): `accepted_at`, `accepted_by_name`,
     `accepted_via` are immutable. **Token columns, counters and `notification_sent_at` stay mutable** —
     access management is separate from the frozen agreement (review point 8).
- **`tg_engagements_stage_sync` — amended (CREATE OR REPLACE).** In the existing terminal branch
  (`NEW.stage IN ('lost','closed')`), after the questionnaire revocation: withdraw every open proposal —
  `UPDATE engagement_proposals SET status='withdrawn', withdrawn_at=now(), token_revoked_at=COALESCE(token_revoked_at, now())
  WHERE engagement_id = NEW.id AND status IN ('draft','ready','sent')` — and write one `proposal_withdrawn`
  event (actor `system`) per row. `accepted`/`voided` rows are untouched (a `closed` care plan keeps its
  contract). Reopening does not undo it — Ryan revises explicitly. Copy the whole function body from 067
  and add the block; do not rewrite the mirror.

### The view — `engagement_list`, replaced

`CREATE OR REPLACE VIEW` may only **append** columns, so the **nine** new ones go at the end, from the
**latest-version** proposal via `LEFT JOIN LATERAL (… ORDER BY version DESC LIMIT 1)`:
`proposal_id, proposal_version, proposal_status, proposal_sent_at, proposal_accepted_at, proposal_total_build,
proposal_currency, proposal_open_count, proposal_first_opened_at`. Keep `security_invoker = true`.
`EngagementListItem` gains the same nine.

### RPCs — all `SECURITY DEFINER`, `SET search_path = ''`, `service_role` EXECUTE only

- **`create_engagement_proposal(p_engagement_id uuid, p_title text, p_currency text, p_tier text, p_pricing_mode text,
  p_pricing jsonb, p_total_build int, p_total_monthly int, p_performance_terms jsonb, p_sections jsonb,
  p_data_basis text, p_brief_id uuid, p_source_snapshot jsonb DEFAULT NULL, p_supersede_id uuid DEFAULT NULL)
  RETURNS uuid`** — creation *and* revision, one transaction. Order: (1) lock the **engagement** `FOR UPDATE`;
  (2) RAISE `engagement_terminal` if `stage IN ('lost','closed')`; (3) RAISE `proposal_already_accepted` if
  an `accepted` proposal exists for the engagement (void it first — review point 1); (4) **the hard gate**,
  now with provenance: the `discovery` questionnaire must be `submitted` (else `discovery_not_submitted`);
  `p_brief_id` must name a brief **of this engagement** with `status IN ('completed','partial')` (else
  `brief_missing`) whose `questionnaire_id` is that questionnaire **and** whose `created_at >=
  questionnaire.submitted_at` (else `brief_stale` — a brief from a previous submission does not satisfy the
  gate after a reopen/resubmit); (5) if `p_supersede_id` is given: lock that row; it must belong to this
  engagement and be `draft|ready|sent`, else RAISE `proposal_not_open`; set `status='superseded',
  superseded_at=now(), token_revoked_at=COALESCE(…, now())`, write `proposal_superseded`; (6) `version :=
  COALESCE(max(version),0)+1`; (7) insert with `locale := engagement.locale`, carrying `p_source_snapshot`
  (revise preserves provenance until a new drafting run replaces it); (8) write `proposal_drafted`
  (`{proposal_id, version, supersedes}`); (9) stamp `superseded_by` on the old row; return the id. A second
  open proposal without a supersede hits `uq_engagement_proposals_one_open` → `23505` → *"There is already an
  open proposal — revise it or withdraw it first."*
- **`issue_engagement_proposal(p_proposal_id uuid, p_content_version int, p_engagement_updated_at timestamptz,
  p_issued_snapshot jsonb, p_pdf_path text, p_pdf_sha256 text, p_delivery text, p_token_hash text,
  p_token_expires_at timestamptz, p_valid_until date) RETURNS jsonb`** — the freeze, `ready → sent`.
  (1) lock engagement → lock proposal; (2) `status = 'ready'` else `{"applied":false,"reason":"not_ready"}`;
  (3) **CAS on both sources of the snapshot**: `content_version = p_content_version` and
  `engagement.updated_at = p_engagement_updated_at`, else `{"applied":false,"reason":"stale"}` (the TS
  caller built `p_issued_snapshot` and the PDF from exactly those two reads); (4) **mandatory sections in
  SQL** on the locked row — `sections` has 7 entries and `exec_summary`, `recommendation`, `scope`, `terms`
  have non-blank `body_md`, else RAISE `proposal_incomplete`; (5) `p_delivery = 'link'` requires
  `p_token_hash` + `p_token_expires_at`; `'manual'` requires both null; (6) set `status='sent'`, `sent_at`,
  `delivery_method`, `issued_snapshot`, `issued_pdf_path`, `issued_pdf_sha256`, the token columns,
  `valid_until = COALESCE(p_valid_until, valid_until, (now() AT TIME ZONE 'Pacific/Honolulu')::date + 30)`;
  (7) write `proposal_sent` (`{version, delivery, emailed: null, expires_at, valid_until}` — the action
  updates nothing here; it writes a second event line only if the email fails); return `{"applied":true}`.
- **`touch_engagement_proposal_open(p_proposal_id uuid) RETURNS jsonb`** — the
  `touch_engagement_questionnaire_open` mould: bump `open_count`, set `first_opened_at` once, write
  `proposal_opened` (actor `client`) **only on the first open**. No status flip.
- **`accept_engagement_proposal(p_proposal_id uuid, p_accepted_by_name text, p_via text, p_token_hash text)
  RETURNS jsonb`** — **the whole acceptance is this one transaction.** (1) read the proposal's
  `engagement_id` unlocked; (2) lock **engagement** `FOR UPDATE`; RAISE `engagement_terminal` if
  `lost|closed`; (3) lock the **proposal** `FOR UPDATE`; (4) if `status = 'accepted'` return
  `{"applied":false,"reason":"already_accepted"}`; if `status <> 'sent'` return `not_open`
  (both paths — the admin path accepts only an *issued* proposal, review point 4); (5) **credential
  re-validation for the client path**: `p_via = 'client'` requires `p_token_hash = access_token_hash`,
  `token_revoked_at IS NULL`, `token_expires_at > now()`, else return `{"applied":false,"reason":"forbidden"}`
  — a revoke or rotate committed before this lock was obtained therefore prevents acceptance; the cookie
  check in the route is UX, this is the enforcement. `p_via = 'admin'` requires `p_token_hash IS NULL`;
  (6) for `client` only: `valid_until < (now() AT TIME ZONE 'Pacific/Honolulu')::date` → `expired` (the
  admin path may accept late on purpose — a signed PDF that arrived a day after expiry is still a yes);
  (7) `p_accepted_by_name` 1..200 after `btrim`, else RAISE `accepted_by_required`; (8) update the proposal:
  `status='accepted', accepted_at, accepted_by_name, accepted_via` — nothing else changes, the document was
  frozen at issue and the token stays live (the client keeps reading the page and downloading the PDF);
  (9) update the engagement: `tier`, `currency`, `contract_value = total_build`, `care_mrr = total_monthly`,
  `stage = CASE WHEN stage IN ('discovery','proposal') THEN 'build' ELSE stage END` — the 067 triggers set
  `won_at`, write `stage_changed` and mirror the lead to `won` in the same transaction; (10) insert
  `proposal_accepted` (`actor = p_via`, `needs_attention = true`, `data: {proposal_id, version, total_build,
  total_monthly, currency, stage_moved}`); (11) return `{"applied":true,"engagement_id","stage_moved"}`.
  A replay hits step 4. Two concurrent clicks serialise on the locks; the loser sees `already_accepted`.
- **`void_engagement_proposal_acceptance(p_proposal_id uuid, p_reason text) RETURNS jsonb`** — the audited
  correction (review point 1). (1) lock engagement → lock proposal; (2) `status = 'accepted'` else
  `{"applied":false,"reason":"not_accepted"}`; (3) reason 1..1000 else RAISE `void_reason_required`;
  (4) proposal: `status='voided', voided_at, void_reason, token_revoked_at = COALESCE(…, now())`;
  (5) engagement: `contract_value = NULL, care_mrr = NULL` (tier and currency stay — they were also chosen
  by Ryan), `stage = CASE WHEN stage = 'build' THEN 'proposal' ELSE stage END` (a `launch|care` engagement is
  not yanked backwards; Ryan decides); **`won_at` is left as 067 defines it** — "never cleared by a
  transition; a mistaken win is an explicit admin edit" — and the event says so; (6) insert
  `proposal_acceptance_voided` (`needs_attention = true`, `data: {proposal_id, version, reason,
  stage_reverted, won_at_retained: true}`); return `{"applied":true}`. The slot is now free: Ryan clicks
  **Revise** on the voided row (copy, no supersede) and the corrected v(n+1) can be issued and accepted.
- **`finalize_engagement_proposal_draft(p_proposal_id uuid, p_run_id uuid, p_status text, p_ai_sections jsonb,
  p_source_snapshot jsonb, p_model_id text, p_pipeline_version text, p_drafting_error text) RETURNS jsonb`** —
  the CAS: applies only if `drafting_status = 'generating' AND drafting_run_id = p_run_id`, else
  `{"applied":false}`. `completed` additionally requires `status = 'draft'` (RAISE `proposal_not_draft`) and
  `content_version = drafting_input_version` (else it records **`failed` with `drafting_error='stale_input'`**
  instead of applying — belt over the guard's braces). `p_ai_sections` is an **object keyed by the five
  AI-owned section keys**; the RPC rebuilds `sections` by replacing `body_md` for those keys only,
  **preserving the stored titles, order, `terms` and `next_steps`**. `completed` stamps `drafted_at`, writes
  `proposal_ai_drafted`; `failed` writes `drafting_error` + `proposal_ai_failed` with `needs_attention`.

Post-migration verification block at the bottom of the file, in the 067 style: table + policy count, the
constraint names exist, the five RPCs grant to `service_role` and `postgres` only, the view has the nine new
columns, exactly one CHECK covers `engagement_events.kind` and it accepts `'proposal_accepted'`, the bucket
row exists with `public = false`.

## Pricing in software

`lib/pricing.ts` computes **whole USD dollars** and keeps `baseBuild` *unrushed* — the rush surcharge
appears only inside `totalBuild` (`Math.round(baseBuild × 1.25) + addons`). The engagement stores **minor
units**. The bridge is one pure module, `lib/studio/engagement/proposal-pricing.ts`, and **rush is an
explicit line**, so it can neither be omitted nor double-counted:

```ts
export interface OfferLine { id: string; label: string; build: number; monthly: number; value: string } // minor units
export interface PricedOffer {
  currency: 'USD' | 'JPY';
  tier: 'starter' | 'pro' | 'ai_native';
  inputs: PricingInput;                                       // what calculatePricing was called with
  base: { label: string; build: number; monthly: number };
  rush: { label: string; build: number } | null;              // explicit surcharge line
  lines: OfferLine[];
  adjustment: { label: string; build: number; monthly: number } | null;   // signed; the ONLY free-form money on a USD offer
  usd_reference: { total_build: number; total_monthly: number } | null;  // cents; JPY offers only
  total_build: number;
  total_monthly: number;
}
export function totalsOf(o: Omit<PricedOffer,'total_build'|'total_monthly'>): { total_build: number; total_monthly: number };
// total_build   = base.build + (rush?.build ?? 0) + Σ lines.build + (adjustment?.build ?? 0)
// total_monthly = base.monthly + Σ lines.monthly + (adjustment?.monthly ?? 0)
export function buildUsdOffer(inputs: PricingInput, adjustment: PricedOffer['adjustment']): PricedOffer;
export function buildJpyOffer(inputs: PricingInput, yen: { base; rush; lines: Record<string, {build, monthly}>; adjustment }): PricedOffer;
export function buildCustomOffer(currency, base, rush, lines, adjustment): PricedOffer;   // ai_native
```

Rules, each pinned by a test:

- **`totalsOf` is the one arithmetic**, used by `buildUsdOffer`, `buildJpyOffer`, `buildCustomOffer`, the
  zod `superRefine`, the pricing form's live preview and the document renderer. There is no second sum.
- **USD**: `base.build = result.baseBuild × 100`; `rush = result.rushApplied ? { build: (Math.round(result.baseBuild × RUSH_MULTIPLIER) − result.baseBuild) × 100 } : null`;
  each line `= result.lines[i] × 100`. Two distinct checks, both enforced: (a) **supplied lines equal the
  authoritative calculator** — `buildUsdOffer` is the only constructor for USD offers and the server action
  **re-runs it from `inputs`** and rejects a payload whose base/rush/lines differ; (b) **totals equal the
  lines** — `totalsOf` re-derivation in zod, then the SQL CHECK. Cross-check pinned in a test:
  `totalsOf(offer).total_build === result.totalBuild × 100 + (adjustment?.build ?? 0)`. The only editable
  money on a USD offer is `adjustment` (a signed delta with a **required** label), so the single source of
  truth stays single and every discount is named on the document.
- **JPY**: the same `calculatePricing` runs for `usd_reference`; **every** yen figure — base, rush, each
  line, adjustment — is typed by Ryan as an integer (`Number.isInteger`, `>= 0` except the adjustment), shown
  beside the USD it corresponds to. **No multiplication happens in code on a JPY offer**, so there is no
  fractional-yen rounding rule to define (decision #8). The form pre-fills nothing from USD.
- **`ai_native`**: `calculatePricing` returns `isCustom`; base, rush and lines are typed in either currency
  (`buildCustomOffer`); `AI_NATIVE_FROM` is shown as a floor hint only.
- Totals `>= 0` (a discount cannot make the offer negative). `performance`: `total_build` may be 0.
  `hybrid`: a small fixed base + the % terms. Decision #6: `contract_value` records the fixed portion only.
- `formatMinorUnits(amount, currency, locale)` is appended to `lib/studio/engagement/format.ts`:
  `Intl.NumberFormat` with `currency`, `maximumFractionDigits: currency === 'JPY' ? 0 : 2`, dividing by 100
  for USD only. Used by the panel, the page, the PDF and the emails — one formatter.

`performance_terms` (zod `performanceTermsSchema`): `rate_percent` (int 1–100), `applies_to` (≤500),
`qualifying_new` (≤1000), `reporting` (≤500), `payment_timing` (≤500), `tracking_note` (≤1000, nullable). All
render in the Terms section as a labelled table, above Ryan's free-text terms.

## The document — one snapshot, one block parser, three renderers

### Issuance freezes everything the client sees

`lib/studio/engagement/proposal-document.ts` exports **`buildIssuedSnapshot(proposal, engagement, now)`** —
pure — producing the `issued_snapshot` the RPC stores:

```
{ snapshot_version: 1, renderer_version: 'proposal-doc-v1',
  version, locale, currency, tier, pricing_mode, pricing, performance_terms, total_build, total_monthly,
  data_basis, sections, title,
  cover: { business_name, contact_name, issued_on (date), year },
  copy: { footnote_provisional, footer, cover_labels… }   // the locale strings baked in, so a later copy edit cannot change an issued document }
```

**Identity fields are frozen too** (review point 4): the cover's business and contact names, the issue date
and the footer year come from the snapshot, never from the live engagement or `now()`. Changing the contact
email later changes nothing the client already has. `valid_until` is **deliberately not in the snapshot** —
decision #12 makes it the one field allowed to change, forward only, and the page/PDF print the live column
beside "Issued on {issued_on}".

**`buildProposalDocModel(snapshotOrDraft)`** turns a snapshot (or, for admin previews of `draft|ready` rows,
a snapshot built on the fly) into the render model. The renderers take **only** this model — a narrow
projection with no `confidence_note`, `source_snapshot`, brief or lead fields, so a future column cannot
leak. Conventions from the `studio-client-engagement` skill live here once:

- **Cover**: HonuVibe Studio wordmark **and** the client's business name as a typographic lockup (the
  skill's "both logos"; a client *logo upload* is not this unit), title, `Proposal v{version}`, `Issued
  {date}`, `Prepared for {contact} · {business}`, `Valid until {date}`. Previews of unissued rows carry a
  **`PREVIEW — not issued`** watermark band.
- **Order**: Executive summary → Key takeaways → Recommendation → Scope & phases → Investment → Terms →
  Next steps.
- **Investment table**: rendered by code from `pricing` — base row, rush row when present, one row per line
  (label + the `value` benefit framing from `ADDONS`), adjustment row when present, `Total build` and
  `Monthly care`, `usd_reference` as a muted line on JPY documents, the performance-terms table when
  `pricing_mode ≠ fixed`. **The narrative never carries these numbers; the table does.**
- **Provisional marking**: `data_basis = 'provisional'` appends the footnote *"† Figures shared verbally are
  provisional and to be confirmed against your records."* and a `†` after the Key-takeaways heading.
- **Footer**: `© {year} HonuVibe.AI · Confidential — prepared for {business}`.

### One markdown parser, so page = PDF = preview

`lib/studio/engagement/proposal-markdown.ts` — **`parseProposalMarkdown(body_md): Block[]`** — supports
exactly: paragraphs, `#`/`##` headings, `-` bullet lists, and inline `**bold**`. Anything else (links,
images, tables, HTML, code fences) is rendered as its **literal text**, in all three places. Three thin
renderers consume the same blocks: `components/proposal/ProposalBlocks.tsx` (HTML, used by the client page
**and** the admin editor's preview — **not** `CommunityMarkdown`, which would accept a superset and break
parity), and `blocksToPdf()` inside `generate-proposal-pdf.ts` (react-pdf primitives). Parity is by
construction; the test renders a fixture through both and asserts identical text content. The AI system
prompt names the subset; the editor's preview shows exactly what the PDF will show.

### The archived PDF is the artefact

`issueProposal` renders the PDF from `buildIssuedSnapshot(...)` **before** the RPC, uploads it to
`engagement-documents/proposals/<engagement_id>/<proposal_id>-v<n>.pdf`, computes its sha256, and passes
path + hash into `issue_engagement_proposal`. If the RPC returns `applied:false` (stale CAS) or throws, the
action **deletes the uploaded object** and surfaces the reason. From `sent` onward **both PDF routes stream
the stored object** — no re-rendering, so a later font or renderer change cannot alter an issued document.
Only `draft|ready` previews render live (watermarked). The sha256 is asserted against the stored bytes on
download and logged (not surfaced) on mismatch.

Sections are seven fixed keys in `PROPOSAL_SECTION_KEYS`:
`exec_summary · takeaways · recommendation · scope · investment_notes · terms · next_steps`. The editor
cannot add or remove one; a section may be empty in `draft`; `ready` and issue require `exec_summary`,
`recommendation`, `scope` and `terms` non-blank (TS in `markProposalReady`, **SQL in the issue RPC** — the
enforcement). `terms` and `next_steps` are seeded from `lib/studio/engagement/proposal-terms.ts` (EN + JA
defaults — payment on acceptance via a link Ryan sends, care billed monthly, validity, out of scope,
hand-over, cancellation — **plain defaults Ryan edits, not legal advice; JA flagged for native review**).
The AI touches neither (C3).

## Surfaces

### Admin

The workspace page `app/[locale]/admin/studio/engagements/[id]/page.tsx` composes an explicit `panels`
array. The proposal panel slots **after the brief and before the timeline**. The page also fetches
`getEngagementProposals(id)` and runs `flipStaleProposalDrafts(admin, id)` (>5 min) alongside the two
existing stale flips.

New components in `components/admin/`, existing panel chrome, copied from — not imported from — their
precedents:

- **`EngagementProposalPanel.tsx`** — states off the *latest* proposal's `status` (none → `draft` → `ready`
  → `sent` → `accepted` → `voided`, plus `withdrawn`/`superseded` history rows). Precedent:
  `EngagementDiscoveryPanel.tsx` (button classes, `useTransition` + inline error, copy-link **only** in the
  send/resend response, the amber review strip when `status='draft' && drafting_status='completed'`, the CJK
  warning for a `ja` proposal whose drafted sections contain no Japanese, *"Notification not sent — resend"*
  when `accepted_at` is set and `notification_sent_at` is null). Extra states: the **gate strip** when the
  hard gate is unmet (*"Send the discovery questionnaire and wait for the brief before proposing"*; Create
  disabled — the RPC enforces it), the **stale-brief strip** when the newest brief predates the current
  submission, the **provisional strip** (amber), **Viewed 3× · first Mar 14** from the counters, and the
  **drafting-in-progress lock** (editor read-only with *"AI is drafting — edits unlock when it finishes"*).
  Actions: `Create proposal` · `Draft with AI` · `Mark ready` · `Back to draft` · `Issue & send link` ·
  `Issue for manual delivery` · `Resend link` (also on `accepted`) · `Revoke link` (also on `accepted`) ·
  `Withdraw` · `Revise` · `Mark accepted` (prompts for the accepter's name; the confirm says it will move the
  engagement to Build and set the contract value) · `Void acceptance` (prompts for a reason; the confirm says
  it clears the contract value and returns a Build engagement to Proposal, and that `won_at` is retained) ·
  `Download PDF` (preview watermark before issue; the archived file after) · `Resend notification`.
- **`ProposalPricingForm.tsx`** — step 1 of Create and the pricing editor while `draft|ready`: **currency**
  (seeded from `engagement.currency`, which defaults to USD and has no editor of its own — the proposal owns
  the choice and accept writes it back), tier segmented control (seeded from `engagement.tier ??
  'starter'`), pricing mode, the `PricingInput` fields (content readiness, imagery, additional languages,
  location type, the five add-on toggles, timeline/rush), the **adjustment** row (label required when
  non-zero), the **performance terms** fieldset when mode ≠ fixed, `data_basis` radio (required),
  `valid_until` date, and a live **Investment preview** from `totalsOf` in the browser. For JPY every money
  cell (base, rush, lines, adjustment) becomes a yen input with the USD reference beside it. Saves carry
  `content_version`; a stale tab gets *"This proposal changed in another tab — reload."*
- **`ProposalSectionsEditor.tsx`** — seven `<textarea>`s (title editable, key fixed) with a per-section
  `Preview` toggle rendering through **`ProposalBlocks`** (the parity renderer). Read-only once issued or
  while drafting (the trigger would reject the write anyway; the UI says why). Saving while `ready` shows
  *"Saving returns this proposal to Draft — mark it ready again after."*
- **`ProposalVersionList.tsx`** — compact history: `v2 · Sent Mar 14 · viewed 2× · US$875.00` /
  `v1 · Superseded` / `v3 · Voided — "wrong tier"`. Each issued row has `Download PDF` (the archive).

`StatusBadge.tsx` gains `accepted` (teal), `voided` (danger), `superseded` (muted), `withdrawn` (muted).
`EngagementTimeline.tsx`'s `KIND_LABELS` gains the twelve kinds. `AdminEngagementsList.tsx` /
`EngagementRow.tsx` gain a sixth column **Proposal** — `—` / `Draft v1` / `Ready` / `Sent · 3d ago` /
`Sent · viewed 2×` / `Accepted ✓ $875.00` / `Voided` — via a `proposalLabel(e)` reading the nine view
columns (extend `EngagementRow.test.tsx`).

Queries append to `lib/admin/queries.ts` after `getEngagementQuestionnaire` (throw-on-error):
`getEngagementProposals(engagementId)` (all versions, `version DESC`) and `getLatestEngagementProposal`.
Types append to `lib/admin/types.ts` after `EngagementBrief`: `EngagementProposal`, the nine
`EngagementListItem` columns. Vocabulary (`PROPOSAL_STATUSES`, `PricingMode`, `DataBasis`, `DraftingStatus`,
`DeliveryMethod`, the twelve event kinds) goes in `lib/studio/engagement/types.ts`.

**Server actions — `lib/studio/engagement/proposal-actions.ts`** (`'use server'`, the
`questionnaire-actions.ts` shape: `requireAdmin()`, zod `parseInput`, service-role client, a local
`translateDbError` mapping every RAISE name above and `23505` to sentences, `revalidatePath` on the engagement
page, the list, **and the lead page whenever the stage may have moved**):

| Action | Rule |
|---|---|
| `createProposal(engagementId, input)` | Re-runs `buildUsdOffer` from `inputs` for USD (rejects a mismatch), validates with `pricedOfferSchema`, seeds `terms` + `next_steps`, calls `create_engagement_proposal`. |
| `saveProposal(proposalId, input, expectedContentVersion)` | `draft\|ready` only; one UPDATE `… WHERE id = $1 AND content_version = $2 AND status IN ('draft','ready')`; zero rows → *"changed underneath you — reload"*; on `ready` the patch includes `status: 'draft'` (the trigger requires it). |
| `markProposalReady` / `proposalBackToDraft` | The human-review gate carried by `status`. `markProposalReady` checks the four mandatory sections, refuses while `drafting_status = 'generating'`, and is the moment Ryan confirms the narrative carries no price (C3). |
| `issueProposal(proposalId, delivery: 'link' \| 'manual')` | Loads proposal + engagement → `buildIssuedSnapshot` → renders + uploads the PDF → for `link`: mints the token (hash only), `token_expires_at = +45 d` → `issue_engagement_proposal(…, content_version, engagement.updated_at, snapshot, path, sha, delivery, …)` → on `applied:false`/throw: deletes the object, surfaces *"changed underneath you"* / *"fill in the required sections"* → for `link`: emails the client in `proposal.locale`; returns `{url, emailed, path}` **once** (`emailed:false` ⇒ *"Email failed — copy the link and send it yourself."*, plus a `notification_failed`-style second event line). For `manual`: returns the archive download URL. |
| `resendProposalLink(proposalId)` | `sent` **or `accepted`** (review point 8): rotate — new token, old replaced, `token_expires_at = +45 d`, **`valid_until = GREATEST(valid_until, today + 30)`** (never shortened — the trigger enforces), fresh email (the accepted variant says "your accepted proposal"), another `proposal_sent` event. On a `manual` row this **adds** link delivery (`delivery_method` stays `manual`; the token columns are what matter). |
| `revokeProposalLink(proposalId)` | Any issued status incl. `accepted`; `proposal_revoked`. |
| `withdrawProposal(proposalId)` | `draft\|ready\|sent` → `withdrawn`, token revoked, `proposal_withdrawn`. Frees the one-open slot. |
| `reviseProposal(proposalId)` | Copies the row's content **and `brief_id` + `source_snapshot`** into `create_engagement_proposal`; passes `p_supersede_id` **only if the source is `draft\|ready\|sent`** (a `withdrawn`/`voided`/`superseded` source is copied without superseding — its slot is already free). The superseded row's old link now says "a newer proposal has replaced this one". |
| `markProposalAccepted(proposalId, acceptedByName)` | `accept_engagement_proposal(…, 'admin', null)` — `sent` only (issue first: a `ready` proposal has not been frozen, so there is nothing to accept). Then the notification. |
| `voidProposalAcceptance(proposalId, reason)` | `void_engagement_proposal_acceptance`; revalidates the lead page (the mirror may have moved back). |
| `resendAcceptNotification(proposalId)` | Re-sends Ryan's email; stamps `notification_sent_at` on success. |

### Client-facing proposal

```
GET  /api/engagement/proposal/enter/[token]   → 303 to the locale-correct page
     app/[locale]/proposal/[id]/page.tsx        /proposal/<uuid>  ·  /ja/proposal/<uuid>
POST /api/engagement/proposal/[id]/accept     accept (cookie-authenticated; token hash re-checked in the RPC)
GET  /api/engagement/proposal/[id]/pdf        the archived PDF (cookie-authenticated)
```

**Route placement.** `/proposal` is verified free: no `app/[locale]/proposal`, no match in `middleware.ts`,
`next.config.ts` redirects, or `lib/marketing-routes.ts`. The same three trees rejected for `/discovery`
are rejected here for the same JP-typography reasons (spine plan, "Route placement").

**Auth is the discovery cookie exchange, copied.** `lib/studio/engagement/proposal-session.ts` imports the
pure helpers from `session.ts` (`secretMatches`, `evaluateSession`, `isCrossSite`, `cookieMaxAgeSeconds`,
`sessionCookieOptions` — row-shaped, questionnaire-agnostic) and defines `proposalCookieNameFor(id) =
'hv_engp_' + id` (a **different prefix**, so a proposal cookie never authorizes a questionnaire and vice
versa) and `authorizeProposalSession(id)`, which returns the row, a service-role client **and
`presentedTokenHash`** for the accept route to hand to the RPC. `lib/studio/engagement/proposal-token.ts`
imports `hashToken` and `TOKEN_RE` from `questionnaire-token.ts` and defines `mintProposalToken`,
`proposalEntryUrl(token)` (`/api/engagement/proposal/enter/<token>`) and `proposalPath(locale, id)`. Same
hygiene, verbatim: 256-bit token, sha256 only, `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`,
`Max-Age` aligned to `token_expires_at`; 410 for a valid-but-expired token, 403 for everything else; expiry
and revocation checked **inside** `authorizeProposalSession`, so Revoke kills an open tab; **no token-in-body
fallback**. The entry route is a copy of `app/api/engagement/enter/[token]/route.ts` (its `messagePage` and
`COPY` included, with proposal wording and a third state for a superseded/withdrawn row: *"A newer proposal
has replaced this one — please open the newest link from your email."*), calling
`touch_engagement_proposal_open`; a token can only exist on an issued row, so `draft|ready` never reach it.

**Accepted-link access is time-limited by design, and refreshable.** The 45-day token expires; the page then
shows the 410 card (*"Reply to Ryan and he'll send a fresh link to your accepted proposal"*); `Resend link`
on the accepted row rotates it. A leaked accepted link is revoked with `Revoke link`. Neither touches the
agreement (guard rule 4).

**The page** `app/[locale]/proposal/[id]/page.tsx` — `force-dynamic`, `robots: {index:false, follow:false,
nocache:true}`, the same locale-prefix handling as the discovery page (a `ja` proposal at `/proposal/<id>`
`permanentRedirect`s to `/ja/`; an `en` proposal under `/ja` renders in place — **do not** pin
`NEXT_LOCALE`). Renders `<ProposalDocument model={buildProposalDocModel(issued_snapshot)} validUntil=… />`
(a **server** component — the precedent is `EngagementAnswersView`, a server component rendering untrusted
text; bodies go through `ProposalBlocks`), a `Download PDF` link to the archive route, and:

- `status = 'sent'` and not past `valid_until` → **`<ProposalAcceptForm>`** (client component): the
  accepter's name (`≥ 16px` input, `maxLength 200`), one checkbox *"I accept this proposal on behalf of
  {business}"*, a hidden honeypot `company_url`, and `Accept proposal`. On `applied:true` it renders the
  accepted state in place — **honestly worded**: *"Thank you — your acceptance is recorded. Ryan will be in
  touch about kickoff."* (not "has been notified": the email is best-effort in `after()`). One plain line
  under the button: *"Accepting here records your name, the date and this exact version of the proposal."*
  — a **click-wrap record, not an e-signature product**.
- past `valid_until` → the expired band, no form.
- `status = 'accepted'` → the accepted band with `accepted_by_name` and date, the document, the PDF link.
- `status = 'voided'` → the token was revoked at void; the entry route's 403 copy covers it.

Chrome: **`components/proposal/`** carries its own `copy.ts` (`const T = {en, ja}`, JA flagged for native
review), `ProposalDocument.tsx`, `ProposalBlocks.tsx`, `ProposalAcceptForm.tsx` and a
`ProposalFatalCard.tsx` copied from `components/engagement/FatalCard.tsx` with proposal wording. The
`data-shell="marketing" learn-zone` surface, the wordmark, and the **inner-wrapper JP typography rule** are
copied exactly (see the comment in `QuestionnaireApp.tsx`).

**Accept route** `POST /api/engagement/proposal/[id]/accept` — in order: rate limit **10 / 1 h per IP** →
`isCrossSite` → honeypot (silent fake success) → `authorizeProposalSession` → zod body
`{accepted_by_name: 1..200, accepted: literal true}` → `accept_engagement_proposal(id, name, 'client',
presentedTokenHash)` → on `applied:true` **only**: `after()` the Ryan notification (`proposal-notify.ts`,
stamping `notification_sent_at` on provider success, `notification_failed` event otherwise; the panel's
"resend notification" is the recovery, and the admin list's `needs_attention` row is the durable signal).
`applied:false` maps `already_accepted → 409`, `not_open → 409`, `expired → 410`, `forbidden → 403`.

**PDF routes.** `GET /api/engagement/proposal/[id]/pdf` (cookie, **30 / 1 h per proposal id**) and
`GET /api/admin/engagements/[id]/proposal/[proposalId]/pdf` (`requireAdmin`) both stream
`issued_pdf_path` from the bucket for issued rows (`Content-Disposition: attachment;
filename="HonuVibe-Studio-Proposal-<ascii-slug>-v<n>.pdf"`, `no-store`); the admin route alone renders a
**watermarked live preview** for `draft|ready`. `lib/studio/engagement/generate-proposal-pdf.ts` copies
`lib/tutoring/generate-report-pdf.ts`'s styling (dark header bar, DM Serif Display titles, DM Sans body,
`registerFonts()` with `Noto Sans JP` + `cjkHyphenate` from `lib/pdf/fonts.ts`; `@react-pdf/renderer` is in
`serverExternalPackages`) over the doc model, using `blocksToPdf()`. `runtime = 'nodejs'`, `maxDuration = 60`.

**Chrome, indexing, analytics — four edits, mirroring `/discovery` exactly:**
- `components/layout/conditional-nav.tsx`: add `proposal` after `discovery` in the auth-shell alternation;
  extend `isAuthShellRoute`'s test with `/proposal/<uuid>`, `/ja/proposal/<uuid>`, and `/proposals` (not
  matched).
- `next.config.ts` header map: add `'/proposal/:path*', '/ja/proposal/:path*'`.
- `app/[locale]/layout.tsx:88` Plausible `data-exclude`: append the four `/proposal` globs. **This file
  carries unrelated uncommitted hunks** — index-only blob of HEAD + this one line, as slice 2 did.
- `components/analytics/vercel-analytics.tsx`: `EXCLUDED_PATH = /^\/(ja\/)?(discovery|proposal)(\/|$)/`; extend
  its test.

### Emails — appended to `lib/studio/engagement/emails.ts`

Same primitives, every dynamic value through `escapeHtml`, typed `{ok, providerId?, error?}` results:

- **`sendProposalInvite`** (client, in `proposal.locale`; variants `issued` and `accepted_resend`):
  *"Your proposal from HonuVibe Studio — {business}"* / *"【HonuVibe Studio】{business} — ご提案書のお届け"*;
  names the version only when `> 1` (*"This replaces the earlier version"*), states `valid_until`, CTA
  `Open your proposal →`. **JA flagged for native review.**
- **`sendProposalAcceptedAdminNotification`** (Ryan, EN): banner *"Proposal accepted"*, details table (client,
  accepted by, via, total build, monthly care, currency, version, stage moved yes/no), CTA to the engagement.

## C3 · AI drafting — `POST /api/admin/engagements/[id]/proposal/[proposalId]/draft`

**Synchronous, not 202 + poll** — the tailor route's shape. The claim is **conditional and exclusive**
(review point 6):

```sql
UPDATE engagement_proposals
   SET drafting_status = 'generating', drafting_started_at = now(),
       drafting_run_id = gen_random_uuid(), drafting_input_version = content_version
 WHERE id = $1 AND status = 'draft' AND drafting_status <> 'generating'
RETURNING drafting_run_id, content_version
```

Exactly one row or the route returns `409` (*"A draft is already running"* / *"Only a draft can be
re-drafted — click Back to draft first"*). The partial unique index remains as a second wall. While the run
is live the guard trigger **rejects every content save** (`proposal_drafting_in_progress`) and the editor is
read-only, so the model's input revision cannot change underneath it; the finalize RPC still requires
`content_version = drafting_input_version` and `drafting_run_id = p_run_id` and otherwise records
`failed / stale_input`. The route **persists through the CAS before responding**; a dead request leaves
`generating` and `flipStaleProposalDrafts` (>5 min, in `proposal-draft.ts`, the `flipStaleTailoring` mould —
fenced UPDATE + `proposal_ai_failed` event) turns it into `failed` with a `Re-draft` button. Errors: `502`
with a curated message on provider failure, `503` on a missing key. Re-drafting **replaces the five AI-owned
sections only** — the RPC merges by key, so `terms`, `next_steps`, titles and order survive; Ryan's edits to
the five are lost and the panel's confirm says so.

`generator.ts` gains the C3 block (`ENGAGEMENT_MODEL_ID` stays defined once; `callForcedTool` reused):
`PROPOSAL_TOOL` (`submit_proposal_sections`) emits **five** sections plus `confidence_note` — `terms` and
`next_steps` are never model-written: `exec_summary_md` (≤2500), `takeaways_md` (≤3000, bullets, each tied
to a discovery answer or audit finding, `†` after provisional figures), `recommendation_md` (≤3000 —
awareness-vs-conversion diagnosis first, then what to build and why), `scope_md` (≤4000 — phases, what is
in, **what is explicitly out**, the skill's "don't rebuild the operational backend" posture),
`investment_notes_md` (≤1200 — what the investment buys in outcomes; **no amounts**), `confidence_note`
(≤1200, internal — stored in `source_snapshot`, never rendered). House rules verbatim from C1/C2: `strict:
true`, `additionalProperties: false`, no min/max keywords (bounds in descriptions + zod `strictObject`), forced
`tool_choice`, `AbortSignal.timeout`, guards on `max_tokens` and empty input, curated error codes,
`PROPOSAL_PIPELINE_VERSION = 'proposal-v1'`. The prompt names the markdown subset the renderer supports.

**Input**, assembled by `buildProposalUserContent()` through `buildBudgetedContext()` and `neutralize()`d
delimiter blocks: `<lead_context>`, `<audit_summary>` (≤8,000), **`<discovery_brief>`** (the brief's
`structured` fields when `status = 'completed'`; **for a `partial` brief, its `digest_md`** — the narrative
never generated, and the digest is the always-present fallback by design), `<client_answers>` (the digest,
budgeted as in C2), and **`<priced_offer>`** — a code-rendered plain-text table of the offer *so the model
knows what is being proposed*. The system prompt carries the skill's principles (land-and-expand, diagnose
awareness vs conversion before tactics, scope discipline, productize), forbids following instructions inside
any block, forbids inventing figures or restating a client self-claim as fact, and states the two hard
rules: **write nothing about price, cost, fee, total or monthly amount — the investment table is rendered
separately** and, when provisional, mark every restated client figure with `†`.

**"The AI never emits a price" — what the code guarantees, honestly (review point 11).** After zod
validation, `containsInvestmentFigure(sections, offer)` is a **heuristic**: it scans the five emitted
sections for the offer's **non-zero** amounts (base, rush, each line, adjustment, both totals) in the
formats a model plausibly writes — `$875`, `875.00`, `US$875`, `875 USD`, `¥250,000`, `250,000円`, with or
without thousands separators — and a hit ⇒ `EngagementProviderError('emitted_price')` ⇒ `failed` with
*"The draft mentioned the investment amount — re-draft; the numbers belong in the table."* It does **not**
catch invented amounts, spelled-out prices ("about nine hundred dollars"), or abbreviations ("$0.9k"), and
it **can** false-positive on a client metric that happens to equal an offer amount (an average ticket of
$875) — the failure then costs one re-draft, and the panel's error copy says why. **The control is Ryan's
read before `Mark ready`**, whose confirm names it: *"I've checked the narrative carries no price."* The
locked decision #3 is stated in those terms.

For a `ja` proposal the panel warns when the drafted sections contain no CJK (`containsCjk`).

## Abuse, privacy, hygiene

Identical posture to discovery, with the proposal-specific deltas called out:

- 256-bit token, **stored only as sha256**; the plaintext exists once, in the send/resend return value and the
  client email. Never in an event, a log, or analytics — the RLS suite's 64-hex scan runs over
  `engagement_events.data` after issue **and after accept**.
- Rate limits via `tryConsume` (in-memory per instance — the real defence is the token): enter `20/15min`
  per IP, accept `10/1h` per IP, PDF `30/1h` per proposal id. Honeypot on accept only. Sec-Fetch-Site rejects
  `cross-site` when present. **No IP or user agent stored.**
- What a leaked link exposes: one proposal's document and price, and the ability to *accept it in someone
  else's name*. Mitigations: the token is re-validated **inside** the accept transaction, so Revoke wins any
  race; the accept records a typed name + time + `accepted_via='client'` and emails Ryan; `valid_until`
  bounds the window; the acceptance is **voidable** with an audited reason; the page describes itself as a
  click-wrap record. **Not** adding OTP re-verification at accept — real machinery for a risk the void +
  notification already contain, and the contact has already proven inbox access. Flagged below.
- Client-typed input reaching Ryan: only `accepted_by_name` — `escapeHtml`'d in the email, text node on
  the page.
- The page renders only the doc model (a narrow projection of `issued_snapshot`) plus the live `valid_until`.

## Explicitly not this unit

| Not building | Attach point |
|---|---|
| **Billing / deposit link / invoices** | `engagement_invoices` over `lib/stripe/*`, or first a nullable `deposit_link_url` rendered in the accepted band. |
| **Change orders / a second accepted offer** | Drop `uq_engagement_proposals_one_accepted` and the `proposal_already_accepted` guard, add `kind CHECK IN ('proposal','change_order')`, have accept **add** to `contract_value`. Existing rows satisfy the partial index. |
| **Client Decline button** | `proposal_declined` kind + `declined_at`/`decline_reason`; the accept route has the shape. |
| **Data-handoff parser** (skill stage 4) | `engagement_datasets` + a CSV upload to `engagement-documents`; `data_basis = 'client_records'` is the flag it would set. |
| **Meeting processing / client summary / follow-up email** | `engagement_briefs.questionnaire_id` is already nullable for a transcript-sourced brief. |
| **Fulfillment deliverables · win tracker** | Unchanged from the spine plan. |
| **Client logo on the cover** | Optional `client_logo_path` in `engagement-documents`; `cover` in the snapshot has the slot. |
| **E-signature provider · OTP at accept** | The accept route is the seam; `accepted_via` gains a third value. |
| **Proposal templates / terms editor UI** | `proposal-terms.ts` is a code const, like `templates.ts`. |
| **Direct money editor on the engagement** | Void + revise + re-accept is the correction path this unit; a small `updateEngagementMoney` action is the later shortcut. |
| **Clearing `won_at` on void** | 067 owns the rule ("explicit admin edit"); void records `won_at_retained: true` so a later revenue rollup can exclude voided wins by joining events. |
| **Client account / login** | Never — spine decision #3. |
| **JP admin UI** | Admin is EN-only by repo convention. |

## Build order — one migration, two shippable slices

Medium-large: 1 table, 1 bucket, 5 RPCs, 2 new + 1 amended trigger, 1 view, ~14 lib modules, 4 admin
components, 5 client components, 5 API routes + 1 page, ~12 test files. Ship as **two commits**, each
independently verifiable **and independently useful**; migration 074 covers both.

**Rollout order (review point: availability).** 074 is **additive** — a new table, a new bucket, RPCs and
triggers nothing calls yet, a constraint swap that is a superset, and view columns appended after the ones
the shipped list reads. **Apply 074 in the Supabase dashboard *before* deploying slice A** (the 062
precedent), so there is no interval in which the workspace page queries a table that does not exist. The
ship report states it in that order. No runtime compatibility shim is built.

**Slice A — priced, drafted, issued, admin-accepted, voidable, notified.** Migration 074 +
`engagement_proposals_rls.test.ts` (schema-first, green before any UI) → `types.ts` additions,
`proposal-schema.ts`, `proposal-pricing.ts`, `proposal-terms.ts`, `proposal-markdown.ts`,
`proposal-document.ts`, `format.ts` money formatter — all pure, all tested → `lib/admin` types + queries →
`generate-proposal-pdf.ts` + `ProposalBlocks.tsx` → **`emails.ts` accept notification + `proposal-notify.ts`**
(moved here from slice B so admin acceptance ships with its notification) → `proposal-actions.ts` (create /
save / ready / back / **issue for manual delivery** / withdraw / revise / mark accepted / void / resend
notification) → `generator.ts` C3 + `proposal-draft.ts` + the draft route → the admin PDF route →
`EngagementProposalPanel` + `ProposalPricingForm` + `ProposalSectionsEditor` + `ProposalVersionList`, the
workspace slot, StatusBadge, timeline labels, the list column. Ryan can price, draft, edit, issue, download
the archived PDF, email it himself, record acceptance (engagement → Build with its contract value), void a
mistake, and receive the notification.

**Slice B — the link.** `proposal-token.ts`, `proposal-session.ts` (+ tests) → `sendProposalInvite` →
`issueProposal('link')` / `resendProposalLink` / `revokeProposalLink` → the enter route, the page +
`components/proposal/*`, the accept route, the client PDF route → the four chrome/analytics edits (the
`layout.tsx` index-only blob). Then the panel's link states light up.

**Gates, stated without a contradiction.** Per CLAUDE.md the gate is `pnpm verify` + `pnpm test:rls` green.
The tree carries a **pre-existing, unrelated red** — `lib/progress/{actions,queries}.test.ts` (28 failures
from other work's `course_catalog` edits) — that this unit must not touch. If it is still red at ship time,
the rule that applies is the one Ryan set for slice 2: **every test file this unit adds or modifies is green,
the full suite shows *only* those 28 pre-existing failures, they are listed by file in the ship report, and
Ryan says "continue" before the commit.** If the other work has landed by then, the gate is fully green with
no exception. Type-check and build must be clean in either case.

Ship each per CLAUDE.md: gates → adversarial review (`requesting-code-review`, triaged with
`receiving-code-review`) → commit to `main` → push. Stage only this unit's files by path.

## Verification

**Gates:** as above. Build with `NODE_OPTIONS=--max-old-space-size=8192`. Local RLS needs the duplicate
022/025 survey migrations temp-renamed, then restored. Local smoke runs against the **local stack only**
(`.env.local` is production): `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` + the anon/service keys from
`.env.test.local` on the command line, fixture admin `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6@fixture.local`. The
box runs near its memory ceiling: bundled headless shell, validate a restored admin session, retry the first
navigation after a cold compile, verify SSR'd pages over HTTP with the session cookie when a browser cannot
stay alive.

Unit tests as `*.test.ts` beside source (`app` vitest project), highest-value first:

| File | Pins |
|---|---|
| `lib/studio/engagement/proposal-pricing.test.ts` | USD: base = `baseBuild × 100`, **rush line = (round(base × 1.25) − base) × 100 only when `asap`**, lines = calculator × 100, `totalsOf` equals `totalBuild × 100 + adjustment`; adjustment signed; negative totals rejected; label required when adjustment non-zero; a payload whose lines differ from the calculator is rejected by the action's re-run. JPY: every yen figure kept as typed, `usd_reference` equals the USD computation, non-integer yen rejected, **no multiplication anywhere** (rush is typed). `ai_native`: custom base/rush/lines. |
| `lib/studio/engagement/proposal-schema.test.ts` | Stored totals that disagree with `totalsOf` rejected; `performanceTermsSchema` required iff mode ≠ fixed; sections exactly the seven keys in order, `body_md ≤ 8000`; `data_basis` enum; `accepted_by_name` 1..200 after trim; `void_reason` 1..1000. |
| `lib/studio/engagement/proposal-markdown.test.ts` | Paragraph/heading/bullet/bold parse; links, tables, HTML, fences come out as literal text; the HTML and PDF renderers of one fixture produce identical text content. |
| `lib/studio/engagement/proposal-document.test.ts` | `buildIssuedSnapshot` carries business/contact/issued_on/year and the locale copy; **changing the engagement's contact afterwards does not change a model built from the snapshot**; `valid_until` is absent from the snapshot; section order fixed; provisional adds the footnote + heading mark; investment table has base + rush + lines (with `value`) + adjustment + totals; `usd_reference` only on JPY; the model has no `confidence_note`/`source_snapshot` (leak guard); the preview model carries the watermark flag for `draft\|ready` only. |
| `lib/studio/engagement/format.test.ts` (extend) | `formatMinorUnits(87500,'USD')` → `$875.00`; `(250000,'JPY')` → `¥250,000`. |
| `lib/studio/engagement/generator.test.ts` (new, C3 only) | `containsInvestmentFigure` catches the offer's amounts in each listed format, **skips zero-valued lines**, ignores an amount not in the offer (`$85`), and — documented false positive — flags a client metric equal to an offer amount; `buildProposalUserContent` neutralises angle brackets in every block, includes the offer table, and uses `digest_md` for a partial brief; `PROPOSAL_TOOL.input_schema` has `additionalProperties:false` at every object and no min/max keywords. |
| `lib/studio/engagement/proposal-session.test.ts` | Cookie prefix differs from the questionnaire's; cookie for A does not authorize B; wrong secret, length-mismatched secret (no throw), expired → 410, revoked → 403; `presentedTokenHash` is the sha256 of the cookie value. |
| `components/admin/EngagementRow.test.tsx` (extend) | `proposalLabel`: `—` / `Draft v1` / `Ready` / `Sent · 3d ago` / `Sent · viewed 2×` / `Accepted ✓ $875.00` / `Voided`. |
| `components/analytics/vercel-analytics.test.ts` + `conditional-nav` test (extend) | `/proposal/<uuid>` and `/ja/proposal/<uuid>` excluded / auth-shell; `/proposals` is not. |
| `components/proposal/ProposalAcceptForm.test.tsx` | Disabled until name + checkbox; POST body is `{accepted_by_name, accepted:true}` (no token); 409 → "already accepted", 410 → expired band, 403 → the "open from your email again" card; honeypot present and empty; success copy says "recorded", not "notified". |
| `supabase/tests/engagement_proposals_rls.test.ts` | Below — a **new** file, same harness as `engagement_rls.test.ts` (fixtures, `withPg` for two-connection cases); teardown deletes proposals → briefs → questionnaires → engagements → leads, and empties the bucket prefix. |

**`engagement_proposals_rls.test.ts` — what it must assert:**

- *RLS:* anon and non-admin member denied select/insert/update/delete on `engagement_proposals`; admin full
  CRUD; service role writes freely. All five RPCs: EXECUTE denied for anon, authenticated **and admin**;
  allowed for service role. `engagement_list` exposes the nine new columns and is empty for anon. The bucket
  exists, `public = false`, and anon cannot list or read an object in it.
- *Constraint swap (the upgrade test):* exactly one CHECK covers `engagement_events.kind`; **every** kind in
  the TS `ENGAGEMENT_EVENT_KINDS` inserts; `'proposal_bogus'` is rejected.
- *Hard gate:* `create_engagement_proposal` RAISEs `discovery_not_submitted` with no questionnaire;
  `brief_missing` with a brief from another engagement or a `failed`/`generating` brief; **`brief_stale`
  when the brief's `created_at` precedes the questionnaire's current `submitted_at`** (reopen → resubmit →
  old brief); succeeds with a `partial` brief; lands at `version = 1`, `status = 'draft'`,
  `content_version = 1`, `locale` copied, one `proposal_drafted` event.
- *Uniqueness & slots:* second create without supersede → `23505`; create with `p_supersede_id` → old row
  `superseded` + token revoked + `superseded_by`, new row `version = 2`, one `proposal_superseded`; a
  `withdrawn` row frees the slot; **create RAISEs `proposal_already_accepted` while an accepted row exists,
  and succeeds after void**; supersede of an `accepted`/`withdrawn` row RAISEs `proposal_not_open`.
- *Transitions & guards:* every disallowed transition RAISEs `proposal_transition_invalid` (table-driven
  over the 7×7 matrix); content UPDATE on `sent` → `proposal_content_locked`; content UPDATE on `ready`
  without `status='draft'` → `proposal_ready_content_change`, with it → succeeds and `content_version`
  incremented by the trigger; content UPDATE while `generating` → `proposal_drafting_in_progress`;
  `valid_until` moved earlier on `sent` → `proposal_validity_shortened`, later → ok; on `accepted`: token
  columns / counters / `notification_sent_at` mutable, `accepted_by_name` and `issued_snapshot` immutable.
- *Shape:* `sent` without a snapshot / pdf path / `valid_until` rejected; `link` delivery without a token
  rejected, `manual` with a token rejected; `accepted` without `accepted_via` rejected; `voided` without a
  reason rejected; mode/terms mismatch rejected; totals mismatch rejected; six sections rejected.
- *Issue:* from `ready` with a stale `p_content_version` → `stale`; with a stale `p_engagement_updated_at`
  → `stale`; with a blank `recommendation` → RAISE `proposal_incomplete`; success stores the snapshot, path,
  sha, `sent_at`, defaults `valid_until` to HST today + 30, writes `proposal_sent`; from `draft` → `not_ready`.
- *Accept:* client from `sent` with the right hash → `accepted`, `accepted_via='client'`; engagement
  `tier`/`currency`/`contract_value`/`care_mrr` equal the offer, `stage='build'`, `won_at` set, lead
  `sales_stage='won'`, one `proposal_accepted` (needs attention) + one `stage_changed`; **replay** →
  `already_accepted`, no second event; **wrong hash → `forbidden`**; **revoked before the RPC → `forbidden`**
  (two connections: revoke commits while the accept transaction is waiting on the lock — the accept must
  lose); rotated token → old hash `forbidden`; client past `valid_until` → `expired`, admin past
  `valid_until` → applied; admin with a non-null hash → RAISE; admin on `ready` → `not_open`; engagement
  already at `launch` → money set, stage unchanged, `stage_moved=false`; forced accept on a `lost`
  engagement → `engagement_terminal`; **two concurrent client accepts** → one `accepted`, one event.
- *Lock-order races (two connections each, no deadlock error):* accept vs revise — whichever commits second
  gets a clean verdict (`not_open` for the accept if superseded first; `proposal_not_open` for the revise if
  accepted first); accept vs Lost — Lost first ⇒ accept sees `not_open`/`engagement_terminal`, accept first
  ⇒ Lost sweeps nothing (accepted rows untouched); accept vs void ⇒ void sees `not_accepted` until accept
  commits.
- *Void:* `accepted` → `voided` with reason; engagement `contract_value`/`care_mrr` null, `stage='proposal'`
  when it was `build`, unchanged when `launch`, **`won_at` retained**, lead mirrors back to `proposal`, token
  revoked, one `proposal_acceptance_voided` (needs attention); void on `sent` → `not_accepted`; after void a
  new proposal can be created, issued and accepted.
- *Terminal sweep:* Lost withdraws `draft|ready|sent` rows with events, revokes tokens, leaves `accepted`
  and `voided` untouched; reopening restores nothing.
- *Drafting:* the conditional claim updates exactly one row and a second concurrent claim zero;
  `finalize` with the wrong `run_id` → `applied:false`; with a changed `content_version` → `failed /
  stale_input`; `completed` merges only the five keys (titles, `terms`, `next_steps` and order preserved,
  `content_version` bumped); `completed` on `ready` → `proposal_not_draft`; `failed` requires an error and
  writes `proposal_ai_failed` with `needs_attention`.
- *Token hygiene:* after issue and after accept, the row holds only a 64-hex hash and no
  `engagement_events.data` on the engagement contains a 64-hex string.
- *Touch:* `touch_engagement_proposal_open` bumps counters and writes `proposal_opened` **once** across three
  calls; status stays `sent`.

**Browser smoke — EN + `/ja`.** Both passes: view-source shows the robots meta, `curl -sI` shows all three
headers on `/proposal/<id>` and `/ja/proposal/<id>`, DevTools Network shows **no** `plausible.io` request and
**no** `/_vercel/insights/*` beacon, the PDF downloads with the right filename and is **byte-identical** to the
admin download of the same version (compare sha256), the investment table scrolls inside its own container
at 375 px, inputs ≥16 px, Accept ≥44 px. The `/ja` pass must confirm Noto Sans JP actually renders (computed
`font-family`), line-height 1.7–1.8, letter-spacing 0.02–0.04 em, no `text-justify`, yen with no decimals,
and the PDF's Japanese wraps.

**End-to-end click path** (the human gate before shipping):

1. Open an engagement whose questionnaire is `submitted` and whose brief is `completed`. Confirm **Create**
   is disabled on a second engagement with no brief, with the gate strip explaining why. Reopen and resubmit
   the first questionnaire *without* regenerating the brief → the stale-brief strip appears and Create is
   refused (`brief_stale`); regenerate → Create enables.
2. **Create proposal**: Starter, booking + AI chat add-ons, `asap` timeline, a named `−$150` adjustment,
   `data_basis = provisional`, `valid_until` blank. Confirm the live Investment preview shows base $500,
   **rush $125**, booking $250, AI chat $150, adjustment −$150, **Total build $875.00**, **Monthly care
   $65.00** (25 + 15 + 25), and the wire carries `87500` / `6500`.
3. **Draft with AI**. While it runs, confirm the editor is locked. Confirm the five sections reference a
   discovery answer and an audit finding, the takeaways carry `†`, the recommendation opens with
   awareness-vs-conversion, and **no section contains 875 or 65 in any money format**. Edit two sections;
   retitle one. Confirm `terms` and `next_steps` are the seeded defaults. Open the same proposal in a second
   tab, save there, then save in the first tab → *"changed in another tab — reload"*.
4. **Mark ready** refuses while `recommendation` is blank (blank it to check; note the row returned to
   Draft on that save). Fill → Mark ready → **Download PDF** shows the `PREVIEW — not issued` band.
5. **Issue & send link** → `valid_until` becomes today + 30 → the client email arrives (or the "email failed —
   copy the link" state). Download PDF from admin: no watermark, cover lockup with business + contact +
   issue date, section order, investment table with the rush row, `†` footnote, confidentiality footer.
   Record its sha256.
6. Change the engagement's contact name in the contact card → reload the PDF → **unchanged** (same sha256).
7. **Private window** → paste the link → the URL becomes `/proposal/<uuid>` (token gone), chromeless, the
   document renders, `Download PDF` gives the same bytes. Admin shows `Viewed 1×`.
8. Try to edit a section in admin → refused with the "revise instead" message. **Revise** → v2 at `draft`
   with v1's content and provenance; v1 `Superseded`; the private window's reload shows the "replaced" card.
   Mark v2 ready → Issue & send → open the new link.
9. **Revoke link** in admin while the private window has the accept form open with a name typed → click
   Accept → the "open from your email again" card (the RPC refused, not just the cookie check). **Resend
   link**, open it, **Accept** as "Test Client": the recorded band says *"your acceptance is recorded"*.
   Admin: `Accepted ✓`, stage **Build**, the lead mirrors **Won**, `won_at` set, `contract_value = 87500`,
   `care_mrr = 6500`, Ryan's notification arrived, timeline shows `proposal_accepted` then `stage_changed`.
   Stale tab → Accept again → "already accepted".
10. **Void acceptance** with reason "wrong tier" → proposal `Voided`, engagement back to **Proposal**, lead
    mirrors **Proposal**, money cleared, `won_at` still set, `proposal_acceptance_voided` needs attention.
    **Revise** from the voided row → v3 at draft → change to Pro → Issue for **manual delivery** → download
    the archive → **Mark accepted** with a name → Build again, money = the Pro offer.
11. On a fresh engagement: Issue for manual delivery, download, then try to edit → refused. Move that
    engagement to **Lost** → its proposal `Withdrawn`.
12. Set `valid_until` to yesterday on a `sent` proposal via the DB → the page shows the expired band with no
    form; **Resend link** → `valid_until` refreshed (never earlier), new link works, old link 403s. On an
    `accepted` row: Resend link works and the email says "your accepted proposal"; Revoke link 403s it.
13. Repeat 2–9 on a `locale: 'ja'`, `currency: 'JPY'` engagement: every money cell a yen input with the USD
    reference beside it, no decimals anywhere, JA email subject, JA page chrome, JA PDF wrapping.

## Judgment calls worth a second look

All decided above; flagged because they are the ones most likely to be wrong, in order of consequence.

1. **Accept auto-moves to `build` and writes the money.** Rev 2 gives it a real correction path (void →
   revise → re-accept) and re-validates the credential inside the transaction, but a mistaken click still
   recognises revenue for the minutes until Ryan reads the notification, and `won_at` is retained by 067's
   rule. If Ryan would rather confirm the stage himself, drop the stage update from the RPC and add a
   button; the money write should stay either way.
2. **The archived PDF lives in a new private bucket.** It is the honest answer to "what did the client
   see", but it adds a storage write to the issue path and a bucket to the migration. The alternative —
   re-render from `issued_snapshot` on every download — keeps the *content* pinned but not the bytes.
3. **JPY figures are typed, not derived.** A yen proposal can diverge from the USD reference printed beside
   it; the document shows both on purpose. If that reads as an unintended discount, drop the `usd_reference`
   line from JPY documents (one flag in `buildProposalDocModel`).
4. **Saves are blocked while the AI drafts** (~30–60 s). Simpler and safer than merging a run against
   changed input; the cost is a short read-only window Ryan will notice once.
5. **No edits after issue, even for a typo.** Revise is two clicks and the client gets a "replaces the
   earlier version" line. Reversal: allow `title`/section-title edits on `sent` in guard rule 3.

## Files — the complete list

**New**
- `supabase/migrations/074_studio_proposals.sql`
- `supabase/tests/engagement_proposals_rls.test.ts`
- `lib/studio/engagement/proposal-schema.ts` (+ `.test.ts`)
- `lib/studio/engagement/proposal-pricing.ts` (+ `.test.ts`)
- `lib/studio/engagement/proposal-terms.ts`
- `lib/studio/engagement/proposal-markdown.ts` (+ `.test.ts`)
- `lib/studio/engagement/proposal-document.ts` (+ `.test.ts`)
- `lib/studio/engagement/generate-proposal-pdf.ts`
- `lib/studio/engagement/proposal-token.ts`
- `lib/studio/engagement/proposal-session.ts` (+ `.test.ts`)
- `lib/studio/engagement/proposal-actions.ts`
- `lib/studio/engagement/proposal-draft.ts`
- `lib/studio/engagement/proposal-notify.ts`
- `lib/studio/engagement/generator.test.ts` (C3 assertions only)
- `components/admin/EngagementProposalPanel.tsx`, `ProposalPricingForm.tsx`, `ProposalSectionsEditor.tsx`, `ProposalVersionList.tsx`
- `components/proposal/ProposalDocument.tsx`, `ProposalBlocks.tsx`, `ProposalAcceptForm.tsx` (+ `.test.tsx`), `ProposalFatalCard.tsx`, `copy.ts`
- `app/[locale]/proposal/[id]/page.tsx`
- `app/api/engagement/proposal/enter/[token]/route.ts`
- `app/api/engagement/proposal/[id]/accept/route.ts`
- `app/api/engagement/proposal/[id]/pdf/route.ts`
- `app/api/admin/engagements/[id]/proposal/[proposalId]/draft/route.ts`
- `app/api/admin/engagements/[id]/proposal/[proposalId]/pdf/route.ts`

**Modified**
- `lib/studio/engagement/types.ts` (event kinds, proposal vocabulary), `generator.ts` (C3 block), `emails.ts` (two senders), `format.ts` (+ `.test.ts`, `formatMinorUnits`)
- `lib/admin/types.ts`, `lib/admin/queries.ts`
- `app/[locale]/admin/studio/engagements/[id]/page.tsx` (panels slot + stale flip + proposals fetch)
- `components/admin/StatusBadge.tsx`, `EngagementTimeline.tsx`, `EngagementRow.tsx` (+ `.test.tsx`), `AdminEngagementsList.tsx`
- `components/layout/conditional-nav.tsx` (+ its test), `components/analytics/vercel-analytics.tsx` (+ its test), `next.config.ts`, `app/[locale]/layout.tsx` (**index-only blob**: HEAD + the one `data-exclude` line)

**Never touched:** anything under `lib/progress/`, `lib/json-ld.ts`, `lib/email/send.ts`, migrations 065/068–073 and their suites, smashhaus/workbench/prelaunch files, `__tests__/*` extras.
