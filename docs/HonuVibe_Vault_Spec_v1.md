# HonuVibe.AI — The Vault: Self-Study Library
## Build-Ready Engineering Specification | v1.0
**Module Location:** `learn.honuvibe.ai/vault`
**Depends On:** Phase 2B (Content Library schema + tag system)

---

## 1. Overview

The Vault is HonuVibe's self-study content library — a searchable, filterable collection of tutorial videos, guides, downloadable resources, and curated external content. It serves as both a standalone learning resource and the content engine feeding Phase 2C's AI-generated study paths.

### What The Vault Is
- A Netflix-style browsable library of bite-sized learning content
- Organized by topic, tool, difficulty, and curated series
- Personal workspace: bookmarks, notes, watch-later queue
- Community quality signals: feedback, popularity, freshness indicators

### What The Vault Is Not
- Not a course platform (that's Phase 2A cohort courses)
- Not a curriculum with enforced progression (that's Phase 2C study paths)
- Not gated behind enrollment — free tier content is publicly accessible

### Access Tiers
- **Free:** Browse, search, filter, view free-tier content, bookmark, leave feedback
- **Authenticated (free account):** All above + personal notes, watch later queue, full bookmark sync
- **Premium ($29/mo subscription from Phase 2C):** All above + premium-tier content unlocked

---

## 2. Data Model

### 2.1 Extends: `content_items` (from Phase 2B)

The Vault reads from the same `content_items` table defined in Phase 2B. The following columns are added to support Vault-specific features:

```sql
-- Add to existing content_items table (Phase 2B)
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS
  freshness_status text DEFAULT 'current'
    CHECK (freshness_status IN ('current', 'review_needed', 'outdated')),
  freshness_reviewed_at timestamptz,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  series_id uuid REFERENCES vault_series(id),
  series_order integer,
  related_item_ids uuid[] DEFAULT '{}';
```

### 2.2 New Table: `vault_series`

Series group related Vault items into ordered learning sequences.

```sql
CREATE TABLE vault_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_jp text,
  description_en text,
  description_jp text,
  thumbnail_url text,
  difficulty_level text DEFAULT 'beginner'
    CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  tags jsonb DEFAULT '[]',
  item_count integer DEFAULT 0,
  total_duration_minutes integer DEFAULT 0,
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vault_series_published ON vault_series (is_published);
CREATE INDEX idx_vault_series_slug ON vault_series (slug);
```

### 2.3 New Table: `vault_downloads`

Downloadable attachments associated with a content item.

```sql
CREATE TABLE vault_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes bigint,
  file_type text NOT NULL
    CHECK (file_type IN ('pdf', 'zip', 'xlsx', 'docx', 'csv', 'json', 'md', 'other')),
  description_en text,
  description_jp text,
  access_tier text DEFAULT 'free'
    CHECK (access_tier IN ('free', 'premium')),
  download_count integer DEFAULT 0,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vault_downloads_item ON vault_downloads (content_item_id);
```

### 2.4 New Table: `vault_bookmarks`

User bookmarks and watch-later queue items.

```sql
CREATE TABLE vault_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  bookmark_type text NOT NULL DEFAULT 'bookmark'
    CHECK (bookmark_type IN ('bookmark', 'watch_later')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, content_item_id, bookmark_type)
);

CREATE INDEX idx_vault_bookmarks_user ON vault_bookmarks (user_id, bookmark_type);
CREATE INDEX idx_vault_bookmarks_item ON vault_bookmarks (content_item_id);
```

### 2.5 New Table: `vault_notes`

Personal notes attached to a content item, private to each user.

```sql
CREATE TABLE vault_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vault_notes_user_item ON vault_notes (user_id, content_item_id);
```

### 2.6 New Table: `vault_feedback`

Lightweight helpful / not-helpful feedback per item per user.

```sql
CREATE TABLE vault_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  feedback_type text NOT NULL
    CHECK (feedback_type IN ('helpful', 'not_helpful')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, content_item_id)
);

CREATE INDEX idx_vault_feedback_item ON vault_feedback (content_item_id);
```

### 2.7 New Table: `vault_views`

View tracking with session-based deduplication.

```sql
CREATE TABLE vault_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  viewer_hash text NOT NULL,
  viewed_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_vault_views_dedup
  ON vault_views (content_item_id, viewer_hash, (viewed_at::date));

CREATE POLICY "vault_views_insert" ON vault_views
  FOR INSERT WITH CHECK (true);
```

### 2.8 RLS Policies

```sql
-- Vault series: public read if published
CREATE POLICY "vault_series_public" ON vault_series
  FOR SELECT USING (is_published = true);

-- Vault downloads: public read (access tier checked in application logic)
CREATE POLICY "vault_downloads_public" ON vault_downloads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      WHERE ci.id = vault_downloads.content_item_id
      AND ci.is_published = true
    )
  );

-- Bookmarks: users see only their own
CREATE POLICY "vault_bookmarks_own" ON vault_bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- Notes: users see only their own
CREATE POLICY "vault_notes_own" ON vault_notes
  FOR ALL USING (auth.uid() = user_id);

-- Feedback: users can read all (for counts), write only their own
CREATE POLICY "vault_feedback_read" ON vault_feedback
  FOR SELECT USING (true);
CREATE POLICY "vault_feedback_write" ON vault_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vault_feedback_update" ON vault_feedback
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vault_feedback_delete" ON vault_feedback
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 3. URL Structure

```
/learn/vault                              → Browse/search all content
/learn/vault/[slug]                       → Individual content item detail page
/learn/vault/series                       → Browse all series
/learn/vault/series/[slug]                → Series detail: ordered list of items
/learn/vault/bookmarks                    → User's saved bookmarks (auth required)
/learn/vault/watch-later                  → User's watch-later queue (auth required)
/learn/vault/notes                        → User's personal notes index (auth required)

# Japanese equivalents
/ja/learn/vault/...                       → All routes mirrored under /ja/ prefix
```

---

## 4. Frontend — Public Browse

### 4.1 Vault Index Page (`/[locale]/learn/vault/page.tsx`)

The main entry point. Designed for discovery and quick access to relevant content.

```
┌─────────────────────────────────────────────────────────────────┐
│  The Vault                                                       │
│  Your self-study library for AI mastery                          │
│                                                                   │
│  [🔍 Search vault...                                    ]        │
│                                                                   │
│  Filters:                                                        │
│  [All Types ▾] [All Topics ▾] [All Levels ▾] [All Tools ▾]      │
│  [Sort: Newest ▾]                                                │
│                                                                   │
├──── 🔥 Trending ─────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ 📹 thumb │  │ 📹 thumb │  │ 📹 thumb │  │ 📹 thumb │         │
│  │ Title    │  │ Title    │  │ Title    │  │ Title    │         │
│  │ 12 min   │  │ 8 min    │  │ 15 min   │  │ 6 min    │         │
│  │ ★ 94%    │  │ ★ 87%    │  │ ★ 91%    │  │ ★ 96%    │         │
│  │ 🔖 ☰     │  │ 🔖 ☰     │  │ 🔖 ☰     │  │ 🔖 ☰     │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                   │
├──── 📚 Featured Series ──────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────┐  ┌──────────────────────────┐      │
│  │ Prompt Engineering 101   │  │ AI for Business Leaders  │      │
│  │ 5 lessons · 48 min total │  │ 4 lessons · 32 min total │      │
│  │ Beginner · ★ 92%         │  │ Intermediate · ★ 89%     │      │
│  │ [Start Series →]         │  │ [Start Series →]         │      │
│  └──────────────────────────┘  └──────────────────────────┘      │
│                                                                   │
├──── All Content ─────────────────────────────────────────────────┤
│                                                                   │
│  (Content grid with pagination — ContentCard components)          │
│                                                                   │
│  [Load More]                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Content Card Component

Each card displays:
- Thumbnail (auto-fetched for YouTube, uploaded for others)
- Content type icon (video, article, template, guide)
- Title (locale-aware: `title_en` or `title_jp`)
- Duration (for video) or read time estimate
- Difficulty badge (color-coded: green/yellow/red)
- Helpfulness score as percentage (if ≥ 5 votes)
- Freshness badge (only if `review_needed` or `outdated`)
- View count (formatted: "1.2K views")
- Tag pills (max 3 visible, "+N more" overflow)
- Bookmark icon (toggle, auth-gated)
- Watch Later icon (toggle, auth-gated, video items only)
- Premium lock overlay (if `access_tier = 'premium'` and user is not premium)

### 4.3 Search & Filter Logic

**Search:** Full-text search across `title_en`, `title_jp`, `description_en`, `description_jp`, and `tags`. Use Supabase's `textSearch` or `ilike` with debounced input (300ms).

**Filters (combinable, AND logic):**

| Filter | Source | Options |
|---|---|---|
| Content Type | `content_items.content_type` | Video, Article, Template, Guide, Tool |
| Topic | `tags` (category: topic) | From canonical tag list |
| Tool | `tags` (category: tool) | ChatGPT, Claude, Midjourney, etc. |
| Difficulty | `content_items.difficulty_level` | Beginner, Intermediate, Advanced |
| Language | `content_items.language` | English, Japanese, Both |
| Access | `content_items.access_tier` | Free, Premium |

**Sort options:**
- Newest (default) — `created_at DESC`
- Most Popular — `view_count DESC`
- Most Helpful — `helpful_count DESC`
- Oldest — `created_at ASC`

**Pagination:** Cursor-based using `created_at` + `id`. 20 items per page. "Load More" button (not infinite scroll — better for mobile performance).

### 4.4 Difficulty Progression Paths

Within any topic tag view, items are visually grouped by difficulty level with a clear progression indicator:

```
┌─── Prompt Engineering ──────────────────────────────────────────┐
│                                                                   │
│  🟢 Beginner                    🟡 Intermediate                  │
│  ┌─────────┐ ┌─────────┐       ┌─────────┐ ┌─────────┐         │
│  │ Card 1  │ │ Card 2  │  ───→ │ Card 3  │ │ Card 4  │  ───→   │
│  └─────────┘ └─────────┘       └─────────┘ └─────────┘         │
│                                                                   │
│  🔴 Advanced                                                     │
│  ┌─────────┐ ┌─────────┐                                        │
│  │ Card 5  │ │ Card 6  │                                        │
│  └─────────┘ └─────────┘                                        │
│                                                                   │
│  This path: 6 items · ~82 min total · Beginner → Advanced       │
└─────────────────────────────────────────────────────────────────┘
```

This view is triggered when a user clicks on a topic tag pill, or selects a single topic from the filter. It replaces the default grid with a progression-grouped layout. The arrows are decorative — items within each level are unordered.

---

## 5. Frontend — Content Detail Page

### 5.1 Content Item Page (`/[locale]/learn/vault/[slug]/page.tsx`)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Vault                                                │
│                                                                   │
│  [Video Player / Embed]                                          │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  Title of the Content Item                                       │
│  By: Author Name · 12 min · Beginner · 1.2K views               │
│  Published: Jan 15, 2026 · ✅ Content is current                 │
│                                                                   │
│  [🔖 Bookmark]  [⏰ Watch Later]  [👍 Helpful (47)]  [👎 (3)]   │
│                                                                   │
│  Tags: [Prompt Engineering] [Claude] [Business AI]               │
│                                                                   │
│  ─── Description ─────────────────────────────────────────────── │
│  Full description of the lesson content, what you'll learn,      │
│  and any prerequisites...                                        │
│                                                                   │
│  ─── Downloads ───────────────────────────────────────────────── │
│  📎 Prompt Template Pack (PDF · 2.4 MB)           [Download]     │
│  📎 Exercise Worksheet (XLSX · 340 KB)            [Download]     │
│  🔒 Advanced Cheat Sheet (PDF · 1.1 MB) — Premium [Upgrade]     │
│                                                                   │
│  ─── My Notes ──────────────── (auth required) ─────────────── │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Add your personal notes about this lesson...            │     │
│  │                                                         │     │
│  │                                          [Save Note]    │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ─── Part of Series ─────────────────────────────────────────── │
│  📚 Prompt Engineering 101 (3 of 5)                              │
│  ← Previous: Understanding Prompts   Next: Advanced Techniques → │
│                                                                   │
│  ─── Related Content ─────────────────────────────────────────── │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ Related1 │  │ Related2 │  │ Related3 │                       │
│  └──────────┘  └──────────┘  └──────────┘                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Related Content Logic

Related items are determined in priority order:

1. **Same series** — other items in the series (always shown first if item is in a series)
2. **Admin-curated** — manually linked related items (stored in `related_item_ids` on content_items)
3. **Tag overlap** — items sharing ≥ 2 tags, weighted by difficulty proximity (same level first, then adjacent levels)
4. **Same topic, next difficulty** — if the item is Beginner and there are Intermediate items with the same topic tag, surface those with a "Level Up" label

Display max 6 related items. Exclude the current item. Respect access tier visibility (show premium items with lock overlay for free users).

### 5.3 Freshness Badges

Visual indicators of content currency, displayed on both cards and detail pages:

| Status | Badge | Display | Admin Action |
|---|---|---|---|
| `current` | ✅ Content is current | Only on detail page (subtle) | Set during review |
| `review_needed` | ⚠️ Under review | Card + detail page (yellow badge) | Auto-set 6 months after `freshness_reviewed_at`, or manual |
| `outdated` | 🔄 Being updated | Card + detail page (orange badge) | Manual set by admin |

**Auto-flagging rule:** A database function or cron job checks weekly for content items where `freshness_reviewed_at < NOW() - INTERVAL '6 months'` and sets `freshness_status = 'review_needed'`. Admin can dismiss by updating `freshness_reviewed_at` to now.

```sql
-- Cron function (Supabase pg_cron or Edge Function)
UPDATE content_items
SET freshness_status = 'review_needed'
WHERE freshness_status = 'current'
  AND freshness_reviewed_at < NOW() - INTERVAL '6 months'
  AND is_published = true;
```

---

## 6. Frontend — Series

### 6.1 Series Browse (`/[locale]/learn/vault/series/page.tsx`)

Grid of series cards, each showing:
- Series thumbnail
- Title (locale-aware)
- Item count + total duration
- Difficulty level badge
- Tag pills
- Helpfulness score (average across all items in series)

### 6.2 Series Detail (`/[locale]/learn/vault/series/[slug]/page.tsx`)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Series                                                │
│                                                                   │
│  📚 Prompt Engineering 101                                       │
│  Master the fundamentals of effective AI prompting               │
│  5 lessons · 48 min total · Beginner                             │
│                                                                   │
│  ─── Lessons ─────────────────────────────────────────────────── │
│                                                                   │
│  1. ✅ What is Prompt Engineering?          8 min    [Watch]      │
│  2. ✅ Writing Clear Instructions           10 min   [Watch]      │
│  3. ○  Understanding Context Windows        12 min   [Watch]      │
│  4. ○  Advanced Prompting Techniques        10 min   [Watch]      │
│  5. 🔒 Real-World Prompt Workflows          8 min    [Premium]    │
│                                                                   │
│  ─── Series Downloads ────────────────────────────────────────── │
│  📎 Complete Prompt Workbook (PDF · 5.2 MB)       [Download]     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

Checkmarks shown only for authenticated users with bookmark/completion tracking. Clicking any item navigates to the content detail page with series context preserved in the URL (query param `?series=slug`) so prev/next navigation works.

---

## 7. Frontend — Personal Features (Auth Required)

### 7.1 Bookmarks Page (`/[locale]/learn/vault/bookmarks/page.tsx`)

Simple list of bookmarked items rendered as ContentCards. Sorted by bookmark creation date (newest first). Empty state: "You haven't bookmarked anything yet. Browse the Vault to find content worth saving."

### 7.2 Watch Later Page (`/[locale]/learn/vault/watch-later/page.tsx`)

Same layout as bookmarks but filtered to `bookmark_type = 'watch_later'`. Only shows video-type items. Empty state: "Your watch later queue is empty. Add videos from the Vault to watch when you're ready."

### 7.3 Notes Index (`/[locale]/learn/vault/notes/page.tsx`)

List of all content items the user has notes on, with a preview of the note text (truncated to 2 lines). Clicking navigates to the content detail page with the notes section scrolled into view.

```
┌─────────────────────────────────────────────────────────────────┐
│  My Notes                                                        │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ 📹 Understanding Context Windows                          │   │
│  │ "Key takeaway: Claude's context is 200K tokens, which     │   │
│  │  means I can paste entire documents..."                   │   │
│  │ Saved: Feb 12, 2026                          [View Item]  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ 📄 AI Tool Comparison Guide                               │   │
│  │ "For client presentations, use Claude. For quick          │   │
│  │  brainstorming, ChatGPT is faster..."                     │   │
│  │ Saved: Feb 10, 2026                          [View Item]  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Notes Editor

On the content detail page, the notes section uses a simple textarea with auto-save (debounced 2 seconds after last keystroke). Supports basic markdown (rendered on read, edited as plaintext). Max length: 5000 characters.

**API behavior:**
- GET `/api/vault/notes?content_item_id=xxx` — returns the user's note for this item (if any)
- PUT `/api/vault/notes` — upsert: create or update the note
- DELETE `/api/vault/notes?content_item_id=xxx` — delete note

---

## 8. Frontend — Quality Signals

### 8.1 Helpfulness Feedback

Thumbs up / thumbs down buttons on the content detail page. One vote per user per item. User can change their vote (toggle). Counts are cached on the `content_items` row for display performance.

**Display logic:**
- Below 5 total votes: show "Be the first to rate this" prompt
- 5+ votes: show percentage — e.g., "★ 94% found this helpful (47 of 50)"
- On cards: show only the percentage as "★ 94%" (compact)

**Vote toggle behavior:**
- Click 👍 when no vote → sets `helpful`, increments `helpful_count`
- Click 👍 when already `helpful` → removes vote, decrements `helpful_count`
- Click 👎 when `helpful` → switches to `not_helpful`, decrements `helpful_count`, increments `not_helpful_count`
- Inverse logic for 👎

**Count sync:** Use a Supabase database trigger on `vault_feedback` INSERT/UPDATE/DELETE to update cached counts on `content_items`.

```sql
CREATE OR REPLACE FUNCTION sync_vault_feedback_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content_items SET
    helpful_count = (
      SELECT COUNT(*) FROM vault_feedback
      WHERE content_item_id = COALESCE(NEW.content_item_id, OLD.content_item_id)
      AND feedback_type = 'helpful'
    ),
    not_helpful_count = (
      SELECT COUNT(*) FROM vault_feedback
      WHERE content_item_id = COALESCE(NEW.content_item_id, OLD.content_item_id)
      AND feedback_type = 'not_helpful'
    )
  WHERE id = COALESCE(NEW.content_item_id, OLD.content_item_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vault_feedback_sync
AFTER INSERT OR UPDATE OR DELETE ON vault_feedback
FOR EACH ROW EXECUTE FUNCTION sync_vault_feedback_counts();
```

### 8.2 View Counts

Incremented server-side when a content detail page is loaded. Debounce or session-guard to avoid inflating counts on page refreshes (don't count the same user/session more than once per 24 hours via `vault_views` table dedup index).

**Display formatting:**
- < 1000: show exact number ("847 views")
- 1000–9999: "1.2K views"
- 10000+: "12K views"

### 8.3 Popularity / Trending Section

The "Trending" row on the Vault index shows the top 8 items by a weighted popularity score calculated over a rolling 30-day window:

```sql
SELECT ci.*,
  (
    (SELECT COUNT(*) FROM vault_views vv
     WHERE vv.content_item_id = ci.id
     AND vv.viewed_at > NOW() - INTERVAL '7 days') * 3
    +
    (SELECT COUNT(*) FROM vault_views vv
     WHERE vv.content_item_id = ci.id
     AND vv.viewed_at > NOW() - INTERVAL '30 days') * 1
    +
    ci.helpful_count * 2
  ) AS trending_score
FROM content_items ci
WHERE ci.is_published = true
ORDER BY trending_score DESC
LIMIT 8;
```

Cache this query result for 1 hour (Supabase Edge Function + KV cache or in-memory on the server component with `revalidate: 3600`).

---

## 9. Admin — Vault Management

Admin routes extend the Phase 2B content management UI. No new admin pages are needed — the existing content admin gains new fields and a series management section.

### 9.1 Content Item Form Additions

Add the following fields to the existing content item create/edit form:

| Field | Type | Notes |
|---|---|---|
| Series | Select (vault_series) | Optional. Dropdown of existing series + "None" |
| Series Order | Number | Shown only when series is selected |
| Related Items | Multi-select (content_items) | Search/filter to find items. Max 6. |
| Freshness Status | Select | Current / Under Review / Being Updated |
| Last Freshness Review | Date (auto-set) | Set to today when status changed to "current" |
| Downloads | Repeating group | File upload + name + description + tier + order |

### 9.2 Series Management (`/admin/content/series/page.tsx`)

Accessible from the admin content sidebar. CRUD for series:

```
┌─── Series Management ──────────────────────────────────────────┐
│                                                    [+ New Series]│
│                                                                  │
│  Prompt Engineering 101          5 items · Published    [Edit]  │
│  AI for Business Leaders         4 items · Draft        [Edit]  │
│  Claude Deep Dive                3 items · Published    [Edit]  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Series edit form:**
- Title (EN/JP)
- Description (EN/JP)
- Thumbnail upload
- Difficulty level
- Tags (reuses Phase 2B tag selector)
- Item list with drag-to-reorder (items are assigned to series via the content item form, but order is managed here)
- Publish toggle

### 9.3 Freshness Dashboard

A filtered view of the content admin showing items that need freshness review:

```
┌─── Content Freshness ──────────────────────────────────────────┐
│                                                                  │
│  ⚠️ Needs Review (3)                                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Understanding GPT-4 · Last reviewed: Aug 2025  [Review]  │  │
│  │ Midjourney V5 Guide · Last reviewed: Jul 2025  [Review]  │  │
│  │ AI Pricing Models  · Last reviewed: Sep 2025   [Review]  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Clicking [Review] opens the edit form. Saving with             │
│  status = "current" updates freshness_reviewed_at.              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 9.4 Download Management

Within the content item edit form, downloads are managed as a repeating field group:

1. Click "Add Download"
2. Upload file to Supabase Storage (`vault-downloads` bucket)
3. File name, description (EN/JP), access tier auto-populated
4. Drag to reorder
5. Save persists to `vault_downloads` table

**Storage bucket config:**
- Bucket: `vault-downloads`
- Public access: No (served via signed URLs with 1-hour expiry)
- Max file size: 50MB
- Allowed types: pdf, zip, xlsx, docx, csv, json, md

---

## 10. API Routes

### 10.1 Public Routes (No Auth)

```
GET  /api/vault/browse              → Paginated content items with filters/search/sort
GET  /api/vault/trending            → Top 8 trending items (cached 1hr)
GET  /api/vault/[slug]              → Single content item detail + downloads + related
GET  /api/vault/series              → All published series
GET  /api/vault/series/[slug]       → Series detail + ordered items
POST /api/vault/view                → Record a view (rate-limited, deduped)
```

### 10.2 Authenticated Routes

```
GET    /api/vault/bookmarks           → User's bookmarks (type: bookmark)
POST   /api/vault/bookmarks           → Add bookmark { content_item_id, type }
DELETE /api/vault/bookmarks/[id]      → Remove bookmark

GET    /api/vault/watch-later         → User's watch-later items
POST   /api/vault/watch-later         → Add to watch later { content_item_id }
DELETE /api/vault/watch-later/[id]    → Remove from watch later

GET    /api/vault/notes               → All user's notes (index)
GET    /api/vault/notes?item=xxx      → User's note for a specific item
PUT    /api/vault/notes               → Upsert note { content_item_id, note_text }
DELETE /api/vault/notes?item=xxx      → Delete note

POST   /api/vault/feedback            → Submit feedback { content_item_id, feedback_type }
DELETE /api/vault/feedback/[id]       → Remove feedback (un-vote)
```

### 10.3 Admin Routes

```
POST   /api/admin/vault/series        → Create series
PUT    /api/admin/vault/series/[id]   → Update series
DELETE /api/admin/vault/series/[id]   → Delete series (unlinks items, doesn't delete them)
PUT    /api/admin/vault/series/[id]/order → Reorder items { item_ids: uuid[] }

POST   /api/admin/vault/downloads     → Upload + create download record
PUT    /api/admin/vault/downloads/[id] → Update download metadata
DELETE /api/admin/vault/downloads/[id] → Delete download (removes from storage)

PUT    /api/admin/vault/freshness/[id] → Update freshness status
GET    /api/admin/vault/freshness/review → Items needing freshness review
```

---

## 11. i18n Strings

### English (`messages/en.json` — vault namespace)

```json
{
  "vault": {
    "page_title": "The Vault",
    "page_subtitle": "Your self-study library for AI mastery",
    "search_placeholder": "Search the Vault...",
    "filter_type": "All Types",
    "filter_topic": "All Topics",
    "filter_level": "All Levels",
    "filter_tool": "All Tools",
    "filter_access": "All Access",
    "sort_newest": "Newest",
    "sort_popular": "Most Popular",
    "sort_helpful": "Most Helpful",
    "sort_oldest": "Oldest",
    "trending_heading": "Trending",
    "featured_series_heading": "Featured Series",
    "all_content_heading": "All Content",
    "load_more": "Load More",
    "views_count": "{count} views",
    "duration_minutes": "{count} min",
    "series_items_count": "{count} lessons",
    "series_total_duration": "{count} min total",
    "start_series": "Start Series",
    "continue_series": "Continue Series",
    "bookmark_add": "Bookmark",
    "bookmark_remove": "Remove Bookmark",
    "bookmark_added_toast": "Added to bookmarks",
    "bookmark_removed_toast": "Removed from bookmarks",
    "watch_later_add": "Watch Later",
    "watch_later_remove": "Remove from Watch Later",
    "watch_later_added_toast": "Added to Watch Later",
    "watch_later_removed_toast": "Removed from Watch Later",
    "helpful": "Helpful",
    "not_helpful": "Not Helpful",
    "helpful_prompt": "Was this helpful?",
    "helpful_first": "Be the first to rate this",
    "helpful_score": "{percent}% found this helpful ({count} of {total})",
    "downloads_heading": "Downloads",
    "download_button": "Download",
    "download_premium": "Premium",
    "download_size": "{size}",
    "notes_heading": "My Notes",
    "notes_placeholder": "Add your personal notes about this lesson...",
    "notes_save": "Save Note",
    "notes_saved": "Note saved",
    "notes_delete": "Delete Note",
    "notes_empty": "No notes yet",
    "notes_index_title": "My Notes",
    "notes_index_empty": "You haven't written any notes yet. Watch a lesson and jot down your takeaways.",
    "related_heading": "Related Content",
    "series_heading": "Part of Series",
    "series_previous": "Previous",
    "series_next": "Next",
    "freshness_current": "Content is current",
    "freshness_review": "Under review",
    "freshness_outdated": "Being updated",
    "published_date": "Published: {date}",
    "bookmarks_title": "My Bookmarks",
    "bookmarks_empty": "You haven't bookmarked anything yet. Browse the Vault to find content worth saving.",
    "watch_later_title": "Watch Later",
    "watch_later_empty": "Your watch later queue is empty. Add videos from the Vault to watch when you're ready.",
    "premium_lock": "Premium content",
    "premium_upgrade": "Upgrade to access",
    "back_to_vault": "Back to Vault",
    "back_to_series": "Back to Series",
    "series_browse_title": "Series",
    "series_browse_subtitle": "Structured learning paths on specific topics",
    "difficulty_path_heading": "Learning Path: {topic}",
    "difficulty_path_summary": "{count} items · ~{minutes} min total · {startLevel} → {endLevel}",
    "level_beginner": "Beginner",
    "level_intermediate": "Intermediate",
    "level_advanced": "Advanced",
    "level_up": "Level Up",
    "auth_required": "Sign in to use this feature",
    "login_to_bookmark": "Sign in to save bookmarks",
    "login_to_note": "Sign in to take notes"
  }
}
```

### Japanese (`messages/ja.json` — vault namespace)

```json
{
  "vault": {
    "page_title": "ザ・ヴォールト",
    "page_subtitle": "AIマスターのための自習ライブラリ",
    "search_placeholder": "ヴォールトを検索...",
    "filter_type": "すべてのタイプ",
    "filter_topic": "すべてのトピック",
    "filter_level": "すべてのレベル",
    "filter_tool": "すべてのツール",
    "filter_access": "すべてのアクセス",
    "sort_newest": "新着順",
    "sort_popular": "人気順",
    "sort_helpful": "評価順",
    "sort_oldest": "古い順",
    "trending_heading": "トレンド",
    "featured_series_heading": "おすすめシリーズ",
    "all_content_heading": "すべてのコンテンツ",
    "load_more": "もっと見る",
    "views_count": "{count} 回視聴",
    "duration_minutes": "{count} 分",
    "series_items_count": "{count} レッスン",
    "series_total_duration": "合計 {count} 分",
    "start_series": "シリーズを開始",
    "continue_series": "シリーズを続ける",
    "bookmark_add": "ブックマーク",
    "bookmark_remove": "ブックマーク解除",
    "bookmark_added_toast": "ブックマークに追加しました",
    "bookmark_removed_toast": "ブックマークから削除しました",
    "watch_later_add": "後で見る",
    "watch_later_remove": "後で見るから削除",
    "watch_later_added_toast": "「後で見る」に追加しました",
    "watch_later_removed_toast": "「後で見る」から削除しました",
    "helpful": "役立った",
    "not_helpful": "役立たなかった",
    "helpful_prompt": "このコンテンツは役立ちましたか？",
    "helpful_first": "最初の評価をしてください",
    "helpful_score": "{percent}%が役立ったと評価（{count}/{total}件）",
    "downloads_heading": "ダウンロード",
    "download_button": "ダウンロード",
    "download_premium": "プレミアム",
    "download_size": "{size}",
    "notes_heading": "マイノート",
    "notes_placeholder": "このレッスンについてメモを追加...",
    "notes_save": "ノートを保存",
    "notes_saved": "保存しました",
    "notes_delete": "ノートを削除",
    "notes_empty": "まだノートがありません",
    "notes_index_title": "マイノート",
    "notes_index_empty": "まだノートを書いていません。レッスンを見て、気づきをメモしましょう。",
    "related_heading": "関連コンテンツ",
    "series_heading": "シリーズの一部",
    "series_previous": "前へ",
    "series_next": "次へ",
    "freshness_current": "最新の内容です",
    "freshness_review": "レビュー中",
    "freshness_outdated": "更新中",
    "published_date": "公開日: {date}",
    "bookmarks_title": "マイブックマーク",
    "bookmarks_empty": "まだブックマークがありません。ヴォールトでお気に入りのコンテンツを見つけましょう。",
    "watch_later_title": "後で見る",
    "watch_later_empty": "「後で見る」リストは空です。気になる動画を追加しましょう。",
    "premium_lock": "プレミアムコンテンツ",
    "premium_upgrade": "アップグレードしてアクセス",
    "back_to_vault": "ヴォールトに戻る",
    "back_to_series": "シリーズに戻る",
    "series_browse_title": "シリーズ",
    "series_browse_subtitle": "トピック別の体系的な学習パス",
    "difficulty_path_heading": "学習パス: {topic}",
    "difficulty_path_summary": "{count} アイテム · 約{minutes}分 · {startLevel} → {endLevel}",
    "level_beginner": "初級",
    "level_intermediate": "中級",
    "level_advanced": "上級",
    "level_up": "レベルアップ",
    "auth_required": "この機能を使うにはサインインしてください",
    "login_to_bookmark": "ブックマークするにはサインインしてください",
    "login_to_note": "ノートを取るにはサインインしてください"
  }
}
```

---

## 12. Component Inventory

### 12.1 Public Components (`components/vault/`)

| Component | Used On | Props |
|---|---|---|
| `VaultContentCard` | Browse, search, bookmarks, watch-later | content item, user tier, bookmark state |
| `VaultContentGrid` | Browse page | items array, loading state |
| `VaultFilters` | Browse page | filter state, tag list, handlers |
| `VaultSearchBar` | Browse page | search value, onChange, onClear |
| `VaultTrendingRow` | Browse page | trending items array |
| `VaultSeriesCard` | Browse page, series index | series data |
| `VaultSeriesDetail` | Series detail page | series + ordered items |
| `VaultContentDetail` | Content detail page | content item, downloads, related, series context |
| `VaultVideoPlayer` | Content detail page | video URL, content type (youtube/vimeo/mux) |
| `VaultDownloadList` | Content detail page | downloads array, user tier |
| `VaultDownloadItem` | Within DownloadList | download data, is_accessible |
| `VaultFeedbackButtons` | Content detail page | feedback state, counts, handlers |
| `VaultBookmarkButton` | Content card + detail | is_bookmarked, onClick |
| `VaultWatchLaterButton` | Content card + detail | is_saved, onClick |
| `VaultNotesEditor` | Content detail page | note data, onSave, onDelete |
| `VaultRelatedContent` | Content detail page | related items array |
| `VaultSeriesNav` | Content detail page (in-series) | series info, current position, prev/next |
| `VaultDifficultyPath` | Topic filter view | items grouped by difficulty |
| `VaultFreshnessBadge` | Content card + detail | freshness_status |
| `VaultPremiumGate` | Content card + detail + downloads | upgrade CTA |
| `VaultEmptyState` | Bookmarks, watch-later, notes | message, CTA |

### 12.2 Admin Components (`components/admin/vault/`)

| Component | Used On | Props |
|---|---|---|
| `VaultSeriesForm` | Series create/edit | series data (optional), onSave |
| `VaultSeriesTable` | Series management | series list |
| `VaultSeriesItemOrder` | Series edit | items, onReorder (drag-and-drop) |
| `VaultDownloadManager` | Content item form | downloads, onAdd, onRemove, onReorder |
| `VaultDownloadUploader` | Within DownloadManager | onUploadComplete |
| `VaultFreshnessQueue` | Freshness dashboard | items needing review |
| `VaultRelatedPicker` | Content item form | selected IDs, onSelect |

---

## 13. File Map

### New Files

```
app/
├── [locale]/learn/vault/
│   ├── page.tsx                              # Vault browse/search
│   ├── [slug]/page.tsx                       # Content detail
│   ├── series/
│   │   ├── page.tsx                          # Series index
│   │   └── [slug]/page.tsx                   # Series detail
│   ├── bookmarks/page.tsx                    # User bookmarks
│   ├── watch-later/page.tsx                  # User watch-later queue
│   └── notes/page.tsx                        # User notes index
├── api/vault/
│   ├── browse/route.ts                       # Paginated browse + filter + search
│   ├── trending/route.ts                     # Trending items (cached)
│   ├── [slug]/route.ts                       # Content detail fetch
│   ├── series/route.ts                       # Series list
│   ├── series/[slug]/route.ts                # Series detail
│   ├── view/route.ts                         # Record view
│   ├── bookmarks/route.ts                    # GET + POST bookmarks
│   ├── bookmarks/[id]/route.ts               # DELETE bookmark
│   ├── watch-later/route.ts                  # GET + POST watch-later
│   ├── watch-later/[id]/route.ts             # DELETE watch-later
│   ├── notes/route.ts                        # GET + PUT notes
│   ├── notes/delete/route.ts                 # DELETE note
│   ├── feedback/route.ts                     # POST feedback
│   └── feedback/[id]/route.ts                # DELETE feedback
├── api/admin/vault/
│   ├── series/route.ts                       # CRUD series
│   ├── series/[id]/route.ts                  # Update/delete series
│   ├── series/[id]/order/route.ts            # Reorder series items
│   ├── downloads/route.ts                    # Upload + create download
│   ├── downloads/[id]/route.ts               # Update/delete download
│   └── freshness/
│       ├── [id]/route.ts                     # Update freshness
│       └── review/route.ts                   # Get items needing review

components/
├── vault/
│   ├── VaultContentCard.tsx
│   ├── VaultContentGrid.tsx
│   ├── VaultFilters.tsx
│   ├── VaultSearchBar.tsx
│   ├── VaultTrendingRow.tsx
│   ├── VaultSeriesCard.tsx
│   ├── VaultSeriesDetail.tsx
│   ├── VaultContentDetail.tsx
│   ├── VaultVideoPlayer.tsx
│   ├── VaultDownloadList.tsx
│   ├── VaultDownloadItem.tsx
│   ├── VaultFeedbackButtons.tsx
│   ├── VaultBookmarkButton.tsx
│   ├── VaultWatchLaterButton.tsx
│   ├── VaultNotesEditor.tsx
│   ├── VaultRelatedContent.tsx
│   ├── VaultSeriesNav.tsx
│   ├── VaultDifficultyPath.tsx
│   ├── VaultFreshnessBadge.tsx
│   ├── VaultPremiumGate.tsx
│   └── VaultEmptyState.tsx
├── admin/vault/
│   ├── VaultSeriesForm.tsx
│   ├── VaultSeriesTable.tsx
│   ├── VaultSeriesItemOrder.tsx
│   ├── VaultDownloadManager.tsx
│   ├── VaultDownloadUploader.tsx
│   ├── VaultFreshnessQueue.tsx
│   └── VaultRelatedPicker.tsx

lib/
├── vault/
│   ├── queries.ts                            # Supabase queries (browse, trending, series)
│   ├── feedback.ts                           # Feedback logic + count sync
│   ├── bookmarks.ts                          # Bookmark/watch-later logic
│   ├── notes.ts                              # Notes CRUD logic
│   ├── freshness.ts                          # Freshness check + auto-flag logic
│   ├── popularity.ts                         # Trending score calculation
│   ├── related.ts                            # Related content resolution logic
│   └── downloads.ts                          # Download URL signing + tracking

messages/
├── en.json                                   # Add "vault" namespace
└── ja.json                                   # Add "vault" namespace
```

### Modified Files (from Phase 2B)

```
lib/supabase/types.ts                         # Add Vault table types
app/[locale]/learn/layout.tsx                 # Add Vault nav item to learn section sidebar
components/learn/LearnSidebar.tsx             # Add "The Vault" link with icon
components/admin/AdminSidebar.tsx             # Add Series Management + Freshness Review links
```

---

## 14. SEO & Metadata

Each Vault content item and series generates its own page with structured metadata:

```typescript
// Content detail page metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const item = await getContentItem(params.slug);
  return {
    title: `${item.title_en} | The Vault | HonuVibe.AI`,
    description: item.description_en?.slice(0, 160),
    openGraph: {
      title: item.title_en,
      description: item.description_en?.slice(0, 160),
      images: item.thumbnail_url ? [item.thumbnail_url] : [],
      type: 'article',
    },
    alternates: {
      languages: {
        'en': `/learn/vault/${params.slug}`,
        'ja': `/ja/learn/vault/${params.slug}`,
      },
    },
  };
}
```

Series pages use `type: 'website'` with the series thumbnail and description.

---

## 15. Analytics Events (Plausible)

| Event | Properties | Trigger |
|---|---|---|
| `vault_browse` | `filter_type`, `filter_topic`, `sort` | Page load or filter change |
| `vault_search` | `query` (truncated to 50 chars) | Search submitted |
| `vault_item_view` | `slug`, `content_type`, `access_tier` | Detail page load |
| `vault_series_view` | `slug`, `item_count` | Series detail page load |
| `vault_download` | `file_name`, `file_type`, `access_tier` | Download click |
| `vault_bookmark` | `action` (add/remove), `content_type` | Bookmark toggle |
| `vault_watch_later` | `action` (add/remove) | Watch later toggle |
| `vault_feedback` | `type` (helpful/not_helpful), `slug` | Feedback submitted |
| `vault_note_save` | `slug`, `note_length` | Note saved |
| `vault_premium_gate` | `slug`, `gate_type` (content/download) | Premium gate interaction |
| `vault_difficulty_path` | `topic`, `item_count` | Difficulty path view |

---

## 16. Build Order

### Phase V1: Foundation (Database + Core Browse)

1. **Database migrations** — Create `vault_series`, `vault_downloads`, `vault_bookmarks`, `vault_notes`, `vault_feedback`, `vault_views` tables + RLS policies
2. **Alter content_items** — Add Vault columns (freshness, feedback counts, series FK, related_item_ids)
3. **Feedback sync trigger** — Create the `sync_vault_feedback_counts` trigger function
4. **Freshness cron** — Set up auto-flagging function (pg_cron or Edge Function)
5. **Vault queries lib** — `lib/vault/queries.ts` for browse, filter, search, trending
6. **API routes: browse** — `/api/vault/browse`, `/api/vault/trending`, `/api/vault/[slug]`
7. **Core components** — `VaultContentCard`, `VaultContentGrid`, `VaultFilters`, `VaultSearchBar`, `VaultFreshnessBadge`
8. **Vault browse page** — `/[locale]/learn/vault/page.tsx` with trending row + filter + grid
9. **Content detail page** — `/[locale]/learn/vault/[slug]/page.tsx` with video player + description
10. **View tracking** — `/api/vault/view` + `VaultContentDetail` integration
11. **Test core browse** — End-to-end: browse → filter → detail → back

### Phase V2: Series + Downloads

12. **Series API routes** — CRUD + series detail fetch
13. **Series components** — `VaultSeriesCard`, `VaultSeriesDetail`, `VaultSeriesNav`
14. **Series browse page** — `/[locale]/learn/vault/series/page.tsx`
15. **Series detail page** — `/[locale]/learn/vault/series/[slug]/page.tsx`
16. **Series context in detail** — Prev/next nav when viewing item within a series
17. **Downloads lib** — Signed URL generation, download count tracking
18. **Download components** — `VaultDownloadList`, `VaultDownloadItem`
19. **Download API routes** — Serve + track downloads
20. **Admin: series management** — `VaultSeriesForm`, `VaultSeriesTable`, `VaultSeriesItemOrder`
21. **Admin: download manager** — `VaultDownloadManager`, `VaultDownloadUploader` in content form
22. **Test series + downloads** — Create series, add items, reorder, download files

### Phase V3: Personal Features (Auth-Gated)

23. **Bookmarks API + lib** — CRUD routes + logic
24. **Bookmark components** — `VaultBookmarkButton` on cards + detail
25. **Bookmarks page** — `/[locale]/learn/vault/bookmarks/page.tsx`
26. **Watch Later API + lib** — Same pattern as bookmarks, filtered to video
27. **Watch Later components** — `VaultWatchLaterButton` on cards + detail
28. **Watch Later page** — `/[locale]/learn/vault/watch-later/page.tsx`
29. **Notes API + lib** — CRUD + auto-save logic
30. **Notes components** — `VaultNotesEditor` on detail page
31. **Notes index page** — `/[locale]/learn/vault/notes/page.tsx`
32. **Feedback API + lib** — Submit/toggle/remove + count sync
33. **Feedback components** — `VaultFeedbackButtons` on detail page
34. **Test personal features** — Bookmark → view bookmarks, write note → view notes index, feedback → count update

### Phase V4: Polish + Intelligence

35. **Related content logic** — `lib/vault/related.ts` implementing priority resolution
36. **Related content component** — `VaultRelatedContent` on detail page
37. **Difficulty progression** — `VaultDifficultyPath` component for topic views
38. **Premium gating** — `VaultPremiumGate` on cards, detail, downloads
39. **Popularity/trending** — Implement trending score query + caching
40. **Admin: freshness queue** — `VaultFreshnessQueue` component
41. **Admin: related picker** — `VaultRelatedPicker` in content form
42. **i18n** — Complete EN + JP strings for all Vault UI
43. **SEO metadata** — generateMetadata for all Vault pages
44. **Analytics events** — Wire up all Plausible events
45. **Learn section nav update** — Add Vault to sidebar/nav
46. **Full QA** — Cross-browser, mobile, bilingual, access tier testing

---

## 17. QA Checklist

### Browse & Discovery
- [ ] Vault index loads with trending row + content grid
- [ ] Search returns relevant results (EN and JP queries)
- [ ] All filters work independently and in combination
- [ ] Sort options produce correct ordering
- [ ] Pagination loads more items without duplicates
- [ ] Difficulty path view triggers on single-topic filter
- [ ] Trending section updates reflect recent activity
- [ ] View counts display and format correctly (1.2K, etc.)
- [ ] Freshness badges appear on cards and detail pages
- [ ] Premium lock overlay shows for free users on premium items

### Series
- [ ] Series index shows published series only
- [ ] Series detail shows items in correct order
- [ ] Prev/Next navigation works within a series
- [ ] Series card shows correct item count and total duration
- [ ] Series with mixed access tiers shows locks correctly

### Downloads
- [ ] Download links generate signed URLs
- [ ] Download count increments on click
- [ ] Premium downloads show lock for free users
- [ ] File size displays correctly
- [ ] Multiple downloads per item render in correct order

### Personal Features (Auth)
- [ ] Unauthenticated users see "Sign in" prompt for bookmarks/notes
- [ ] Bookmark toggle works on cards and detail page
- [ ] Bookmarks page shows all bookmarked items
- [ ] Watch Later toggle only appears on video items
- [ ] Watch Later page filters to video items only
- [ ] Notes auto-save after 2 seconds of inactivity
- [ ] Notes render markdown on read view
- [ ] Notes index shows all items with notes
- [ ] Deleting a note removes it from index
- [ ] Feedback buttons toggle correctly (helpful → not helpful → remove)
- [ ] Feedback counts update in real-time after vote

### Admin
- [ ] Series CRUD works (create, edit, reorder, delete)
- [ ] Download upload + management works
- [ ] Freshness queue shows items needing review
- [ ] Setting freshness to "current" updates reviewed_at date
- [ ] Related item picker searches and selects correctly
- [ ] Content item form shows all new Vault fields

### Bilingual
- [ ] All Vault UI renders correctly in EN and JP
- [ ] Series titles/descriptions show in correct locale
- [ ] Download descriptions show in correct locale
- [ ] Empty states show locale-appropriate messages
- [ ] Search works with Japanese queries
- [ ] Freshness badge labels translate correctly

### Mobile
- [ ] Content grid responsive (2-col → 1-col)
- [ ] Video player scales correctly
- [ ] Filters collapse to sheet/modal on mobile
- [ ] Download buttons are touch-friendly
- [ ] Notes editor is usable on mobile keyboard
- [ ] Series nav (prev/next) is thumb-accessible

---

## 18. Open Questions

| Question | Context | Priority | Owner |
|---|---|---|---|
| Video hosting provider? | MUX vs Vimeo Pro for Vault videos. YouTube OK for free-tier external embeds but not for HonuVibe originals. | 🔴 Blocking (before V1) | Ryan |
| Supabase Storage tier? | 50MB file upload limit adequate? Current plan supports it? | 🟡 High | Ryan / Dev |
| Freshness review cadence? | 6-month auto-flag is the default. Should some categories (tools, pricing) flag sooner? | 🟠 Medium | Ryan |
| Notes character limit? | 5000 chars proposed. Increase for power users? | 🟢 Low | Ryan |
| Series: allow cross-difficulty? | Can a series span Beginner → Advanced, or must all items be same level? | 🟠 Medium | Ryan |
| Download analytics depth? | Track just count, or also who downloaded (for premium content value reporting)? | 🟢 Low | Ryan |
| Vault nav placement? | Top-level learn section nav item, or nested under a "Self Study" group with Phase 2C paths? | 🟡 High | Ryan |

---

## 19. Dependencies

| Dependency | Source | Status |
|---|---|---|
| `content_items` table | Phase 2B | Must exist before Vault migrations |
| Canonical tag system | Phase 2B | Must be seeded |
| Auth system | Phase 2A | Must be functional for personal features |
| Stripe premium subscription | Phase 2C | Must exist for premium gating (can stub with feature flag) |
| Supabase Storage bucket | New | Create `vault-downloads` bucket |
| Admin content form | Phase 2B | Extended with new fields |

---

*HonuVibe.AI — The Vault: Self-Study Library Specification v1.0*
*Made in Hawaii with Aloha 🐢*
