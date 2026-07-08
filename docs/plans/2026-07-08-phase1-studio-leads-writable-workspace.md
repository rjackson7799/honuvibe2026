# Phase 1 — Writable Studio Leads + Lead Workspace

> Unit 1 of 4 from the approved master plan
> `docs/plans/2026-07-08-studio-lead-engine-master.md`. Self-contained: this doc
> is everything the execution session needs.

## Context

The Studio Leads admin (`/admin/studio/leads`) is a read-only inbox of "Start a Project" form submissions — status and notes are edited directly in Supabase, and there is no way to originate a lead. This phase makes leads fully writable and gives every lead a workspace: manual Create New Lead (company, website, contact person, email, phone), inline sales-stage + notes editing, a preview-link field, and a copy-paste AI outreach email. It lays the schema groundwork (nullable contact fields, `source` vocabulary) that Phases 2–4 (preview gate, audit engine, prospect finder) build on.

The old "keep leads read-only until the discovery tool ships" freeze is explicitly lifted (Ryan, 2026-07-08). The discovery intake and public studio form must keep working untouched.

## Ground truth (verified 2026-07-08)

- Admin reads the **`leads`** table (migration `047_discovery_engine.sql`), NOT retired `studio_leads`, via an **aliased select** in `lib/admin/queries.ts:243-272`: `full_name:name, company:business_name, project_type:tier_interest, status:sales_stage`. The `as unknown as StudioLead[]` cast means drift is invisible to the type-checker.
- Public intake: `app/api/studio-leads/submit/route.ts` inserts into `leads` via `createAdminClient()` with `source:'studio_form'` (lines 70-84). Do not touch.
- `leads.source` has NO check constraint — new values `manual` / `prospecting` need no DDL. Migration 047 backfilled legacy rows with `source:'studio_form_migrated'` (047 line 274) — that value exists in prod data; do NOT normalize old rows, just include it in the vocabulary and any source label display.
- Highest migration is `055_notifications.sql` → this phase is **056** (re-check dir at build time).
- Patterns to copy: server actions `lib/workbench/actions.ts` (inline `requireAdmin()` that throws, Zod parse, `createAdminClient()` write, `revalidatePath`); create-via-`[id]='new'` page `app/[locale]/admin/workbench/[id]/page.tsx`; form style `components/admin/AdminWorkbenchScenarioForm.tsx` (single draft object, dirty tracking, inline save/error text — no modals, no toasts); Claude call `lib/tutoring/generator.ts` (raw fetch to api.anthropic.com, forced tool_use, Zod on tool input, `ANTHROPIC_API_KEY`).
- Admin UI is EN-only hardcoded strings (no `messages/*.json` keys) — match that; no JP parity needed for admin components.

## Changes

### 1. Migration `supabase/migrations/056_studio_lead_workspace.sql`

```sql
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS preview_password text,
  ADD COLUMN IF NOT EXISTS outreach_email_subject text,
  ADD COLUMN IF NOT EXISTS outreach_email_body text,
  ADD COLUMN IF NOT EXISTS outreach_email_generated_at timestamptz;
-- Manual/prospected leads may lack contact name/email at creation.
-- Both existing writers (studio form, discover) always supply them.
ALTER TABLE leads ALTER COLUMN name DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;
COMMENT ON COLUMN leads.source IS 'discover | studio_form | studio_form_migrated (047 backfill) | manual | prospecting';
```

`existing_url` (already on `leads`) is the "current website" field — do not add a duplicate. RLS unchanged (`leads_admin_all` already covers admin writes).

### 2. Types — `lib/admin/types.ts` (~lines 64-88)

- `StudioLead`: `full_name`, `email` → `string | null`; fix latent `message: string` → `string | null` (DB column is nullable today); add `phone: string | null`, `existing_url: string | null`, `source: string`.
- New `StudioLeadDetail extends StudioLead`: `preview_url`, `preview_password`, `outreach_email_subject`, `outreach_email_body`, `outreach_email_generated_at` (all `| null`), `updated_at`.
- Grep all `StudioLead` consumers before changing; null-guard `StudioLeadCard` in the same commit.

### 3. Queries — `lib/admin/queries.ts`

- Extend `getStudioLeads()` select with `phone, existing_url, source` (keep alias list in sync with the type — the concatenated select string defeats supabase-js typing).
- Add `getStudioLeadById(id): Promise<StudioLeadDetail | null>` (same aliasing + workspace columns; return null on not-found).

### 4. Server actions — new `lib/studio/lead-actions.ts`

`'use server'`; copy the `requireAdmin()` / Zod / `createAdminClient()` / `revalidatePath` skeleton from `lib/workbench/actions.ts`.

- **Naming contract:** UI components and `StudioLead*` types speak the aliased vocabulary everywhere (`full_name`, `company`, `status`, `project_type`); DB column names (`name`, `business_name`, `sales_stage`, `tier_interest`) appear ONLY inside the actions' single shared UI→DB mapping helper. Forms submit `status`; the action maps it to `sales_stage`. A wrong column name fails silently at runtime, so this helper is the one place the translation lives.
- **Input normalization (all actions):** trim every string; convert `''` → `null` for all optional fields (`email`, `phone`, `existing_url`, `preview_url`, `preview_password`, `notes`, contact person, industry, outreach fields). Validate email format and URL format via Zod ONLY when the value is present (`.optional()` + refine, not required validators).
- `createLead(input)` — company required; contact person/email/phone/industry/website/notes optional; inserts `source:'manual'`, `lifecycle:'new'`, `sales_stage:'new'`; returns `{id}`.
- `updateLead(id, patch)` — contact fields, `existing_url`, `status` (enum-validated: new/qualified/proposal/won/lost → mapped to `sales_stage`), `notes`, `preview_url`, `preview_password`.
- `saveOutreachEmail(id, {subject, body})`.
- Each revalidates `/admin/studio/leads` and `/admin/studio/leads/${id}`.

### 5. Outreach email generation

- New `lib/studio/outreach-generator.ts` — structure copied from `lib/tutoring/generator.ts`: raw fetch, forced tool_use (`tool_choice: {type:'tool', ...}`), Zod schema `{subject: string, body: string}`. Model `claude-sonnet-4-6`, max_tokens ~2000. Prompt inputs: company, contact name, industry, `existing_url`, admin notes, preview URL + password if set. Tone: warm, concise, Hawaii local-business friendly; CTA = look at the preview / book a chat.
- New `app/api/admin/studio-leads/[id]/outreach/route.ts` — POST only; inline admin check (copy from `app/api/admin/partners/route.ts` style); calls generator synchronously; writes the three `outreach_email_*` columns; returns `{subject, body, generated_at}` (the panel displays the timestamp without a refresh). `export const maxDuration = 60`.
- **Error contract:** every failure path returns JSON, never a leaked thrown 500 — 400 malformed id/input, 401/403 non-admin, 404 lead not found, 503 `{error: 'Generation unavailable'}` when `ANTHROPIC_API_KEY` is unset, 502 `{error}` when the Claude call fails (wrap the generator call in try/catch, log the underlying error server-side).

### 6. UI

- `app/[locale]/admin/studio/leads/page.tsx` — "New Lead" `<Link href="/admin/studio/leads/new">` styled like the workbench list button (`Button` + lucide `Plus`); replace the stale "Update status and notes in Supabase…" subcopy with e.g. "Create, track, and work Studio leads."
- New `app/[locale]/admin/studio/leads/[id]/page.tsx` — server component mirroring `app/[locale]/admin/workbench/[id]/page.tsx`: `id === 'new'` → `<AdminStudioLeadForm lead={null}/>`; else `getStudioLeadById` + `notFound()` on miss.
- New `components/admin/AdminStudioLeadForm.tsx` — workbench-form pattern. Fields: company (required), contact person, contact email, phone, industry (free text), current website, status `<select>` (mapped to `sales_stage` inside the action), notes textarea, preview URL + preview password (external-link anchor when URL set; label the password field "Preview password (shared gate secret — not a user credential)"; it is stored plaintext by design so it can be re-sent to the client). Create → `createLead` → `router.replace('/admin/studio/leads/'+id)`; edit → `updateLead`. Inline `saveMessage`/`saveError`, dirty tracking.
- New `components/admin/StudioLeadOutreachPanel.tsx` — rendered on the detail page below the form (edit mode only): "Generate email" → POST outreach route → editable subject input + body textarea; "Save draft" (`saveOutreachEmail`); **two copy affordances** — a small copy icon beside the subject input (copies subject only) and a "Copy email" button (copies body only, no `Subject:` prefix — subject and body paste into separate mail-client fields); each shows its own inline "Copied ✓" state; show `outreach_email_generated_at` when present (from route response after generating, from props on load).
- `components/admin/StudioLeadCard.tsx` — null-guard `full_name` (fallback to company or "—") and `email` (hide the mailto link when absent); **hide the entire "Project" block when `message` is null** (today it renders `lead.message` unconditionally at lines 65-70) and **guard the "Source Locale" field the same way** (line 62 — manual leads have no locale); add "Open workspace →" `<Link>` to `/admin/studio/leads/{id}` in the expanded panel; small `source` label text (show `studio_form_migrated` as "Studio form (migrated)").
- **Locale handling (deliberate):** links use plain absolute paths (`/admin/studio/leads/new`) via `next/link`, exactly like the existing workbench/partners admin components — from `/ja/admin/...` this lands on the EN admin, which is accepted (admin is EN-only hardcoded). Do not introduce locale-aware links just for these pages.
- No `AdminNav.tsx` change (active-match `startsWith` covers the detail route).

### Out of scope (later phases)

`lead_audits` table + audit panel (Phase 3), preview gate + `client_previews` (Phase 2), prospects (Phase 4). Do NOT create stub tables or panels for them.

## Suggested commit message

```
feat(admin): writable studio leads — create/edit + outreach workspace (phase 1)
```

## Verification

> Executed in the build session (2026-07-08): `pnpm verify` fully green, and once
> Docker was started, `supabase db reset` (all migrations incl. 056 applied
> cleanly on a fresh DB) + `pnpm test:rls` green. The remaining runtime/DB/browser
> items below were NOT exercised interactively (no dev server / browser in the
> automation env); they are **code-verified** (type-check + production build +
> adversarial code-review of the exact diff) with runtime walkthroughs pending —
> Ryan to run them against local Supabase and/or post-deploy.

- [x] `pnpm verify` clean (type-check → tests 475/475 → build) — executed, green
- [x] `pnpm test:rls` clean — executed green (8 files / 71 tests) after `supabase db reset` applied 056 cleanly on a fresh DB; dup 022/025 temp-renamed for the run and restored (not committed). Migration 056 is RLS-neutral.
- [ ] Apply 056 to local DB; create a lead with only a company name → appears in list with source "manual", no crash on null name/email — runtime pending (logic verified in review)
- [ ] Edit lead: change sales_stage + notes + phone + website + preview URL → persists after reload; status filter tabs count it correctly — runtime pending
- [ ] Generate outreach email (needs `ANTHROPIC_API_KEY` in `.env.local`) → subject/body populate + generated-at timestamp shows without refresh; editable; Save draft persists; subject-copy copies subject only, body-copy copies body only (no `Subject:` prefix) — runtime pending (copy logic verified in review)
- [ ] Outreach route failure paths return JSON, not a thrown 500: unset `ANTHROPIC_API_KEY` locally → 503 with error message surfaced inline in the panel; bogus lead id → 404 — runtime pending (all paths verified in review; note: a non-UUID id returns 400, a UUID-shaped nonexistent id returns 404 — test the 404 case with e.g. `00000000-0000-0000-0000-000000000000`)
- [ ] Create/edit with `''` in optional fields (email, phone, website, preview URL/password, notes) → stored as NULL in the DB, not empty strings; invalid email/URL rejected only when non-empty — DB check pending (Zod normalization verified in review)
- [ ] Existing migrated leads (`source = 'studio_form_migrated'`, backfilled by 047) still render in the list and open in the workspace; source label reads "Studio form (migrated)" — runtime pending (label map verified in review)
- [ ] Regression: submit the public studio "Start a Project" form → lead appears in admin, old-style cards still render (null-guards hold: no empty "Project" block, no empty "Source Locale" on manual leads), confirmation emails still fire — runtime pending (submit route untouched; null-guards verified in review)
- [ ] Browser smoke: `/admin/studio/leads` + `/admin/studio/leads/new` + a detail page load with zero console errors; mobile width 375px intact; both themes readable — browser pending (all three routes compiled in the production build)
- [ ] `/ja/admin/studio/leads` still loads (admin is EN-hardcoded; route must not 500) — browser pending (route compiled; links use plain absolute paths per plan)

## Out-of-band after ship

- Apply `056_studio_lead_workspace.sql` in the Supabase dashboard SQL editor on project `zvfwtndbxshrtpwcwynw` AFTER deploy — prod is NOT migrated by the Vercel deploy; the create form 500s ahead of its schema until applied.
