# Studio Lead Engine — Master Plan (Previews, Lead Workspace, Prospect Finder)

> Approved by Ryan 2026-07-08. This is the master plan; each phase gets its own
> derived plan doc + fresh execution session per `docs/dev-workflow.md`.
> Phase 1 plan: `docs/plans/2026-07-08-phase1-studio-leads-writable-workspace.md`.

## Context

The Studio needs to start monetizing. Ryan's flow today: export an HTML mockup from claude.ai/design → drop it at an unguessable URL under `public/previews/` → send the client a link. The admin Studio Leads page is read-only (status/notes edited in Supabase directly), and there is no way to originate leads — only inbound "Start a Project" form submissions.

This plan builds a connected lead engine: **(1)** a reusable client-preview skill with optional real password protection, **(2)** a writable Studio Leads admin with Create New Lead + per-lead workspace (preview link, AI outreach email, AI website audit), **(3)** a prospect finder that searches Google Places for local businesses in an industry, scores their websites for "outdated site" signals, and converts winners into leads.

**Feasibility verdict: all three are feasible with mostly-existing infra.** Key discoveries from exploration:
- Hawaii Palms previews are **not actually password protected** — just unguessable URL + `X-Robots-Tag: noindex` (`next.config.ts:70-81`). Ryan chose: keep quick mode AND add an optional real password gate.
- The admin reads the normalized **`leads`** table (migration 047), NOT retired `studio_leads`, via an aliased select in `lib/admin/queries.ts:243-272`. Highest migration is **055** (verified 2026-07-08); new migrations start at 056.
- Strong reusable plumbing exists: SSRF-hardened URL fetcher (`lib/community/link-preview.ts`), 202 + `after()` background jobs with DB status rows (`app/api/tutoring/generate/route.ts`, maxDuration 300), forced tool_use + Zod Claude calls (`lib/tutoring/generator.ts`), `parseJsonFromClaude` (`lib/courses/json-response.ts`), admin CRUD patterns (workbench server actions, partners API routes).

**Decisions locked with Ryan:**
- Previews: dual mode — quick unguessable static URL, or password-gated.
- Prospecting source: Google Places API (New) — official, ~$0.11 per 60-result search, free tier covers ~100 searches/mo.
- Audit v1: own-site only (fetch + PageSpeed Insights + heuristics + Claude narrative). No paid SERP API; competitive framing is qualitative.
- Leads become fully writable (create + status + notes) — the old "read-only until discovery tool" freeze is lifted.

**Execution model:** 4 phases, each an independent unit of work (own plan doc, fresh session, review + verify + ship). Migration numbers below assume 056–059; **re-check the migrations dir at each phase's build time** (numbering has collided before — 022/025).

---

## Phase 1 — Writable Studio Leads + Lead Workspace (highest immediate value)

### Migration `056_studio_lead_workspace.sql`
```sql
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS preview_password text,        -- display-only convenience
  ADD COLUMN IF NOT EXISTS outreach_email_subject text,
  ADD COLUMN IF NOT EXISTS outreach_email_body text,
  ADD COLUMN IF NOT EXISTS outreach_email_generated_at timestamptz;
-- Manual/prospected leads may lack contact name/email at creation:
ALTER TABLE leads ALTER COLUMN name DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;
COMMENT ON COLUMN leads.source IS 'discover | studio_form | studio_form_migrated (047 backfill) | manual | prospecting';
```
Reuse `existing_url` for "current website" (already exists). Apply manually in Supabase dashboard (`zvfwtndbxshrtpwcwynw`) after deploy — Vercel does not run migrations.

### Types & queries
- `lib/admin/types.ts` (~lines 64-88): `StudioLead.full_name/email` → `| null` (also fix latent `message: string` → `| null`); add `phone`, `existing_url`, `source`. New `StudioLeadDetail` (workspace columns) and `LeadAudit` types.
- `lib/admin/queries.ts`: extend `getStudioLeads()` aliased select with `phone, existing_url, source`; add `getStudioLeadById(id)` and `getLeadAudits(leadId)`.

### Mutations — workbench-style server actions (new `lib/studio/lead-actions.ts`)
Copy the `requireAdmin()`/Zod/`createAdminClient()`/`revalidatePath` skeleton from `lib/workbench/actions.ts`:
- `createLead(input)` — inserts with `source:'manual'`, `lifecycle:'new'`, `sales_stage:'new'`; returns `{id}`.
- `updateLead(id, patch)` — contact fields, `existing_url`, `sales_stage`, `notes`, preview fields.
- `saveOutreachEmail(id, {subject, body})`.
- **Critical:** centralize the UI→DB column mapping (`full_name→name`, `company→business_name`, `status→sales_stage`, `project_type→tier_interest`) in ONE helper — the aliased read select hides drift and a wrong column name fails silently.

### AI outreach email — API route (needs maxDuration)
- New `lib/studio/outreach-generator.ts`: forced tool_use + Zod (copy `lib/tutoring/generator.ts` structure), model `claude-sonnet-4-6`, output `{subject, body}`. Input: company, contact, industry, site URL, notes, preview link+password, latest audit summary if any.
- New `app/api/admin/studio-leads/[id]/outreach/route.ts` — POST, synchronous, `maxDuration = 60`, writes draft columns, returns draft.

### UI
- `app/[locale]/admin/studio/leads/page.tsx`: add "New Lead" `<Link href="/admin/studio/leads/new">` (Button + `Plus`); update stale "edit in Supabase" subcopy.
- New `app/[locale]/admin/studio/leads/[id]/page.tsx` — mirrors `app/[locale]/admin/workbench/[id]/page.tsx`: `id === 'new'` → create form, else detail via `getStudioLeadById` + `notFound()`.
- New `components/admin/AdminStudioLeadForm.tsx` — workbench-form pattern (single draft object, dirty tracking, inline save/error state, no modals/toasts). Fields: company (required), contact person, email, phone, industry, current website, sales_stage select, notes, preview URL + password.
- New `components/admin/StudioLeadOutreachPanel.tsx` — Generate → editable subject/body → Save draft → Copy (`navigator.clipboard`, inline "Copied ✓").
- `components/admin/StudioLeadCard.tsx`: null-guard `full_name`/`email`/`message` (fallback to company; hide mailto when no email); add "Open workspace →" link; small `source` label.
- No `AdminNav.tsx` change needed for this phase (`startsWith` active-match covers `[id]`).
- Untouched: public intake route + form (additive columns + relaxed NOT NULLs can't break it).

---

## Phase 2 — Preview Delivery (dual mode) + Reusable Skill

### Quick mode (unchanged, now codified)
Static export → `public/previews/<Client>-preview-<10hex>/` → existing noindex header. Commit + deploy.

### Gated mode
- **Storage:** private Supabase Storage bucket `client-previews` (exports are 7–8 MB; keeping them in `public/` can't be gated, and repo-dir serving would need a redeploy per preview).
- **Migration `057_client_previews.sql`:** table `client_previews` (`id, created_at, lead_id FK→leads NULLABLE ON DELETE SET NULL, slug UNIQUE, title, mode public|gated, password (plaintext — low-stakes mockups, admin must re-send it; one-function swap to hash later), storage_prefix, entry_file default 'index.html', expires_at, access_count, last_accessed_at`), admin-only RLS; private bucket insert.
- **Gate route:** new `app/api/preview/[slug]/[[...path]]/route.ts` (under `/api` so middleware/matcher untouched):
  - GET: cookie `hv_pv_<slug>` = HMAC-SHA256(slug, `PREVIEW_GATE_SECRET`) verified timing-safe → **stream** the object (`new Response(blob.stream())` — Vercel caps buffered responses at ~4.5 MB) with content-type by extension + `X-Robots-Tag: noindex` set by the handler; no/invalid cookie → self-contained password form (inline CSS, noindex meta).
  - POST: rate-limit via `tryConsume` (`lib/community/rate-limit.ts`), timing-safe password match → Set-Cookie (HttpOnly, Secure, SameSite=Lax, Path=/api/preview/<slug>, 30d) → 303 to GET. Bump `access_count`/`last_accessed_at` on entry-file hits.
- New `lib/previews/gate.ts` — HMAC sign/verify + timing-safe compare helpers.
- Lead workspace: Phase 1's free-text `preview_url` field simply holds either URL form; optionally later a picker from `client_previews`.

### Reusable skill (deliverable of feature #1)
New `C:\Users\HCI\.claude\skills\studio-client-preview\SKILL.md` (global, beside `client-landing-page`/`studio-client-engagement`; same frontmatter conventions: `name`, `description: "Use when..."`). Steps it encodes:
1. Take claude.ai/design export; verify/inject `<meta name="robots" content="noindex,nofollow">`, strip analytics, check relative asset paths.
2. Choose mode. Quick → `public/previews/<Client>-preview-<10hex>/`, commit, deploy. Gated → generate slug + memorable password; upload files **directly to Supabase Storage** `client-previews/<slug>/` with the service-role key from `.env.local` (never through a route — request-body cap); insert the `client_previews` row.
3. Set `preview_url` (+ password) on the lead in admin.
4. Emit a send-to-client message template with link + password.
Cross-reference from `studio-client-engagement` (its preview handling currently delegates to `client-landing-page`, which prescribes a heavier lockdown meant for full sites).

---

## Phase 3 — Website Audit Engine

### Shared fetch extraction (Phases 3 and 4 both need it)
New `lib/http/safe-fetch.ts`: extract `assertPublicHostname` + parameterized `fetchHtmlWithCaps({maxBytes, timeoutMs, maxRedirects})` from `lib/community/link-preview.ts`; refactor link-preview to import it (behavior-preserving — re-run its tests).

### Migration `058_lead_audits.sql`
Table `lead_audits`: `id, lead_id FK→leads ON DELETE CASCADE, created_at, updated_at, status generating|completed|failed` (reuses existing StatusBadge pills), `audited_url` (snapshot), `scores jsonb, findings jsonb, tech jsonb, psi jsonb, narrative jsonb` ({one_liner, current_state_md, opportunities_md, competitive_md, next_steps_md}), `summary_md text` (copy-paste artifact), `model_id, generation_error, completed_at`. Index `(lead_id, created_at DESC)`, admin-only RLS.

### Pipeline (`lib/studio/audit/…`: `heuristics.ts`, `psi.ts`, `schemas.ts`, `generator.ts`, `run.ts`)
Runs inside `after()`, ~1.5–3 min total, **≈ $0.06–0.12/audit**:
1. Safe-fetch homepage + up to 3 same-host pages (about/services/contact), 5 MB/page, SSRF-check every hop — **in parallel with** PSI.
2. **Deterministic heuristics** (code computes scores; Claude never invents numbers): http-only/mixed content; tech detection (meta generator, `wp-content` paths + theme name, Wix/Squarespace/Shopify, page builders elementor/divi/wpbakery, jQuery version); copyright-year staleness ≥2y; viewport/responsive; title/meta-description/H1/OG/schema.org-LocalBusiness/favicon/robots/sitemap; alt coverage; script/stylesheet counts, render-blocking, legacy image formats; conversion basics (`tel:` link, contact form, map, hours). Each check emits `{id, category, severity critical|warn|info|pass, title, evidence}`; scores 0–100 per category computed in code.
3. **PageSpeed Insights** (free, `PAGESPEED_API_KEY`): mobile strategy, all 4 categories. Retry ×1, then proceed heuristics-only — PSI is never a hard dependency.
4. **Claude narrative**: forced tool_use + Zod, model **`claude-sonnet-5`** (matches paths-gen choice; opus-4-8 is a one-line upgrade), max_tokens ~8000, no temperature. Competitive framing is qualitative — explicitly instructed not to name real competitors or invent data.

### Route + UI
- New `app/api/admin/studio-leads/[id]/audit/route.ts` — POST: 400 if no `existing_url`, 409 if latest run still `generating` (server-side guard, not just button-disable), insert row → `after(runAudit)` → 202 `{auditId}`; `maxDuration = 300`. GET: list runs; rows `generating` > 6 min flip to `failed` on read (no cron needed).
- New `components/admin/StudioLeadAuditPanel.tsx` on the lead detail page — Run audit (disabled w/o URL), poll GET ~5s while generating, render latest audit sections + "Copy summary", collapsed history with StatusBadge.

---

## Phase 4 — Prospect Finder

### Migration `059_prospects.sql`
Table `prospects`: `id, place_id UNIQUE, name, website, phone, address, rating numeric(2,1), review_count, industry, location, search_query, score int` (0–100, worse site = higher opportunity), `score_breakdown jsonb, tech jsonb, status new|scoring|scored|score_failed|no_website|converted|dismissed, converted_lead_id FK→leads ON DELETE SET NULL, created_at, scored_at`. Index `(status, score DESC NULLS LAST)`, admin-only RLS. Upsert on `place_id` refreshes Places data but preserves converted/dismissed status.

### Search + scoring
- New `lib/studio/prospecting/places.ts`: `POST https://places.googleapis.com/v1/places:searchText`, field mask `places.id,displayName,formattedAddress,websiteUri,nationalPhoneNumber,rating,userRatingCount,nextPageToken`, pageSize 20, **max 3 pages** (hard cap — this mask is the Enterprise SKU, ~$35/1000 requests ⇒ ~$0.11 per full search; free tier ≈ 100+ searches/mo — verify current pricing at build time). No Place Details call needed.
- New `lib/studio/prospecting/score.ts`: heuristics-only in v1 (no LLM — ranking signal is deterministic; leave a `// v2: optional haiku one-liner` hook). Safe-fetch homepage (2 MB, 8s — SSRF guard mandatory, `websiteUri` is third-party data). Additive: no website → status `no_website` score 95; social-page-as-website +25; http-only +15; no viewport +15; stale copyright +10; old WP generator +10; no meta desc/OG +10; legacy builder +8; unreachable → `score_failed`.
- Routes: `app/api/admin/prospects/search/route.ts` (POST `{industry, location}` → upsert rows → 202; `after()` promise-pool concurrency 4 scores them, ~1–2 min for 60; `maxDuration = 300`; on-read staleness `scoring` > 5 min → `score_failed`), `app/api/admin/prospects/route.ts` (GET list w/ filters), `app/api/admin/prospects/[id]/convert/route.ts` (POST, **idempotent** — returns existing lead if already converted; inserts lead `{source:'prospecting', business_name, existing_url, phone, industry}`, sets `converted` + `converted_lead_id`), `[id]` PATCH dismiss.
- UI: new `app/[locale]/admin/prospects/page.tsx` + `components/admin/AdminProspectList.tsx` (search form, ranked table: name/link/score/badges/rating, Convert → jumps to the new lead workspace with a "run full audit" shortcut). Add "Prospects" item to the Studio group in `components/admin/AdminNav.tsx` (~line 69).

---

## The flywheel + future automation (recommendations, not in scope)

Prospect search → score → convert → audit → outreach email (references audit + preview) → preview link with password → close. Cheap later upgrades, roughly in value order:
1. **Send email from the app via Resend** (client + templates already exist in `lib/email/`) instead of copy-paste, with lead status auto-advance.
2. **Follow-up reminders** through the just-shipped notifications system (migration 055) — e.g. "no reply in 5 days".
3. **Preview-open signal**: `access_count`/`last_accessed_at` already land in Phase 2 — surface "Client viewed the preview 3×" on the lead card; strongest buying signal available.
4. **Competitor-lite audit context** from Places data you already pay for (nearby same-industry ratings/review counts) — no SERP API needed.
5. **Weekly cron** re-scoring or new-prospect sweep for a saved industry/location (vercel.json cron + `CRON_SECRET` pattern exists).

## Env vars (all with presence checks per convention)
`ANTHROPIC_API_KEY` (exists) · `PAGESPEED_API_KEY` (new, free) · `GOOGLE_PLACES_API_KEY` (new — restrict to Places API (New); GCP billing must be enabled) · `PREVIEW_GATE_SECRET` (new, 32+ random bytes). Add to Vercel + `.env.local`.

## Verification (each phase, per dev workflow)
- `pnpm verify` (type-check → tests → build); `pnpm test:rls` for every phase (all four touch migrations/RLS — remember the 022/025 temp-rename dance for local runs).
- Phase 1: create/edit/stage/notes end-to-end locally; generate + copy outreach email (needs `ANTHROPIC_API_KEY`); regression: submit public studio form → lead still appears, old cards render (null-guards).
- Phase 2: upload a real 7–8 MB design export; wrong password → error, right password → renders incl. sibling images; cookie persists; `curl -I` shows `X-Robots-Tag: noindex`; quick-mode path still serves.
- Phase 3: audit a known WordPress site and a modern site — scores differ sensibly; PSI-down path still completes; concurrent-run 409; failure paths write `generation_error`.
- Phase 4: search a real industry/location (watch billing console), scores populate progressively, convert → lead workspace → run audit; convert is idempotent on double-click.
- UI phases get the browser EN smoke (admin is EN-only in practice; `/ja` route smoke for the new admin pages loading at all).
- Each phase ships via `/ship` (verify → adversarial review → commit to main → push), then **apply its migration manually in the Supabase dashboard** before relying on the deploy.

## Key risks
- **Aliased-select drift** (Phase 1): reads alias columns, writes must use real names; the `as unknown as StudioLead[]` cast hides mistakes — centralize the mapping, extend the select carefully.
- **NOT NULL relaxation ripple**: grep `StudioLead` consumers; null-guard the card before types change.
- **Vercel 4.5 MB response cap** (Phase 2): gated previews must stream; uploads go direct to Storage, never through a route.
- **`after()` lifetime = maxDuration 300s** (Phases 3–4): audit ~3 min and scoring ~2 min fit, but budget-check at build; on-read staleness flips zombie rows.
- **Places billing** (Phase 4): field mask is the cost driver; hard 3-page cap; verify free-tier numbers before launch.
- **SSRF**: every outbound fetch of admin- or Places-supplied URLs goes through the extracted guard on every redirect hop.
- **Migration numbering**: re-check the dir at each phase; 056–059 assumed from today's state (055 highest).
