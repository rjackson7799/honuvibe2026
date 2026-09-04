# Studio Engagement Spine + Client Discovery

> **STATUS: APPROVED by Ryan 2026-09-04 (rev 2). Slice 1 (the spine) SHIPPED 2026-09-04** — migration
> 067 (covers both slices), `engagement_rls.test.ts`, the pure `lib/studio/engagement/*` modules, the
> `lead-actions.ts` conditional-status fix, and the admin list / workspace / stage control / timeline.
> **Slice 2 (discovery) is NOT built.** Per CLAUDE.md, execute it in a **fresh session**, and do not
> start it until 067 has been applied on prod (manual, Supabase dashboard SQL editor).
>
> **Rev 2 (2026-09-04)** — incorporates external review round 1: submission is now one transaction
> (lock → required check → snapshot → CAS → event → brief claim), one questionnaire per (engagement, kind) is
> a hard UNIQUE, `closed` is formalized as a second terminal stage, stage-anchor semantics are defined,
> `start_engagement` checks eligibility server-side, the cookie is questionnaire-scoped, send/resend/reopen
> semantics are specified, manifest edits reconcile answers and carry `questions_version`, AI input has a
> budget, and the brief keeps a permanent `digest_md`. The hashed-IP idea was dropped rather than hardened.
>
> Decisions in "Locked decisions" were settled with Ryan during the brainstorm and should not be
> re-litigated during execution. The two calls most likely to be wrong are flagged at
> "Two judgment calls worth a second look" — those are the ones to argue with on review.

## Context

HonuVibe Studio is about to take real paying clients, and the software stops halfway.

Origination works end to end: `prospects` (Google Places search + "outdated site" scoring, migration 061)
converts into `leads` via the `convert_prospect` RPC; `lead_audits` (060) generates a website audit and a
sales narrative; `lib/studio/outreach-generator.ts` drafts the outreach email; `client_previews` (057)
delivers a password-gated mockup. That is the whole flywheel the Studio Lead Engine master plan promised:
**search → score → convert → audit → outreach → preview → close.**

And then it ends. `leads.sales_stage` can be set to `won`, and `won` is inert — it fires the same generic
`UPDATE`, triggers nothing, creates nothing, unlocks no UI. There is no table anywhere in migrations 001–066
shaped like `engagements`, `projects`, `deliverables`, or `invoices`. A won lead has a company name, a
contact, an audit history, an outreach draft and a preview URL — and then nothing. There is nowhere to
record what was sold, what is being built, what is due, or what was billed.

The `studio-client-engagement` skill prescribes a 7-stage workflow (pre-meeting research → discovery meeting
→ processing → follow-up → data handoff → proposal → per-client project hygiene) and insists on
**"Real data before proposals. Always."** None of that workflow is implemented. There is no per-client folder
convention on disk, no questionnaire artifact, no discovery record. Discovery today is a Markdown file
Ryan writes by hand and emails.

This unit builds the missing half: the **engagement spine** (a client record that owns the stages
Discovery → Proposal → Build → Launch → Care) and the **discovery questionnaire** that opens it — a
tokenized, no-account link a client fills in at their own pace, whose answers land on the engagement and
get turned into an internal discovery brief.

Intended outcome: Ryan can qualify a lead, open an engagement, have Claude tailor a discovery questionnaire
from a reusable template using what the audit already found, send one link, and get structured answers plus
a brief back — instead of emailing a Markdown file and re-typing the replies.

## Locked decisions

Settled with Ryan before design. Do not revisit during execution.

| # | Decision | Consequence |
|---|---|---|
| 1 | **Engagement opens at `qualified`**, not at `won` | The lead pipeline shrinks to `new → qualified → lost`. Once an engagement exists, its `stage` is the single source of truth; a DB trigger mirrors back onto `leads.sales_stage` so the existing `/admin/studio/leads` list and filter chips keep working. |
| 2 | Stages: `discovery → proposal → build → launch → care`, plus **two terminal stages: `lost` and `closed`** | Discovery precedes the proposal, matching the skill's "real data before proposals". `closed` is a care plan that ended amicably — not a loss — and maps to `won` so finished clients never leave the won bucket. Both terminals are reached from explicit confirm actions, not the five-button control. |
| 3 | **Tokenized magic link, no client account** | Client never signs up. Store a hash, never the raw secret — follow `discovery_sessions.session_secret_hash`. |
| 4 | **One language per questionnaire** (`locale` on the instance) | Deliberate departure from the survey engine's `_en`/`_jp` column pairs. You author in the client's language; no half-translated questionnaires. |
| 5 | Question types **`single` · `multi` · `text`** only, plus `allow_other` on choice types and `long` on text | Ranking and scale cut. The sample doc's one ranking question becomes a `multi` capped at 2. |
| 6 | **Template + AI tailoring** | Reusable templates; Claude tailors one into a per-engagement instance using lead context (industry, `existing_url`, notes, latest `lead_audits` summary/findings). Ryan reviews and edits before sending — the house "AI drafts, human edits, then sends" loop from `outreach-generator.ts`. |
| 7 | On submit: **notify Ryan + AI discovery brief** | Internal brief only (exec summary · working/not working · opportunities · questions for the call), following the `lead_audits` `generating\|completed\|partial\|failed` pattern. A client-facing recap is a later unit. |
| 8 | Scope this unit = **discovery + spine only** | Proposal, fulfillment funnel, win tracker and billing are designed-for but not built. |
| 9 | Built for **5–15 concurrent engagements** | Rich per-client detail and stage aging are worth it; aggregate dashboards and automation are not, yet. |

Next free migration number is **067** (066 is the latest committed; 065 is present but uncommitted).

## Data model — migration `067_studio_engagement.sql`

Five tables, all `ENABLE ROW LEVEL SECURITY` with a single `*_admin_all` policy
(`USING (public.is_admin()) WITH CHECK (public.is_admin())`) and **no anon or member policy anywhere** —
matching `discovery_sessions`/`discovery_responses`. The anonymous client reaches its questionnaire only
through a service-role route that has already verified the token hash. An RLS predicate cannot see a cookie,
so an anon policy would have to key off something forgeable.

| Table | Shape |
|---|---|
| `engagements` | `lead_id` → `leads` **`ON DELETE RESTRICT`**, `title`, `locale`, `client_contact_{name,email}`, `stage`, `stage_entered_at`, `tier`, `currency`/`contract_value`/`care_mrr`, `won_at`, `care_started_at`, `care_ended_at`, `ended_at`, `lost_reason`, `next_action`/`next_action_due_at`, `notes`. |
| `engagement_events` | `kind`, `actor`, `from_stage`/`to_stage`, `summary`, `data jsonb`, **`needs_attention`** + `resolved_at`. |
| `engagement_questionnaires` | `engagement_id`, `kind`, `locale`, `title`, `intro_md`, **`sections jsonb`**, **`questions jsonb`**, `questions_version`, `status` ∈ `draft \| ready \| sent \| in_progress \| submitted`, tailoring run state (`tailoring_status`, `tailoring_error`, provenance), token columns (`access_token_hash`, `token_issued_at`, `token_expires_at`, `token_revoked_at`), open counters, `sent_at`, `submitted_at`, `notification_sent_at`, `answer_snapshot`. **`UNIQUE (engagement_id, kind)`** — one row per kind, always; reopen and "start over" transition the same row. Expiry and revocation are token columns, not statuses. |
| `engagement_questionnaire_answers` | `questionnaire_id`, `question_id text`, `answer jsonb`, `other_text`, `questions_version int` (the manifest version the answer was written against), `UNIQUE (questionnaire_id, question_id)`. |
| `engagement_briefs` | `engagement_id`, nullable `questionnaire_id`, `status`, **`digest_md`** (deterministic, phase 1, never overwritten), `brief_md` (narrative, phase 2), `structured jsonb`, `source_snapshot jsonb`, provenance, `generation_error`, `completed_at`. |

`ON DELETE RESTRICT` on `lead_id` is deliberate: an engagement is the revenue record, so deleting a lead
that has one should be a loud error, not silent data loss. **Watch out** — `prospects_rls.test.ts`'s
`beforeEach` bulk-deletes leads; harmless today, but the new RLS test must delete engagements before leads.

**Money is `integer` minor units + a `currency` column** (USD cents / JPY yen, which is zero-decimal),
matching `payments.amount` in migration 008. Not `numeric`.

**Timestamps: five anchors, not seven per-stage columns.** `stage_entered_at` (→ "days in stage", the single
highest-value attention number, never stale), `won_at` (revenue recognition), `care_started_at` /
`care_ended_at` (MRR months — not recoverable from `stage_entered_at` once the engagement moves on), and
`ended_at`. Full per-stage history lives in `engagement_events`, written by the trigger so it cannot be
missed. That satisfies "don't preclude the win tracker" with four columns instead of seven sparse ones
maintained by a seven-branch trigger.

### Questions are jsonb on the instance, not child rows

The three arguments for rows were examined and two of them don't survive:

- *"Answers must survive later question edits"* — a **red herring for the storage decision**. Migration 049
  already proves it: `survey_questions` is fully mutable, and meaning is protected by
  `event_survey_responses.answer_snapshot` pinned at submit. Both shapes need the same snapshot. Neutral.
- *"`validateAndSnapshot` expects rows"* — it does not. Its signature takes `EventSurveyQuestion[]`, an
  **in-memory array**; the row-ness lives in the loader in `lib/survey/event-surveys.ts`. A jsonb column
  deserializes to the same shape with a *smaller* mapper. Weakest of the three.
- *"AI drafts a whole set at once"* — this one favours jsonb decisively. With rows, `DELETE all + INSERT n`
  must be transactional, so re-drafting needs a ~60-line RPC. With jsonb it is one
  `UPDATE … SET questions = $1, questions_version = questions_version + 1` — atomic for free, and the
  version bump makes "which manifest was this answered against" a first-class fact.

Two more reasons: there is **no independent per-question lifecycle** (no reorder RPC, no permalink — Ryan
edits the instance as a document), and **cross-instance question analytics is dead on arrival by
construction** — decision #6 makes every instance's questions AI-tailored per client, so there is no shared
"Q7" to aggregate.

What jsonb loses, accepted explicitly: you cannot `CHECK` the interior. Follow migration 066's stated policy
verbatim — *"jsonb interiors are bounded by zod at the write sites (pg_column_size CHECKs are brittle)"*.
SQL guards shape and count only, using the **`CASE` form** (`CASE WHEN jsonb_typeof(questions) = 'array'
THEN jsonb_array_length(questions) <= 40 ELSE false END`) rather than `A AND B`, because SQL `AND` is not a
guaranteed short-circuit and `jsonb_array_length` raises on a non-array.

Question contract, Zod-owned in `lib/studio/engagement/questions-schema.ts`:
`{ id, section_key, qtype: 'single'|'multi'|'text', prompt, help, required, options: {value,label}[],
allow_other, max_select, long }`. **`allow_other` is a reserved sentinel option value injected by the
validator, never stored in `options`** — so the AI cannot emit two "other"s and the label is localized once
in TS. `long` switches the text cap between 500 and 5000. Sections live in a parallel
`sections: [{key, title, blurb}]` array on the questionnaire.

**Answers stay rows.** This is the `discovery_responses` idiom verbatim and it is the *structural* answer to
concurrent autosave: two tabs editing different questions touch different rows and cannot clobber each other.
A single jsonb blob on the questionnaire would lose writes. `other_text` is a sibling column, not a key inside
`answer` — it keeps `answer` shape-identical to `discovery_responses`, is length-CHECKable in SQL, and for
`multi` naturally allows exactly one "other".

**The brief is a table, not columns on the questionnaire.** Retry is the deciding argument: Ryan will
regenerate after a call transcript lands or with a better prompt, and columns allow exactly one. This is
precisely why `lead_audits` is a table and not columns on `leads`. `questionnaire_id` is nullable so a brief
from a meeting transcript later needs no schema change.

### Single-flight guards (the 060/066 idiom, 23505 → 409)

- `uq_engagements_lead` — hard `UNIQUE (lead_id)`.
- `uq_engagement_questionnaires_engagement_kind` — hard `UNIQUE (engagement_id, kind)`. A partial index over
  "live" statuses would let drafts and submitted rows accumulate, contradicting the one-instance panel.
- `uq_engagement_questionnaires_one_tailoring ON (engagement_id) WHERE tailoring_status = 'generating'`
- `uq_engagement_briefs_one_generating ON (engagement_id) WHERE status = 'generating'`
- `uq_engagement_questionnaires_token_hash ON (access_token_hash) WHERE access_token_hash IS NOT NULL`

Terminal-shape CHECKs on `engagements` (lost requires `ended_at` + `lost_reason`; closed requires `ended_at`
and no `lost_reason`), on `engagement_questionnaires` (a `sent`/`in_progress`/`submitted` row **cannot exist
without a token record**; a `submitted` row cannot exist without `answer_snapshot` and `submitted_at`), and
on `engagement_briefs` (`completed` requires `digest_md` + `brief_md` + `structured` + `source_snapshot`;
`partial` requires `digest_md` + `generation_error`; `failed` requires `generation_error` only).

### Stage transitions and timestamp anchors

The five-button control moves between the active stages freely. `lost` and `closed` are reached only from
separate confirm actions (`Mark lost` requires a `lost_reason`; `Close engagement` does not). **Terminal
stages may be reopened** — a revived deal is real — and reopening is any move from a terminal stage back to
an active one.

Anchor semantics, enforced by the `BEFORE` trigger so they cannot drift:

| Anchor | Rule |
|---|---|
| `stage_entered_at` | Always `now()` on any stage change. |
| `won_at` | **First entry** into `build\|launch\|care\|closed`. Never cleared by a transition — revenue is recognised once; a mistaken win is corrected by an explicit admin edit, and the event log shows the reversal. |
| `care_started_at` | First entry into `care`. Not cleared. |
| `care_ended_at` | Set on leaving `care`; **cleared on re-entering `care`** (so `care_ended_at IS NULL` always means "currently in care"). A client with two care windows has the full history in `engagement_events`; the anchors describe the latest window only, and the later MRR rollup reads the events for multi-window clients. |
| `ended_at`, `lost_reason` | Set on entering a terminal stage; **both cleared on reopening**. The event log keeps the prior loss. |

Entering a terminal stage also: revokes any live questionnaire token (`token_revoked_at = now()` on rows with
a hash and `status <> 'submitted'`), and resolves every open `needs_attention` event for the engagement
(`resolved_at = now()`), both in the same `AFTER` trigger that writes the `stage_changed` event. Reopening
does not undo either — Ryan resends a link or re-flags attention explicitly.

### The mirror — one map, five layers of protection

```sql
-- public.engagement_sales_stage_for(text) -> text   IMMUTABLE, SET search_path = ''
-- discovery -> qualified   proposal -> proposal
-- build|launch|care|closed -> won      lost -> lost
-- RAISEs on an unknown stage. Never returns NULL (leads.sales_stage is NOT NULL).
```

Two corrections to the naive map, both from the planner and both adopted:

- **`discovery → 'qualified'`, not `'proposal'`.** Mapping discovery to `proposal` would make the
  `qualified` chip degenerate to "qualified in the last few seconds, before Ryan clicked Start". With this
  map the five existing chips partition the pipeline cleanly: *new · qualified (in discovery) · proposal ·
  won (build/launch/care/closed) · lost*.
- **`closed` exists and maps to `'won'`.** A care plan that ends amicably is not `lost`. If `closed` mapped
  anywhere else, a finished engagement would silently leave the won bucket and the later revenue rollup
  would undercount every completed client.

Protection, strongest first: (1) **one writer** — `tg_engagements_stage_sync` is the only thing that writes
`leads.sales_stage` once an engagement exists; (2) **one map** — those seven lines are the sole encoding, and
a TS twin `lib/studio/engagement/stages.ts` is pinned to it by a parity test, exactly as
`blue_filler_composite_for` ↔ `lib/blue-filler/scoring.ts`; (3) **a hard guard** —
`trg_leads_sales_stage_engagement_guard BEFORE UPDATE OF sales_stage ON leads` raises
`lead_sales_stage_is_engagement_derived` on any conflicting direct write, **including by the service role**,
since triggers are not RLS; (4) the known caller is fixed (see below); (5) a CI drift assertion —
`SELECT count(*) … WHERE l.sales_stage <> engagement_sales_stage_for(e.stage)` must be 0 after a randomised
sequence of stage moves.

**No session-GUC bypass flag is needed**, and that is a feature: the mirror writes *exactly*
`engagement_sales_stage_for(stage)`, so it satisfies the guard by construction. There is no escape hatch to
be abused.

> **This forces a change to shipped code, and skipping it turns the lead form into a 500.**
> `toLeadColumns()` in `lib/studio/lead-actions.ts` *always* emits `sales_stage` on update, so once any
> engagement exists the guard rejects every lead-form save. **Making the schema field optional is not
> enough**: `updateLead()` (`lead-actions.ts:235-246`) builds its patch object with `status: parsed.status`
> unconditionally, and `toLeadColumns` decides by *property presence* (`'status' in patch`), so an optional
> field still produces `sales_stage: undefined` on the wire. The fix is three parts, all in the same slice
> as the trigger: (1) `updateLeadSchema.status` becomes `.optional()`; (2) `updateLead()` constructs the
> `status` property **conditionally** — `...(parsed.status !== undefined ? { status: parsed.status } : {})`;
> (3) the form omits `status` from the payload when an engagement exists. Pin (2) with a unit test that
> asserts the row passed to `.update()` has no `sales_stage` key when `status` is omitted.

`leads.lifecycle` is **not** touched and **not** mirrored — it is the discovery engine's system status and
means something entirely different. Say so in the migration header so nobody later "helpfully" wires it up.
Likewise, **do not tighten `leads.sales_stage`'s CHECK**: prod rows already sit at `proposal`/`won`, and the
mirror is what gives those values meaning now.

### RPCs — all `SECURITY DEFINER`, `SET search_path = ''`, `service_role` EXECUTE only

- **`start_engagement(p_lead_id) RETURNS TABLE (engagement_id uuid, already_started boolean)`** — the
  `convert_prospect` mould. Order matters: (1) lock the **lead** `FOR UPDATE` (not the engagement — it may
  not exist yet, so there is no row to lock; this lock is what serialises a double-click); (2) if an
  engagement already exists, return it with `already_started = true` — **before** the eligibility check,
  because the mirror has already moved the lead off `qualified`; (3) otherwise **require
  `sales_stage = 'qualified'`** and raise `lead_not_qualified` if not — the disabled button is UX, this is
  the enforcement, and a stale tab or direct call must not start an engagement from `new`, `won` or `lost`;
  (4) insert, seeding `title` from `business_name`, `locale` from `source_locale`, contacts from
  `leads.name`/`email`, `tier` from `NULLIF(tier_interest,'not_sure')`. The initial `stage_changed` event
  and the mirror are trigger-produced in the same transaction. Writes **no** `sales_stage` — one writer only.
- **`submit_engagement_questionnaire(p_questionnaire_id) RETURNS jsonb`** — **the whole submission is this
  one transaction**, so there is no window between "read the answers" and "flip the status" for an autosave
  to slip through. In order: (1) `SELECT … FOR UPDATE` on the questionnaire row — this waits for any in-flight
  autosave holding the `FOR KEY SHARE` lock the answer trigger takes (below), and blocks new ones until
  commit; (2) if `status NOT IN ('sent','in_progress')` return `{"applied":false,"reason":"not_open"}`;
  (3) **required check in SQL** — for every question with `required = true` in the stored `questions`
  manifest, an answer row must exist with a non-empty value (`answer <> '""'`, non-empty array, or
  `other_text` present when `answer = '"__other"'`); on failure raise `required_missing` with the offending
  ids; (4) build `answer_snapshot` as **the pinned manifest plus the raw answers** —
  `{questions_version, sections, questions, answers: [{question_id, answer, other_text}]}` — which is
  strictly more information than pinning labels, trivially atomic, and lets rendering resolve labels from
  the snapshot forever; (5) `status = 'submitted'`, `submitted_at = now()`; (6) insert the
  `questionnaire_submitted` event with `needs_attention = true`; (7) **insert the brief claim row**
  (`engagement_briefs` at `status = 'generating'`) so the paid generation is durably scheduled even if the
  request dies a millisecond later; (8) return `{"applied":true,"engagement_id","brief_id"}`. A replay hits
  step 2 and returns `applied:false` with no second event, no snapshot overwrite and no second brief.
  The TS submit route validates first for good client-side error messages (which section, which question),
  but **the RPC is authoritative** — the TS check is UX, not enforcement.
- **`finalize_engagement_questionnaire_tailoring(...)`** / **`finalize_engagement_brief(...)`** — the
  `finalize_blue_filler_research` CAS clone, returning `{"applied": bool}`; every contract violation RAISEs.
  If the request dies after the brief claim is inserted but before generation finishes, the row sits at
  `generating` until the admin's next read, where `flipStaleBriefs` (>7 min) flips it to `failed` with a
  curated `generation_error` and a `Regenerate` button — the audit engine's existing recovery path, reused
  as-is. **Notification is best-effort, not transactional:** the durable "Ryan must look at this" signal is
  the `needs_attention` event row, which the admin list surfaces regardless of email. The submit route sends
  the email after the RPC returns `applied:true` and stamps `notification_sent_at`; the discovery panel shows
  `Notification not sent — resend` whenever `submitted_at` is set and `notification_sent_at` is null. No
  retry queue — at this volume a visible resend beats invisible machinery.
- **`touch_engagement_questionnaire_open(id)`** — the `bump_preview_access` mould (supabase-js cannot
  increment). Bumps `open_count`, sets `first_opened_at` once, flips `sent → in_progress`, and writes a
  `questionnaire_opened` event **only on the first open** so repeat opens don't spam the timeline.

### Two more triggers worth their weight

- **Append-only on `engagement_events`** — a `BEFORE UPDATE` guard raising unless only `resolved_at` changed.
  Honest limitation to note in the migration: DELETE is *not* blocked, because a `BEFORE DELETE` guard would
  also block the `ON DELETE CASCADE` from `engagements`.
- **Answer lock** — `BEFORE INSERT OR UPDATE OR DELETE` on answers. It reads the parent with
  **`SELECT status, questions_version … FOR KEY SHARE`** — the weakest row lock that still conflicts with
  the submit RPC's `FOR UPDATE` — so an autosave in flight when submission begins holds the RPC until it
  commits (and is therefore *in* the snapshot), and an autosave that starts after the RPC takes its lock
  waits, then sees `submitted` and raises `questionnaire_not_open`. That pairing is what makes "the snapshot
  equals the answers table" an invariant rather than a claim. Rules: INSERT/UPDATE allowed only while the
  parent is `draft|ready|sent|in_progress` (`draft`/`ready` so Ryan can test-fill); INSERT/UPDATE also
  raises `stale_manifest` if `NEW.questions_version <> parent.questions_version`; DELETE allowed only while
  the parent is `draft|ready` (the manifest-save path clears answers) **or when the parent row is not found**
  — that case is the `ON DELETE CASCADE` from the questionnaire itself, whose row is already gone in the
  trigger's view, and an orphan cannot otherwise exist because of the FK.

### `needs_attention` is asserted at write time, not derived

The naive alternative is scanning the timeline and comparing against stage rules — a correlated per-engagement
query with business logic in TS. Instead the writer who knows sets the flag (`questionnaire_submitted` and
`brief_generated` set it; `stage_changed` doesn't), clearing is `SET resolved_at = now()`, and the whole
"what needs my attention today" query is one partial-index scan with no aggregates:
`idx_engagement_events_open_attention ON (created_at DESC) WHERE needs_attention AND resolved_at IS NULL`.

### `validateAndSnapshot` — fork it, copy the discipline

Reuse verdict, honestly: the jsonb-vs-rows objection is **not** a blocker, but three others are.
`SnapshotItem` is hard-wired to `prompt_en`/`prompt_jp` and `label_en`/`label_jp` pairs, and decision #4
makes us single-locale — generalising it ripples into `event-summary.ts`, `course-summary.ts`,
`send-presenter-summary.ts` and both live submit routes, for zero behavioural gain on shipped, tested,
actively-collecting code. `allow_other` has no representation (`invalid_option` would reject it, and the
`{clean, snapshot}` return has no channel for the free text). And `MAX_TEXT` is a module constant, not
per-question.

The decisive one is **autosave**: it must validate a single answer with `required` *not* enforced but
`too_long`/`invalid_option`/`too_many` still enforced, which the current signature cannot express.

So the fork's shape is different from the original, because the snapshot is no longer built in TS:

- **`validateOneAnswer(question, raw, otherText)`** — the *authoritative* per-answer validator, run by the
  autosave route on every write. Because every stored answer has passed it against the manifest version it
  was written for (the trigger rejects a stale `questions_version`), the answers table only ever holds
  individually-valid answers. Errors: `unknown_question` · `too_long` · `invalid_option` · `too_many` ·
  `other_required` · `other_not_allowed`.
- **`findMissingRequired(questions, answers)`** — the submit route's pre-check, returning the missing ids
  grouped by section so the client can jump to the first one. **UX only** — the RPC re-checks `required` in
  SQL and is the enforcement.
- **No `validateAndSnapshotEngagement`.** The snapshot is built inside `submit_engagement_questionnaire` as
  pinned manifest + raw answers; a small `renderSnapshot(snapshot)` in TS resolves labels from the pinned
  manifest for the admin answers view, the digest, and the brief prompt.

Copy wholesale from the original: never trust the client, re-derive from the stored manifest, dedupe
`multi`. If a single validator is ever wanted, the correct refactor is to extract a core parameterised by
`labelOf(option)` and make the event/course validator a thin wrapper — **do not attempt that in 067.**

## Naming

Nav label and route are **Engagements**, not "Clients": the stage vocabulary is per-*project*, and the day a
client buys a second build, "Clients" lies. The workspace `<h1>` still renders the **company name** with a
small `Engagement · Discovery` eyebrow, so it reads as the client while the data stays honest.

`components/admin/AdminNav.tsx:75-80` gains one item between Studio Leads and Prospects. No `isItemActive`
special case is needed — `/admin/studio/leads` and `/admin/studio/engagements` are sibling prefixes, so the
default `startsWith` match already disambiguates them.

## Surfaces

### Admin

| Route | File | Notes |
|---|---|---|
| `/admin/studio/engagements` | `app/[locale]/admin/studio/engagements/page.tsx` | Copy of the leads list page's shape. **No "New" button** — creation is a lead-workspace action. |
| `/admin/studio/engagements/[id]` | `app/[locale]/admin/studio/engagements/[id]/page.tsx` | **No `id === 'new'` branch** — an engagement without a lead is meaningless. `notFound()` on miss. |

New components in `components/admin/`, all following existing panel chrome
(`rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4`):

- **`AdminEngagementsList.tsx`** — mirrors `AdminStudioLeadsList.tsx` 1:1 (same chip constants, same table
  chrome). Columns `Client · Stage · Discovery · Last activity · Started` — five, not six; Email/Source are
  lead-acquisition facts that belong on the lead page. The **Discovery** column is the one Ryan scans:
  `—` / `Draft` / `Sent · 3d ago` / `12 of 24` / `Submitted ✓` / `Brief ready`.
- **`EngagementRow.tsx`** — copies `StudioLeadRow.tsx`'s expand-on-click pattern.
- **`EngagementStageControl.tsx`** — a segmented five-button control over the active stages, not a
  `<select>`; two separate ghost actions with confirm, `Mark lost` (prompts for `lost_reason`) and
  `Close engagement`. When the engagement is terminal the segmented control still renders — clicking any
  active stage is the reopen path, with its own confirm. Every stage change `revalidatePath`s the
  engagements list, the engagement page **and `/admin/studio/leads/<leadId>`**, because the mirror just
  changed that page's data. Below it, in `text-[12px] text-fg-tertiary`:
  `Stage since Mar 14 · mirrors to lead status "Won"` — telling Ryan the mirror exists so the lead page's
  frozen badge isn't a mystery. **Any transition is allowed**; one operator, 15 engagements, a state machine
  here only produces "why won't it let me".
- **`EngagementDiscoveryPanel.tsx`** — the centerpiece; six states off `questionnaire.status`
  (none → `draft` → `ready` → `sent` → `in_progress` → `submitted`). The lifecycle semantics the panel
  implements, stated once so the actions, the RPCs and the tests agree:
  - **Draft / Ready.** Any manifest save (edit, reorder, re-tailor) in `draft` or `ready` **deletes all
    existing answer rows** for the questionnaire and bumps `questions_version` — draft test-fills are
    throwaway, and this is what keeps a deleted or retyped question from stranding an answer that would
    later block submission. `Mark ready` is the human-review gate; `Back to draft` reverses it.
  - **Send.** `sendQuestionnaire()` requires `status = 'ready'` and a `client_contact_email`; it mints the
    token, stores only the hash, sets `sent_at` + `token_expires_at` (+45 days), **emails the client** via
    Resend (EN + JA templates, in `questionnaire.locale` — the JA copy ships flagged for native review per
    CLAUDE.md's no-unreviewed-machine-translation rule, alongside the questionnaire chrome's `T.ja` strings),
    logs `questionnaire_sent`, and returns the URL
    **once** for copy. If the email fails the token is still valid: the action returns
    `{url, emailed: false}` and the panel says *"Email failed — copy the link and send it yourself."*
  - **After send, editing is reword-only.** Prompts, help text and option *labels* may change (typos);
    adding/removing questions, changing a type, or changing option *values* is blocked in the editor and
    rejected by the action. Rewording does not bump `questions_version`.
  - **Resend = rotate.** The plaintext is never stored, so "find the link later" is `Resend`: new token,
    old one revoked, expiry extended, a fresh email, another `questionnaire_sent` event. `Copy link` exists
    only in the send/resend response. `Revoke link` revokes without replacing.
  - **Submitted → Reopen.** `reopenQuestionnaire()` moves `submitted → in_progress`, **retains**
    `answer_snapshot` (it is the record of what was submitted; a resubmit overwrites it), logs
    `questionnaire_reopened`, and requires the token to still be valid (else Ryan resends first). It is
    refused with 409 while a brief is `generating`. Existing briefs are kept; the brief panel marks any
    brief whose `created_at < questionnaire.submitted_at` as *"from a previous submission"*. A resubmit
    produces a new event, a new notification and a new brief — history is already modelled.
  - **Start over** (any status) resets to `draft`, revokes the token, clears answers and
    `answer_snapshot`, and logs an event. Same row — there is never a second row per kind.
- **`QuestionnaireEditor.tsx` + `QuestionnaireQuestionEditor.tsx`** — **copy, don't import**,
  `components/admin/event-survey/{QuestionList,QuestionEditor,OptionsEditor}.tsx`. They're 90% right but
  hard-bound to EN/JP **pairs** (decision #4 makes us single-locale), have no section grouping, and lack
  `allow_other`/`long`. Keep their `move(index, dir)` reorder, `editing: string | 'new' | null` state,
  `useTransition` + inline error, and exact Tailwind classes.
- **`EngagementAnswersView.tsx`** — section-grouped `<dl>`. Choice answers render the option **label from the
  pinned snapshot**, not a live join. Free text goes through **`CommunityMarkdown`** — it is client-authored,
  therefore untrusted (`never dangerouslySetInnerHTML`, per the audit panel's rule).
- **`EngagementBriefPanel.tsx`** — near-literal fork of `StudioLeadAuditPanel.tsx`'s polling machinery
  (`POLL_MS = 5000`, `pollRef`/`aliveRef`, `?poll=1`, stop + full reload on terminal, cleanup on unmount).
- **`EngagementTimeline.tsx`** — reverse-chron `engagement_events` with a note composer.

`StatusBadge.tsx` gains `discovery`/`build`/`launch`/`care`/`closed` and questionnaire `ready`/`sent`/`in_progress`/`submitted`
(`proposal`, `lost`, `draft`, `generating`, `completed`, `partial`, `failed` already exist).

Queries append to `lib/admin/queries.ts` after `getProspects` (same throw-on-error rule — never return `[]`
on a query error): `getEngagements`, `getEngagementById`, `getEngagementForLead`, `getEngagementEvents`,
`getEngagementBriefs`, `getLatestEngagementBrief`. Types append to `lib/admin/types.ts` after the Prospect
block so the studio types stay contiguous. **Pre-aggregate the questionnaire progress counts in SQL**, not
with an N+1 in the page — at 15 rows an N+1 is invisible, which is exactly how it survives to 150.

### Lead workspace changes — four edits

1. `app/[locale]/admin/studio/leads/[id]/page.tsx` fetches the engagement alongside the lead
   (`Promise.all([getStudioLeadById, getEngagementForLead])`) and passes it down.
2. In `AdminStudioLeadForm.tsx`, the status `<select>` is **replaced** (not hidden) when an engagement exists:
   a `StatusBadge` + `Managed by the engagement (stage: …)` + `Open engagement →`.
3. **Server-side enforcement in `lib/studio/lead-actions.ts`.** This is the sharpest bug risk in the unit: if
   the select ever posts, `toLeadColumns` writes `sales_stage`, and the *next* engagement stage change
   silently reverts it — a ghost bug that reads as "the admin doesn't save". Do **both**: omit `status` from
   the client payload, *and* have `updateLead()` reject a `status` change when a live engagement exists.
4. A new edit-mode-only `<Section title="Engagement">` carrying the **Start engagement** button — disabled
   with *"Mark this lead Qualified and save to start an engagement"* until `status === 'qualified'`.

`StudioLeadRow.tsx` gains an `Open engagement →` action and a small teal `Engaged` dot (one added column on
the existing aliased select). **Leave the leads-list filter chips alone** — once engagements drive
`sales_stage`, `won` correctly means "in build/launch/care".

### Client-facing questionnaire

```
GET  /api/engagement/enter/[token]     → 303 to the locale-correct questionnaire
     app/[locale]/discovery/[id]/page.tsx      /discovery/<uuid>  ·  /ja/discovery/<uuid>
POST /api/engagement/[id]/answer       autosave
POST /api/engagement/[id]/submit       submit
```

**Route placement.** `app/studio/**` is unavailable — `middleware.ts` excludes `studio(?:$|/)` so Sanity
Studio can own it, and with `localePrefix: 'as-needed'` the EN URL of `app/[locale]/studio/...` *is*
`/studio/...`, which never reaches middleware and resolves into the CMS. Both non-`[locale]` trees are rejected on **verified** evidence, not preference:
`app/studio-site/layout.tsx:41` is `<html lang="en">` with only `inter` + `dmSerif` **and** mounts
`<StudioNav />` — so a JA questionnaire at `studio.honuvibe.ai/q/<id>` would render Japanese in a Latin
fallback font underneath the Studio marketing nav. `app/app-site/` is rejected on the same JP
typography: its isolated root layout hardcodes `<html lang="en">` with only Latin fonts, so a JA
questionnaire would violate the CLAUDE.md JP type rules in a way a nested layout cannot fix. A new
subdomain tree is rejected as over-build for 15 clients. **`app/[locale]/discovery/[id]/` wins**: it inherits
`setRequestLocale`, correct `<html lang>`, and `notoSansJP.variable` free from `app/[locale]/layout.tsx`,
matches the `/survey/[slug]` precedent by shape and purpose, and needs no middleware change. `/discovery` is
verified free of route, redirect, and `MARKETING_PATHS` collisions.

**Locale is owned by the entry route** — it redirects to the prefix matching `questionnaire.locale`; the page
308s back if the prefixes disagree. The client never chooses; no `LangToggle` renders.

**Renderer: a third one, in `components/engagement/`** (~5 files, ~600 lines). Extending
`components/survey/SurveyForm.tsx` is rejected — it has two live consumers collecting responses right now,
its architecture is "one `useState`, validate on submit, POST once", and its question type is bilingual
pairs; adding sections + autosave + resume + `allow_other` doubles it and changes its data flow at the root.
Lifting `components/discover/*` is rejected — `DiscoverFlow` is welded to the Build It AI pricing funnel
(`LivePriceTotal`, `priceFromAnswers`, the compile-time `lib/questions.ts` set, `discoverPath()`), and its
CSS is mounted by the `app-site` layout. It borrows without importing: the reducer + per-question
`timers.current[id]` debounce + `hydrated` gate from `DiscoverFlowProvider.tsx`, the entire visual language
and inline `const T = {en, ja}` copy convention from `SurveyForm.tsx`, and the `data-state` step attribute
from `StepRail.tsx`. **Tripwire: if a fourth question renderer appears, consolidate** on a shared
`QuestionField` primitive.

**Auth is a cookie exchange, not a bearer token per request.** `/api/engagement/enter/[token]` looks up
`sha256(token)`, `timingSafeEqual`s, sets an `httpOnly` cookie, logs the open, flips `sent → in_progress`,
and 303s to a UUID-only URL — so the secret never lands in history, analytics, or a `Referer`. This is
`lib/discover/session.ts` ported in structure into `lib/studio/engagement/session.ts` (89 lines; copying
beats generalizing a shipped module) — **with one deliberate change**: `discover` uses a single
`hv_discover` cookie, which would make entering questionnaire B silently drop authorization for A (bad for
Ryan's testing, worse for a repeat client). Use a **questionnaire-scoped name**, `hv_engq_<questionnaireId>`,
the pattern `lib/previews/gate.ts` already uses (`hv_pv_` + `cookieNameFor`). Attributes: `HttpOnly`,
`Secure` in production, `SameSite=Lax`, `Path=/`, `Max-Age` aligned to `token_expires_at`; value is the raw
secret only (the id is in the name and the route param, and `authorizeSession(id)` reads exactly the cookie
for that id). **Cookie-authenticated writes also check `Sec-Fetch-Site`** — reject when it is *present and*
`cross-site`; an **absent** header passes, because Safari before 16.4 doesn't send it and this is a
client-facing page. It is defence-in-depth on top of `SameSite=Lax`, which is the actual CSRF control; a
`sendBeacon` from the page itself is `same-origin`, so it passes. `token_revoked_at` and `token_expires_at` are checked **inside `authorizeSession`**, not just at
entry, so revoking kills an already-open tab. Expired-on-a-valid-secret returns **410**, distinct from
**403** (unknown id or bad secret — deliberately not distinguished), so the page can say *"this link has
expired — ask Ryan for a new one"* only when that is true. Accepted cost: opening the link in an in-app browser and
later in Safari yields no cookie — the 403 state is therefore not an error page but *"This link needs to be
opened from your email again."* Do **not** add a token-in-body fallback; two auth paths is how one rots.

**Autosave is an API route, not a server action** — a server action re-renders the RSC tree and replays the
router cache on every resolve, which is the wrong shape for a write every ~600 ms. Choice questions save
immediately (0 ms); text debounces 600 ms; flush on blur, on section change, before submit, and on
`pagehide`/`visibilitychange` via `navigator.sendBeacon` (parse the body defensively — a beacon sets no
custom headers). Every save body carries **`questions_version`**; the route returns `409 stale_manifest`
if it doesn't match the stored manifest and the client reloads the questionnaire — a stale tab cannot save
against a newer manifest. Last-write-wins upsert on `(questionnaire_id, question_id)`, exactly like
`discovery_responses` — no merge logic. The one race worth fixing is client-side: **serialize per question
id** with an `inflight` promise chain so two debounced saves can't land out of order.

Recovery is specified, not implied: a failed save retries with **bounded backoff (1 s → 3 s → 8 s)**, then
holds with a manual `Retry`; an `online` listener and a tab-refocus both re-trigger the queue; retries
coalesce (only the latest value per question is ever sent). **Submit first flushes every pending save and
is blocked while any remains failed**, with the message pointing at the unsaved answers. `sendBeacon` on
`pagehide` is best-effort by construction, so the page must be honest about it: a `beforeunload` guard
fires while any field is dirty, and the chip shows `Unsaved` (not `Saving…`) once retries are exhausted.
One `Saving… / Saved · 4 min ago / Unsaved — retry` chip in the sticky header; never a toast.

**The rail lets the client jump to any section at any time**; required-fields are enforced **only at submit**.
Blocking forward movement on a 7-section B2B questionnaire is hostile — real clients skip the revenue
section, finish the easy ones, and come back. This is a deliberate divergence from `DiscoverFlow`'s linear
Continue/Back (a pricing funnel, where each answer feeds the next).

**Submit** runs `findMissingRequired` for a good client-side error (jump to the first missing question),
then calls `submit_engagement_questionnaire` — the single transaction that locks the row, re-checks
`required` authoritatively, pins the snapshot, flips to `submitted`, logs the event and claims the brief.
Only on `applied:true` does the route email Ryan (stamping `notification_sent_at`) and kick generation via
`after()`. The thank-you renders in place. Submission **locks** the questionnaire — because it triggers an
email and a paid AI generation, and silent re-edits would desync the brief from the answers with no way for
anyone to know. Reopen semantics are defined under the discovery panel above.

**Chrome, indexing, analytics** — four edits, each mirroring the `/join/*` precedent exactly:
- Add `discovery` to the auth-shell regex in `components/layout/conditional-nav.tsx` (the alternation now
  reads `…|admin|join|survey\/(?!ai-essentials(?:\/|$))[^/]+|events\/[^/]+\/survey` after the drive-by fix
  below; insert `discovery` after `join`). Kills the dark global `<Nav />` **and** the `pt-14 md:pt-16`
  padding in one token. `ConditionalFooter` is an allowlist and already renders nothing.
- Extend the `next.config.ts` header map (verified at lines 101-108) to
  `['/join/:path*', '/ja/join/:path*', '/discovery/:path*', '/ja/discovery/:path*']`, giving `no-store`,
  `no-referrer`, `X-Robots-Tag: noindex, nofollow` — plus per-page `robots` metadata and `force-dynamic`.
- Add `/discovery/*, /ja/discovery/*` to the Plausible `data-exclude` in `app/[locale]/layout.tsx:80` (its
  own comment says to keep the list in sync).
- Wrap Vercel `<Analytics />` with a `beforeSend` that drops discovery paths. Low-severity (the URL holds
  only a UUID) but *which client is filling out a questionnaire, and when* is genuinely confidential. This is
  the one edit that touches every page — verify the build and one non-discovery page after.

**Abuse.** 256-bit token (`randomBytes(32).toString('hex')`), stored only as `sha256`. `tryConsume` limits:
enter `20/15min` per IP, answer `600/1h` **per questionnaire id** (post-auth, so one client behind a
corporate NAT can't be starved by a colleague), submit `12/1h` per IP (matching the course-survey route).
Note in the code comment that `lib/community/rate-limit.ts` is an in-memory per-instance bucket — the real
defense is the token. Honeypot `company_url` on submit only (silent fake success, the repo's convention).
A leaked link exposes exactly one questionnaire's prompts and answers — not the lead, notes, audit, brief,
other engagements, or any account. Mitigations built this unit: `token_revoked_at` + Revoke button,
`token_expires_at` default +45 days, rotate-on-resend, lock-on-submit, and
`open_count`/`first_opened_at`/`last_opened_at`. **No IP or user-agent is stored, hashed or otherwise** — a
plain hash of a predictable IP is reversible by enumeration, a keyed HMAC scheme is real privacy machinery
for a "opened from N networks" hint Ryan would rarely act on, and the honest answer is that the open
counters already tell him what he needs. Explicitly **not** building IP pinning either — clients move phone
→ laptop → office constantly, and it would generate more support mail than it prevents leaks.

## Questionnaire templates: code, not an admin route

`lib/studio/engagement/templates.ts` — a typed const, no table, no admin UI this unit. The repo already does
exactly this in `lib/questions.ts` (a higher-volume, higher-stakes funnel that has never needed an editor).
Ryan drafts a questionnaire ~twice a month and will edit the *instance* every time (that is decision #6);
he'll edit the *template* perhaps three times in the product's life. An editor is ~500 lines duplicating
`components/admin/event-survey/*` for that. Decisive argument: **the template and the tailoring prompt must
change together** — the tool schema's `template_section_key` enum is derived from the template, so splitting
them across DB and code lets them drift until strict mode starts rejecting valid output.

Ship **one** template, `small_business_discovery`, its seven sections lifted from the
`studio-client-engagement` skill's discovery buckets (the sample questionnaire's real source), with
**economics second** per the skill's "commercial terms first":
`orientation · economics · leadgen · audience · tech_ops · content_brand · goals_capacity`.

The template carries both `_en` and `_ja` strings even though instances are single-locale — the template is
authoring source, the instance is a locale-resolved snapshot. That keeps `/ja` questionnaires from being
machine-translated at request time (a CLAUDE.md rule) while keeping the instance model clean.

## AI routes

Both obey the house rules established by `c981a8d`: raw `fetch` to `api.anthropic.com`, forced
`tool_choice`, **`strict: true`** with `additionalProperties: false` on every nested object, `AbortSignal.timeout`,
guards on `stop_reason === 'max_tokens'` and empty `tool_use.input`, zod `strictObject` validation, and **no**
`temperature`/`top_p`/`top_k`/`thinking` (the 5-series models 400 on them). Strict mode also forbids
`minItems`/`maximum` etc., so bounds live in descriptions + zod, and bounded integers use `enum`.
Both live in `lib/studio/engagement/generator.ts` with a local `EngagementProviderError` — don't import
across feature folders; the audit generator already duplicates rather than couples.
Model: `claude-sonnet-5`, matching the audit narrative and Blue Filler.

**Input budget — per-answer caps alone do not bound cost or latency** (40 long answers permit ~200k
client characters). Both prompts are assembled by one `buildBudgetedContext()` with deterministic
truncation, applied in this order until the total fits: audit summary capped at 8,000 chars; each answer
capped at 2,000 chars with a visible `[… truncated]` marker; then, if the client-answer block still exceeds
**48,000 chars**, answers are truncated proportionally by section (never dropped whole). `MAX_TOKENS =
8000` output, `REQUEST_TIMEOUT_MS = 90_000`. Whenever anything was truncated, `source_snapshot.truncated`
records what and by how much, and the system prompt instructs the model to say so in `confidence_note`. The
digest (phase 1 of the brief) is built from the **untruncated** snapshot — only the model input is budgeted.

All untrusted input — lead notes, `industry`, `existing_url`, audit findings (literally derived from an
attacker-controlled website), and every client-typed answer — goes inside named delimiter blocks
(`<lead_context>`, `<audit_summary>`, `<client_answers>`) after a local `neutralize()`, with a system-prompt
clause forbidding following instructions found inside them. Copied verbatim from the audit generator.

**C1 · Tailoring** — `POST /api/admin/engagements/[id]/questionnaire/tailor`, `maxDuration = 120`,
**synchronous, not 202+poll** (one call, one admin — the audit's poll machinery exists because that pipeline
is a 1.5–3 min crawl + PSI chain; this is the shape of `blue-filler/generate`). The route **persists the
draft before it responds**, which removes the whole "what if the request dies" argument at zero cost.
Synchronous does not mean unclaimed: the route sets `tailoring_status = 'generating'` first (the partial
unique index turns a double-click into a 409), finalizes through the CAS RPC at the end, and the admin
`GET` runs `flipStaleTailoring` (>5 min) so a request that died mid-call leaves a `failed` with a curated
error and a `Re-tailor` button, never a stuck `generating`.
Errors: `409` if the questionnaire isn't `draft` (never overwrite a sent instance), `502` on provider error
with a curated message (never echo provider text), `503` on missing key.

**The model emits no ids, no positions, no locale, no status** — the route assigns them (the Blue Filler
`slug` lesson). The merge is a **pure function** in `lib/studio/engagement/merge.ts`, the most bug-prone
piece and the most testable: an omitted template question is **kept** (never silently lose one; drops must be
explicit), a >40% drop rejects the whole output as a misunderstanding, and coherence is repaired in code —
`long`/`allow_other` forced false off-type, `max_select` clamped to `options.length`, duplicate option values
deduped, choice questions with <2 options downgraded to `text`.

**Human-review gate — carried by the `status` enum, not a separate boolean.** Tailoring always leaves the
questionnaire at `status = 'draft'`; only `markQuestionnaireReady()` moves it to `'ready'`; and
`sendQuestionnaire()` **throws** unless it is `'ready'`. That turns decision #6's "Ryan reviews before
sending" from a hope into a mechanism — the workbench's `jp_needs_review` publish gate applied to the
AI-drafts-human-edits loop — without adding a second flag that could disagree with `status`. The admin panel
renders the amber review strip whenever `status === 'draft'` and `tailoring_status === 'completed'`. For a
`ja` questionnaire, additionally warn when the tailored output contains no CJK codepoints.

**C2 · Discovery brief** — inserted in the submit request (so the panel immediately shows `generating`),
generated in `after()`; regenerate via `POST /api/admin/engagements/[id]/brief`, a near-literal fork of the
audit route including `flipStaleBriefs` on read and the atomic-insert-as-guard (a double submit becomes a
`23505` the route swallows, not a second paid run).

**Two-phase, which is what makes `partial` meaningful:** phase 1 renders **`digest_md`** — its own column,
never overwritten — deterministically in code from the pinned snapshot (section headings, prompt → answer,
option labels resolved from the pinned manifest, `other:` values marked, unanswered as `—`, angle brackets
neutralised) and writes it immediately; this cannot fail for model reasons. Phase 2 writes the narrative
into **`brief_md`** + `structured`. Provider failure ⇒ `partial` (`digest_md` present, `brief_md` null,
curated `generation_error`), so **Ryan always gets a readable answers document within a second of submission
and the AI layer is genuinely optional.** `failed` means phase 1 itself failed, which should only happen on
a malformed snapshot. Tool
fields: `one_liner`, `exec_summary_md`, `working_md`, `not_working_md`, `opportunities_md`,
`questions_for_call[]`, and `confidence_note` — the last earns its place because the failure mode of a brief
is confident synthesis of a half-filled questionnaire, and naming the gaps is what makes it trustworthy on
the call. The system prompt carries the skill's lenses (awareness-vs-conversion, revenue-vs-headcount,
seasonality, retention) and forbids invented figures, restating client self-claims as fact, and naming real
competitors. Every `*_md` renders through `CommunityMarkdown`.

## Explicitly not this unit

| Not building | Attach point |
|---|---|
| **Proposal** (build, send, accept) | `engagement_proposals` + a panel between discovery and timeline; the `proposal` stage already exists, and the brief's `opportunities_md` is its drafting input. `lib/pricing.ts` stays the single numeric source of truth. |
| **Fulfillment funnel** | `engagement_deliverables` + a panel that renders at `build`/`launch`; those stages already exist and `engagement_events` already logs completion. |
| **Client win tracker** | `engagement_outcomes` (`metric_key`, `baseline`, `current`) + a panel at `care`. It reads baselines out of the discovery answers — which is exactly why answers are stored **per question** rather than as one blob. |
| **Integrated billing** | `engagement_invoices` over the existing `lib/stripe/*`; the engagement id is the natural `client_reference_id`. Positioning doc's Phase-1 posture is manual Stripe links, so this is genuinely later. |
| **Client account / login** | Never — decision #3. The cookie exchange is the permanent design, not a stopgap. |
| **Template editor UI** | Add the table, seed from the const, add the route. Nothing here blocks it. |
| **Multiple questionnaires per engagement** | Today: hard `UNIQUE (engagement_id, kind)`, and the panel reads the one row per kind. Later: drop that unique, add a partial `uq_…_one_open ON (engagement_id, kind) WHERE status <> 'submitted'`, teach the panel to list history and pick the newest. No data migration — existing rows already satisfy the partial index. |
| **Client file uploads** | `047` already provisions private `discovery-assets`/`discovery-logos` buckets — reuse them, don't invent a third. |
| **JP admin UI** | Admin is EN-only by repo convention. Only the *client* surface is bilingual. |

## Build order — one migration, two shippable slices

This unit is large (5 tables, 5 RPCs, 6 trigger functions, ~11 lib modules, ~9 admin components, a
5-component client renderer, 5 API routes + 3 pages, ~13 test files) — comparable to the audit engine and prospect finder combined. Ship it as
**two commits**, each independently verifiable, rather than one landing. Migration 067 covers both so there
is only one manual dashboard apply.

**Slice 1 — the spine.** Migration 067 + `engagements_rls.test.ts` (schema-first, gates green before any UI)
→ `types.ts` / `stages.ts` + parity test / `questions-schema.ts` / `validate-answers.ts` + tests (all pure,
no DB) → `queries.ts`, `engagement-actions.ts`, **and the `lead-actions.ts` + `AdminStudioLeadForm` change**
(this must land with the trigger or the lead form 500s) → engagements list, workspace, stage control,
timeline. Ships real value on its own: Ryan can open, stage, and track engagements.

**Slice 2 — discovery.** `templates.ts` → `questionnaire-token.ts`, `questionnaire-actions.ts`, the three
client API routes, `app/[locale]/discovery/[id]/`, the `next.config.ts` / `conditional-nav.tsx` /
analytics-exclusion edits → `components/engagement/*` → `tailor.ts` + `brief.ts` and their `after()` runners
→ the notification. Then the discovery panel, answers view and brief panel wire it into the workspace.

Ship each per CLAUDE.md: `pnpm verify` + `pnpm test:rls` → adversarial review → commit to main → push.
Apply 067 in the Supabase dashboard **after** the slice-1 deploy.

## Two judgment calls worth a second look

Both are already decided in this plan; flagging them because they are the ones most likely to be wrong, and
both are cheap to reverse.

1. **`UNIQUE (lead_id)` forecloses repeat business.** A returning client cannot get a second engagement.
   Shipping the hard unique anyway is deliberate: with two engagements the mirror becomes ambiguous ("which
   one drives `sales_stage`?"), and that ambiguity *is* the stale-mirror failure mode. The unlock is fully
   specified and small — drop the index, add `uq_engagements_one_open ON (lead_id) WHERE stage NOT IN
   ('lost','closed')`, and change only the trigger's lead lookup; `engagement_sales_stage_for` takes a stage,
   so the map is untouched. No speculative `parent_engagement_id` column now, since it would be unusable
   under the current unique.
2. **Templates as a code const, not a table.** Ryan drafts a questionnaire ~twice a month and edits the
   *instance* every time; he'd edit the *template* perhaps three times in the product's life. A table without
   an admin UI is worse than a const (you'd edit it via raw SQL instead of a reviewed diff), and an editor is
   ~500 lines duplicating `components/admin/event-survey/*`. `lib/questions.ts` is the repo's own precedent
   for a code-owned question set in a higher-stakes funnel. Reversal path: add the table, seed from the
   const, add the route — nothing here blocks it.

## Verification

**Gates:** `pnpm verify` (type-check → tests → build) before commit; `pnpm test:rls` is **required** — this
unit adds tables, RLS, and a trigger. Per CLAUDE.md the local RLS run needs the duplicate 022/025 survey
migrations temp-renamed, then restored. Build with `NODE_OPTIONS=--max-old-space-size=8192` (the repo OOMs
at the default heap).

**Prod migration is manual** — after deploy, apply `067_studio_engagement.sql` in the Supabase dashboard on
`zvfwtndbxshrtpwcwynw`. Until then the engagement routes 500. This belongs in the ship report, not just here.

Unit tests as `*.test.ts` beside source (`app` vitest project), highest-value first:

| File | Pins |
|---|---|
| `lib/studio/engagement/stage.test.ts` | The stage → `sales_stage` mirror map, table-driven, plus exhaustiveness over every `EngagementStage`. Riskiest logic in the unit, cheapest to pin. |
| `lib/studio/engagement/merge.test.ts` | Positions from array order; model ids ignored; omitted questions kept; `drop` honored but >40% rejected; off-type flags forced false; `max_select` clamped; 1-option choice downgraded; result always lands at `status = 'draft'`. |
| `lib/studio/engagement/templates.test.ts` | Data invariants (style of `lib/workbench/types.test.ts`): unique keys, choice questions ≥2 unique-valued options, `allow_other` only on choice, `long` only on text, both `_en`/`_ja` non-empty, no option value equals `__other`. |
| `lib/studio/engagement/validate-answers.test.ts` | `validateOneAnswer`: `unknown_question` · `invalid_option` · `too_many` · `too_long` · `other_required` · `other_not_allowed`; a blank answer is **accepted** (autosave never enforces `required`). `findMissingRequired`: groups by section, ignores non-required. `renderSnapshot`: resolves labels from the pinned manifest, not a live lookup. |
| `lib/studio/engagement/context-budget.test.ts` | `buildBudgetedContext`: nothing truncated under budget; per-answer cap applied with marker; proportional-by-section truncation over 48k; `truncated` metadata reports what was cut; digest input is never truncated. |
| `lib/studio/lead-actions.test.ts` | `updateLead()` with `status` omitted passes a row to `.update()` that has **no `sales_stage` key** (property absent, not `undefined`); with `status` present it is emitted. |
| `lib/studio/engagement/session.test.ts` | Port of `lib/previews/gate.test.ts` — hash stable, wrong secret fails, **length mismatch fails without throwing** (the `timingSafeEqual` trap), expired and revoked rejected. |
| `lib/studio/engagement/digest.test.ts` | Section order preserved; unanswered → `—`; angle brackets neutralized (no `<script>` reaches the prompt or the panel). |
| `components/engagement/QuestionnaireProvider.test.tsx` | Fake timers: five keystrokes → **one** POST; a choice click POSTs immediately; blur flushes; two rapid saves to one question serialize; a failed save surfaces retry. |
| `supabase/tests/engagement_rls.test.ts` | See the integration list below — this file carries the concurrency and crash-point assertions, not just RLS. |

**`engagement_rls.test.ts` — what it must assert** (same harness as `prospects_rls.test.ts`; teardown
deletes engagements **before** leads because of `RESTRICT`):

- *RLS:* anon and non-admin member denied select/insert/update/delete on all five tables; admin full CRUD;
  service role writes freely. All five RPCs: EXECUTE denied for anon, authenticated **and admin**; allowed
  for service role.
- *Uniqueness:* `UNIQUE (lead_id)` rejects a second engagement (hard unique — not a partial index); `UNIQUE
  (engagement_id, kind)` rejects a second discovery questionnaire in any status; the partial indexes reject a
  second `generating` tailoring run / brief and free the slot on a terminal status.
- *Mirror:* `engagement_sales_stage_for` returns non-null for all seven stages and RAISEs on `'bogus'`;
  insert mirrors to `qualified`; each transition writes the mapped value; delete resets to `qualified`; a
  direct `UPDATE leads SET sales_stage = 'new'` on an engaged lead RAISEs for admin **and** service role;
  the drift query is 0 after a randomised transition sequence.
- *Anchors:* `won_at` set on first `build` and unchanged by `build → discovery → build`; `care_ended_at` set
  on leaving care and cleared on re-entry; `lost` requires `lost_reason` and sets `ended_at`; `lost →
  discovery` clears both; `closed` sets `ended_at` with `lost_reason` null; entering a terminal stage revokes a
  live token and resolves open attention events.
- *`start_engagement`:* RAISEs `lead_not_found`; RAISEs `lead_not_qualified` from `new`, `won`, `lost`;
  succeeds from `qualified` with seeded title/locale/contact/tier; replay returns `already_started = true`
  with one row and **one** event; two concurrent calls (parallel promises) produce exactly one row.
- *Autosave vs submit concurrency:* an answer upsert started before `submit_engagement_questionnaire` and
  committed after it began is **in** the snapshot; an upsert started after the RPC took its lock RAISEs
  `questionnaire_not_open`; an upsert with a stale `questions_version` RAISEs `stale_manifest`; a DELETE
  after `sent` is rejected while a questionnaire-row delete still cascades.
- *Submit:* `required_missing` raised with the offending ids when a required answer is absent; success flips
  status, pins a snapshot equal to the manifest + answers at commit, writes one `questionnaire_submitted`
  event with `needs_attention = true`, and inserts exactly one `generating` brief; replay returns
  `applied:false` with no second event, no snapshot change, no second brief.
- *Crash points:* after a successful RPC with no follow-up work, the brief row exists at `generating` and
  `flipStaleBriefs` moves it to `failed` once stale; `notification_sent_at` is null and the query the panel
  uses to show "resend" returns the row.
- *Reopen:* `submitted → in_progress` retains `answer_snapshot`; refused while a brief is `generating`;
  resubmit overwrites the snapshot and creates a second brief.
- *Events:* `stage_changed` carries correct `from`/`to`; updating anything but `resolved_at` RAISEs.
- *Token hygiene:* after send, the row holds only a 64-hex hash and no `engagement_events.data` contains a
  64-hex string.
- *Session (app project, `session.test.ts`):* cookie for questionnaire A does not authorize B; wrong secret,
  length-mismatched secret (no throw), expired (410), revoked (403) all rejected; `Sec-Fetch-Site:
  cross-site` rejected on the write routes.

Also extend `lib/admin/queries.test.ts` (existing chain-mock idiom) to assert `getEngagements()` **throws** on
a query error rather than returning `[]`.

**Reserve `__other` as the `allow_other` option value**, as a code constant, and assert in tests that no
template or AI-generated option ever uses it — otherwise the "Other" checkbox collides with a real choice.

**Browser smoke — EN + `/ja`.** The `/ja` pass must confirm Noto Sans JP actually renders (check computed
`font-family` in DevTools, not just that it looks Japanese), line-height 1.7–1.8, letter-spacing 0.02–0.04em,
no `text-justify`, and that hand-editing the URL to `/discovery/<id>` 308s back to `/ja/`. Both passes:
view-source shows the robots meta, `curl -sI` shows all three headers, DevTools Network shows **no**
`plausible.io` request and **no** `/_vercel/insights/*` beacon, and at 375 px the rail collapses with ≥16 px
inputs and ≥44 px touch targets.

**End-to-end click path** (the human gate before shipping):

1. Open a lead with a real `existing_url`; run the website audit to `completed` — both AI steps want it as context.
2. Set **Qualified** → Save → **Start engagement** enables → click it.
3. Confirm the lead page now shows a frozen badge + "Managed by the engagement".
4. Draft from template with **Tailor with AI** on. Confirm the draft references the lead's industry and at
   least one audit finding, and that economics leads. Reword one, delete one, add one, reorder two.
5. Confirm **Send is disabled** until `Mark ready`. Mark ready → Send → confirm the client email arrived
   (or the "email failed — copy the link" state if not). Copy the link.
6. **Private window** → paste → confirm the URL becomes `/discovery/<uuid>` (token gone) and the page is chromeless.
7. Answer a section; watch `Saving… → Saved`. Jump sections via the rail and back — answers intact.
8. Start a long answer, wait for `Saved`, then type more and **close the tab within a second**. Reopen the
   emailed link. Expected: everything up to the last `Saved` is there, and the beacon usually rescued the
   rest — but that last part is best-effort, so the pass criterion is *no silent loss*: either the text is
   there or the `beforeunload` guard fired before the tab closed. Then: go offline (DevTools), type, confirm
   the chip goes `Unsaved — retry`, go online, confirm it recovers without a click.
9. Submit with a required field blank → jumps to it. Fill → Submit → thank-you in place. Re-click the link →
   read-only.
10. Admin: answers read back with labels (not values), brief polls `generating → completed`.
11. Advance to **Build** → confirm the lead mirrors to **Won**.
12. **Revoke link** → the private window's next autosave 403s with the "open from your email again" state.
13. Repeat 4–9 on a second engagement with `locale: 'ja'`.

## Drive-by — resolved 2026-09-04, shipped separately

`/survey/[slug]` and `/events/[slug]/survey` were not in the auth-shell regex, so they rendered the dark
legacy `<Nav />` on top of a light marketing card that already carries its own `HonuVibe.AI` wordmark —
two logos stacked. Ryan chose to fix it **ahead of this unit, as its own one-line commit**, so the
engagement slices stay bisectable. **Shipped as `a2ac00b`** (`isAuthShellRoute` exported + 30-case test;
`verify:fast` green at 1,342 tests; Ryan's EN + `/ja` browser smoke of both survey pages still pending).
The regex in `components/layout/conditional-nav.tsx` now reads:

```
/^\/(ja\/)?(learn\/(dashboard|vault|auth|paths)|admin|join|survey\/(?!ai-essentials(?:\/|$))[^/]+|events\/[^/]+\/survey)(\/|$)/
```

The negative lookahead is load-bearing: the legacy `/survey/ai-essentials` page has no marketing shell and
no wordmark of its own (verified) and was built for the dark Nav, so a bare `survey` prefix would have
stripped its header. `/events/<slug>` itself keeps the Nav — only its `/survey` child is a card.

**Consequence for slice 2:** adding `discovery` to that regex is now a clean one-token addition to an
alternation that already exists — no reason to touch the lookahead.

