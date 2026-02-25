# HonuVibe.AI — Feature Spec: Library (Quick-Learn Videos)
**Course On-Ramp & Stickiness Engine — Build-Ready Implementation Guide**
*v1.0 | February 2026*

---

## Overview

The Library is a collection of short (3–7 minute) tutorial videos covering specific, practical tasks. These are standalone — no course enrollment required — and serve as the primary on-ramp from casual visitor to registered user to course student. The Library is to courses what YouTube shorts are to a documentary series: quick wins that build trust and create habit.

**This is the most strategically important content feature.** Almost every other feature (Resources, Glossary, Templates, Comparisons, Industry Pages) cross-links to Library videos. It's the hub of the content flywheel.

### What Makes This Feature Different From Previous Specs

- **Requires auth** — bulk of Library is gated behind free account signup (Supabase Auth, already in place)
- **Requires Supabase tables** — video metadata, user favorites, and viewed tracking
- **Requires video hosting** — same MUX/Vimeo infrastructure as courses
- **Has user interaction state** — favorites and viewed tracking persist across sessions
- **Integrates with the student dashboard** — "My Library" tab alongside enrolled courses

---

## Routes

| Locale | URL | Description |
|---|---|---|
| EN | `/learn/library` | Library video index |
| EN | `/learn/library/[slug]` | Individual video page |
| JP | `/ja/learn/library` | Library video index (Japanese) |
| JP | `/ja/learn/library/[slug]` | Individual video page (Japanese) |

Library lives under `/learn/` because it's part of the learning ecosystem, shares the same auth infrastructure, and the path clearly signals its relationship to courses.

### Redirects

Add to `next.config.ts`:

```typescript
{ source: '/tutorials', destination: '/learn/library', permanent: true },
{ source: '/ja/tutorials', destination: '/ja/learn/library', permanent: true },
{ source: '/library', destination: '/learn/library', permanent: true },
{ source: '/ja/library', destination: '/ja/learn/library', permanent: true },
{ source: '/videos', destination: '/learn/library', permanent: true },
{ source: '/ja/videos', destination: '/ja/learn/library', permanent: true },
```

---

## Access Model

| Tier | Auth Required | Content | Purpose |
|---|---|---|---|
| **Open** | No | 5–8 hand-picked videos | Hook content — SEO-rich, shareable, gives a taste of quality |
| **Free Account** | Yes (email signup) | All Library videos | Builds the email list, creates registered users, enables personalization |

Key behaviors:
- Open videos are fully viewable without any account. No overlay, no teaser — full video plays.
- Free Account videos show the thumbnail, title, and description publicly. Clicking "Watch" triggers the auth gate.
- The auth gate is a friendly signup prompt, not a paywall. Copy: "Create a free account to watch this video and track your progress."
- Once authenticated, all Library videos are available. No payment required for any Library content.
- Favorites and viewed tracking only work for authenticated users (obviously).

---

## Navigation & Discovery

**Learn nav sub-link:** Add "Library" as a discoverable entry point under Learn. Options:

- **Option A:** When user hovers/clicks "Learn" in the main nav, show a small dropdown: "Courses" + "Library"
- **Option B:** Add "Library" as a visible sub-link on the Learn/Course catalog page
- **Option C:** Both

**Footer:** Add "Library" under the existing NAVIGATE or RESOURCES column:

```
NAVIGATE              RESOURCES            LEGAL
HonuHub               Resources            Privacy Policy
Explore               AI Glossary          Terms of Service
Learn                 Newsletter           Cookie Notice
Community             Blog
                      About
                      Contact
```

Learn already links to `/learn`. Library is discoverable from the Learn page and from cross-links throughout the site. No additional footer entry needed unless Ryan prefers one.

**Student Dashboard:** Add a "My Library" tab or section to `/learn/dashboard` showing:
- Favorited videos
- Recently viewed videos
- "Continue watching" (videos started but not completed)

This is the primary stickiness mechanism. Once a user has a personalized library, they return.

**Homepage cross-link (optional):** Consider adding a "Quick Tutorials" or "From the Library" section to the homepage showing 3 featured Library videos. This is not required for launch but strengthens the funnel.

---

## Data Architecture

### Decision: Supabase vs Sanity

Library video metadata lives in **Supabase** (not Sanity) because:
- User interactions (favorites, progress) are transactional data tied to user accounts
- Keeping video metadata in the same database as user interactions avoids cross-system joins
- The course/lesson data model already exists in Supabase — Library videos follow the same pattern
- Queries that combine "all videos + this user's favorites + this user's progress" are a single Supabase call

Content that's purely editorial (blog, glossary, resources, comparisons) stays in Sanity. Content that has user-state attached (courses, library) stays in Supabase.

---

## Supabase Tables

### library_videos

```sql
create table library_videos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_en text not null,
  title_jp text,
  description_en text,
  description_jp text,
  video_url text not null,                -- MUX playback ID or Vimeo URL
  thumbnail_url text,                     -- Custom thumbnail (not auto-generated)
  duration_seconds integer not null,
  category text not null check (category in (
    'ai-basics',
    'coding-tools',
    'business-automation',
    'image-video',
    'productivity',
    'getting-started'
  )),
  language text default 'en' check (language in ('en', 'ja', 'both')),
  access_tier text default 'free_account' check (access_tier in ('open', 'free_account')),
  difficulty text default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  related_course_id uuid references courses(id) on delete set null,
  related_resource_slug text,             -- Links to a tool on the Resources page
  related_glossary_slugs text[],          -- Array of glossary term slugs
  tags text[],                            -- Searchable keyword tags
  sort_order integer default 0,           -- Manual ordering within category
  is_featured boolean default false,      -- Featured on homepage or top of library
  is_published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for common queries
create index idx_library_videos_category on library_videos(category) where is_published = true;
create index idx_library_videos_published on library_videos(is_published, published_at desc);
create index idx_library_videos_slug on library_videos(slug);

-- RLS: anyone can read published videos
alter table library_videos enable row level security;
create policy "library_videos_public_read" on library_videos
  for select using (is_published = true);
```

### user_library_favorites

```sql
create table user_library_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references library_videos(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, video_id)
);

-- Index for fast lookup
create index idx_library_favorites_user on user_library_favorites(user_id);

-- RLS: users see and manage only their own
alter table user_library_favorites enable row level security;
create policy "favorites_select_own" on user_library_favorites
  for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on user_library_favorites
  for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on user_library_favorites
  for delete using (auth.uid() = user_id);
```

### user_library_progress

```sql
create table user_library_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references library_videos(id) on delete cascade,
  progress_percent integer default 0 check (progress_percent between 0 and 100),
  completed boolean default false,        -- True when progress >= 80%
  last_watched_at timestamptz default now(),
  completed_at timestamptz,               -- Set when completed becomes true
  unique(user_id, video_id)
);

-- Index for fast lookup
create index idx_library_progress_user on user_library_progress(user_id);

-- RLS: users see and manage only their own
alter table user_library_progress enable row level security;
create policy "progress_select_own" on user_library_progress
  for select using (auth.uid() = user_id);
create policy "progress_upsert_own" on user_library_progress
  for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on user_library_progress
  for update using (auth.uid() = user_id);
```

### Admin Management

Library videos are managed directly in Supabase. Ryan or an admin adds/edits videos through:
- **Option A: Supabase Dashboard** — direct table editing (functional, not pretty)
- **Option B: Admin page** — a simple admin UI at `/learn/admin/library` (auth-gated to admin role) with forms for CRUD operations
- **Option C: Seed script** — a data seed file for initial load, then Supabase Dashboard for ongoing management

**Recommendation for launch:** Option A (Supabase Dashboard) for initial load and management. Build Option B as a Phase 3 enhancement if editing frequency warrants it. This avoids building admin UI before you know how often you'll be adding videos.

---

## API Routes

### GET — Fetch videos (with optional user state)

No custom API route needed. Use Supabase client queries directly in server components:

```typescript
// Fetch all published library videos
const { data: videos } = await supabase
  .from('library_videos')
  .select('*')
  .eq('is_published', true)
  .order('sort_order', { ascending: true });

// If user is authenticated, also fetch their favorites and progress
const { data: favorites } = await supabase
  .from('user_library_favorites')
  .select('video_id')
  .eq('user_id', userId);

const { data: progress } = await supabase
  .from('user_library_progress')
  .select('video_id, progress_percent, completed')
  .eq('user_id', userId);
```

### POST — Toggle favorite

```typescript
// app/api/library/favorite/route.ts
// POST { video_id: string, action: 'add' | 'remove' }

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { video_id, action } = await request.json();

  if (action === 'add') {
    await supabase
      .from('user_library_favorites')
      .upsert({ user_id: user.id, video_id });
  } else {
    await supabase
      .from('user_library_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('video_id', video_id);
  }

  return NextResponse.json({ success: true });
}
```

### POST — Update progress

```typescript
// app/api/library/progress/route.ts
// POST { video_id: string, progress_percent: number }

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { video_id, progress_percent } = await request.json();
  const completed = progress_percent >= 80;

  await supabase
    .from('user_library_progress')
    .upsert({
      user_id: user.id,
      video_id,
      progress_percent,
      completed,
      last_watched_at: new Date().toISOString(),
      completed_at: completed ? new Date().toISOString() : null,
    }, {
      onConflict: 'user_id,video_id',
    });

  return NextResponse.json({ success: true });
}
```

---

## i18n Strings

Add to `messages/en.json`:

```json
{
  "library": {
    "title": "The HonuVibe Library",
    "subtitle": "Quick tutorials. Real skills. No fluff.",
    "meta_title": "AI Tutorial Library — Quick-Learn Videos | HonuVibe",
    "meta_description": "Short, practical AI tutorials you can finish in under 10 minutes. Learn Cursor, Claude, automation, image generation, and more.",
    "search_placeholder": "Search tutorials...",
    "filter_all": "All",
    "filter_ai_basics": "AI Basics",
    "filter_coding_tools": "Coding Tools",
    "filter_business_automation": "Business Automation",
    "filter_image_video": "Image & Video",
    "filter_productivity": "Productivity",
    "filter_getting_started": "Getting Started",
    "duration_label": "{minutes} min",
    "open_badge": "Free",
    "account_badge": "Free Account",
    "watch_video": "Watch",
    "favorited": "Favorited",
    "favorite": "Favorite",
    "viewed": "Viewed",
    "featured_label": "Featured",
    "related_videos": "Related Tutorials",
    "related_course": "Want to go deeper?",
    "related_resource": "Tool Featured",
    "related_glossary": "Terms Explained",
    "auth_gate_heading": "Create a free account to watch",
    "auth_gate_sub": "Get access to the full tutorial library, save favorites, and track your progress.",
    "auth_gate_button": "Sign Up Free",
    "auth_gate_login": "Already have an account? Log in",
    "cta_heading": "Ready to go beyond tutorials?",
    "cta_sub": "Our courses give you the full system — not just the quick wins.",
    "cta_button": "Explore Courses",
    "empty_state": "No tutorials match that filter. Try a different category.",
    "my_library": "My Library",
    "my_favorites": "Favorites",
    "my_recent": "Recently Watched",
    "my_library_empty": "You haven't watched or favorited any tutorials yet. Start exploring!",
    "continue_watching": "Continue Watching"
  }
}
```

Add to `messages/ja.json`:

```json
{
  "library": {
    "title": "HonuVibeライブラリ",
    "subtitle": "短くて実践的なチュートリアル。すぐに使えるスキル。",
    "meta_title": "AIチュートリアルライブラリ — 短時間動画レッスン | HonuVibe",
    "meta_description": "10分以内で完了する実践的なAIチュートリアル。Cursor、Claude、自動化、画像生成などを学べます。",
    "search_placeholder": "チュートリアルを検索...",
    "filter_all": "すべて",
    "filter_ai_basics": "AI基礎",
    "filter_coding_tools": "コーディングツール",
    "filter_business_automation": "ビジネス自動化",
    "filter_image_video": "画像・動画",
    "filter_productivity": "生産性",
    "filter_getting_started": "はじめに",
    "duration_label": "{minutes}分",
    "open_badge": "無料",
    "account_badge": "無料アカウント",
    "watch_video": "見る",
    "favorited": "お気に入り済",
    "favorite": "お気に入り",
    "viewed": "視聴済",
    "featured_label": "おすすめ",
    "related_videos": "関連チュートリアル",
    "related_course": "もっと深く学びたいですか？",
    "related_resource": "紹介ツール",
    "related_glossary": "解説用語",
    "auth_gate_heading": "無料アカウントを作成して視聴",
    "auth_gate_sub": "チュートリアルライブラリへのフルアクセス、お気に入り保存、進捗管理が可能です。",
    "auth_gate_button": "無料で登録",
    "auth_gate_login": "アカウントをお持ちの方はログイン",
    "cta_heading": "チュートリアルの先へ進みたいですか？",
    "cta_sub": "HonuVibeのコースでは、クイックヒントだけでなく、体系的な学びを提供します。",
    "cta_button": "コースを見る",
    "empty_state": "該当するチュートリアルが見つかりません。別のカテゴリをお試しください。",
    "my_library": "マイライブラリ",
    "my_favorites": "お気に入り",
    "my_recent": "最近視聴",
    "my_library_empty": "まだチュートリアルを視聴・お気に入りしていません。ライブラリを探索してみましょう！",
    "continue_watching": "続きを見る"
  }
}
```

---

## File Structure

```
app/
├── [locale]/
│   ├── learn/
│   │   ├── library/
│   │   │   ├── page.tsx                # Library video index
│   │   │   └── [slug]/
│   │   │       └── page.tsx            # Individual video page
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Updated: add "My Library" tab/section

├── api/
│   ├── library/
│   │   ├── favorite/
│   │   │   └── route.ts               # Toggle favorite (POST)
│   │   └── progress/
│   │       └── route.ts               # Update progress (POST)

components/
├── library/
│   ├── LibraryVideoCard.tsx            # Card for index page
│   ├── LibraryPlayer.tsx               # Video player wrapper with progress tracking
│   ├── LibraryFilter.tsx               # Search + category filter (client component)
│   ├── FavoriteButton.tsx              # Heart toggle (client component)
│   ├── ViewedBadge.tsx                 # Checkmark overlay for viewed videos
│   ├── AccessGate.tsx                  # Auth gate overlay for free_account videos
│   ├── RelatedVideos.tsx               # Related video cards section
│   └── MyLibrarySection.tsx            # Dashboard "My Library" tab content
```

---

## Page Implementation: Library Index

### `app/[locale]/learn/library/page.tsx`

```
Data fetching: Server component. 
- Fetch all published library videos from Supabase
- If user authenticated: also fetch their favorites and progress in parallel
- Merge user state into video data before passing to client components
ISR: Not applicable (Supabase queries are dynamic). Use caching strategy appropriate to your setup.
```

**Page structure (top to bottom):**

1. **SectionHeading**
   - Overline: "LIBRARY" / "ライブラリ"
   - Heading: `t('library.title')`
   - Sub: `t('library.subtitle')`

2. **LibraryFilter** (client component)
   - Search input + category filter pills in a single row
   - Search: text input, filters by title, description, and tags
   - Category pills: All | AI Basics | Coding Tools | Business Automation | Image & Video | Productivity | Getting Started
   - Both filters apply simultaneously (search within category)
   - Client-side filtering (all video data is already loaded)

3. **Featured row** (only if any videos have `is_featured: true`)
   - Label: `t('library.featured_label')`
   - Horizontal scroll on mobile, 3-column grid on desktop
   - Uses `LibraryVideoCard` with highlight border

4. **Video grid**
   - Filtered by active category and search query
   - 1-column mobile, 2-column tablet (md), 3-column desktop (xl)
   - Each video rendered as `LibraryVideoCard`
   - Cards show user state (favorite heart, viewed checkmark) only when authenticated
   - Cards for `free_account` tier show a subtle lock icon when user is not authenticated
   - If filter returns 0 results: show `t('library.empty_state')`

5. **CTAStrip** (existing component)
   - Heading: `t('library.cta_heading')`
   - Sub: `t('library.cta_sub')`
   - Button: `t('library.cta_button')` → `/learn`

---

## Page Implementation: Individual Video

### `app/[locale]/learn/library/[slug]/page.tsx`

```
Data fetching: Server component.
- Fetch video by slug from Supabase
- If user authenticated: fetch favorite status and progress for this video
- Fetch 3 related videos (same category, excluding current)
- 404 if video not found or not published
```

**Access check logic:**

```
IF video.access_tier === 'open':
  → Show video player to everyone

IF video.access_tier === 'free_account':
  IF user is authenticated:
    → Show video player
  ELSE:
    → Show AccessGate overlay (thumbnail visible behind blur, signup prompt in front)
```

**Page structure (top to bottom):**

1. **Back link**
   - "← Back to Library" → `/learn/library`
   - `text-sm`, `fg-secondary`, hover `accent-teal`

2. **Video player area**
   - If accessible: `LibraryPlayer` component with full video
   - If gated: `AccessGate` component over blurred thumbnail
   - Player takes full content width on all breakpoints
   - Aspect ratio: 16:9

3. **Video metadata** (below player)
   - Title: `font-serif`, `text-h2`, `fg-primary`
   - Metadata row: duration badge + category tag + difficulty badge + language badge
   - If authenticated: `FavoriteButton` aligned right of title
   - Description: `text-base`, `fg-secondary`, full text (no clamp on detail page)

4. **Related content section** (only if related fields are populated)
   - **Related course** (if `related_course_id`): Course card with "Want to go deeper?" heading and enroll CTA
   - **Related resource** (if `related_resource_slug`): Link to Resources page tool
   - **Related glossary terms** (if `related_glossary_slugs`): Linked term chips (same component as Glossary)

5. **RelatedVideos** (3 videos from same category)
   - Heading: `t('library.related_videos')`
   - 1-column mobile, 3-column desktop
   - Uses `LibraryVideoCard`

6. **NewsletterSubscribeBlock** (reuse existing component)
   - Catch viewers who just finished a video — high-intent moment for subscription

7. **CTAStrip**
   - Same as index page

---

## Component Specifications

### LibraryVideoCard

```
File: components/library/LibraryVideoCard.tsx
Type: Server component (user state passed as props)
```

**Visual structure:**

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │         THUMBNAIL               ││
│  │                                 ││
│  │  [4 min]            [✓ Viewed]  ││
│  └─────────────────────────────────┘│
│                                     │
│  Setting Up Cursor with Claude      │
│  Coding Tools · Beginner    [♡/♥]   │
└─────────────────────────────────────┘
```

**Props:**

```typescript
interface LibraryVideoCardProps {
  id: string;
  slug: string;
  title: string;                    // Locale-resolved by parent
  description: string;              // Locale-resolved by parent
  thumbnailUrl?: string;
  durationSeconds: number;
  category: string;
  difficulty: string;
  language: string;
  accessTier: 'open' | 'free_account';
  isFeatured?: boolean;
  // User state (null if not authenticated)
  isFavorited?: boolean;
  isViewed?: boolean;
  progressPercent?: number;
  // Context
  locale: string;
  isAuthenticated: boolean;
}
```

**Styling:**
- Container: `bg-secondary`, `border border-primary`, `rounded-lg`, overflow hidden, hover: `border-hover` + `shadow-sm`
- If `isFeatured`: `border-accent` highlight
- Thumbnail: aspect-ratio 16:9, `object-cover`, `rounded-t-lg`
  - Duration badge: bottom-left of thumbnail, `bg-black/70`, `text-white`, `text-xs`, `px-2 py-1`, `rounded`
  - If `isViewed`: checkmark badge bottom-right, `accent-teal` bg, white check icon
  - If `accessTier === 'free_account'` and not authenticated: subtle lock icon overlay on thumbnail
  - If `progressPercent > 0 && progressPercent < 80`: thin progress bar at bottom of thumbnail, `accent-teal`, width = progressPercent%
- Title: `font-sans`, `text-sm`, `font-medium`, `fg-primary`, 2-line clamp, `px-4 pt-3`
- Metadata row: `px-4 pb-4`, `flex items-center justify-between`
  - Left: category tag + difficulty badge, `text-xs`, `fg-tertiary`
  - Right: `FavoriteButton` (only if authenticated), or access tier badge (if not authenticated)
- Entire card is a link to `/learn/library/[slug]`

**Duration formatting helper:**

```typescript
function formatDuration(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}
```

### LibraryPlayer

```
File: components/library/LibraryPlayer.tsx
Type: Client component ("use client" — handles video events)
```

Wraps your MUX or Vimeo player with progress tracking.

**Props:**

```typescript
interface LibraryPlayerProps {
  videoUrl: string;
  videoId: string;                  // library_videos.id for progress API
  title: string;
  isAuthenticated: boolean;
}
```

**Behavior:**
- Renders the MUX Player or Vimeo embed (same component/approach as your course player)
- If authenticated: tracks playback progress
  - On `timeupdate` events (throttled to every 10 seconds): calculate percent = currentTime / duration * 100
  - When percent crosses 25%, 50%, 75%, 80% thresholds: POST to `/api/library/progress`
  - At 80%: mark as completed (fires `library_video_complete` analytics event)
  - On page unload/navigate away: send final progress update via `navigator.sendBeacon` or a final API call
- If not authenticated: video plays normally with no tracking
- Keyboard accessible: space to pause, arrow keys to scrub
- Mobile: native player controls, no custom overlay

### FavoriteButton

```
File: components/library/FavoriteButton.tsx
Type: Client component ("use client")
```

**Props:**

```typescript
interface FavoriteButtonProps {
  videoId: string;
  isFavorited: boolean;
  isAuthenticated: boolean;
  locale: string;
}
```

**Behavior:**
- Heart icon: outline when not favorited, filled when favorited
- Click: optimistic UI update (toggle immediately), then POST to `/api/library/favorite`
- If API fails: revert the toggle, show subtle error (toast or shake animation)
- If not authenticated: don't render (parent component handles this)
- Touch target: 44×44px minimum
- `aria-label`: "Add to favorites" / "Remove from favorites" (localized)
- Fires `library_favorite` analytics event on toggle

### AccessGate

```
File: components/library/AccessGate.tsx
Type: Client component
```

**Props:**

```typescript
interface AccessGateProps {
  thumbnailUrl?: string;
  videoTitle: string;
  locale: string;
  translations: {
    heading: string;
    sub: string;
    button: string;
    login: string;
  };
}
```

**Visual structure:**

```
┌─────────────────────────────────────────────┐
│                                             │
│          [Blurred thumbnail]                │
│                                             │
│    ┌─────────────────────────────────┐      │
│    │  Create a free account to watch │      │
│    │                                 │      │
│    │  Get access to the full         │      │
│    │  tutorial library, save         │      │
│    │  favorites, and track progress. │      │
│    │                                 │      │
│    │     [ Sign Up Free ]            │      │
│    │                                 │      │
│    │  Already have an account? Log in│      │
│    └─────────────────────────────────┘      │
│                                             │
└─────────────────────────────────────────────┘
```

**Styling:**
- Container: relative, aspect-ratio 16:9
- Thumbnail: `blur-sm`, `brightness-50`, fills container
- Overlay: centered card, `bg-secondary`, `border border-primary`, `rounded-lg`, `p-6`, `shadow-lg`, `max-w-sm`
- Heading: `font-serif`, `text-h3`, `fg-primary`
- Sub: `text-sm`, `fg-secondary`, `mt-2`
- Sign Up button: existing `Button` component, `variant="primary"`, `mt-4`
- Login link: `text-sm`, `accent-teal`, `mt-3`
- Sign Up links to your auth signup page (e.g., `/learn/auth/signup?redirect=/learn/library/[current-slug]`)
- Login links to your auth login page with the same redirect
- Fires `access_gate_shown` analytics event on mount

### ViewedBadge

```
File: components/library/ViewedBadge.tsx
Type: Server component
```

Simple checkmark indicator overlaid on the video thumbnail.

**Styling:**
- Position: absolute, bottom-right of thumbnail
- Container: `bg-accent-teal`, `rounded-full`, `w-6 h-6`, `flex items-center justify-center`
- Check icon: white, 14px, Lucide `Check` icon
- `aria-label`: "Watched"

### RelatedVideos

```
File: components/library/RelatedVideos.tsx
Type: Server component
```

**Props:**

```typescript
interface RelatedVideosProps {
  videos: LibraryVideoCardProps[];  // 3 videos from same category
  heading: string;
  locale: string;
}
```

Renders a simple grid of 3 `LibraryVideoCard` components with a heading.

### MyLibrarySection

```
File: components/library/MyLibrarySection.tsx
Type: Server component (data fetched at dashboard page level)
```

This is added to the existing student dashboard page (`/learn/dashboard`).

**Data:** Fetch from Supabase:
- User's favorites (join with library_videos for full video data)
- User's progress entries ordered by `last_watched_at` desc

**Sections:**
1. **Continue Watching** — videos with `progress_percent > 0 && completed === false`, ordered by `last_watched_at` desc. Shows progress bar on cards.
2. **Favorites** — all favorited videos, ordered by `created_at` desc
3. **Recently Watched** — all viewed videos, ordered by `last_watched_at` desc, limit 10

Each section uses `LibraryVideoCard` in a horizontal scroll (mobile) or 3-column grid (desktop).

If no data in any section: show `t('library.my_library_empty')` with a CTA to explore the Library.

---

## SEO & Metadata

### Library Index

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'library' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: locale === 'en' ? '/learn/library' : '/ja/learn/library',
      languages: { en: '/learn/library', ja: '/ja/learn/library' },
    },
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
      url: locale === 'en' ? '/learn/library' : '/ja/learn/library',
      locale: locale === 'en' ? 'en_US' : 'ja_JP',
      type: 'website',
    },
  };
}
```

### Individual Video

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const video = await getLibraryVideoBySlug(slug);

  if (!video) return {};

  const title_resolved = locale === 'en' ? video.title_en : (video.title_jp || video.title_en);
  const desc_resolved = locale === 'en' ? video.description_en : (video.description_jp || video.description_en);

  return {
    title: `${title_resolved} — AI Tutorial | HonuVibe`,
    description: desc_resolved,
    alternates: {
      canonical: locale === 'en' ? `/learn/library/${slug}` : `/ja/learn/library/${slug}`,
      languages: {
        en: `/learn/library/${slug}`,
        ja: `/ja/learn/library/${slug}`,
      },
    },
    openGraph: {
      title: `${title_resolved} — AI Tutorial | HonuVibe`,
      description: desc_resolved,
      url: locale === 'en' ? `/learn/library/${slug}` : `/ja/learn/library/${slug}`,
      locale: locale === 'en' ? 'en_US' : 'ja_JP',
      type: 'video.other',
      images: video.thumbnail_url ? [{ url: video.thumbnail_url }] : undefined,
    },
  };
}
```

### JSON-LD

**Index page** — `CollectionPage`:

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: t('title'),
  description: t('subtitle'),
  url: `https://honuvibe.ai${locale === 'en' ? '/learn/library' : '/ja/learn/library'}`,
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://honuvibe.ai' },
      { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://honuvibe.ai/learn' },
      { '@type': 'ListItem', position: 3, name: t('title') },
    ],
  },
};
```

**Video page** — `VideoObject` (enables video rich results in Google):

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VideoObject',
  name: title_resolved,
  description: desc_resolved,
  thumbnailUrl: video.thumbnail_url,
  duration: `PT${Math.ceil(video.duration_seconds / 60)}M`,
  uploadDate: video.published_at,
  contentUrl: video.video_url,
  embedUrl: video.video_url,
  publisher: {
    '@type': 'Organization',
    name: 'HonuVibe.AI',
    url: 'https://honuvibe.ai',
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://honuvibe.ai' },
      { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://honuvibe.ai/learn' },
      { '@type': 'ListItem', position: 3, name: locale === 'en' ? 'Library' : 'ライブラリ', item: `https://honuvibe.ai${locale === 'en' ? '/learn/library' : '/ja/learn/library'}` },
      { '@type': 'ListItem', position: 4, name: title_resolved },
    ],
  },
};
```

### Sitemap

Add to `app/sitemap.ts`:

```typescript
// Library index
{
  url: 'https://honuvibe.ai/learn/library',
  lastModified: new Date(),
  alternates: {
    languages: { en: 'https://honuvibe.ai/learn/library', ja: 'https://honuvibe.ai/ja/learn/library' },
  },
},

// Individual video pages (fetch slugs from Supabase)
...libraryVideoSlugs.map((slug: string) => ({
  url: `https://honuvibe.ai/learn/library/${slug}`,
  lastModified: new Date(),
  alternates: {
    languages: {
      en: `https://honuvibe.ai/learn/library/${slug}`,
      ja: `https://honuvibe.ai/ja/learn/library/${slug}`,
    },
  },
})),
```

**Note:** Only `open` access tier videos should be in the sitemap. `free_account` videos can be included (the page is public, only the player is gated), but ensure the page renders meaningful content (title, description, thumbnail) for crawlers even when the video is gated.

---

## Analytics Events

| Event | Trigger | Props |
|---|---|---|
| `library_index_view` | Index page load | `locale`, `video_count` |
| `library_video_view` | Individual video page load | `video_slug`, `category`, `difficulty`, `access_tier`, `locale` |
| `library_video_play` | Video play starts | `video_slug`, `category`, `locale` |
| `library_video_complete` | 80% progress reached | `video_slug`, `category`, `locale` |
| `library_favorite` | Favorite toggled | `video_slug`, `action` (add/remove), `locale` |
| `library_filter` | Category filter changed | `category`, `locale` |
| `library_search` | Search input used (debounced) | `search_query`, `results_count`, `locale` |
| `access_gate_shown` | Auth gate displayed | `video_slug`, `locale` |
| `access_gate_signup` | User clicks signup from gate | `video_slug`, `locale` |
| `library_related_click` | Related video clicked | `source_slug`, `target_slug`, `locale` |
| `library_course_click` | "Want to go deeper?" course link | `video_slug`, `course_slug`, `locale` |
| `library_cta_click` | Bottom "Explore Courses" CTA | `locale` |

---

## Mobile Behavior

| Element | Mobile (default) | Tablet (md) | Desktop (xl) |
|---|---|---|---|
| Search input | Full width | `max-w-sm` left-aligned | `max-w-sm` left-aligned |
| Filter pills | Horizontal scroll | Inline with search | Inline with search |
| Featured row | Horizontal scroll strip | 2-column grid | 3-column grid |
| Video grid | 1-column stack | 2-column grid | 3-column grid |
| Video player | Full width, 16:9 | Full width, 16:9 | `max-w-content`, 16:9 |
| Access gate overlay | Full width with centered card | Same | Same |
| Favorite button | In metadata row of card | Same | Same |
| Related videos | Horizontal scroll | 3-column grid | 3-column grid |
| My Library (dashboard) | Horizontal scroll per section | 2-column grid | 3-column grid |

- All touch targets 44×44px minimum
- Video player uses native controls on mobile (no custom overlay)
- Search input 16px font minimum
- Thumbnail images served with mobile-specific crops via `srcset`

---

## Content: Initial Seed Videos (12–15 minimum)

Manage through Supabase Dashboard. Each video requires: slug, title_en, description_en, video_url, thumbnail_url, duration_seconds, category, access_tier.

### Suggested Launch Batch

| # | Title | Category | Access | Duration |
|---|---|---|---|---|
| 1 | Setting Up Cursor IDE with Claude | coding-tools | open | 5 min |
| 2 | Your First AI Chat — Claude vs ChatGPT vs Gemini | ai-basics | open | 6 min |
| 3 | Using AI Image Generators (Midjourney / DALL-E) | image-video | open | 7 min |
| 4 | How to Write Better Prompts | ai-basics | open | 5 min |
| 5 | AI Tools for Small Business — Where to Start | getting-started | open | 6 min |
| 6 | Connecting Claude to Google Sheets | business-automation | free_account | 5 min |
| 7 | Building Your First Automation with N8N | business-automation | free_account | 7 min |
| 8 | AI for Email Writing — Templates That Work | productivity | free_account | 4 min |
| 9 | Setting Up a Free Supabase Database | coding-tools | free_account | 5 min |
| 10 | Deploying a Website on Vercel in 5 Minutes | coding-tools | free_account | 5 min |
| 11 | Using AI for Social Media Content | productivity | free_account | 5 min |
| 12 | Introduction to MCP (Model Context Protocol) | ai-basics | free_account | 6 min |
| 13 | AI Video Generation with Runway | image-video | free_account | 6 min |
| 14 | Automating Client Onboarding with AI | business-automation | free_account | 7 min |
| 15 | From Idea to Prototype — AI-Powered Building | getting-started | free_account | 7 min |

**Rule of thumb:** Keep 5–8 videos as `open` (roughly 1/3). These are your SEO and social traffic hooks. Make them the most universally appealing topics — the ones most likely to get searched and shared.

**Post-launch cadence:** 1 new video per week minimum.

---

## Video Production Notes

Not a dev concern, but relevant to the feature:

- **Length:** 3–7 minutes. Hard cap at 10 minutes. If it's longer, split into two videos.
- **Thumbnails:** Custom-designed, not auto-generated frames. Consistent brand style. Show the tool/interface being demonstrated.
- **Format:** Screen recording with voiceover is the primary format. Talking head intro/outro optional.
- **Hosting:** Same MUX or Vimeo setup as courses. Do NOT use YouTube embeds — you lose control over recommendations, ads, and tracking.
- **Subtitles:** EN subtitles on all videos. JP subtitles as a V2 enhancement.

---

## Acceptance Criteria

- [ ] Supabase tables created: `library_videos`, `user_library_favorites`, `user_library_progress`
- [ ] RLS policies applied and tested for all three tables
- [ ] API routes: `/api/library/favorite` and `/api/library/progress` working and secured
- [ ] `/learn/library` index page renders with heading, filter, video grid, and CTA
- [ ] `/ja/learn/library` renders with Japanese UI strings
- [ ] `/learn/library/[slug]` renders video page with player, metadata, related content, and related videos
- [ ] `/ja/learn/library/[slug]` renders JP content where available
- [ ] Open tier videos play without any auth requirement
- [ ] Free account tier videos show AccessGate when not authenticated
- [ ] AccessGate redirects to auth with proper return URL
- [ ] After auth signup/login, user returns to the video and can play it
- [ ] FavoriteButton toggles optimistically and persists to Supabase
- [ ] Progress tracking fires at 25%, 50%, 75%, 80% thresholds
- [ ] Videos marked as viewed (completed) at 80% progress
- [ ] ViewedBadge shows on cards for completed videos
- [ ] Progress bar shows on cards for partially-watched videos
- [ ] LibraryFilter filters by category and search simultaneously
- [ ] Empty state shows when no videos match filters
- [ ] Student dashboard includes "My Library" section with Continue Watching, Favorites, and Recently Watched
- [ ] My Library empty state shows explore CTA when no data
- [ ] `generateMetadata` produces correct SEO for both page types and both locales
- [ ] JSON-LD `VideoObject` schema on video pages
- [ ] All pages in sitemap with locale alternates
- [ ] Redirects from `/tutorials`, `/library`, `/videos` working
- [ ] All analytics events fire correctly
- [ ] Dark mode and light mode render correctly
- [ ] Minimum 12 videos loaded with correct metadata
- [ ] 5+ videos set as `open` access tier
- [ ] Lighthouse mobile score: 90+
- [ ] Video playback tested on iPhone Safari, Chrome Android, desktop Chrome/Safari

---

## Cross-Links (Active Now + Future)

### Active now — wire these up during this build:

| Source | Target | Connection |
|---|---|---|
| Library video | Course | `related_course_id` → show course card with enroll CTA |
| Library video | Resources page | `related_resource_slug` → link to tool on Resources page |
| Library video | Glossary | `related_glossary_slugs` → term chips linking to glossary pages |
| Resources page | Library video | Resources already have `relatedLibraryVideoSlug` field → "Watch Tutorial" links |
| Glossary | Library video | Glossary terms already have `relatedLibraryVideoSlug` field → "Watch Tutorial" links |

### Future — do not build now:

| Future Feature | Connection |
|---|---|
| **Templates** | Templates will have `relatedLibraryVideoSlug` showing "how to use this template" |
| **Comparisons** | Comparisons will link to Library tutorials for each tool compared |
| **Challenges** | Challenges will list Library videos as suggested learning resources |
| **Industry Pages** | Industry pages will link to relevant Library tutorials per use case |

---

*HonuVibe.AI — Feature Spec: Library v1.0 | Prepared for Ryan Jackson*

*Made in Hawaii with Aloha 🐢*
