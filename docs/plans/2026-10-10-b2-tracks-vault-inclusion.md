# B2 — Tracks + Vault inclusion flag + public catalog (migration 079)

**Status:** BUILT 2026-10-13 — D1–D4 approved as recommended (Ryan, 2026-10-13). See "Execution record" at the end.
**Roadmap:** `docs/plans/2026-10-05-marketing-redesign-green.md` → "### B2" + "Review amendments" (B2 bullet).
**Locked decision #6 (2026-10-04, don't re-litigate):** tracks = `track text` + CHECK on `content_items` and `courses`, values `ai_essentials, marketing_growth, build_with_ai, research_insights, workflow_automation`; admin-editable in the Vault editor and course editor.
**Locked decision #5:** courses are included in the Vault through a `courses.vault_included` flag (the access predicate itself is B3, not this unit).
**Execution:** one fresh session via `docs/plans/_EXECUTION_TEMPLATE.md`, one commit. Baseline = `e64348f` (B1 shipped).

## Why now

B2 unblocks Unit 1 (Home track rows) and Unit 2 (Learn catalog filters, course facts). It is schema + data plumbing + two admin controls. There is no visitor-facing UI in B2.

## What prod looks like today (checked 2026-10-10, read-only)

- `content_items`: 27 published (8 free, 19 premium), 0 partner-owned. Has `partner_id`, `access_tier`, `difficulty_level`, `tags`; no `track`.
- `courses`: 13 rows (4 published, 3 of those private). Has `partner_id`, `is_private`, `tags`; no `track`, no `vault_included`.
- **`course_catalog` does NOT exist on prod.** It is created by `071_course_material_access.sql`, which is untracked and unapplied (course-access workstream, along with the uncommitted `checkout` / `checkout-embed` / `lib/*/queries.ts` readers). See D1.
- 27 items is small: "fetch everything, filter on the client" (roadmap Unit 2) is comfortably fine.

## Decisions for Ryan

| # | Question | Recommendation |
|---|---|---|
| D1 | The roadmap says 079 should `CREATE OR REPLACE VIEW course_catalog` to append `track, vault_included`. That view doesn't exist on prod (071 never applied), so 079 would fail. | **079 touches base tables only.** No view change. Record in this plan and in memory that whoever lands 071 must include `c.track, c.vault_included` in its `course_catalog` definition (071 is `CREATE VIEW`, and it will run after 079 because 079 is applied first). Don't edit 071 from this unit; it belongs to the other workstream. |
| D2 | Tracks start NULL on all 27 items and 13 courses. Assign by hand in admin, or run a one-off backfill? | **One-off backfill from the proposed table in the appendix**, after you approve or correct it. It runs as a data update (service-role, logged), separate from the migration, after 079 is on prod. Anything you leave blank stays NULL and shows only under "All". |
| D3 | **Pre-existing leak found while scoping:** anon can read `url` / `embed_url` of all 19 premium items through the public API (`content_public_read USING (is_published)`, 041). 6 are YouTube links for premium videos, i.e. the premium content itself. The `honuvibe.ai` links point at pages that are gated separately. | **Separate small slice right after B2**, not folded in. A fix touches every `select('*')` reader of `content_items` (column grants or a gated accessor), which is a different blast radius from B2. B2's new catalog query never selects `url` / `embed_url`, so it doesn't widen the leak. If you'd rather close it first, say so and B2 waits. |
| D4 | `build_with_ai` has only 2 items in the proposed mapping (Cursor guide, AI project brief template). Unit 2 will show a thin chip. | Accept for now; it fills as content lands. Flag only. |

## Scope

### 1. Migration `supabase/migrations/079_tracks_and_vault_inclusion.sql`

- `ALTER TABLE public.content_items ADD COLUMN IF NOT EXISTS track text NULL` with a named CHECK `content_items_track_check CHECK (track IS NULL OR track IN (…5 values…))`.
- Same on `public.courses` (`courses_track_check`).
- `ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS vault_included boolean NOT NULL DEFAULT false`. No consumer reads it until B3 except the admin toggle; the default flips nothing.
- `CREATE INDEX IF NOT EXISTS content_items_track_published_idx ON public.content_items(track) WHERE is_published`.
- `COMMENT ON COLUMN` for all three (cite decisions #5/#6).
- `NOTIFY pgrst, 'reload schema';`
- Header: apply to prod BEFORE pushing (expand-first: new nullable / defaulted columns, no reader changes).
- **Grants check:** adding columns to a table with table-level grants needs nothing. Confirm prod has no column-level grants on these tables before applying (`select … from information_schema.column_privileges where table_name in ('content_items','courses')`). If any exist, grant the new columns to match. Lesson from 076 (default privileges / targeted REVOKEs).
- No RLS change: `content_public_read` already covers new columns for published rows. `courses` policies unchanged.

### 2. `lib/tracks.ts` (new)

- `export const TRACK_IDS = ['ai_essentials', 'marketing_growth', 'build_with_ai', 'research_insights', 'workflow_automation'] as const;` + `type TrackId`.
- `isTrackId(v: unknown): v is TrackId`.
- Registry `TRACKS: Record<TrackId, { key: string }>` holding only the stable short key the design uses (`ess, mkt, bld, res, wf`) and a cover-tone token name. **Labels and blurbs go in i18n** (`tracks.<id>.label`, `tracks.<id>.blurb`) so JA review happens in one place. EN labels from the design: AI Essentials · Marketing & Growth · Build with AI · Research & Insights · Workflow & Automation. Blurbs: lift from `docs/design_2026_green/HonuVibe Learn - Catalog.html` where present; anything else is drafted and flagged.
- Unit test `__tests__/lib/tracks.test.ts`: `TRACK_IDS` matches the CHECK list parsed out of `079_tracks_and_vault_inclusion.sql` (both constraints), and every id has EN + JA label/blurb keys.

### 3. Types + server actions

- `lib/vault/types.ts`: `track: TrackId | null` on the item row types; `track?: TrackId | null` on `VaultItemCreateInput`.
- `lib/vault/actions.ts` `createVaultItem` (~:114) / `updateVaultItem` (~:175): pass `track` through, rejecting anything not `isTrackId` (null allowed).
- `lib/courses/types.ts`: `track`, `vault_included` on the course type.
- `lib/courses/actions.ts` `updateCourse` (:15): accept both; validate `track` via `isTrackId`.

### 4. Admin controls

- `components/admin/vault-editor/classification-section.tsx`: add a fourth select "Track", with a "None" option = NULL; wire the state through `vault-editor.tsx` the same way `accessTier` is wired.
- `components/admin/AdminCourseDetail.tsx`: Track select + an "Included in the Vault" toggle styled like the existing privacy toggle (:573). Both save through `updateCourse`. Copy under the toggle: "Vault members can open this course once B3 ships. Leave off for cohorts and paid-only courses." (admin is EN-only).

### 5. Public catalog query — `lib/vault/catalog.ts` (new file)

New file on purpose: `lib/vault/queries.ts` carries uncommitted course-access edits.

- `getPublicCatalog()`: cookie-less anon client + `unstable_cache` (same pattern as `getCachedVaultTotalCount`, `lib/vault/queries.ts:248`), tag `vault-catalog`, `revalidate: 600`.
- Explicit column list (never `*`, never `url` / `embed_url`): `id, slug, title_en, title_jp, description_en, description_jp, content_type, thumbnail_url, duration_minutes, difficulty_level, language, access_tier, track, is_featured, publish_date, series_id, series_order`.
- Filters: `is_published = true` AND `partner_id IS NULL` (review amendment: partner-owned items are unlisted).
- Order: track (NULLs last), then `is_featured desc`, then `publish_date desc`.
- Returns `[]` + `console.error` on error, matching the neighbouring helpers.
- `publishVaultItem` / `unpublishVaultItem` / `updateVaultItem` call `revalidateTag('vault-catalog')`.

### 6. i18n (EN + JA)

- New `tracks` namespace: `tracks.<id>.label`, `tracks.<id>.blurb`, `tracks.all` ("All tracks").
- JA machine-drafted → flagged for native review.
- **No consumer UI yet:** the namespace ships unused until Unit 1/2, and the tracks unit test keeps it from rotting.

### 7. Backfill (after 079 is on prod; only with D2 approved)

- `scripts/backfill-tracks-079.ts`: service-role, prod-ref guarded. Reads the approved slug→track table, `UPDATE`s only rows whose `track IS NULL` (never overwrites an admin choice), prints a before/after count per track. Dry-run by default; `--apply` to write.
- The approved table lives in this plan's appendix and the script imports nothing else.

## Tests

| File | Change |
|---|---|
| `__tests__/lib/tracks.test.ts` (new) | CHECK list ↔ `TRACK_IDS`; i18n keys present EN + JA |
| `__tests__/lib/vault/catalog.test.ts` (new) | Mocked client: explicit column list has no `url` / `embed_url`; filters `is_published` + `partner_id IS NULL`; error → `[]` |
| `__tests__/lib/vault/actions-track.test.ts` (new, or extend an existing actions test) | Invalid track rejected; null accepted; `revalidateTag('vault-catalog')` on publish/unpublish/update |
| `supabase/tests/vault_catalog_rls.test.ts` (new) | anon reads `track` on a published premium item; anon reads no unpublished item; partner-owned published item is excluded by the catalog query's filter; `vault_article_bodies` unreadable by anon; CHECK rejects `'bogus'` on both tables; `vault_included` defaults false |
| Admin component tests (if the editors have them) | Track select round-trips; course toggle calls `updateCourse({ vault_included })` |

Not asserted here: the `course_catalog` columns (D1; the view doesn't exist yet).

## Verification

- `pnpm verify` in a clean worktree of HEAD + B2 (hoisted install), as for B1. The main tree carries unrelated dirty work.
- `pnpm test:rls` on the throwaway project with 079 applied there first. On this machine, override `TEST_SUPABASE_DB_URL` to the IPv4 session pooler (`aws-0-ca-central-1.pooler.supabase.com:5432`, user `postgres.kmmfssluqbcuhybfrsbn`); no IPv6 here.
- Admin smoke: set a track on one Vault item and one course, toggle `vault_included`, reload, values persist. EN only (admin).
- Adversarial review before commit.

## Ship sequence

1. Commit B2 locally.
2. Ryan applies `079_tracks_and_vault_inclusion.sql` on `zvfwtndbxshrtpwcwynw`. Verify by querying prod: the columns exist, the CHECKs exist with the expected definition, the index exists, a column-privileges check.
3. Push.
4. With D2 approved: `scripts/backfill-tracks-079.ts` dry-run → Ryan OKs counts → `--apply`.
5. Ryan sets `vault_included` per course when B3 is ready (no default flip).

## Rollback

`ALTER TABLE … DROP COLUMN track` (both) / `DROP COLUMN vault_included` + drop the index. Code rollback alone is safe while 079 stays (unused nullable columns).

## Out of scope

The `course_catalog` view (D1), Vault course access predicate (B3), the premium-URL leak (D3, its own slice), any visitor-facing track UI (Units 1–2), filters on the member Vault page.

---

## Appendix — track per published item (D2, approved as recommended 2026-10-13)

Vault items (27):

| slug | proposed track |
|---|---|
| advanced-system-prompts-claude | ai_essentials |
| ai-content-creation-social-media | marketing_growth |
| ai-ethics-every-professional | ai_essentials |
| ai-japanese-workplace-trends-2026 | research_insights |
| ai-meeting-notes-template-japanese | workflow_automation |
| ai-project-brief-template | build_with_ai |
| automate-content-calendar-ai | marketing_growth |
| building-personal-ai-workflow | workflow_automation |
| chain-of-thought-prompting-guide | ai_essentials |
| chatgpt-business-email-japanese | workflow_automation *(low confidence; could be ai_essentials)* |
| chatgpt-claude-gemini-comparison | ai_essentials |
| claude-ai-complete-overview | ai_essentials |
| cohort1-session-ai-workflows | workflow_automation |
| cohort1-session-prompt-fundamentals | ai_essentials |
| cohort2-session-advanced-claude | ai_essentials |
| cohort2-session-ai-content-creators | marketing_growth |
| cursor-ai-code-editor-guide | build_with_ai |
| notebooklm-deep-dive | research_insights |
| notebooklm-research-guide | research_insights |
| perplexity-deep-research | research_insights |
| prompt-engineering-mindset | ai_essentials |
| prompt-starter-kit | ai_essentials |
| weekly-ai-experiment-log | ai_essentials |
| what-is-prompt-engineering | ai_essentials |
| why-japanese-professionals-adopting-ai | research_insights *(could be ai_essentials)* |
| zapier-ai-actions-overview | workflow_automation |
| zapier-automation-japanese-business | workflow_automation |

Totals: ai_essentials 11 · workflow_automation 6 · research_insights 5 · marketing_growth 3 · build_with_ai 2.

Courses (published only; drafts stay NULL until they publish):

| slug | proposed track |
|---|---|
| ai-essentials-first-steps-future | ai_essentials |
| ai-for-music-professionals *(private)* | marketing_growth |
| teaching-ai-for-teachers *(private)* | ai_essentials |
| how-to-make-different-types-of-martinis *(private, test)* | — leave NULL |
| test-1v1 *(private, test)* | — leave NULL |

---

## Execution record (2026-10-13)

**Baseline:** `e64348f`. Verified in a clean worktree of HEAD + exactly the B2 diff (hoisted install). `messages/{en,ja}.json` carry uncommitted auth-hardening lines, so B2's `tracks` namespace was applied to their HEAD versions by script and only that was staged.

**Changes from the plan text:**
- `lib/tracks.ts` exports `TRACK_KEYS` (the design's chip keys) instead of a `TRACKS` record with a cover tone. The design colours cards per item, not per track, so a tone would have been invented. EN labels/blurbs are the design's own strings; JA is machine-drafted.
- `Course.track` / `Course.vault_included` are optional on the TS type: several course queries select explicit column lists without them (including the dirty `lib/courses/queries.ts`, left untouched). Both admin loaders use `select('*')`.
- The catalog cache is revalidated with `revalidateTag(tag, { expire: 0 })`, not `'max'` (review: an unpublished item must not be served stale even once). The catalog is sorted into `TRACK_IDS` order in code rather than alphabetically by SQL.

**For B3 (review finding, not fixed here):** policy `courses_own_proposals_update` (032) lets an instructor update their own `status='proposal'` row through PostgREST, so they could pre-set `vault_included = true`. B3's predicate must require `is_published` (it does per the roadmap), and the admin approval path should not silently carry an instructor-set `vault_included`: reset it or surface it on approval.

**test:rls:** 079 applied to the throwaway project via the IPv4 pooler; `vault_catalog_rls` 6/6.
