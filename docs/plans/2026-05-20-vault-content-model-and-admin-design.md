# The Vault — Content Model & Admin Design

> **Revision history:** v1 (2026-05-20) — initial design. v2 (2026-05-20) — added Access Boundary section, switched paid payloads to protected child tables, made `content_items.url` nullable, fixed stale migration numbers, added publish validation, chose markdown libraries, reordered build sequence to do security first.

> **Phase 1 status (already shipped):** Migration [supabase/migrations/040_vault_content_v2.sql](supabase/migrations/040_vault_content_v2.sql) consolidates the type taxonomy, adds new columns to `content_items`, and creates `vault_prompts`. Code updates across 15 files. **Caveat:** the shipped 040 migration places `body_en/body_jp` directly on `content_items`, which the Access Boundary section below identifies as a leak risk. A follow-up migration `041_vault_access_boundary.sql` will move article bodies to a protected child table before any premium article content is authored.

## Context

The Vault is HonuVibe's main subscription revenue stream (target $99/month — note: current marketing copy in `messages/*.json` references $49/mo; pricing decision should be confirmed before admin/public copy ships). The public-facing experience at `/learn/vault/` already exposes filter chips for six content types (Video, Article, Guide, Template, Tool, Recording) and three difficulty levels.

The Vault admin already exists at [components/admin/AdminVaultDetail.tsx](components/admin/AdminVaultDetail.tsx) and writes to `content_items`. It is currently video-URL-oriented and exposes shared fields but has no per-type sections (no body editor, no download uploader, no prompt list, no tool widget picker). The older `library_videos` form at [app/[locale]/admin/library/[id]/page.tsx](app/[locale]/admin/library/[id]/page.tsx) is a **separate legacy system** that writes to a different table and is out of scope here.

Two problems to solve:

1. **Taxonomy** — the current category set has redundancies (Article/Guide, Video/Recording) and is missing the most-shared AI asset (prompts).
2. **Content delivery** — there is no admin path to create non-video Vault content. The schema partially supports articles, templates, and tools, but the form, viewer, body field, file storage, and tool registry don't exist.

Goal: a complete content model + admin form + per-type viewer that lets Ryan publish all six confirmed content types from one consistent admin surface, with each type rendering correctly for subscribers.

---

## Confirmed Decisions

These came out of brainstorming and are baked into the design below:

| Decision | Choice |
|---|---|
| Content types | **Video, Workshop, Article, Template, Tool, Prompt Pack** (6 types) |
| Body authoring | **In-app markdown editor + Supabase** (not Sanity, not MDX) |
| Tool definition | **Interactive React widgets** hosted in-app (not external links) |
| Prompt Pack UX | **Inline prompt list with copy buttons** (child table per prompt) |

Taxonomy changes vs. current:
- Drop **Recording** → replace with **Workshop** (dated, long-form, optional live Cal.com link)
- Merge **Guide** into **Article** (Guide becomes a format tag alongside existing Tutorial/Case Study/etc.)
- Add **Prompt Pack** as its own first-class type

---

## Access Boundary (Critical — read before schema)

Postgres RLS is **row-level, not column-level**. The existing `content_items_public_read` policy in [supabase/migrations/001_phase2_schema.sql](supabase/migrations/001_phase2_schema.sql) allows any anonymous client to `SELECT *` from any row where `is_published = true`. That means **any column added to `content_items` is effectively public for published rows**, regardless of `access_tier`.

This rules out putting paid payloads (article bodies, prompt text, tool config) as columns on `content_items`. Three classes of data, three storage strategies:

| Class | Examples | Where it lives | Who can read |
|---|---|---|---|
| **Public catalog metadata** | title, description, thumbnail, content_type, difficulty, tags, slug, author, duration, freshness, helpful_count, partner | `content_items` columns | anyone (RLS: published rows) |
| **Protected paid payload** | article body, prompt text, premium template files | dedicated child tables with access-tier-aware RLS, OR server-only fetch endpoints that gate by subscription | only subscribers with the right tier |
| **Admin-only** | admin_notes, draft body fields, partner notes, freshness review state | RLS allows admin-only SELECT | admins only |

### The protected-child-table pattern

For each paid payload type, the body lives in a child table joined by `content_item_id`, with RLS that checks both `is_published` AND `access_tier` AND user subscription state. The browse page can still render the card (title, thumbnail, "Premium" badge) because that data is in `content_items`, but the actual body/prompts/files are only fetchable when the user has access.

Child tables this design uses:
- `vault_article_bodies` — `body_en`, `body_jp` (moves OUT of `content_items` in migration 041)
- `vault_prompts` — already exists in migration 040, RLS needs tightening
- `vault_downloads` — already exists; storage objects need to live in a **private bucket** with server-minted signed URLs

### Storage buckets — public vs. private split

A single `vault-assets` bucket with mixed access doesn't work cleanly. Two buckets:

- **`vault-public`** (public read) — thumbnails, article inline images. Anything safe to be hotlinkable.
- **`vault-private`** (no public access; service-role writes; client reads only via signed URLs minted by an authenticated server endpoint) — template downloads, premium downloadable assets.

Inline article images stay in `vault-public` because they're embedded in markdown that the user is already authorized to see — the image URL is incidental.

### Server-side enforcement points

Two trust boundaries, both must be enforced:

1. **RLS** — protects against direct PostgREST/anon access. Every protected child table has an `access_tier`-aware policy.
2. **API/server actions** — for endpoints that mint signed URLs or serve protected payloads, the server explicitly checks subscription state before returning content. Helper: `requireVaultAccess(supabase, item)` in `lib/vault/access.ts` (new). Reuses the existing `hasVaultAccess` check from `lib/access/checks.ts`.

This is the rule going forward: **if it's behind the paywall, it does NOT live on `content_items`**.

---

## Schema Changes

### 1. New `content_type` enum values (shipped in 040)

Migrated the `content_type` check constraint on `content_items` and the union in [lib/vault/types.ts](lib/vault/types.ts):

```
'video' | 'workshop' | 'article' | 'template' | 'tool' | 'prompt_pack'
```

Data migration mapping: `video_youtube`/`video_custom` → `video`; `course_recording` → `workshop`; `guide` → `article` (with `format:guide` tag preserved).

### 2. New columns on `content_items` (shipped in 040)

Shipped columns: `event_date`, `event_signup_url`, `presenter_name`, `tool_widget_key`, `tool_widget_config`. These are **public catalog metadata** — exposing them on published rows is fine.

> ⚠️ Migration 040 also shipped `body_en` and `body_jp` on `content_items`. These will be **moved to `vault_article_bodies`** in migration 041 (see below) before any premium article is authored. The columns will be dropped from `content_items` in the same migration.

### 3. `url` column becomes nullable (migration 041)

`content_items.url` is currently `NOT NULL`, but in-app content types (article, tool, prompt_pack) have no meaningful external URL. Make it nullable, and instead derive the canonical detail-page URL from `slug` + `content_type` at render time.

```sql
ALTER TABLE content_items ALTER COLUMN url DROP NOT NULL;
```

Admin form validation enforces "URL required" only for `video` and `workshop` types (see Publish Validation section).

### 4. `vault_article_bodies` — protected child table (migration 041)

Article bodies move off `content_items` to enforce premium gating.

```sql
CREATE TABLE vault_article_bodies (
  content_item_id uuid PRIMARY KEY REFERENCES content_items(id) ON DELETE CASCADE,
  body_en text,
  body_jp text,
  reading_time_minutes integer,  -- auto-computed on save
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vault_article_bodies ENABLE ROW LEVEL SECURITY;

-- Free-tier article bodies are public to any authenticated reader of the parent
CREATE POLICY "vault_article_bodies_free_read" ON vault_article_bodies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = vault_article_bodies.content_item_id
        AND ci.is_published = true
        AND ci.access_tier = 'free'
    )
  );

-- Premium article bodies require an active Vault subscription
CREATE POLICY "vault_article_bodies_premium_read" ON vault_article_bodies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = vault_article_bodies.content_item_id
        AND ci.is_published = true
        AND ci.access_tier = 'premium'
    )
    AND public.has_vault_access(auth.uid())  -- helper function, see below
  );

CREATE POLICY "vault_article_bodies_admin_all" ON vault_article_bodies
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### 5. `vault_prompts` — tighten RLS (migration 041)

The vault_prompts policy shipped in 040 only checks `is_published`. Migration 041 replaces it with access-tier-aware policies (same pattern as `vault_article_bodies` above).

### 6. `vault_downloads` — file URL stays admin-readable; clients get signed URLs only (migration 041)

Tighten the public-read policy: clients can see download **metadata** (file_name, file_size, file_type, description) for browse-list purposes, but `file_url` is not returned via PostgREST. Signed URLs are minted by `POST /api/vault/downloads/[id]` after access check.

Implementation: drop direct client SELECT of `file_url`, expose via a security-barrier view `vault_downloads_public` that omits `file_url`. The API endpoint uses the service role to mint signed URLs.

### 7. `recommended_model` values use stable provider names (migration 041)

Replace the 040 check constraint values `'gpt-4' | 'claude' | 'gemini' | 'any'` with provider-stable names: `'openai' | 'anthropic' | 'google' | 'any'`. Model-specific names age too fast.

### 8. Supabase Storage — split into two buckets (migration 041)

| Bucket | Access | Contents |
|---|---|---|
| `vault-public` | public read, admin write | thumbnails, article inline images |
| `vault-private` | no public access; service-role write; signed URLs only | template downloads, premium downloadable assets |

Folder convention:
```
vault-public/
  thumbnails/{content_item_id}/{filename}
  article-images/{content_item_id}/{filename}

vault-private/
  downloads/{content_item_id}/{filename}
```

### 9. Helper functions

`public.has_vault_access(user_id uuid) RETURNS boolean` — SECURITY DEFINER function that checks an active Vault subscription. Used in RLS policies. Mirrors the logic in [lib/access/checks.ts](lib/access/checks.ts) but in SQL so policies can call it.

`public.is_admin() RETURNS boolean` — already exists.

---

## Admin Form Architecture

**Refactor the existing [AdminVaultDetail.tsx](components/admin/AdminVaultDetail.tsx)** into a single adaptive form. The existing admin route at `/admin/vault/[id]` and create at `/admin/vault/new` stay; the form gains a Type selector at the top and conditional sections that appear/disappear based on type. Do not create a parallel `components/admin/vault/VaultItemForm.tsx` — extend in place.

### Shared fields (all types)
- Slug (auto-generated from title, editable)
- Title EN / Title JP
- Description EN / Description JP (short summary, 0–500 chars — same as today)
- Difficulty (beginner / intermediate / advanced)
- Language (en / ja / both)
- Access tier (free / premium)
- Tags (Topic, Tool, Skill, Industry, Format — existing taxonomy in [lib/vault/types.ts:170](lib/vault/types.ts#L170))
- Series + series order
- Related items
- Partner owner
- Admin notes
- Thumbnail (uploaded to `vault-assets/thumbnails/`)
- Featured / Published toggles

### Per-type conditional sections

| Type | Conditional admin fields |
|---|---|
| **Video** | YouTube URL or direct video URL → auto-derive `embed_url`, fetch duration, suggest thumbnail |
| **Workshop** | Same as Video + `event_date`, `presenter_name`, `event_signup_url` (Cal.com), optional pre-event materials (downloads section) |
| **Article** | Markdown editor for `body_en` and `body_jp` (TipTap or Milkdown with image upload to `vault-assets/article-images/`). Code blocks, callouts, embeds, headings. Estimated reading time auto-computed on save. |
| **Template** | File uploader (multi-file) writing to `vault_downloads` rows in `vault-assets/downloads/`. Each download has its own EN/JP description and access tier. |
| **Tool** | Widget picker (dropdown of registered widget keys from `lib/vault/tools/registry.ts`). Optional JSON config field. **Tool entries can only be saved as draft until a registered widget key is selected** — prevents dead admin choices when zero widgets are registered in Phase 1. |
| **Prompt Pack** | Repeater list of `vault_prompts` rows. Each row: title EN/JP, prompt text EN/JP, use case EN/JP, recommended model. Drag-to-reorder. |

### Markdown library choices (chosen, not TBD)

- **Editor (admin)**: **TipTap** with the markdown serializer extension. Reasoning: best-supported React WYSIWYG, has prebuilt Notion-style toolbar, plays nicely with image upload hooks. Alternative considered: Milkdown (good but smaller ecosystem).
- **Renderer (public)**: **react-markdown** + **rehype-sanitize** + **rehype-highlight**. Sanitization runs server-side as part of the SSR render to strip any unsafe HTML even though only admins author content (defense in depth).
- **No `next-mdx-remote`**. The earlier draft mentioned it; rejected because MDX allows arbitrary JSX execution which we don't need and don't want from a Postgres-stored body.

### Sub-components (new, under `components/admin/vault/`)
`VaultMarkdownEditor.tsx`, `VaultDownloadUploader.tsx`, `VaultToolPicker.tsx`, `VaultPromptListEditor.tsx`, `VaultThumbnailUploader.tsx`, `VaultWorkshopEventFields.tsx`

---

## Publish Validation

The publish toggle (`is_published = true`) requires per-type minimums. Drafts can be saved without these; publishing without them shows a blocking error. Implemented in the server action, not just client-side.

| Type | Required to publish |
|---|---|
| Video | `url` set; YouTube/Vimeo/direct video URL detected by `extractYouTubeId` or similar |
| Workshop | `url` set; `event_date` set; `presenter_name` set |
| Article | Either `body_en` or `body_jp` non-empty (at least one locale); `reading_time_minutes` auto-computed |
| Template | At least one `vault_downloads` row attached |
| Prompt Pack | At least one `vault_prompts` row with non-empty `prompt_text_en` or `prompt_text_jp` |
| Tool | `tool_widget_key` set AND key exists in `toolWidgetRegistry` |
| All types | `title_en` set; `slug` set; `difficulty_level` set; thumbnail uploaded |

---

## Per-Type Viewer Experience

The existing detail page at [app/[locale]/learn/vault/[slug]/page.tsx](app/[locale]/learn/vault/[slug]/page.tsx) uses [components/vault/VaultContentDetail.tsx](components/vault/VaultContentDetail.tsx) which currently handles only video + external links. Refactor into a `VaultContentRenderer` that switches on `content_type`:

| Type | Renderer |
|---|---|
| Video | Existing `VaultVideoPlayer` (no change) |
| Workshop | `VaultWorkshopRenderer` — video player + event metadata banner (date, presenter, "Register for live re-run" CTA if `event_signup_url` present and `event_date > now`) |
| Article | `VaultArticleRenderer` — renders `body_en` or `body_jp` via `react-markdown` or `next-mdx-remote` with syntax highlighting, callout components, image lightbox |
| Template | `VaultTemplateRenderer` — overview text + prominent download cards from `vault_downloads`. Tracks download count. |
| Tool | `VaultToolRenderer` — dynamic import of widget by `tool_widget_key` from `lib/vault/tools/registry.ts`. Renders inside a sandboxed pane. |
| Prompt Pack | `VaultPromptPackRenderer` — overview text + list of prompt cards. Each card shows title, use case, recommended model badge, prompt text in monospace, copy button. Optional "Copy all" at top. EN/JP toggle. |

Shared chrome (bookmark, watch-later, helpful/not-helpful, notes, related items, series nav, premium gate) stays in the parent layout.

---

## Tool Widget Registry

Tools are React components registered in a central map. Adding a new tool widget is a code change (intentional — Ryan controls what runs).

```ts
// lib/vault/tools/registry.ts
export const toolWidgetRegistry = {
  'prompt-builder': dynamic(() => import('@/components/vault/tools/PromptBuilder')),
  'jp-en-translator': dynamic(() => import('@/components/vault/tools/JpEnTranslator')),
  'ai-cost-calculator': dynamic(() => import('@/components/vault/tools/AiCostCalculator')),
} as const;

export type ToolWidgetKey = keyof typeof toolWidgetRegistry;
```

The admin form's widget picker reads `Object.keys(toolWidgetRegistry)` so it stays in sync. Each widget receives `{ config: jsonb, contentItem: VaultContentItem, userTier: VaultAccessTier }` as props.

**Phase 1 ships zero tool widgets** — just the type, form support, and registry plumbing. Build first widget in Phase 2.

---

## File Storage

Two buckets (see Access Boundary section for rationale).

- **`vault-public`** (public read, admin write via service role)
  - `thumbnails/{content_item_id}/{filename}` — content item cards and headers
  - `article-images/{content_item_id}/{filename}` — inline images embedded in markdown bodies (public because the surrounding body is already gated by `vault_article_bodies` RLS)

- **`vault-private`** (no public access; service-role writes; client reads only via signed URLs)
  - `downloads/{content_item_id}/{filename}` — every template download regardless of `access_tier`. Free downloads still go through the signed-URL endpoint so we get consistent access logging and abuse mitigation.

### Upload + download endpoints

- `POST /api/vault/admin/upload` (admin-only) — accepts a file + target bucket + path, returns the storage path. Server action wrapper; enforces MIME and size limits (10 MB images, 50 MB downloads, png/jpg/webp for images, pdf/zip/xlsx/docx/csv/json/md for downloads). Handles delete + replace via `?overwrite=true`.
- `POST /api/vault/downloads/[id]` (existing route, **needs upgrade**) — currently only increments `download_count` ([app/api/vault/downloads/[id]/route.ts:15](app/api/vault/downloads/[id]/route.ts#L15)). Upgrade to: (1) check `requireVaultAccess()` if the download or parent is premium, (2) mint a 1-hour signed URL via Supabase Storage admin client, (3) increment `download_count`, (4) return `{ url }`. Returns 403 with paywall payload if access denied.

Upload helpers in [lib/vault/storage.ts](lib/vault/storage.ts) (new): `uploadThumbnail`, `uploadArticleImage`, `uploadDownload`, `deleteFromStorage`.

---

## Migrations

### 040 (shipped) — taxonomy + new columns

[supabase/migrations/040_vault_content_v2.sql](supabase/migrations/040_vault_content_v2.sql) is already written and applied to the codebase. It:
- Migrated `content_type` values for the existing 27 items
- Added `body_en`, `body_jp`, workshop fields, tool fields to `content_items`
- Created `vault_prompts` with first-pass (parent-only) RLS

**Known issue with 040**: `body_en` and `body_jp` are on `content_items`, which is publicly readable for published rows. This is fine until premium article content is authored — which has not happened yet — and is corrected in 041.

**Idempotency fix (amend 040 in place):** The `tags || '["format:guide"]'` append is not idempotent against partial re-runs. Guard it:

```sql
UPDATE content_items
SET tags = COALESCE(tags, '[]'::jsonb) || '["format:guide"]'::jsonb
WHERE content_type = 'guide'
  AND NOT (tags ? 'format:guide');
```

### 041 (new) — access boundary

`supabase/migrations/041_vault_access_boundary.sql`:

1. **Make `content_items.url` nullable**
2. **Create `vault_article_bodies`** table with access-tier-aware RLS
3. **Move data**: `INSERT INTO vault_article_bodies (content_item_id, body_en, body_jp) SELECT id, body_en, body_jp FROM content_items WHERE body_en IS NOT NULL OR body_jp IS NOT NULL`
4. **Drop `body_en` and `body_jp` from `content_items`** — once data is moved
5. **Replace `vault_prompts` RLS** with access-tier-aware policies
6. **Replace `vault_downloads` RLS** to hide `file_url` from client SELECTs (use a view for public listing)
7. **Update `recommended_model` check constraint** values: `openai | anthropic | google | any`
8. **Create `vault-public` and `vault-private` Storage buckets** with appropriate policies
9. **Create helper function `public.has_vault_access(user_id uuid)`** as SECURITY DEFINER

The `library_videos` table and its admin form are out of scope; decommission later.

---

## Build Sequence

Reordered to put the access boundary first — building UI on a leaky data model creates rework. Each step is independently mergeable; the public Vault keeps working throughout.

1. **Phase 1 — DONE** ✅ (taxonomy migration 040, types, filter chips, icon maps, i18n). Already committed.

2. **Phase 2 — Access Boundary (security/storage first)**
   - Write and apply migration `041_vault_access_boundary.sql`
   - Create `vault-public` + `vault-private` Storage buckets with policies
   - Add `has_vault_access` SQL helper + `lib/vault/access.ts` `requireVaultAccess()` server helper
   - Upgrade `/api/vault/downloads/[id]` to do access check + signed URL + count increment
   - Update `lib/vault/queries.ts` to fetch `vault_article_bodies` separately via server-only path; wire `prompts` into `getVaultContentDetail` instead of the current hardcoded `[]` at [app/[locale]/learn/vault/[slug]/page.tsx:120](app/[locale]/learn/vault/[slug]/page.tsx#L120)
   - Verify: write a test (or manual check) confirming an unauthenticated client cannot fetch `vault_article_bodies` rows for a `premium` parent

3. **Phase 3 — Admin form refactor**
   - Extend existing [AdminVaultDetail.tsx](components/admin/AdminVaultDetail.tsx) with a Type selector + conditional sections (no new form file)
   - Add `lib/vault/storage.ts` upload helpers + `/api/vault/admin/upload` endpoint
   - Add publish validation in the server action
   - Ship per-type sections in revenue-priority order:
     - a. **Article** — TipTap editor + `VaultArticleRenderer` (react-markdown + rehype-sanitize). Unlocks the most content velocity.
     - b. **Template** — multi-file uploader + `VaultTemplateRenderer` (renders signed-URL download cards).
     - c. **Prompt Pack** — `vault_prompts` editor + `VaultPromptPackRenderer` with copy buttons.
     - d. **Workshop** — event date fields + `VaultWorkshopRenderer` with Cal.com CTA.
     - e. **Video** — already works; just update form to match new shared shell.
     - f. **Tool** — widget registry + picker + `VaultToolRenderer`. Phase 4 ships zero widgets registered; Tool entries are forced to draft state until a key is selected from the registry.

4. **Phase 4 — Tool widgets (separate brainstorm per widget)**

---

## Verification

After each phase:
- Run `pnpm build` to confirm types compile.
- Manually create one item of each type in the admin and view it as a subscriber on `/learn/vault/[slug]` — confirm body renders, downloads work, prompts copy, widgets mount.
- **Premium leakage check (Phase 2 gate):** as an anonymous + free-tier user, hit `https://<project>.supabase.co/rest/v1/vault_article_bodies?content_item_id=eq.<premium item id>` and confirm 0 rows. Same for `vault_prompts` against a premium parent. Same for `vault_downloads` selecting `file_url`.
- Check premium gating end-to-end: log in as a free user, confirm premium downloads return 403 and the renderer shows the paywall instead of content.
- Confirm existing 27 items still render after migration (load `/learn/vault/` and click into 3-5 of them).
- Run Lighthouse on the article renderer page — markdown + images should stay under the 800KB / LCP 2.5s budget.

---

## i18n Scope

Every new user-facing string needs EN + JP entries in `messages/en.json` and `messages/ja.json`. Categories of strings touched by this work:

- Type labels (already done in Phase 1: `type_workshop`, `type_prompt_pack`)
- Per-type renderer chrome: "Register for live re-run" (Workshop), "Copy" / "Copy all" / "Copied" (Prompt Pack), "Recommended model" badge, "Download" / "Downloading…" (Template), "Read more" / reading-time label (Article), "Loading tool…" / "Tool unavailable" (Tool)
- Empty states per type
- Admin field labels for new sections (body editor placeholder, file uploader, prompt editor, workshop event fields)
- Publish validation errors (one per type, both locales)

---

## Critical Files Touched

| Path | Why |
|---|---|
| [supabase/migrations/040_vault_content_v2.sql](supabase/migrations/040_vault_content_v2.sql) | Shipped — taxonomy + new columns. Idempotency guard added inline. |
| `supabase/migrations/041_vault_access_boundary.sql` (new) | Access boundary: child tables, RLS, storage buckets, nullable url, helper functions |
| [lib/vault/types.ts](lib/vault/types.ts) | Shipped — new type union, `VaultPrompt`, body/workshop/tool fields. Add `VaultArticleBody` type in Phase 2. |
| [components/vault/VaultFilters.tsx](components/vault/VaultFilters.tsx) | Shipped — filter chips updated |
| [components/vault/VaultContentDetail.tsx](components/vault/VaultContentDetail.tsx) | Phase 3: refactor to dispatch to per-type renderers |
| [components/admin/AdminVaultDetail.tsx](components/admin/AdminVaultDetail.tsx) | Phase 3: extend in place with Type selector + conditional sections (not replaced) |
| `components/admin/vault/` (new) | Sub-components for editor, uploader, prompt list, etc. |
| `components/vault/renderers/` (new) | Per-type viewer components |
| `components/vault/tools/` (new) | Tool widget components (folder empty until Phase 4) |
| `lib/vault/access.ts` (new) | `requireVaultAccess` server helper |
| `lib/vault/storage.ts` (new) | Upload helpers for both buckets |
| `lib/vault/tools/registry.ts` (new) | Tool widget registry |
| [app/api/vault/downloads/[id]/route.ts](app/api/vault/downloads/[id]/route.ts) | Upgrade: access check + signed URL minting (currently only counts) |
| `app/api/vault/admin/upload/route.ts` (new) | Admin file upload endpoint with MIME + size enforcement |
| [lib/vault/queries.ts](lib/vault/queries.ts) | Phase 2: fetch `vault_article_bodies` + `vault_prompts` in `getVaultContentDetail` |
| [app/[locale]/learn/vault/[slug]/page.tsx](app/[locale]/learn/vault/[slug]/page.tsx) | Phase 2: stop hardcoding `prompts: []` |

---

## Out of Scope (Explicitly)

- Building any actual Tool widgets (Phase 4 — each widget gets its own brainstorm)
- Decommissioning the `library_videos` table and its admin form
- Audio / Podcast type (add when Ryan starts producing audio)
- Sanity migration (not happening; Vault stays in Supabase)
- Workshop live-streaming integration (Cal.com link is enough for Phase 1)
- Pricing finalization ($49 vs $99) — confirm before publishing any subscriber-facing copy
