# HonuVibe.AI — Phase 2B Build Specification
## Content Library & Admin Enrichment
**Build-Ready Engineering Blueprint | v1.0**
*Weeks 10–13 | Runs Parallel with First Cohort Delivery*

---

## Overview

Phase 2B builds the content library — the curated database of videos, articles, tools, and templates that serves as the foundation for self-study (Phase 2C) and enriches future cohort courses. This phase runs in parallel with delivering HVAI-101, so every resource shared during the live cohort gets fed into the library.

### What Ships in Phase 2B

1. Content library database schema
2. Admin UI for managing content items (CRUD, tagging, bulk actions)
3. YouTube metadata auto-fetch (oEmbed integration)
4. Public content browsing page (free items visible to all visitors)
5. Content linking to cohort course resources
6. Tag management system
7. Admin dashboard enrichments (content metrics)

### Dependencies

- Phase 2A must be complete (auth, admin panel, course infrastructure)
- Content library shares the same admin layout and auth guards

---

## 1. Database Schema

### 1.1 Content Items

```sql
CREATE TABLE content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  title_en text NOT NULL,
  title_jp text,
  description_en text,
  description_jp text,

  -- Content details
  content_type text NOT NULL
    CHECK (content_type IN (
      'video_custom',      -- HonuVibe-produced video (Vimeo, MUX)
      'video_youtube',     -- Curated YouTube video
      'article',           -- External article or blog post
      'tool',              -- AI tool reference (link to tool)
      'template',          -- Downloadable template (prompt library, frameworks)
      'guide',             -- HonuVibe guide or PDF
      'course_recording'   -- Replay from a cohort course session
    )),

  -- Source & URL
  url text NOT NULL,                               -- Primary URL (YouTube, Vimeo, article link, etc.)
  source text NOT NULL DEFAULT 'external'
    CHECK (source IN ('honuvibe', 'youtube', 'external')),
  thumbnail_url text,                              -- Auto-fetched for YouTube, manual for others

  -- Media metadata
  duration_minutes integer,                        -- For video content
  author_name text,                                -- YouTube channel name, article author, etc.
  publish_date date,                               -- Original publish date of the content

  -- Classification
  difficulty_level text DEFAULT 'beginner'
    CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  language text DEFAULT 'en'
    CHECK (language IN ('en', 'ja', 'both')),

  -- Tags (flexible tagging via JSONB + join table)
  tags jsonb DEFAULT '[]',                         -- ["prompting", "business-ai", "productivity"]

  -- Access control
  access_tier text DEFAULT 'free'
    CHECK (access_tier IN ('free', 'premium')),

  -- Linked course (if this content came from a cohort session)
  source_course_id uuid REFERENCES courses(id),
  source_session_id uuid REFERENCES course_sessions(id),

  -- Admin notes (internal, not shown to students)
  admin_notes text,

  -- Status
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,               -- Featured on content browse page

  -- Metrics (updated periodically or via triggers)
  view_count integer DEFAULT 0,
  usage_in_paths integer DEFAULT 0,                -- How many self-study paths include this item

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for tag-based queries
CREATE INDEX idx_content_items_tags ON content_items USING GIN (tags);
CREATE INDEX idx_content_items_type ON content_items (content_type);
CREATE INDEX idx_content_items_tier ON content_items (access_tier);
CREATE INDEX idx_content_items_published ON content_items (is_published);
```

### 1.2 Tags (Canonical Tag List)

While content_items stores tags as JSONB for query flexibility, maintain a canonical tag list for consistent tagging across the admin UI.

```sql
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,                       -- "prompt-engineering"
  name_en text NOT NULL,                           -- "Prompt Engineering"
  name_jp text,                                    -- "プロンプトエンジニアリング"
  category text                                    -- "topic", "tool", "skill", "industry"
    CHECK (category IN ('topic', 'tool', 'skill', 'industry', 'format')),
  usage_count integer DEFAULT 0,                   -- Auto-maintained
  created_at timestamptz DEFAULT now()
);
```

**Seed tags from HVAI-101 content:**

```sql
INSERT INTO tags (slug, name_en, name_jp, category) VALUES
  -- Topics
  ('ai-fundamentals', 'AI Fundamentals', 'AI基礎', 'topic'),
  ('prompt-engineering', 'Prompt Engineering', 'プロンプトエンジニアリング', 'topic'),
  ('business-ai', 'Business AI', 'ビジネスAI', 'topic'),
  ('productivity', 'Productivity', '生産性', 'topic'),
  ('content-creation', 'Content Creation', 'コンテンツ作成', 'topic'),
  ('research', 'Research & Analysis', 'リサーチ・分析', 'topic'),
  ('automation', 'Automation', '自動化', 'topic'),
  ('ethics', 'AI Ethics', 'AI倫理', 'topic'),
  ('bilingual', 'Bilingual / EN-JP', 'バイリンガル', 'topic'),
  ('career', 'Career Development', 'キャリア開発', 'topic'),

  -- Tools
  ('chatgpt', 'ChatGPT', 'ChatGPT', 'tool'),
  ('claude', 'Claude', 'Claude', 'tool'),
  ('gemini', 'Gemini', 'Gemini', 'tool'),
  ('perplexity', 'Perplexity', 'Perplexity', 'tool'),
  ('notebooklm', 'NotebookLM', 'NotebookLM', 'tool'),
  ('zapier', 'Zapier', 'Zapier', 'tool'),
  ('canva-ai', 'Canva AI', 'Canva AI', 'tool'),
  ('gamma', 'Gamma', 'Gamma', 'tool'),
  ('cursor', 'Cursor', 'Cursor', 'tool'),
  ('deepl', 'DeepL', 'DeepL', 'tool'),

  -- Skills
  ('writing', 'Writing & Communication', 'ライティング・コミュニケーション', 'skill'),
  ('data-analysis', 'Data Analysis', 'データ分析', 'skill'),
  ('translation', 'Translation & Localization', '翻訳・ローカリゼーション', 'skill'),
  ('project-management', 'Project Management', 'プロジェクト管理', 'skill'),

  -- Industry
  ('small-business', 'Small Business', 'スモールビジネス', 'industry'),
  ('nonprofit', 'Nonprofit', '非営利団体', 'industry'),
  ('freelance', 'Freelance / Solopreneur', 'フリーランス', 'industry'),

  -- Format
  ('tutorial', 'Tutorial', 'チュートリアル', 'format'),
  ('overview', 'Overview / Explainer', '概要', 'format'),
  ('case-study', 'Case Study', 'ケーススタディ', 'format'),
  ('hands-on', 'Hands-On / Workshop', '実践ワークショップ', 'format'),
  ('comparison', 'Tool Comparison', 'ツール比較', 'format');
```

### 1.3 Content Collections (Optional — Future Enhancement)

For manually curated groupings (e.g., "Best intro to prompting" or "Ryan's top 10 AI videos"):

```sql
CREATE TABLE content_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_jp text,
  description_en text,
  description_jp text,
  is_published boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE content_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES content_collections(id) ON DELETE CASCADE,
  content_item_id uuid REFERENCES content_items(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  note_en text,                                    -- curator's note for this item in context
  note_jp text,
  UNIQUE(collection_id, content_item_id)
);
```

### 1.4 Row-Level Security

```sql
-- Content items: published items readable by all, admin can do everything
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_public_read" ON content_items
  FOR SELECT USING (is_published = true);
CREATE POLICY "content_admin_all" ON content_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Tags: readable by all (needed for filters), admin-managed
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_public_read" ON tags FOR SELECT USING (true);
CREATE POLICY "tags_admin_all" ON tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

---

## 2. API Routes

### 2.1 Public Routes

```
GET  /api/content                     → List published content items
     Query params: type, tags, difficulty, language, tier, search, page, limit
GET  /api/content/[id]                → Single content item detail
GET  /api/tags                        → List all tags (for filter UI)
```

**Content listing query logic:**
```typescript
// /api/content/route.ts
// Build Supabase query dynamically from params:
let query = supabase
  .from('content_items')
  .select('*')
  .eq('is_published', true)
  .order('created_at', { ascending: false });

if (type) query = query.eq('content_type', type);
if (difficulty) query = query.eq('difficulty_level', difficulty);
if (language) query = query.eq('language', language);
if (tier) query = query.eq('access_tier', tier);
if (tags) query = query.contains('tags', JSON.parse(tags)); // JSONB contains
if (search) query = query.or(`title_en.ilike.%${search}%,title_jp.ilike.%${search}%,description_en.ilike.%${search}%`);

// Pagination
query = query.range((page - 1) * limit, page * limit - 1);
```

### 2.2 Admin Routes

```
POST   /api/admin/content                → Create content item
PUT    /api/admin/content/[id]           → Update content item
DELETE /api/admin/content/[id]           → Delete content item (soft delete or hard)
POST   /api/admin/content/bulk-tag       → Add tags to multiple items
POST   /api/admin/content/youtube-fetch  → Fetch YouTube metadata from URL
POST   /api/admin/tags                   → Create new tag
PUT    /api/admin/tags/[id]              → Update tag
DELETE /api/admin/tags/[id]              → Delete tag
```

### 2.3 YouTube Metadata Fetch

```
POST /api/admin/content/youtube-fetch/route.ts
```

```typescript
// 1. Receive { url: string } — a YouTube video URL
// 2. Extract video ID from URL (handle youtube.com/watch?v=, youtu.be/, etc.)
// 3. Call YouTube oEmbed API:
//    GET https://www.youtube.com/oembed?url=${videoUrl}&format=json
// 4. Returns: { title, author_name, thumbnail_url, ... }
// 5. Optionally call YouTube Data API v3 for duration (requires API key):
//    GET https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${API_KEY}
//    Parse duration from ISO 8601 (PT15M33S → 15 minutes)
// 6. Return pre-filled content item data:
//    { title_en: title, author_name, thumbnail_url, duration_minutes, url, content_type: 'video_youtube', source: 'youtube' }
```

**Note:** oEmbed doesn't require an API key. For duration, you'll need a YouTube Data API key (free tier allows 10,000 units/day — more than enough). If you don't want to set up the API key initially, duration can be entered manually.

---

## 3. Frontend — Admin Content Library

### 3.1 Content Library Page (`/admin/content/page.tsx`)

**Layout:**

```
Content Library                              [+ Add Content]  [Bulk Import]

┌─ Filters ──────────────────────────────────────────────────────────────┐
│ Type: [All ▾]  Tags: [Multi-select ▾]  Tier: [All ▾]  Status: [All ▾] │
│ Search: [________________________]                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ☐ │ 🎥 │ How I Use Claude for Research    │ youtube  │ free    │ ✓ Pub │
│ ☐ │ 🎥 │ AI Workflow Automation Demo       │ honuvibe │ premium │ Draft │
│ ☐ │ 📄 │ Prompt Engineering Guide 2026    │ external │ free    │ ✓ Pub │
│ ☐ │ 🔧 │ Perplexity AI                    │ external │ free    │ ✓ Pub │
│ ☐ │ 📋 │ Prompt Template Library           │ honuvibe │ premium │ ✓ Pub │
│   │    │                                   │          │         │       │
│ Selected: 2  [ Tag Selected ▾ ]  [ Set Tier ▾ ]  [ Publish ]  [ Delete ] │
└─────────────────────────────────────────────────────────────────────────┘

Showing 1-20 of 47 items                                    [← 1 2 3 →]
```

**Features:**
- Filterable, searchable, sortable table
- Checkbox selection for bulk actions (tagging, tier change, publish/unpublish)
- Type icons: 🎥 video, 📄 article, 🔧 tool, 📋 template, 📖 guide
- Quick edit: click a row to open edit panel (slide-over or modal)
- Inline status toggle (draft ↔ published)

### 3.2 Add/Edit Content Item (`/admin/content/new/page.tsx` or modal)

**Form Fields:**

```
┌─ Content Item ─────────────────────────────────────────────────┐
│                                                                │
│  Content Type:  ○ YouTube Video  ○ Custom Video  ○ Article    │
│                 ○ Tool  ○ Template  ○ Guide                   │
│                                                                │
│  URL: [_________________________________]  [Fetch Metadata]   │
│       (For YouTube URLs, click to auto-fill fields below)      │
│                                                                │
│  Title (EN): [_________________________________]              │
│  Title (JP): [_________________________________]  (optional)  │
│                                                                │
│  Description (EN): [___________________________]              │
│  Description (JP): [___________________________]  (optional)  │
│                                                                │
│  Thumbnail: [Upload or paste URL]  [Auto-fetched preview]     │
│                                                                │
│  Duration (minutes): [____]  (auto-filled for YouTube)        │
│  Author/Source: [______________]                               │
│  Original Publish Date: [__________]                          │
│                                                                │
│  ─── Classification ───                                       │
│                                                                │
│  Difficulty:  ○ Beginner  ○ Intermediate  ○ Advanced          │
│  Language:    ○ English  ○ Japanese  ○ Both                   │
│  Access Tier: ○ Free  ○ Premium                               │
│                                                                │
│  Tags: [ prompt-engineering × ] [ business-ai × ] [+ Add]    │
│         (searchable multi-select from canonical tag list)      │
│                                                                │
│  ─── Links ───                                                │
│                                                                │
│  Source Course: [None ▾]  (link to a cohort course)           │
│  Source Session: [None ▾]  (link to a specific session)       │
│                                                                │
│  ─── Admin ───                                                │
│                                                                │
│  Internal Notes: [___________________________]                │
│  Featured: ☐                                                  │
│  Published: ☐                                                 │
│                                                                │
│  [ Save as Draft ]  [ Save & Publish ]                        │
└────────────────────────────────────────────────────────────────┘
```

**YouTube Quick-Add Flow:**
1. Admin pastes YouTube URL into the URL field
2. Clicks "Fetch Metadata" (or auto-triggers on paste)
3. System calls `/api/admin/content/youtube-fetch`
4. Auto-fills: title_en, author_name, thumbnail_url, duration_minutes
5. Admin adds tags, description, tier, and publishes

### 3.3 Tag Management (`/admin/content/tags/page.tsx`)

Simple CRUD for the canonical tag list:

```
┌─ Tags ─────────────────────────────────────────────────┐
│                                                [+ New Tag]
│  Topic                                                  │
│  ├── AI Fundamentals (AI基礎)              12 items     │
│  ├── Prompt Engineering (プロンプトエンジニアリング) 8 items │
│  ├── Business AI (ビジネスAI)               6 items     │
│  └── ...                                                │
│                                                         │
│  Tool                                                   │
│  ├── ChatGPT                                5 items     │
│  ├── Claude                                 7 items     │
│  └── ...                                                │
│                                                         │
│  Skill                                                  │
│  └── ...                                                │
└─────────────────────────────────────────────────────────┘
```

Grouped by category (topic, tool, skill, industry, format). Each tag shows usage count. Click to edit name/translations. Delete with confirmation (removes tag from all items).

### 3.4 Bulk Import (CSV)

For initial library population, support CSV upload:

```
POST /api/admin/content/bulk-import/route.ts
```

**CSV format:**
```csv
url,title_en,title_jp,content_type,source,difficulty_level,language,access_tier,tags,description_en
https://youtube.com/watch?v=abc123,How to Use Claude,Claude活用方法,video_youtube,youtube,beginner,both,free,"prompt-engineering,claude",A beginner's guide to Claude
```

**Flow:**
1. Admin uploads CSV file
2. System parses rows, validates required fields
3. For YouTube URLs, auto-fetches metadata to fill gaps
4. Shows preview table with validation status per row
5. Admin confirms → bulk insert

---

## 4. Frontend — Public Content Browse

### 4.1 Content Library Page (`/[locale]/learn/library/page.tsx`)

This is the public-facing content browse page. It serves as the top-of-funnel for self-study (Phase 2C) but is valuable on its own as a curated resource directory.

**Layout:**

```
Explore the HonuVibe Library                          ← Title
Curated AI resources to accelerate your learning       ← Subtitle

┌─ Filters ──────────────────────────────────────────┐
│ [All Types ▾] [All Topics ▾] [All Levels ▾] [🔍 ] │
└────────────────────────────────────────────────────┘

┌─ Featured ─────────────────────────────────────────┐
│  [Featured content item — large card with image]    │
└────────────────────────────────────────────────────┘

┌─ Content Grid ─────────────────────────────────────┐
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ 🎥 thumb │  │ 🎥 thumb │  │ 🔒 thumb │         │
│  │          │  │          │  │ PREMIUM   │         │
│  │ Title    │  │ Title    │  │ Title     │         │
│  │ 15 min   │  │ 22 min   │  │ 30 min    │         │
│  │ ● ● tags │  │ ● ● tags │  │ ● ● tags  │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ 📄 icon  │  │ 🔧 icon  │  │ 🎥 thumb │         │
│  │          │  │          │  │          │         │
│  │ Title    │  │ Title    │  │ Title     │         │
│  │ Article  │  │ Tool     │  │ 10 min    │         │
│  │ ● ● tags │  │ ● ● tags │  │ ● ● tags  │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
└────────────────────────────────────────────────────┘

┌─ Premium Upsell ───────────────────────────────────┐
│  Unlock the full library with a Premium membership  │
│  50+ curated resources · AI-powered study paths     │
│  [ Start Free → ]  [ Go Premium — $29/mo → ]       │
└────────────────────────────────────────────────────┘
```

### 4.2 Content Card Component (`components/learn/ContentCard.tsx`)

```
┌──────────────────────────────┐
│  [Thumbnail / Type Icon]     │     ← YouTube thumbnail or type-based icon
│  🔒 PREMIUM                  │     ← Lock badge on premium items (if user is free tier)
│                              │
│  BEGINNER · YOUTUBE · 15 MIN │     ← Overline metadata
│  How to Use Claude for       │     ← Title
│  Research Projects            │
│                              │
│  [prompt-engineering] [claude]│     ← Tag pills
│                              │
│  [ Watch → ] or [ Read → ]  │     ← CTA based on type
└──────────────────────────────┘
```

**Behavior by access tier:**
- **Free item:** Full access — click to open (YouTube embed, article link, etc.)
- **Premium item, free user:** Shows card with lock overlay. Clicking opens a modal: preview description + "Upgrade to Premium to access this resource" + upgrade CTA
- **Premium item, premium user:** Full access

### 4.3 Content Detail View

For videos: expand inline or navigate to a detail page with embedded player + description + related items.

For articles/tools: direct link (opens in new tab). No detail page needed.

For templates/guides: detail page with description + download button (premium gated).

---

## 5. Linking Content Library to Cohort Courses

### 5.1 Auto-Population from Course Delivery

As you deliver HVAI-101, resources shared during sessions should flow into the content library. Two approaches:

**Manual (V1):** After each session, admin adds resources to the library through the admin UI. Set `source_course_id` and `source_session_id` to link them.

**Semi-automated (V1.5):** When admin adds a replay URL to a course session (via the Phase 2A session editor), automatically create a `content_item` with `content_type: 'course_recording'` and `access_tier: 'premium'`. Admin just needs to add tags.

### 5.2 Resource Linking in Course Hub

The `course_resources` table (Phase 2A) can reference `content_items`:

```sql
-- Add to course_resources table
ALTER TABLE course_resources ADD COLUMN content_item_id uuid REFERENCES content_items(id);
```

When a course resource has a `content_item_id`, it pulls metadata from the content library (title, thumbnail, etc.) and links to the library entry. This creates a two-way connection: courses reference library items, and library items reference their source courses.

---

## 6. Admin Dashboard Enrichments

### 6.1 Content Library Stats (Add to Admin Dashboard)

```
┌─ Content Library ─────────────────────────────────┐
│  Total Items: 47     Published: 38    Draft: 9    │
│  Free: 28            Premium: 19                  │
│  Videos: 23          Articles: 12    Tools: 7     │
│  Templates: 3        Guides: 2                    │
│                                                    │
│  Most Tagged: prompt-engineering (12)              │
│  Most Viewed: "How to Use Claude" (342 views)     │
└────────────────────────────────────────────────────┘
```

### 6.2 Course Session → Library Pipeline Widget

In the course detail admin page (Phase 2A), add a section:

```
┌─ Content Library Links ───────────────────────────┐
│  Week 1 Session: 2 items linked                    │
│  Week 2 Session: 3 items linked                    │
│  Week 3 Session: 0 items  [ + Add to Library ]    │
│  Week 4 Session: not yet delivered                  │
└────────────────────────────────────────────────────┘
```

"Add to Library" opens a quick-add form pre-populated with the session's metadata.

---

## 7. Component Inventory (New for Phase 2B)

### 7.1 Public Components (`components/learn/`)

| Component | Used On | Props |
|---|---|---|
| `ContentCard` | Library browse, search results | content item data, user tier |
| `ContentGrid` | Library browse | array of content items, loading state |
| `ContentFilters` | Library browse | filter state, tag list, handlers |
| `ContentDetail` | Content detail page/modal | content item data, is_accessible |
| `PremiumGate` | Content detail (locked) | upgrade CTA, preview info |
| `TagPills` | ContentCard, filters | array of tags |

### 7.2 Admin Components (`components/admin/`)

| Component | Used On | Props |
|---|---|---|
| `ContentItemForm` | Add/edit content | content item data (optional for new), onSave |
| `ContentTable` | Content library list | items, selection state, bulk actions |
| `YouTubeFetcher` | Content item form | url, onMetadataFetched |
| `TagManager` | Tag management page | tags grouped by category |
| `TagSelector` | Content item form | selected tags, available tags, onChange |
| `BulkImporter` | CSV upload flow | onImportComplete |
| `ContentLibraryStats` | Admin dashboard | stats data |

---

## 8. File Map (New Files for Phase 2B)

```
app/
├── [locale]/
│   ├── learn/
│   │   └── library/
│   │       ├── page.tsx                 # Public content browse
│   │       └── [id]/
│   │           └── page.tsx             # Content detail (for videos, guides)
│   ├── admin/
│   │   └── content/
│   │       ├── page.tsx                 # Admin content library list
│   │       ├── new/
│   │       │   └── page.tsx             # Add new content item
│   │       ├── [id]/
│   │       │   └── page.tsx             # Edit content item
│   │       ├── tags/
│   │       │   └── page.tsx             # Tag management
│   │       └── import/
│   │           └── page.tsx             # Bulk CSV import
├── api/
│   ├── content/
│   │   ├── route.ts                     # GET published content (with filters)
│   │   └── [id]/
│   │       └── route.ts                 # GET single content item
│   ├── tags/
│   │   └── route.ts                     # GET all tags
│   ├── admin/
│   │   ├── content/
│   │   │   ├── route.ts                 # POST create, GET admin list
│   │   │   ├── [id]/
│   │   │   │   └── route.ts             # PUT update, DELETE
│   │   │   ├── bulk-tag/
│   │   │   │   └── route.ts             # POST bulk tagging
│   │   │   ├── bulk-import/
│   │   │   │   └── route.ts             # POST CSV import
│   │   │   └── youtube-fetch/
│   │   │       └── route.ts             # POST fetch YouTube metadata
│   │   └── tags/
│   │       ├── route.ts                 # POST create tag
│   │       └── [id]/
│   │           └── route.ts             # PUT update, DELETE tag

components/
├── learn/
│   ├── ContentCard.tsx
│   ├── ContentGrid.tsx
│   ├── ContentFilters.tsx
│   ├── ContentDetail.tsx
│   ├── PremiumGate.tsx
│   └── TagPills.tsx
├── admin/
│   ├── ContentItemForm.tsx
│   ├── ContentTable.tsx
│   ├── YouTubeFetcher.tsx
│   ├── TagManager.tsx
│   ├── TagSelector.tsx
│   ├── BulkImporter.tsx
│   └── ContentLibraryStats.tsx

lib/
├── content/
│   ├── queries.ts                       # Supabase queries for content items
│   ├── types.ts                         # TypeScript types
│   └── youtube.ts                       # YouTube oEmbed + Data API helpers
└── tags/
    ├── queries.ts
    └── types.ts

messages/
├── en.json                              # Add library.* section
└── ja.json                              # Add library.* section
```

---

## 9. i18n Additions

Add to `messages/en.json`:

```json
{
  "library": {
    "title": "Explore the HonuVibe Library",
    "subtitle": "Curated AI resources to accelerate your learning",
    "filter_all_types": "All Types",
    "filter_all_topics": "All Topics",
    "filter_all_levels": "All Levels",
    "search_placeholder": "Search resources...",
    "featured": "Featured",
    "free": "Free",
    "premium": "Premium",
    "premium_locked_title": "Premium Resource",
    "premium_locked_description": "Upgrade to access the full HonuVibe library including AI-powered study paths.",
    "upgrade_cta": "Go Premium",
    "start_free": "Start Free",
    "minutes": "{count} min",
    "video": "Video",
    "article": "Article",
    "tool": "Tool",
    "template": "Template",
    "guide": "Guide",
    "watch": "Watch",
    "read": "Read",
    "download": "Download",
    "visit_tool": "Visit Tool",
    "related_course": "From course: {courseName}",
    "showing_results": "Showing {start}-{end} of {total}",
    "no_results": "No resources found matching your filters.",
    "premium_upsell_title": "Unlock the full library",
    "premium_upsell_description": "50+ curated resources and AI-powered study paths"
  }
}
```

Add corresponding Japanese translations to `messages/ja.json`.

---

## 10. Content Population Strategy

### Week 1 of HVAI-101 Delivery

Capture and add to library:
- Session replay → `course_recording`, premium
- Any YouTube videos referenced during the session → `video_youtube`, free (already public)
- Prompt template library shared with students → `template`, premium
- AI platform setup guide → `guide`, free (marketing value)

### Ongoing During Cohort

After each session:
1. Upload replay to Vimeo → add replay URL to session (Phase 2A)
2. Create `content_item` for the recording (premium)
3. Add any new external resources shared during the session
4. Tag everything consistently

### Target for End of HVAI-101

Minimum 30 content items in the library:
- 8 course recordings (premium)
- 10+ curated YouTube videos (free)
- 5+ articles/guides (mix of free and premium)
- 5+ tool references (free)
- 2+ templates (premium)

This gives Phase 2C (self-study) a meaningful content base to generate paths from.

---

## 11. QA Checklist

### Admin Content Management
- [ ] Create content item with all fields
- [ ] Edit existing content item
- [ ] Delete content item
- [ ] YouTube URL auto-fetch populates metadata correctly
- [ ] Bulk tag selection applies to multiple items
- [ ] CSV bulk import parses and creates items
- [ ] Tag creation, editing, deletion works
- [ ] Tag usage counts update correctly
- [ ] Content filters work (type, tags, tier, status, search)
- [ ] Pagination works

### Public Content Browse
- [ ] Published free items visible to unauthenticated users
- [ ] Published premium items show lock overlay for free users
- [ ] Premium items fully accessible for premium users
- [ ] Filters narrow results correctly
- [ ] Search returns relevant results (EN and JP)
- [ ] Content detail page renders correctly for each type
- [ ] YouTube embeds play correctly
- [ ] External links open in new tab
- [ ] Premium upgrade CTA routes correctly
- [ ] Bilingual content displays based on locale

### Integration
- [ ] Content items linked to course sessions display correctly
- [ ] Source course/session metadata shows on library items
- [ ] Admin dashboard content stats are accurate

---

*HonuVibe.AI — Phase 2B Build Specification v1.0*
*Made in Hawaii with Aloha 🐢*
