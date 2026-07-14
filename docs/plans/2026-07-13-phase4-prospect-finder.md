# Phase 4 — Prospect Finder

> Unit 4 of 4 (final) from the approved master plan
> `docs/plans/2026-07-08-studio-lead-engine-master.md`. Self-contained: this doc
> is everything the execution session needs. Phase 1 (writable leads) shipped
> 2026-07-08 (`2f143e5`); Phase 2 (preview delivery) shipped 2026-07-10
> (`13116f3`); Phase 3 (audit engine) shipped 2026-07-13 (`464b2f3`, migration
> **060** — prod apply + `pnpm test:rls` still pending at time of writing).
>
> **Rev 2 (2026-07-13)** — integrates a 3rd-party review: website-CAS scoring
> fence, explicit score-calibration contract, transactional convert RPC,
> `scoringCount` polling signal, dismissed-excluded default view,
> `dismissed_from` restore, PostgREST-safe filters, Places result validation,
> corrected pricing, `includePureServiceAreaBusinesses`, and a go/no-go
> prerequisite gate. Rejected as v1 scope: a durable search-job table, chunked
> upserts, and a mandated UI test suite (repo precedent: conditional component
> test + browser smoke).
>
> **STATUS: DRAFT — awaiting Ryan's review before execution** (per
> `docs/dev-workflow.md`: plan → explicit review → fresh execution session).

## Go/no-go prerequisites (explicit gate — do not start execution without)

1. Phase 3's `060_lead_audits.sql` applied to prod **and** `pnpm test:rls` run
   green locally (it was blocked by a broken Docker Desktop at Phase 3 ship —
   the 061 RLS run below exercises both suites anyway, but 060-on-prod must not
   still be open when 061 ships on top of it).
2. `GOOGLE_PLACES_API_KEY` created (Places API (New) restriction, **GCP billing
   enabled**) — needed for the live-search verification steps.
3. At deploy time: `061_prospects.sql` applied in the dashboard **in the same
   window as the Vercel deploy** — the `/admin/prospects` page and routes 500
   until it exists. This is the standard manual-migration window, called out
   here as a gate rather than an afterthought.

## Context

Phases 1–3 built the *reactive* half of the lead engine: manage leads, deliver
previews, audit a known lead's website. Phase 4 adds **origination**: search
Google Places for local businesses in an industry + location, score each one's
website with deterministic "outdated site" heuristics (worse site = higher
opportunity), and convert winners into leads — landing directly in the Phase 1
workspace with the Phase 3 "Run audit" button one click away. This closes the
flywheel: **search → score → convert → audit → outreach → preview → close.**

The design reuses four mechanisms that now exist because of Phase 3:

- **`lib/http/safe-fetch.ts`** — the SSRF-hardened fetcher (`ipaddr.js`
  "globally routable unicast only"). `websiteUri` from Places is third-party
  data; every fetch of it goes through this guard. This is exactly why the
  fetcher was extracted into a shared module in Phase 3.
- **`normalizeAuditUrl`** (`lib/studio/audit/crawl.ts`) — scheme-prepend,
  credential/port rejection, fragment strip, trailing-dot host. Runs on
  `websiteUri` **before** any host classification or fetch.
- **202 + `after()` + `maxDuration = 300` + on-read staleness flip + fenced
  writes** — the exact shape of `lib/studio/audit/run.ts` /
  `app/api/admin/studio-leads/[id]/audit/route.ts`, adapted from one row per
  job to a batch of prospect rows (with one Phase 4-specific hardening: the
  score fence is a compare-and-swap on the claimed website, see §5).
- **The `after()` route-test harness** — `__tests__/api/studio-lead-audit.test.ts`
  already solved mocking `next/server`'s `after` with `vi.importActual`; copy it.

Scoring is **heuristics-only in v1 — no LLM call** (the ranking signal is
deterministic; leave a `// v2: optional haiku one-liner` hook).

## Decisions defaulted for Ryan's review (say the word and I'll re-plan)

1. **Convert is a transactional RPC**, not a multi-request route sequence.
   `public.convert_prospect(p_prospect_id)` (hardened per the 057
   `bump_preview_access` pattern: `SECURITY DEFINER`, empty search_path,
   service-role-only EXECUTE) locks the prospect row, returns the existing lead
   if already converted, else inserts the lead + marks the prospect converted
   **in one transaction**. No orphan-lead crash windows, no cleanup deletes,
   and "at most one lead per prospect" holds transactionally.
2. **Score calibration contract** (explicit ordering; weights are named
   constants): `no_website` **95** > `social-as-website` **85** > worst
   fully-legacy scored site **80 max** > `score_failed` **40** > modern site
   **≈0–10**. A social page *is* "effectively no website" and must rank near
   the top; an unreachable site is unknown quality and must NOT outrank a
   solidly-bad scored site. A dedicated ordering test asserts this chain.
3. **Search results replace-refresh, statuses survive.** A repeat search
   upserts Places data for every hit on `place_id`, but `converted` /
   `dismissed` prospects keep their status and are **not re-scored**, and rows
   another live search is already `scoring` are not double-claimed.
4. **One search at a time is NOT enforced.** Concurrent searches converge via
   the `place_id` upsert; the website-CAS fence (§5) keeps a mid-flight
   refresh from mislabeling a score. A per-hour search budget and a durable
   search-job record are v2.
5. **Default list = top 200 by score, dismissed excluded.** Filters can pull
   dismissed back in explicitly. Poll-completion does NOT depend on the list
   contents: the GET always returns an unfiltered `scoringCount`.
6. **Service-area businesses are included**
   (`includePureServiceAreaBusinesses: true`): plumbers/cleaners/mobile
   services are exactly the high-value no-website prospect class, and the flag
   defaults off. Their `formattedAddress` may be absent → `address` null.
7. **StatusBadge gains six prospect pills** (`scoring` coral, `scored` teal,
   `no_website` gold, `score_failed` danger, `converted` gray, `dismissed`
   muted) — token classes only, same shape as Phase 3's `partial`.
8. **English-only admin UI** (same as Phases 1–3; the `/ja` route loads with EN
   copy).

## Ground truth (verified 2026-07-13)

- **Migration number is `061`.** Highest on disk is `060_lead_audits.sql`
  (Phase 3). The master plan's "059_prospects" is two collisions stale
  (059 → feedback, 060 → lead audits). **Re-check the dir at build time.**
- **`leads` insert path for convert:** `leads.name`/`email` are nullable (056);
  `source` has no CHECK and the 056 COMMENT already documents `prospecting`.
  Columns the RPC inserts: `business_name` (NOT NULL), `existing_url`, `phone`,
  `industry`, `source: 'prospecting'`, `lifecycle: 'new'`,
  `sales_stage: 'new'` — the same shape `createLead` builds in
  `lib/studio/lead-actions.ts:203-216`.
- **Hardened-RPC house pattern** — `supabase/migrations/057_client_previews.sql:68-79`
  (`bump_preview_access`): `SECURITY DEFINER`, `SET search_path = ''`,
  fully-qualified refs, `REVOKE ALL … FROM PUBLIC, anon, authenticated`,
  `GRANT EXECUTE … TO service_role`. `convert_prospect` follows it exactly.
- **Lead workspace URL** for the post-convert jump:
  `/admin/studio/leads/<id>` (`app/[locale]/admin/studio/leads/[id]/page.tsx`).
- **AdminNav Studio group** is `components/admin/AdminNav.tsx:71-76`. Add
  `{ href: '/admin/prospects', label: 'Prospects', icon: Radar }` (import
  `Radar` from lucide-react). `isItemActive`'s `startsWith` needs no change.
- **List-page shape to mirror:** `app/[locale]/admin/studio/leads/page.tsx` —
  server component, `setRequestLocale`, `max-w-[1100px]`, heading + subcopy +
  action area, client list component below.
- **`requireAdmin()` route helper** — copy verbatim from
  `app/api/admin/studio-leads/[id]/audit/route.ts:23-39`.
- **Fence + staleness idiom** — `lib/studio/audit/run.ts`. Prospects use
  `status='scoring'` where audits used `generating`; stale threshold **5 min**
  anchored on `scoring_started_at`.
- **`fetchHtmlWithCaps(url, caps)`** — `lib/http/safe-fetch.ts`; score.ts calls
  it with `{ maxBytes: 2 * 1024 * 1024, timeoutMs: 8_000 }`.
- **Heuristic building blocks** — `lib/studio/audit/heuristics.ts` has the
  detection patterns (viewport, meta generator, copyright-year max-match,
  page-builder tokens) but outputs category scores, not additive opportunity
  points. **score.ts is a separate small module** with its own additive
  weights; it may copy detection regexes but must not import/couple to the
  audit's category scoring.
- **Places API (New) text search:** `POST https://places.googleapis.com/v1/places:searchText`,
  headers `X-Goog-Api-Key: <key>` + `X-Goog-FieldMask:
  places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,nextPageToken`,
  JSON body `{ textQuery, pageSize: 20, includePureServiceAreaBusinesses: true,
  pageToken? }`. `displayName` is `{ text, languageCode }` — store
  `displayName.text`. Follow-up pages must keep all params identical except the
  token. `nextPageToken` is usable immediately (no legacy sleep). Max 60
  results total. **Max 3 pages, hard cap.** (Verify the exact
  `includePureServiceAreaBusinesses` field name against the REST reference at
  build time.)
- **Places pricing (corrected from the master plan):** this field mask triggers
  the **Text Search Enterprise SKU — $35 per 1,000 requests, with a 1,000
  request/month free cap** (per-SKU free tiers replaced the old $200 credit in
  2025). A full 3-page search = 3 requests ≈ **$0.105 beyond the cap**; the
  free cap covers ≈ **333 full searches/month**. Verify current numbers at
  build time — this table moves.
- **Test conventions** — unit tests beside the module; route tests under
  `__tests__/api/`; RLS tests in `supabase/tests/*_rls.test.ts`.
  `prospects.converted_lead_id` FK is **nullable**, so the RLS test needs no
  seeded `leads` row for basic CRUD — only the convert-RPC assertions need one;
  seed it the way `supabase/tests/lead_audits_rls.test.ts` does.

## Changes

### 1. Migration `supabase/migrations/061_prospects.sql`

> Re-verify `061` is the next free number at build time.

```sql
-- ============================================================================
-- 061_prospects.sql — Prospect Finder (Studio lead engine, phase 4)
-- ============================================================================
-- One row per Google Places result we have seen. Repeat searches upsert the
-- Places data on place_id but never clobber a converted/dismissed status.
-- Status lifecycle:
--   new          (inserted, scoring not yet started — transient)
--   scoring      (background job is fetching + scoring the website)
--   scored       (score + breakdown written)
--   score_failed (website unreachable/invalid, or scoring went stale — still convertible)
--   no_website   (Places returned no websiteUri — highest opportunity, score 95)
--   converted    (a lead was created; converted_lead_id points at it)
--   dismissed    (admin ruled it out; survives re-searches; dismissed_from
--                 remembers the prior status so restore is lossless)
-- Admin-only; the background job writes via the service role. Conversion is a
-- single-transaction RPC (convert_prospect) so a prospect can never end up
-- converted without a lead, or spawn two leads under a double-click race.
--
-- Apply MANUALLY in the Supabase dashboard SQL editor on project
-- zvfwtndbxshrtpwcwynw in the same window as the deploy.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.prospects (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  place_id           text NOT NULL UNIQUE,
  name               text NOT NULL,
  website            text,                -- normalized URL or NULL
  phone              text,
  address            text,                -- may be NULL for service-area businesses
  rating             numeric(2,1),
  review_count       int,
  industry           text NOT NULL,       -- what the admin searched
  location           text NOT NULL,       -- what the admin searched
  search_query       text NOT NULL,       -- the literal textQuery sent to Places
  status             text NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new','scoring','scored','score_failed',
                                         'no_website','converted','dismissed')),
  score              int,                 -- 0-100; worse site = higher opportunity
  score_breakdown    jsonb,               -- [ { id, label, points } ]
  tech               jsonb,               -- { cms, generator, socialAsWebsite, ... }
  converted_lead_id  uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  dismissed_from     text,                -- status before dismissal (for restore)
  scored_at          timestamptz,
  scoring_started_at timestamptz,         -- staleness anchor for the on-read flip

  -- A row claimed for scoring must carry its staleness anchor, or a malformed
  -- 'scoring' row with a NULL timestamp could never go stale.
  CONSTRAINT prospects_scoring_needs_anchor_ck
    CHECK (status <> 'scoring' OR scoring_started_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_prospects_status_score
  ON public.prospects (status, score DESC NULLS LAST);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prospects_admin_all" ON public.prospects;
CREATE POLICY "prospects_admin_all" ON public.prospects
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- No anon/member policy: the background job reads/writes via the service role only.

-- Transactional, idempotent conversion (hardened per 057's bump_preview_access):
-- row-lock the prospect; return the existing lead when already converted; else
-- insert the lead and mark the prospect converted in the same transaction.
CREATE OR REPLACE FUNCTION public.convert_prospect(p_prospect_id uuid)
RETURNS TABLE (lead_id uuid, already_converted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_p    public.prospects%ROWTYPE;
  v_lead uuid;
BEGIN
  SELECT * INTO v_p FROM public.prospects WHERE id = p_prospect_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'prospect_not_found';
  END IF;
  IF v_p.converted_lead_id IS NOT NULL THEN
    RETURN QUERY SELECT v_p.converted_lead_id, true;
    RETURN;
  END IF;
  INSERT INTO public.leads
    (business_name, existing_url, phone, industry, source, lifecycle, sales_stage)
  VALUES
    (v_p.name, v_p.website, v_p.phone, v_p.industry, 'prospecting', 'new', 'new')
  RETURNING id INTO v_lead;
  UPDATE public.prospects
  SET status = 'converted', converted_lead_id = v_lead, dismissed_from = NULL
  WHERE id = p_prospect_id;
  RETURN QUERY SELECT v_lead, false;
END;
$$;
REVOKE ALL ON FUNCTION public.convert_prospect(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_prospect(uuid) TO service_role;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-migration verification (run as anon / ordinary authenticated):
--   select * from public.prospects;                       -- 0 rows / denied
--   select public.convert_prospect(gen_random_uuid());    -- permission denied
-- ----------------------------------------------------------------------------
```

No terminal-shape CHECK beyond the two above: a `scored` row's payload is a
single UPDATE, and `converted` is set inside the RPC's transaction.

### 2. Types + queries

**`lib/admin/types.ts`** — add near `LeadAudit`:

```ts
export type ProspectStatus =
  | 'new' | 'scoring' | 'scored' | 'score_failed'
  | 'no_website' | 'converted' | 'dismissed';

export interface Prospect {
  id: string;
  created_at: string;
  place_id: string;
  name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  industry: string;
  location: string;
  search_query: string;
  status: ProspectStatus;
  score: number | null;
  score_breakdown: { id: string; label: string; points: number }[] | null;
  tech: Record<string, unknown> | null;
  converted_lead_id: string | null;
  dismissed_from: string | null;
  scored_at: string | null;
  scoring_started_at: string | null;
}
```

**`lib/admin/queries.ts`** — add (same throw-on-error rule as `getLeadAudits`;
a query error is a logged 500, never `[]`):

```ts
// Top 200 by opportunity score. Dismissed rows are EXCLUDED unless explicitly
// requested via the status filter. `search` is sanitized to [\w\s-] (max 80)
// before interpolation into .or() — PostgREST filter grammar treats commas,
// parens, and quotes as syntax, so stripping only %/_ is not enough.
export async function getProspects(filters?: {
  status?: ProspectStatus;
  search?: string;
  limit?: number;                       // default 200
}): Promise<Prospect[]> {
  const supabase = await createClient();
  let query = supabase
    .from('prospects').select('*')
    .order('score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 200);
  if (filters?.status) query = query.eq('status', filters.status);
  else query = query.neq('status', 'dismissed');
  const s = filters?.search?.replace(/[^\w\s-]/g, '').trim().slice(0, 80);
  if (s) {
    query = query.or(`name.ilike.%${s}%,industry.ilike.%${s}%,location.ilike.%${s}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Prospect[];
}

// Unfiltered in-flight count — the panel's poll-completion signal. Independent
// of list filters/limit so polling can never stop early because active rows
// fell outside the visible top-200 or a filter hid them.
export async function getScoringCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('prospects')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'scoring');
  if (error) throw error;
  return count ?? 0;
}
```

### 3. Places client — new `lib/studio/prospecting/places.ts`

```ts
export interface PlaceResult {
  placeId: string;
  name: string;
  website: string | null;     // raw websiteUri (normalized later by score/upsert)
  phone: string | null;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
}

export class PlacesError extends Error {
  constructor(message: string, public code: 'NO_KEY' | 'API_ERROR' | 'TIMEOUT') { … }
}

export async function searchPlaces(textQuery: string): Promise<PlaceResult[]>;
```

- `POST https://places.googleapis.com/v1/places:searchText` with
  `X-Goog-Api-Key: process.env.GOOGLE_PLACES_API_KEY`, the exact field mask
  from Ground truth, and body `{ textQuery, pageSize: 20,
  includePureServiceAreaBusinesses: true }` + `pageToken` on follow-ups
  (all other params identical across pages, per the API contract). **Hard cap:
  `MAX_PAGES = 3`** (a named constant — this is the billing guard, do not
  soften it). Stop early when no `nextPageToken`.
- `AbortSignal.timeout(15_000)` per page. Missing key → throw
  `PlacesError('NO_KEY')` (the search route maps it to 503 — unlike PSI, Places
  is a hard dependency of *this* feature). Non-2xx → `API_ERROR` with the
  status in the message (raw body → server logs only).
- **Result validation:** skip any result missing `id` or `displayName.text`
  (both are DB-required) and `console.warn` the skipped count — one malformed
  result must not fail the whole batch upsert. Other absent fields → null.
- Dedup results by `placeId` across pages (Places can repeat across page
  boundaries).
- **This is our own outbound call to `places.googleapis.com` (a safe host) — no
  SSRF surface here.** The SSRF boundary is `websiteUri`, handled in score.ts.

### 4. Scorer — new `lib/studio/prospecting/score.ts`

```ts
export interface ProspectScore {
  status: 'scored' | 'score_failed' | 'no_website';
  score: number;                                           // 0-100, clamped
  breakdown: { id: string; label: string; points: number }[];
  tech: { cms: string | null; generator: string | null; socialAsWebsite: boolean };
}

export async function scoreProspectWebsite(
  website: string | null,
  currentYear: number,
): Promise<ProspectScore>;
```

**Calibration contract (decision D2 — weights as named constants, tunable, but
the ORDERING is the product requirement and has its own test):**

| Signal | Points | Status |
|---|---|---|
| No website at all | fixed **95** | `no_website` |
| Social page as website (facebook/instagram/linktr.ee/yelp/google host) | fixed **85** | `scored` |
| http-only final URL | +18 | `scored` (additive) |
| No `meta[name=viewport]` | +18 | `scored` (additive) |
| Stale copyright ≥2y (max-year rule) | +12 | `scored` (additive) |
| WordPress generator < 5 | +12 | `scored` (additive) |
| No meta description AND no `og:title` | +12 | `scored` (additive) |
| Page-builder markup (elementor/divi/wpbakery/js_composer) | +8 | `scored` (additive) |
| Unreachable / unfetchable / invalid URL | fixed **40** | `score_failed` |

Max additive sum = 80, so the chain **95 (none) > 85 (social) > ≤80 (worst
legacy) > 40 (unknown) > ≈0 (modern)** holds by construction. `score_failed`
sits below every seriously-bad scored site because its quality is unknown.

Flow:
- `website === null` → `no_website`, no fetch.
- **Normalize first**: `normalizeAuditUrl(website)`; `ok: false` (junk/
  `javascript:`/over-length URI from Places) → `score_failed`. This handles
  scheme-less, uppercase, and trailing-dot inputs before any host check.
- **Social detection on the PARSED hostname** of the normalized URL: match
  `host === domain || host.endsWith('.' + domain)` against the constant list
  (`facebook.com`, `instagram.com`, `linktr.ee`, `yelp.com`, `google.com`) —
  suffix matching kills lookalikes (`myfacebook.com.evil` fails, `m.facebook.com`
  matches). Social → fixed 85, **skip the fetch** (social pages block bots),
  `tech.socialAsWebsite = true`.
- Else `fetchHtmlWithCaps(url, { maxBytes: 2 * 1024 * 1024, timeoutMs: 8_000 })`;
  `null` → `score_failed`.
- On fetched HTML: cheerio checks (detection copied in spirit from
  `lib/studio/audit/heuristics.ts`, each in its own try/catch — same per-check
  fault-isolation rule as Phase 3; `currentYear` passed in, never `new Date()`
  inside). `score = clamp(sum, 0, 100)`, status `scored`. Every fired signal
  appears in `breakdown`; non-fired signals are omitted (opportunity list, not
  an audit).
- **Never throws** — any unexpected error resolves to `score_failed`.

### 5. Routes — new `app/api/admin/prospects/…`

All: inline `requireAdmin()` (verbatim from the audit route), JSON error
responses, `runtime = 'nodejs'`.

**`search/route.ts`** — POST `{ industry, location }`, `maxDuration = 300`:
1. `requireAdmin()`; Zod-parse body (both required, trimmed, max 100 chars) → 400.
2. `searchPlaces(\`${industry} in ${location}\`)`. `NO_KEY` → **503**
   `{ error: 'Prospecting unavailable — GOOGLE_PLACES_API_KEY is not configured.' }`;
   other `PlacesError` → 502. Zero results → **200 `{ found: 0 }`**.
3. **Upsert pass (no status, no scoring_started_at):**
   `admin.from('prospects').upsert(rows, { onConflict: 'place_id' })` where
   rows carry ONLY the Places-refresh columns
   (`place_id,name,website,phone,address,rating,review_count,industry,location,search_query`)
   — website pre-normalized (`norm.ok ? norm.url : raw`; scoring re-checks).
   Existing statuses survive because `status` is absent from the payload
   (supabase-js upsert only writes supplied columns); new rows get the `'new'`
   default. **Upsert error → 500
   `{ error: 'Search succeeded but saving prospects failed.' }`** +
   `console.error` noting the Places spend is already incurred. `after()` is
   NOT scheduled on this path.
4. **Staleness flip:** `UPDATE … SET status='score_failed', score=40,
   score_breakdown=NULL, tech=NULL, scored_at=now()
   WHERE status='scoring' AND scoring_started_at < now() - interval '5 minutes'`
   — zombie rows from a died invocation unblock here (and in the GET below) so
   the claim below can re-score them. (`scoring_started_at IS NULL` cannot
   occur — the `prospects_scoring_needs_anchor_ck` CHECK forbids it.)
5. **Claim pass:** `UPDATE prospects SET status='scoring',
   scoring_started_at=now(), score=NULL, score_breakdown=NULL, tech=NULL,
   scored_at=NULL WHERE place_id IN (<this search's ids>) AND status NOT IN
   ('converted','dismissed','scoring')` → `.select('id, website')`. The
   returned rows — **each carrying the website snapshot it was claimed with** —
   are the scoring work-list. Converted/dismissed rows are refreshed but never
   re-scored (D3); rows a live overlapping search is scoring aren't
   double-claimed.
6. `after(() => scoreProspects(admin, claimed, currentYear))` — a small
   orchestrator beside score.ts: **promise pool, concurrency 4** (copy the
   `mapPool` shape from `lib/studio/audit/crawl.ts`), each row:
   `scoreProspectWebsite(row.website, currentYear)` → **compare-and-swap fenced
   write**:
   `UPDATE … SET status=<r.status>, score, score_breakdown, tech, scored_at=now()
   WHERE id=<row.id> AND status='scoring' AND website = <row.website>`
   (`.is('website', null)` when the claimed snapshot was null) + rowcount
   check. The website term is the fix for the refresh race: if search B
   re-upserted a different website mid-flight, this worker's result describes
   the OLD site and must not land — the CAS makes it a logged no-op, the row
   stays `scoring` on B's data, and the 5-min stale flip + next search re-score
   it. A `converted` set mid-scoring is fenced by the status term as before.
   Log `[studio/prospects] scored=<n> failed=<m> fenced=<k> ms=<t>` at the end.
7. Return **202 `{ found: <total>, scoring: <claimed count> }`**.

**`route.ts`** (list) — GET with `?status=` and `?q=` params:
1. `requireAdmin()` → 401/403. Validate `status` against the `ProspectStatus`
   enum (unknown value → 400); `q` max 80 chars (sanitized again inside
   `getProspects`).
2. Staleness flip (same conditional UPDATE as search step 4 — no cron).
3. `getProspects({ status, search })` + `getScoringCount()` →
   **`{ prospects, scoringCount }`**. `scoringCount` is unfiltered and
   limit-independent — the panel polls on it, so polling can never stop early
   because active rows fell outside the top-200 or a filter hid them. Thrown
   query error → `console.error('[admin/prospects] …')` + 500.

**`[id]/convert/route.ts`** — POST (thin wrapper over the RPC, decision D1):
1. `requireAdmin()`; UUID-validate → 400.
2. `admin.rpc('convert_prospect', { p_prospect_id: id })`. `prospect_not_found`
   error → 404; other error → 500.
3. → **200 `{ leadId, existing: <already_converted> }`**. Idempotent by
   construction; the panel navigates to `/admin/studio/leads/<leadId>`.

**`[id]/route.ts`** — PATCH `{ action: 'dismiss' | 'restore' }`:
- `dismiss`: `UPDATE … SET status='dismissed', dismissed_from=<current status>
  WHERE id=<id> AND status NOT IN ('converted','dismissed')` + rowcount check
  (0 → 409 — converted is final, double-dismiss is a no-op conflict).
  Implemented as read-then-conditional-write with the status in the WHERE (the
  fence idiom), since `dismissed_from` needs the pre-read value.
- `restore`: `UPDATE … SET status=COALESCE(dismissed_from,'new'),
  dismissed_from=NULL WHERE id=<id> AND status='dismissed'` (0 rows → 409).
  Restore means **"back to exactly the state it was dismissed from"** — a
  scored row shows its score again immediately; a `new` row becomes eligible
  for scoring on the next search that returns it. No re-score is triggered.
- → `{ ok: true }`.

### 6. UI — prospects page + list + nav + StatusBadge

**New `app/[locale]/admin/prospects/page.tsx`** — mirror the studio-leads list
page: server component, `setRequestLocale`, `max-w-[1100px]`, heading
"Prospects" + subcopy "Search local businesses and score their websites for
rebuild opportunities.", then
`<AdminProspectList initialProspects={prospects} initialScoringCount={n} />`
from `getProspects()` + `getScoringCount()`.

**New `components/admin/AdminProspectList.tsx`** (`'use client'`), following
the admin panel conventions (outreach/audit panel chrome, coral error pill):
- **Search form:** industry + location text inputs + "Search" button (POSTs
  `search`, disabled while the search request is in flight). On 202, show
  "Scoring N sites…" info pill and **poll the list GET every ~5 s while
  `scoringCount > 0`** — the unfiltered count, NOT the visible rows (clear the
  interval on unmount and when it reaches 0 — same `aliveRef` + `pollRef`
  guards as `StudioLeadAuditPanel`). 503 (no key) / 502 / 400 / the
  upsert-failed 500 → coral error pill with the returned message.
- **Filters:** status select (default "Active" = dismissed excluded /
  scored / no_website / score_failed / converted / dismissed) + a small text
  filter; both re-fetch the GET with query params. Polling continues across
  filter changes (it reads `scoringCount`, not the rows).
- **Ranked table** (stacked cards on mobile): name (external-link icon to the
  website when present) · score (bold; high = strong opportunity = teal) ·
  `<StatusBadge status={p.status} />` · breakdown badges (small muted chips
  from `score_breakdown[].label`, cap ~4, "+n more") · rating ★ + review
  count · **Convert** button (POSTs convert →
  `router.push('/admin/studio/leads/' + leadId)`) · **Dismiss** (PATCH; hidden
  once converted; dismissed rows show **Restore** instead).
- Converted rows render an "Open lead →" link instead of Convert.

**`components/admin/AdminNav.tsx`** — Studio group (line ~74): add
`{ href: '/admin/prospects', label: 'Prospects', icon: Radar }` + import `Radar`.

**`components/admin/StatusBadge.tsx`** — add the six prospect pills per
decision D7 + labels ("Scoring", "Scored", "No Website", "Score Failed",
"Converted", "Dismissed"). Token classes only.

### 7. Test plan

**Unit — `lib/studio/prospecting/places.test.ts`** (mock `global.fetch`):
- key unset → throws `NO_KEY`, no request; field mask + api key +
  `includePureServiceAreaBusinesses` sent (assert on the recorded request);
  single page → mapped results with nulls for absent optional fields;
  **a result missing `id` or `displayName.text` is skipped (not thrown), rest
  of the page survives**; 3-page pagination stops at the hard cap even when a
  4th token is offered; dedup by `placeId` across pages; non-2xx →
  `API_ERROR`; abort → `TIMEOUT`.

**Unit — `lib/studio/prospecting/score.test.ts`** (mock `@/lib/http/safe-fetch`
and `normalizeAuditUrl` only where needed; pass `currentYear` explicitly):
- **Ordering contract (the D2 test):** `no_website` (95) > social (85) >
  a full-legacy fixture (all six signals → 80) > `score_failed` (40) > a
  modern fixture (≤10). One assertion chain, not just independent numbers.
- `null` website → `no_website` 95, no fetch call.
- Social hosts: `https://facebook.com/x`, `facebook.com/x` (scheme-less),
  `https://m.facebook.com/x`, `HTTPS://WWW.FACEBOOK.COM/x` → all 85, **no
  fetch call**; lookalike `https://myfacebook.com.evil/x` → NOT social
  (proceeds to fetch).
- unreachable (`fetchHtmlWithCaps` → null) and invalid URL
  (`normalizeAuditUrl` not-ok) → `score_failed` 40.
- legacy fixture → every signal fires with its exact points in `breakdown`,
  clamped ≤ 100; modern fixture → near-empty breakdown.
- malformed HTML / a throwing check → still resolves as `scored` with degraded
  signals (never throws, never `score_failed` when the page fetched).

**Route — `__tests__/api/prospects.test.ts`** (copy the
`studio-lead-audit.test.ts` harness: `vi.importActual('next/server')` + `after`
recorder; mock `@/lib/supabase/server`, `places.ts`, `score.ts`):
- search: non-admin 401/403; missing industry/location 400; `NO_KEY` → 503;
  zero results → 200 `{found: 0}`; **upsert failure → 500 and `after` NOT
  scheduled**; happy path → upsert WITHOUT status/scoring_started_at, staleness
  flip runs before the claim, claim excludes converted/dismissed/scoring,
  202 `{found, scoring}`, `after` cb recorded not run.
- **the scorer's CAS fence:** invoke the recorded `after` callback with a mock
  admin whose score-write UPDATE returns rowcount 0 (simulating a mid-flight
  website refresh or convert) → the result is discarded, logged as fenced, no
  retry-write.
- **overlapping searches:** a second search's claim (mocked table state with a
  row already `scoring`) does not re-claim it.
- convert: bad UUID 400; RPC `prospect_not_found` → 404; RPC returns
  `already_converted: true` → `{existing: true}` passthrough; happy path →
  `{leadId, existing: false}`.
- dismiss/restore: converted → 409; scored → dismissed stores
  `dismissed_from='scored'`; restore returns it to `scored`; restore on a
  non-dismissed row → 409.
- list GET: unknown `status` param → 400; filters pass through;
  **`{ scoringCount }` present and computed unfiltered even when the status
  filter excludes `scoring`**; query error → 500 (never `[]`).
- **filter sanitization:** `q` of `foo,bar(baz)%_'` reaches `.or()` stripped to
  safe chars (assert the built pattern), and a punctuation-heavy business name
  still matches on its word characters.

**RLS — `supabase/tests/prospects_rls.test.ts`** (mirror
`lead_audits_rls.test.ts`; seed a `leads`-less table for CRUD, plus one seeded
prospect for the RPC checks):
- anon: SELECT empty / INSERT rejected. Authed non-admin: same.
- admin: full CRUD (assert the positives).
- service role: INSERT + UPDATE (the scoring job's path).
- CHECK: `status='bogus'` insert rejected; `status='scoring'` with NULL
  `scoring_started_at` rejected (`prospects_scoring_needs_anchor_ck`).
- **RPC:** anon/authed cannot execute `convert_prospect` (EXECUTE revoked);
  service role converts a seeded prospect → a `leads` row exists with
  `source='prospecting'` and the prospect is `converted`; calling it AGAIN
  returns the same lead id with `already_converted=true` and does NOT create a
  second lead (count the leads).

**Panel behavior** — component test if the repo's RTL harness covers admin
panels cleanly (it exists — `@testing-library/react` is a devDependency),
covering at minimum: the poll interval is cleared on unmount, and polling
continues when the status filter hides `scoring` rows (reads `scoringCount`).
Otherwise these two are named items in the browser smoke, per Phase 3
precedent.

### 8. Out of scope (do not build)

LLM scoring one-liners (v2 hook comment only); a durable search/job record
table (the `scoringCount` signal covers completion detection; job-level
reporting/cost tracking is v2); per-hour search budget/quota UI; chunked
upserts or Places retry logic (a search is ≤60 rows / 3 requests); scheduled
re-scoring crons; competitor-lite Places context on audits; Resend outreach
sending; pagination beyond the 200-row cap; auto-running the Phase 3 audit on
convert (the workspace's Run audit button is one click away); bilingual UI.

**Accepted limitations:** scoring context lives in the `after()` closure — a
killed invocation abandons the batch and the 5-min staleness flip turns
orphaned `scoring` rows into `score_failed` (re-search to retry). A website
refreshed by an overlapping search mid-score deliberately loses its in-flight
result to the CAS fence and follows the same stale-flip → re-search path.

## Env vars & dependencies

`GOOGLE_PLACES_API_KEY` — **new.** GCP key restricted to **Places API (New)**;
**billing must be enabled** (the free tier is a 1,000-request/month cap on the
Enterprise SKU, not unmetered). Add to Vercel (all envs) + `.env.local`.
Missing key → search returns 503 with a clear message; the rest of the admin
is unaffected.

**No new npm dependencies** — cheerio, zod, ipaddr.js (via safe-fetch) all
present.

## Suggested commit message

```
feat(studio): prospect finder — Places search + opportunity scoring (phase 4)
```

## Verification (per dev workflow)

- [ ] Go/no-go prerequisites at the top of this doc are satisfied (060 on prod,
      test:rls green, Places key created).
- [ ] `pnpm verify` clean (type-check → tests → build); new routes build as
      dynamic functions.
- [ ] `pnpm test:rls` clean incl. `prospects_rls.test.ts` AND the Phase 3
      `lead_audits_rls.test.ts` (022/025 dup-migration temp-rename dance).
- [ ] Apply `061_prospects.sql` locally; search a real industry/location
      (**watch the GCP billing console on the first search**); scores populate
      progressively as the poll refreshes.
- [ ] **Ordering contract live:** a no-website prospect and a
      facebook-page-as-website prospect rank above every scored site; a modern
      site ranks at the bottom; an unreachable site (40) sits below bad scored
      sites.
- [ ] Convert → lands in the lead workspace, `source: 'prospecting'`, existing
      URL/phone/industry carried over → Run audit works on it end-to-end
      (the full flywheel).
- [ ] Convert is idempotent on double-click (one lead, `{existing: true}` on
      the second — verify the leads table has exactly one row).
- [ ] Dismiss hides from the default view (it now genuinely does — the default
      query excludes dismissed); Restore returns the row to its prior status;
      re-search preserves converted/dismissed while refreshing their Places
      data.
- [ ] Missing `GOOGLE_PLACES_API_KEY` → search shows the 503 message; page
      otherwise fine.
- [ ] Zombie flip: a `scoring` row with `scoring_started_at` >5 min ago reads
      back `score_failed` with score 40 and cleared breakdown/tech.
- [ ] Polling completes correctly with the status filter set to something that
      hides `scoring` rows (the `scoringCount` signal, not the visible list).
- [ ] Browser EN smoke of `/admin/prospects` (+ `/ja` route loads).
- [ ] Ships via `/ship`; stage only intentional files.

## Out-of-band after ship

- Apply `061_prospects.sql` in the Supabase dashboard SQL editor
  (`zvfwtndbxshrtpwcwynw`) **in the same window as the deploy** (go/no-go gate
  item 3).
- Create + restrict `GOOGLE_PLACES_API_KEY` in GCP (Places API (New) only,
  billing enabled); add to Vercel all envs. **Verify current Places pricing**
  ($35/1k Enterprise requests, 1,000 free/mo assumed) before heavy use.

## Key risks

- **Places billing** — the field mask is the cost driver (Enterprise SKU,
  $35/1k requests; free cap 1,000 requests ≈ 333 full searches/mo);
  `MAX_PAGES = 3` is the hard guard; pricing verified at build + first-search
  billing-console check in Verification.
- **SSRF on `websiteUri`** — third-party data from Google; normalize first,
  then every fetch goes through `fetchHtmlWithCaps` (per-hop `ipaddr.js`
  guard); social hosts are scored without fetching at all.
- **Concurrent-search integrity (first-of-a-kind for a batch job)** — the
  two-pass upsert (data refresh without `status`), the claim excluding
  converted/dismissed/scoring, and the **website compare-and-swap on the score
  write** together prevent status clobbering AND the score-for-the-wrong-
  website race. Test all three directly.
- **Convert integrity** — a single-transaction RPC with a row lock; no orphan
  windows, at-most-one-lead-per-prospect holds transactionally, idempotent on
  replay. The RPC is the one new DB function; it follows the hardened 057
  pattern exactly.
- **Score calibration** — the ordering contract (D2) is the product
  requirement; weights are tunable constants but the chain
  no_website > social > worst-legacy > score_failed > modern is test-enforced.
- **Migration numbering** — master plan said 059; reality is **061**. Re-check
  at build time.
- **`after()` batch budget** — 60 sites × (≤8 s fetch) at concurrency 4 ≈ ≤2 min
  worst case, inside `maxDuration = 300`; the 5-min staleness flip catches a
  died invocation.
