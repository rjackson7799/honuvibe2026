# Build It AI — Increment 1: DB Verification Checklist

Code-layer verification is already green: `pnpm type-check`, `pnpm build`, and
26 unit tests (`lib/pricing.test.ts` + `lib/discover/derive.test.ts`) pass. This
checklist covers the DB-dependent runtime, which needs Supabase running.

> Pre-existing, not from this work: 4 failures in `marketing-routes.test.ts`
> (`/ja/honuhub`) and `pnpm lint` (ESLint 9 wants a flat config that doesn't
> exist). Neither touches the discovery code.

---

## 0. Apply migration `047_discovery_engine.sql`

**Option A — local Supabase** (replays all migrations, so work around the known
022/025 duplicate-version collision):

```bash
# temporarily move the two duplicate-versioned survey files out of the way
mkdir -p supabase/_dupe_hold
mv supabase/migrations/022_surveys.sql               supabase/_dupe_hold/
mv supabase/migrations/025_survey_has_laptop_nullable.sql supabase/_dupe_hold/

supabase db reset      # applies 001..047 cleanly

# restore them when done
mv supabase/_dupe_hold/*.sql supabase/migrations/ && rmdir supabase/_dupe_hold
```

**Option B — dashboard SQL editor** (dev or prod project, e.g. `zvfwtndbxshrtpwcwynw`):
paste the full contents of `supabase/migrations/047_discovery_engine.sql` and run
it. It's wrapped in `BEGIN…COMMIT` and is safe to re-run (IF NOT EXISTS / ON
CONFLICT / DROP POLICY IF EXISTS throughout).

### Schema sanity (run in SQL editor)

```sql
-- 6 tables exist
select table_name from information_schema.tables
where table_schema='public'
  and table_name in ('leads','discovery_sessions','discovery_responses',
                     'discovery_outputs','assets','email_otps')
order by 1;                                    -- expect 6 rows

-- RLS enabled on all 6
select relname, relrowsecurity from pg_class
where relname in ('leads','discovery_sessions','discovery_responses',
                  'discovery_outputs','assets','email_otps');  -- all true

-- leads has NO anon-insert policy (admin-only)
select polname, polroles::regrole[] from pg_policy
where polrelid = 'leads'::regclass;            -- only leads_admin_all

-- two private buckets
select id, public from storage.buckets where id like 'discovery-%';  -- both false
```

### Backfill correctness + idempotency

```sql
-- migrated count matches studio_leads
select
  (select count(*) from studio_leads) as studio_leads,
  (select count(*) from leads where source='studio_form_migrated') as migrated;  -- equal

-- field mapping looks right
select legacy_studio_lead_id, name, business_name, tier_interest, sales_stage, lifecycle
from leads where source='studio_form_migrated' limit 5;
-- name=old full_name, business_name=old company, sales_stage=old status, lifecycle='new'

-- IDEMPOTENCY: re-run the backfill block from 047, then re-count → unchanged
-- (ON CONFLICT (legacy_studio_lead_id) DO NOTHING)
```

---

## 1. Start the app

Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
and `SUPABASE_SERVICE_ROLE_KEY` (pointing at whichever DB you applied 047 to).

```bash
pnpm dev
```

Open **http://app.localhost:3000/discover** — browsers auto-resolve `*.localhost`
to 127.0.0.1, so this exercises the real `app.` host rewrite (exactly like prod's
`app.honuvibe.ai/discover`). Do **not** use `http://localhost:3000/app-site/discover`
directly — on the main host next-intl intercepts it and 404s (same as `/studio-site`).
The `/api/discover/*` routes resolve on any host (the middleware matcher excludes
`api`), so client fetches work regardless.

> Verified live against prod (2026-06-10) via the API: intake renders, `/start`
> sets the `hv_discover` cookie, `/review` is **403 without the cookie / 200 with
> it**, autosave persists, lifecycle walks `new→in_progress→review→verified→
> completed`, `not_sure`+6 pages+booking+payments prices to **$3,050/$115** with a
> Pro recommendation, and `ai_native` returns `custom:true`.

---

## 2. Intake → session + cookie

Fill name / email / business / **Where customers find you = Physical** /
**plan = Recommend one for me (not_sure)** / consent → **Start**.

- DevTools → Application → Cookies → **`hv_discover`** present, **HttpOnly**, SameSite=Lax.
- ```sql
  select id, name, business_name, source, lifecycle, sales_stage, tier_interest, location_type
  from leads order by created_at desc limit 1;     -- source='discover', lifecycle='new'
  select id, lead_id, current_step, expires_at, session_secret_hash is not null as has_secret
  from discovery_sessions order by created_at desc limit 1;  -- current_step=1, has_secret=t
  ```

---

## 3. Walk the 3 steps (autosave + lifecycle + branches)

Answer questions across Step 1 → 2 → 3.

- After the **first** answer:
  ```sql
  select lifecycle from leads order by created_at desc limit 1;   -- 'in_progress'
  ```
- One row per answered question, **no duplicate on edit** (edit a chip, re-check):
  ```sql
  select question_id, answer, created_at, updated_at
  from discovery_responses
  where session_id = '<SESSION_ID>' order by question_id;
  -- editing the same question updates the row + advances updated_at (no new row)
  ```
- **Branches** (each surfaces inline only when triggered):
  - intake industry = **Healthcare** → Step 2 shows the **compliance** branch under Q9.
  - Q9 select **Online scheduling (booking)** → **booking-tool** branch appears.
  - Q3 primary CTA = **Buy now** (or Q1 goal "Sell online") → **commerce** branch.
  - location physical/both → Step 3 shows the **GBP** branch under Q15.

---

## 4. Live pricing matches spec §10 (right rail)

| Inputs | Expect (build / mo) |
|---|---|
| Starter, 5 pages, no add-ons | **$500 / $25**, no nudge |
| Starter, 6th page added | **$500 / $25** + "past the 5-page Starter ceiling" nudge (no per-page charge) |
| Pro, AI imagery + booking + payments | **$3,150 / $115** |
| …then Q15 timeline = **ASAP** | build → **$3,938** (round 3150×1.25), mo unchanged |
| not_sure + blog/6 pages | tier card shows **Studio Pro · Recommended for you** |
| Multilingual (Japanese) on Pro | **+$500 / +$20** line; on Starter → no charge/line |
| GBP toggles when location = Online | no GBP line |

---

## 5. Review → verify → complete

- Step 3 **Review my plan** → `/review` shows answers grouped by step + investment card.
- **Looks good — confirm email**:
  ```sql
  select lifecycle from leads order by created_at desc limit 1;   -- 'review'
  ```
- Verify screen: enter **any 6 digits** → Verify:
  ```sql
  select email_verified, lifecycle from leads order by created_at desc limit 1;  -- t, 'verified'
  ```
- Summary auto-finalizes (`POST /complete`):
  ```sql
  select lifecycle from leads order by created_at desc limit 1;   -- 'completed'
  select completed_at, computed_pricing is not null as priced, recommend_upgrade
  from discovery_sessions order by created_at desc limit 1;        -- completed_at set, priced=t
  select pricing_summary is not null as priced,
         brand_voice_profile, prd, design_brief
  from discovery_outputs order by generated_at desc limit 1;       -- priced=t, others NULL
  ```
  Summary shows the price + a "Generating…" brand-voice placeholder.

---

## 6. Session secret really gates (403)

Copy the flow URL, open in a **fresh incognito window** (no `hv_discover` cookie):

```bash
# no cookie → 403
curl -i http://localhost:3000/api/discover/review/<SESSION_ID> | head -1   # HTTP/1.1 403
```

The flow page in that window shows "Could not load your session."

---

## 7. AI-Native short-circuit

New intake, **plan = Studio AI-Native** → after Start you land on
`/discover/<id>/custom` (the scoping stub), **not** the question flow.

```sql
select tier_interest, lifecycle from leads order by created_at desc limit 1;  -- 'ai_native','new'
```

---

## 8. Resume

Mid-flow (same browser, cookie present) **reload** → brief "Taking a look…"
loader, then resumes at the saved `current_step` with answers intact; branches
re-derive from the answers.

---

## 9. Admin cut-over (reads `leads`, no split-brain)

Sign in as an admin → **/admin/studio/leads**:
- Shows the **migrated** studio_leads rows **and** the new `discover` + `studio_form` leads.
- The status filter (new/qualified/proposal/won/lost) maps to **`sales_stage`**.

---

## 10. Studio form now writes `leads`

Submit the Studio "Start a Project" form (studio.honuvibe.ai/contact, or locally
http://localhost:3000/studio-site/contact):

```sql
select source, name, business_name, lifecycle, sales_stage
from leads where source='studio_form' order by created_at desc limit 1;   -- row present
```

Form still shows its success state; confirmation/admin emails fire (no-op if
Resend unconfigured).

---

## After verifying

- Restore the duplicate migration files if you used Option A (see step 0).
- For prod: run `047` in the dashboard SQL editor **before** the deploy serves
  `/api/discover/*` (Vercel does not auto-apply migrations).
- Deferred to later increments (not bugs): logo upload + SVG sanitize, the lean
  scraper, the 3 Claude calls + artifact generation, real Resend OTP,
  rate-limiting, the admin pipeline UI upgrade (lifecycle column + answers),
  Cal.com booking, Stripe links, JP i18n, abandoned-lead cleanup.
```
