# HonuVibe.AI — Phase 2C Build Specification
## Self-Study Mode & AI Path Generation
**Build-Ready Engineering Blueprint | v1.0**
*Weeks 13–16 | Freemium Growth Engine*

---

## Overview

Phase 2C introduces self-study — personalized, AI-curated learning paths assembled from the content library built in Phase 2B. This is the freemium growth engine: free users get access to paths built from free content, premium subscribers unlock the full library and deeper paths.

### What Ships in Phase 2C

1. Student intake flow (goal description, preferences)
2. AI path generation via Claude API
3. Self-study dashboard with personalized curriculum
4. Progress tracking (item-level completion)
5. Stripe subscription for premium library access
6. Path regeneration and adjustment
7. Public "Start Learning" entry point tied to marketing funnel

### Dependencies

- Phase 2A complete (auth, enrollment, Stripe infrastructure)
- Phase 2B complete (content library with 30+ tagged items)
- Claude API integration already proven via course.md parser (Phase 2A)

### Architecture Principle

The intelligence is NOT in a complex recommendation engine. It's in:
1. A well-tagged content library (Phase 2B)
2. A well-crafted Claude prompt that understands learning progression
3. A clean student interface that makes self-directed learning feel guided

---

## 1. Database Schema

### 1.1 User Subscription (Extend Users Table)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free'
  CHECK (subscription_tier IN ('free', 'premium'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_stripe_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none'
  CHECK (subscription_status IN ('none', 'active', 'past_due', 'cancelled', 'trialing'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;
```

### 1.2 Study Paths

```sql
CREATE TABLE study_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,

  -- What the student asked for
  goal_description text NOT NULL,                  -- Free text from student intake
  difficulty_preference text DEFAULT 'beginner'
    CHECK (difficulty_preference IN ('beginner', 'intermediate', 'advanced')),
  language_preference text DEFAULT 'en'
    CHECK (language_preference IN ('en', 'ja')),
  focus_areas jsonb,                               -- Tags selected by student: ["prompting", "business-ai"]

  -- Generated path metadata
  title_en text,                                   -- AI-generated title for the path
  title_jp text,
  description_en text,                             -- AI-generated summary of the path
  description_jp text,
  estimated_hours numeric(4,1),                    -- Total estimated time
  total_items integer,                             -- Total content items in path
  free_items integer,                              -- How many are free tier
  premium_items integer,                           -- How many require premium

  -- Status
  status text DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived', 'regenerating')),

  -- AI generation metadata
  generation_model text,                           -- e.g., "claude-sonnet-4-20250514"
  generation_prompt_version text,                   -- Track prompt iterations

  generated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_accessed_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_study_paths_user ON study_paths (user_id);
CREATE INDEX idx_study_paths_status ON study_paths (status);
```

### 1.3 Study Path Items

```sql
CREATE TABLE study_path_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid REFERENCES study_paths(id) ON DELETE CASCADE,
  content_item_id uuid REFERENCES content_items(id) ON DELETE CASCADE,

  sort_order integer NOT NULL,

  -- AI-generated context for why this item is in the path
  rationale_en text,                               -- "This video introduces the fundamentals you'll need..."
  rationale_jp text,

  -- What to focus on / learning objective for this item
  learning_focus_en text,                          -- "Pay attention to the section on system prompts"
  learning_focus_jp text,

  -- Progress
  is_completed boolean DEFAULT false,
  completed_at timestamptz,

  -- Denormalized for quick rendering (avoid joins)
  item_title_en text,
  item_content_type text,
  item_access_tier text,
  item_duration_minutes integer,

  created_at timestamptz DEFAULT now(),

  UNIQUE(path_id, content_item_id)
);

CREATE INDEX idx_path_items_path ON study_path_items (path_id, sort_order);
```

### 1.4 Path Generation Log (Debugging & Iteration)

```sql
CREATE TABLE path_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid REFERENCES study_paths(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),

  -- Request
  goal_description text,
  preferences jsonb,                               -- { difficulty, language, focus_areas }
  content_catalog_size integer,                    -- How many items were sent to Claude
  prompt_version text,

  -- Response
  raw_response text,                               -- Claude's raw JSON response
  parsed_successfully boolean,
  items_generated integer,
  generation_time_ms integer,

  -- Cost tracking (optional)
  input_tokens integer,
  output_tokens integer,

  created_at timestamptz DEFAULT now()
);
```

### 1.5 Row-Level Security

```sql
-- Study paths: users see only their own
ALTER TABLE study_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paths_own" ON study_paths
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "paths_admin_read" ON study_paths
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Path items: users see only items in their own paths
ALTER TABLE study_path_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "path_items_own" ON study_path_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM study_paths WHERE study_paths.id = study_path_items.path_id AND study_paths.user_id = auth.uid())
  );

-- Generation logs: admin only
ALTER TABLE path_generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gen_logs_admin" ON path_generation_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

---

## 2. AI Path Generation

### 2.1 Generation Flow

```
Student fills intake form
  → POST /api/learn/paths/generate
  → API queries content library for all published items matching language
  → API filters by tier (free items for free users, all for premium)
  → Builds content catalog summary (metadata only — not full content)
  → Sends to Claude API with generation prompt
  → Claude returns ordered curriculum with rationale
  → API validates response, creates study_path + study_path_items
  → Returns path to frontend
  → Student sees their personalized learning dashboard
```

### 2.2 Content Catalog Preparation

Before sending to Claude, prepare a compact catalog of available content:

```typescript
// lib/paths/catalog.ts

interface CatalogItem {
  id: string;
  title: string;
  type: string;          // video_youtube, article, tool, etc.
  difficulty: string;
  tags: string[];
  duration_minutes: number | null;
  description: string;   // Truncated to ~100 chars
  source: string;
  tier: string;          // free or premium
}

async function buildCatalog(
  language: string,
  userTier: 'free' | 'premium'
): Promise<CatalogItem[]> {
  let query = supabase
    .from('content_items')
    .select('id, title_en, title_jp, content_type, difficulty_level, tags, duration_minutes, description_en, description_jp, source, access_tier')
    .eq('is_published', true);

  // For free users, only include free content
  if (userTier === 'free') {
    query = query.eq('access_tier', 'free');
  }

  const { data } = await query;

  return data.map(item => ({
    id: item.id,
    title: language === 'ja' && item.title_jp ? item.title_jp : item.title_en,
    type: item.content_type,
    difficulty: item.difficulty_level,
    tags: item.tags || [],
    duration_minutes: item.duration_minutes,
    description: (language === 'ja' && item.description_jp ? item.description_jp : item.description_en || '').substring(0, 150),
    source: item.source,
    tier: item.access_tier,
  }));
}
```

### 2.3 Claude Generation Prompt

```typescript
// lib/paths/prompt.ts

const GENERATION_PROMPT_VERSION = 'v1.0';

function buildGenerationPrompt(
  goal: string,
  difficulty: string,
  language: string,
  focusAreas: string[],
  catalog: CatalogItem[],
  userTier: string
): string {
  return `You are a curriculum designer for HonuVibe.AI, a Hawaii-based AI education platform.

A student has described what they want to learn. Your job is to assemble a personalized study path from the available content library.

STUDENT PROFILE:
- Goal: "${goal}"
- Difficulty level: ${difficulty}
- Preferred language: ${language === 'ja' ? 'Japanese' : 'English'}
- Focus areas: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'not specified'}
- Subscription tier: ${userTier}

AVAILABLE CONTENT LIBRARY (${catalog.length} items):
${JSON.stringify(catalog, null, 2)}

INSTRUCTIONS:
1. Select 8-15 items from the library that form a logical learning progression for this student's goal.
2. Order them from foundational to advanced — the student should build knowledge sequentially.
3. For each selected item, provide:
   - A brief rationale for why it's included (1-2 sentences)
   - A learning focus note — what specifically to pay attention to (1 sentence)
4. Generate a title and description for the overall study path.
5. Do not include items whose difficulty is significantly above the student's level unless they build naturally from easier items.
6. Prefer a mix of content types (videos, articles, tools) for varied learning.
7. If the student specified focus areas, weight heavily toward content tagged with those areas.
8. If there aren't enough items to build a good path, include what you can and note the gap.

${userTier === 'free' ? 'NOTE: This student is on the free tier. All items in the catalog are accessible to them.' : 'NOTE: This student has premium access. Include the best content regardless of tier, but try to start with a few free items so they can begin immediately.'}

Return ONLY valid JSON with this exact structure:
{
  "title_en": "string — path title in English",
  "title_jp": "string — path title in Japanese (translate the English title)",
  "description_en": "string — 2-3 sentence summary of what this path covers, in English",
  "description_jp": "string — same summary in Japanese",
  "estimated_hours": number,
  "items": [
    {
      "content_item_id": "uuid from the catalog",
      "sort_order": 1,
      "rationale_en": "string — why this item is included, in English",
      "rationale_jp": "string — same in Japanese",
      "learning_focus_en": "string — what to focus on, in English",
      "learning_focus_jp": "string — same in Japanese"
    }
  ],
  "gaps": "string or null — if the library doesn't fully cover the student's goal, describe what's missing"
}`;
}
```

### 2.4 Generation API Route

```
POST /api/learn/paths/generate/route.ts
```

```typescript
// Pseudocode:
// 1. Verify authenticated user
// 2. Receive { goal_description, difficulty_preference, language_preference, focus_areas }
// 3. Validate: goal_description is non-empty, <= 500 chars
// 4. Rate limit: max 3 path generations per user per day (prevent abuse)
// 5. Build content catalog for user's tier
// 6. If catalog has < 5 items: return error "Not enough content available yet"
// 7. Build Claude prompt with catalog + student preferences
// 8. Call Anthropic API:
//    - model: "claude-sonnet-4-20250514"
//    - system: generation prompt
//    - max_tokens: 4000
//    - temperature: 0.3 (deterministic but not rigid)
// 9. Parse response as JSON
// 10. Validate: items array exists, all content_item_ids exist in catalog
// 11. Create study_path record
// 12. Create study_path_items records (with denormalized fields from content_items)
// 13. Save generation log
// 14. Return { path_id, path_data }
```

### 2.5 Path Regeneration

Students can regenerate their path if it doesn't fit. This creates a new path (doesn't modify the old one).

```
POST /api/learn/paths/[id]/regenerate/route.ts
```

```typescript
// 1. Verify user owns the path
// 2. Archive current path (status = 'archived')
// 3. Use same goal/preferences but fresh Claude call
// 4. If student provided feedback: append to goal_description
//    e.g., "Original goal: ... | Feedback: I want more focus on prompting, less on tools"
// 5. Generate new path following same flow as §2.4
// 6. Return new path
```

---

## 3. Stripe Subscription

### 3.1 Premium Subscription Product

Create in Stripe:
- **Product:** "HonuVibe Premium Library"
- **Price (USD):** $29/month recurring
- **Price (JPY):** ¥3,980/month recurring
- **Trial:** 7-day free trial (optional — discuss with Ryan)

### 3.2 Subscription Checkout

```
POST /api/stripe/subscribe/route.ts
```

```typescript
// 1. Verify authenticated user
// 2. Receive { currency: 'usd' | 'jpy' }
// 3. Get or create Stripe customer
// 4. Create Stripe Checkout Session:
//    - mode: 'subscription'
//    - line_items: [{ price: premiumPriceId, quantity: 1 }]
//    - success_url: /learn/dashboard?subscribed=true
//    - cancel_url: /learn/library
//    - metadata: { user_id }
// 5. Return { checkout_url }
```

### 3.3 Subscription Webhook Events

Add to existing webhook handler (`/api/stripe/webhook/route.ts`):

```typescript
// Handle subscription events:
case 'customer.subscription.created':
  // Update user: subscription_tier = 'premium', subscription_status = 'active'
  // Store subscription ID
  break;

case 'customer.subscription.updated':
  // Update status (active, past_due, etc.)
  // If cancelled: set subscription_expires_at to period end
  break;

case 'customer.subscription.deleted':
  // Downgrade: subscription_tier = 'free', subscription_status = 'cancelled'
  // User retains access until subscription_expires_at
  break;

case 'invoice.payment_failed':
  // Update subscription_status = 'past_due'
  // Optional: send notification
  break;
```

### 3.4 Premium Access Check

```typescript
// lib/subscriptions/access.ts

function hasPremiamAccess(user: User): boolean {
  if (user.role === 'admin') return true;
  if (user.subscription_tier !== 'premium') return false;
  if (user.subscription_status === 'active' || user.subscription_status === 'trialing') return true;
  // Grace period: cancelled but not yet expired
  if (user.subscription_status === 'cancelled' && user.subscription_expires_at) {
    return new Date() < new Date(user.subscription_expires_at);
  }
  return false;
}
```

---

## 4. Frontend — Student Intake Flow

### 4.1 Entry Points

Students enter the self-study flow from multiple places:

1. **Content Library page** (Phase 2B): "Create Your Study Path" CTA
2. **Homepage**: "Start Learning Free" CTA
3. **Learn catalog page**: "Not sure where to start? Let AI build your path" CTA
4. **Student dashboard**: "Create New Study Path" button

### 4.2 Intake Page (`/[locale]/learn/paths/new/page.tsx`)

**Auth required.** If not logged in → redirect to `/learn/auth?redirect=/learn/paths/new`

**Design:** Clean, focused, single-purpose. Feels like the beginning of something, not a form.

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  Let's build your learning path.                       │  ← Title
│  Tell us what you want to learn, and our AI will      │  ← Subtitle
│  curate a personalized curriculum from the             │
│  HonuVibe library.                                    │
│                                                        │
│  ─── What do you want to learn? ───                   │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ I want to learn how to use AI tools to improve   │  │
│  │ my small business marketing, especially for      │  │
│  │ creating bilingual content in English and        │  │
│  │ Japanese.                                         │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
│  0/500 characters                                      │
│                                                        │
│  ─── Your experience level ───                        │
│                                                        │
│  ○ Beginner — I'm new to AI tools                     │
│  ● Intermediate — I use ChatGPT but want to go deeper │
│  ○ Advanced — I'm comfortable and want specialized    │
│    knowledge                                           │
│                                                        │
│  ─── Focus areas (optional) ───                       │
│                                                        │
│  Select topics you're most interested in:              │
│  [ Prompting ✓ ] [ Business AI ] [ Productivity ✓ ]   │
│  [ Content Creation ] [ Research ] [ Automation ]      │
│  [ Translation ] [ Ethics ] [ Career ]                 │
│                                                        │
│  ─── Language preference ───                          │
│                                                        │
│  ○ English  ○ Japanese                                │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │        [ Build My Learning Path → ]              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Free paths include free resources.                    │
│  Premium paths unlock the full library.                │
│  [ Learn about Premium → ]                            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Focus area chips** are populated from the `tags` table (category = 'topic'). This connects the student's selection to the tag system used in the content library.

### 4.3 Generation Loading State

After submitting, show a loading state while Claude generates the path:

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  🐢                                                   │
│  Building your learning path...                        │
│                                                        │
│  Our AI is curating the best resources for your        │
│  goals from the HonuVibe library.                     │
│                                                        │
│  ████████████░░░░░░░░  (animated progress bar)         │
│                                                        │
│  This usually takes about 10 seconds.                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Use the Honu mark as the loading indicator (gentle swimming animation). Time the progress bar to ~10-15 seconds based on typical Claude response time.

### 4.4 Path Preview (Post-Generation)

Show the generated path before the student commits:

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  Your Learning Path is Ready                           │
│                                                        │
│  AI-Powered Marketing for Bilingual Business           │  ← AI-generated title
│                                                        │
│  A curated path through 12 resources covering          │  ← AI-generated description
│  AI-powered content creation, bilingual workflows,     │
│  and practical marketing applications.                 │
│                                                        │
│  12 resources · ~6 hours · 8 free + 4 premium         │  ← Stats
│                                                        │
│  ┌─ Your Curriculum ──────────────────────────────┐    │
│  │                                                 │    │
│  │  1. 🎥 How AI Works — A Plain English Guide    │    │
│  │     15 min · Free · YouTube                     │    │
│  │     "Start here to build a solid foundation..." │    │
│  │                                                 │    │
│  │  2. 🎥 Prompt Engineering Basics               │    │
│  │     22 min · Free · YouTube                     │    │
│  │     "Learn the core skill that makes all..."    │    │
│  │                                                 │    │
│  │  3. 📄 10 AI Marketing Workflows That Work     │    │
│  │     Article · Free · External                   │    │
│  │     "See real examples of how businesses..."    │    │
│  │                                                 │    │
│  │  4. 🎥 Bilingual Content with Claude           │    │
│  │     🔒 30 min · Premium · HonuVibe             │    │
│  │     "This is where your bilingual goals..."     │    │
│  │                                                 │    │
│  │  ... (8 more items)                             │    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [ Start Learning → ]    [ Regenerate Path ↻ ]  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  4 items require Premium access.                       │
│  [ Upgrade to Premium — $29/mo → ]                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**"Start Learning"** saves the path and redirects to the study dashboard.
**"Regenerate Path"** opens a small feedback input: "What would you like to change?" then regenerates.

---

## 5. Frontend — Self-Study Dashboard

### 5.1 Dashboard Integration

The existing student dashboard (`/learn/dashboard`) now shows both cohort courses AND self-study paths:

```
Welcome back, [Name]

┌─ Your Courses ─────────────────────────────────────┐
│  [HVAI-101 course card — from Phase 2A]             │
└─────────────────────────────────────────────────────┘

┌─ Your Study Paths ─────────────────────────────────┐
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ AI-Powered Marketing for Bilingual Business   │  │
│  │ 12 resources · 5 of 12 completed             │  │
│  │ ██████████░░░░░░░░░░ 42%                     │  │
│  │ [ Continue → ]                                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [ + Create New Study Path ]                        │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─ Explore More ─────────────────────────────────────┐
│  [ Browse Content Library → ]                       │
│  [ View Available Courses → ]                       │
└─────────────────────────────────────────────────────┘
```

### 5.2 Study Path Page (`/[locale]/learn/paths/[id]/page.tsx`)

**Auth required + must own path.**

This is the self-study equivalent of the cohort course hub. It shows the AI-curated curriculum as a checklist-style progression.

```
┌────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                                   │
│                                                        │
│  AI-Powered Marketing for Bilingual Business           │
│  12 resources · ~6 hours                               │
│  ███████████░░░░░░░░░ 42%    5 of 12 completed        │
│                                                        │
│  ┌─ Your Curriculum ──────────────────────────────┐    │
│  │                                                 │    │
│  │  ✅ 1. How AI Works — A Plain English Guide    │    │
│  │     ✓ Completed · 15 min · YouTube             │    │
│  │                                                 │    │
│  │  ✅ 2. Prompt Engineering Basics               │    │
│  │     ✓ Completed · 22 min · YouTube             │    │
│  │                                                 │    │
│  │  ✅ 3. 10 AI Marketing Workflows That Work     │    │
│  │     ✓ Completed · Article                      │    │
│  │                                                 │    │
│  │  ✅ 4. Bilingual Content with Claude           │    │
│  │     ✓ Completed · 30 min · HonuVibe            │    │
│  │                                                 │    │
│  │  ✅ 5. DeepL vs Claude for Translation         │    │
│  │     ✓ Completed · 18 min · YouTube             │    │
│  │                                                 │    │
│  │  ── NEXT UP ──────────────────────────────     │    │
│  │                                                 │    │
│  │  ⬜ 6. Advanced Prompting for Content          │    │
│  │     "This builds on the basics from item 2..." │    │
│  │     25 min · Free · YouTube                     │    │
│  │     Focus: Pay attention to the chain-of-       │    │
│  │     thought technique for long-form content     │    │
│  │                                                 │    │
│  │     [ Start → ]  [ Mark Complete ✓ ]           │    │
│  │                                                 │    │
│  │  ── COMING UP ─────────────────────────────    │    │
│  │                                                 │    │
│  │  ⬜ 7. AI Social Media Strategy                │    │
│  │     12 min · Free · Article                     │    │
│  │                                                 │    │
│  │  🔒 8. Ryan's Content Workflow                 │    │
│  │     35 min · Premium · HonuVibe                 │    │
│  │     [ Upgrade to access → ]                     │    │
│  │                                                 │    │
│  │  ... (4 more items)                             │    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                        │
│  ┌─ Path Actions ──────────────────────────────────┐   │
│  │  [ Regenerate Path ↻ ]   [ Archive Path ]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ┌─ Interested in structured learning? ────────────┐   │
│  │  Our cohort courses include live instruction,    │   │
│  │  community, and accountability.                  │   │
│  │  [ View Courses → ]                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Key behaviors:**

**"Start" button:** Opens the content. For YouTube videos → inline embed or new tab. For articles → new tab. For HonuVibe videos → inline embed. For tools → new tab.

**"Mark Complete" button:** Toggles `is_completed` on the `study_path_items` record. Updates progress bar. Next item in sequence becomes "NEXT UP."

**Premium locked items:** Show with lock icon. CTA links to subscription checkout. If user upgrades mid-path, items become accessible immediately.

**Rationale/focus text:** Shown for the "NEXT UP" item (most prominent) and accessible via expand for other items. Provides the guided feeling that differentiates this from just a playlist.

**Cohort course upsell:** Subtle CTA at the bottom connecting self-study to the premium cohort experience. This is the funnel.

### 5.3 Content Viewer (Inline)

For video content, display an inline player within the study path page:

```
┌────────────────────────────────────────────────────────┐
│  ⬜ 6. Advanced Prompting for Content                  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │          [YouTube / Vimeo Embed Player]           │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Focus: Pay attention to the chain-of-thought          │
│  technique for long-form content                       │
│                                                        │
│  [ Mark Complete ✓ ]                                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

For articles and tools, show a preview card with "Open in new tab" button. Don't iframe external sites.

---

## 6. API Routes

### 6.1 Route Inventory

```
-- Study Paths (auth required)
POST /api/learn/paths/generate          → Generate new path
GET  /api/learn/paths                   → List user's paths
GET  /api/learn/paths/[id]              → Get path detail with items
POST /api/learn/paths/[id]/regenerate   → Regenerate path
PUT  /api/learn/paths/[id]              → Update path (archive, etc.)
PUT  /api/learn/paths/[id]/items/[itemId] → Update item (mark complete)

-- Subscription
POST /api/stripe/subscribe              → Create subscription checkout
POST /api/stripe/portal                 → Stripe Customer Portal link (manage subscription)
GET  /api/subscription/status           → Current user's subscription status

-- Admin
GET  /api/admin/paths                   → All study paths (admin view)
GET  /api/admin/paths/stats             → Path generation analytics
GET  /api/admin/subscription/stats      → Subscription metrics
```

### 6.2 Mark Item Complete

```
PUT /api/learn/paths/[id]/items/[itemId]/route.ts
```

```typescript
// 1. Verify user owns path
// 2. Update study_path_items: is_completed = true, completed_at = now()
// 3. Check if all items completed → if yes, update study_path status to 'completed'
// 4. Increment content_items.view_count for the content item
// 5. Return updated item
```

### 6.3 Subscription Portal

```
POST /api/stripe/portal/route.ts
```

```typescript
// 1. Verify authenticated user with active subscription
// 2. Create Stripe Billing Portal session
// 3. Return { portal_url }
// Student can manage their subscription (cancel, update payment) via Stripe's hosted portal
```

---

## 7. Premium Upgrade Touchpoints

Premium upgrade CTAs should appear naturally throughout the experience, never aggressively:

| Location | Trigger | CTA Style |
|---|---|---|
| Content library browse | User clicks a premium item | Modal with preview + upgrade button |
| Study path preview | Path includes premium items | Inline note: "4 items require Premium" |
| Study path in-progress | User reaches a premium item | Inline card: "Unlock this with Premium" |
| Student dashboard | Free user | Subtle banner: "Upgrade for full library access" |
| Path generation intake | Free user | Info text: "Premium paths include all resources" |

**Never block the core experience.** Free users can always generate paths and work through free content. Premium is an enhancement, not a gate.

---

## 8. Admin — Self-Study Analytics

### 8.1 Path Stats Widget (Admin Dashboard)

```
┌─ Self-Study ───────────────────────────────────────┐
│  Total paths generated: 47                          │
│  Active paths: 32                                   │
│  Avg items per path: 11                             │
│  Avg completion rate: 38%                           │
│                                                     │
│  Most requested topics:                             │
│  1. Prompt Engineering (23 paths)                   │
│  2. Business AI (18 paths)                          │
│  3. Content Creation (15 paths)                     │
│                                                     │
│  Most used content items:                           │
│  1. "How AI Works" (in 34 paths)                   │
│  2. "Prompt Engineering Basics" (in 29 paths)      │
│                                                     │
│  Premium conversions from paths: 5                  │
└────────────────────────────────────────────────────┘
```

### 8.2 Subscription Stats Widget

```
┌─ Subscriptions ────────────────────────────────────┐
│  Active premium: 12                                 │
│  MRR: $348 / ¥47,760                               │
│  Churn this month: 1                                │
│  Trial → Paid conversion: 67%                       │
└────────────────────────────────────────────────────┘
```

---

## 9. Component Inventory (New for Phase 2C)

### 9.1 Student Components (`components/learn/`)

| Component | Used On | Props |
|---|---|---|
| `PathIntakeForm` | Path creation page | onSubmit, tags list |
| `GoalTextarea` | Path intake | value, onChange, maxLength |
| `DifficultySelector` | Path intake | selected, onChange |
| `FocusAreaChips` | Path intake | tags, selected, onChange |
| `PathGenerating` | Loading state | animated Honu + progress |
| `PathPreview` | Post-generation preview | path data, onStart, onRegenerate |
| `PathCard` | Dashboard | path summary, progress |
| `StudyPathView` | Path detail page | full path with items |
| `PathItemCard` | Inside StudyPathView | item data, status, onComplete |
| `ContentViewer` | Inside PathItemCard | url, type (for inline embeds) |
| `PremiumUpgradeCard` | Multiple locations | variant ('inline' \| 'modal' \| 'banner') |
| `SubscriptionButton` | Upgrade touchpoints | currency, variant |
| `SubscriptionStatus` | Account settings | subscription data |

### 9.2 Admin Components

| Component | Used On | Props |
|---|---|---|
| `PathStatsWidget` | Admin dashboard | stats data |
| `SubscriptionStatsWidget` | Admin dashboard | subscription metrics |

---

## 10. File Map (New Files for Phase 2C)

```
app/
├── [locale]/
│   ├── learn/
│   │   ├── paths/
│   │   │   ├── new/
│   │   │   │   └── page.tsx             # Intake form
│   │   │   └── [id]/
│   │   │       └── page.tsx             # Study path detail
│   │   └── pricing/
│   │       └── page.tsx                 # Premium pricing page
├── api/
│   ├── learn/
│   │   └── paths/
│   │       ├── generate/
│   │       │   └── route.ts             # POST generate path
│   │       ├── route.ts                 # GET user's paths
│   │       └── [id]/
│   │           ├── route.ts             # GET path detail, PUT update
│   │           ├── regenerate/
│   │           │   └── route.ts         # POST regenerate
│   │           └── items/
│   │               └── [itemId]/
│   │                   └── route.ts     # PUT mark complete
│   ├── stripe/
│   │   ├── subscribe/
│   │   │   └── route.ts                 # POST create subscription
│   │   └── portal/
│   │       └── route.ts                 # POST billing portal
│   ├── subscription/
│   │   └── status/
│   │       └── route.ts                 # GET current status
│   ├── admin/
│   │   ├── paths/
│   │   │   ├── route.ts                 # GET all paths
│   │   │   └── stats/
│   │   │       └── route.ts             # GET path analytics
│   │   └── subscriptions/
│   │       └── stats/
│   │           └── route.ts             # GET subscription metrics

components/
├── learn/
│   ├── PathIntakeForm.tsx
│   ├── GoalTextarea.tsx
│   ├── DifficultySelector.tsx
│   ├── FocusAreaChips.tsx
│   ├── PathGenerating.tsx
│   ├── PathPreview.tsx
│   ├── PathCard.tsx
│   ├── StudyPathView.tsx
│   ├── PathItemCard.tsx
│   ├── ContentViewer.tsx
│   ├── PremiumUpgradeCard.tsx
│   ├── SubscriptionButton.tsx
│   └── SubscriptionStatus.tsx
├── admin/
│   ├── PathStatsWidget.tsx
│   └── SubscriptionStatsWidget.tsx

lib/
├── paths/
│   ├── catalog.ts                       # Content catalog builder
│   ├── prompt.ts                        # Claude generation prompt
│   ├── generate.ts                      # Generation orchestration
│   ├── queries.ts                       # Supabase queries for paths
│   └── types.ts                         # TypeScript types
├── subscriptions/
│   ├── access.ts                        # Premium access check
│   ├── queries.ts
│   └── types.ts

messages/
├── en.json                              # Add paths.*, subscription.* sections
└── ja.json                              # Add paths.*, subscription.* sections
```

---

## 11. i18n Additions

Add to `messages/en.json`:

```json
{
  "paths": {
    "create_title": "Let's build your learning path.",
    "create_subtitle": "Tell us what you want to learn, and our AI will curate a personalized curriculum from the HonuVibe library.",
    "goal_label": "What do you want to learn?",
    "goal_placeholder": "Describe your learning goal in a few sentences...",
    "difficulty_label": "Your experience level",
    "difficulty_beginner": "Beginner — I'm new to AI tools",
    "difficulty_intermediate": "Intermediate — I use ChatGPT but want to go deeper",
    "difficulty_advanced": "Advanced — I want specialized knowledge",
    "focus_label": "Focus areas (optional)",
    "focus_subtitle": "Select topics you're most interested in",
    "language_label": "Language preference",
    "generate_cta": "Build My Learning Path",
    "generating_title": "Building your learning path...",
    "generating_subtitle": "Our AI is curating the best resources for your goals.",
    "generating_time": "This usually takes about 10 seconds.",
    "preview_title": "Your Learning Path is Ready",
    "preview_stats": "{count} resources · ~{hours} hours",
    "preview_free_items": "{count} free",
    "preview_premium_items": "{count} premium",
    "start_learning": "Start Learning",
    "regenerate": "Regenerate Path",
    "regenerate_feedback": "What would you like to change?",
    "mark_complete": "Mark Complete",
    "completed": "Completed",
    "next_up": "Next Up",
    "coming_up": "Coming Up",
    "start": "Start",
    "premium_required": "Premium access required",
    "upgrade_to_access": "Upgrade to access",
    "archive_path": "Archive Path",
    "your_paths": "Your Study Paths",
    "create_new": "Create New Study Path",
    "no_paths": "No study paths yet. Create one to get started!",
    "path_progress": "{completed} of {total} completed",
    "cohort_upsell_title": "Interested in structured learning?",
    "cohort_upsell_text": "Our cohort courses include live instruction, community, and accountability.",
    "view_courses": "View Courses"
  },
  "subscription": {
    "premium_title": "HonuVibe Premium",
    "premium_subtitle": "Unlock the full library and AI-powered study paths",
    "price_monthly": "$29/month",
    "price_monthly_jpy": "¥3,980/month",
    "features": [
      "Access to all premium content",
      "AI-powered study path generation",
      "Full HonuVibe video library",
      "Premium templates and guides",
      "Priority community support"
    ],
    "upgrade_cta": "Go Premium",
    "manage_subscription": "Manage Subscription",
    "current_plan": "Current Plan",
    "free_plan": "Free",
    "premium_plan": "Premium",
    "status_active": "Active",
    "status_cancelled": "Cancelled — access until {date}",
    "status_past_due": "Payment issue — please update",
    "cancel": "Cancel Subscription",
    "reactivate": "Reactivate"
  }
}
```

Add corresponding Japanese translations to `messages/ja.json`.

---

## 12. QA Checklist

### Path Generation
- [ ] Intake form validates required fields (goal, difficulty)
- [ ] Claude API call succeeds and returns valid JSON
- [ ] Generated path has appropriate number of items (8-15)
- [ ] Items are ordered logically (foundational → advanced)
- [ ] All content_item_ids in the path exist in the database
- [ ] Rationale and learning focus text are present and relevant
- [ ] Path title and description are generated in both EN and JP
- [ ] Free users only see free items in their paths
- [ ] Premium users see mixed free + premium items
- [ ] Rate limiting works (max 3 per day)
- [ ] Error handling for Claude API failures (timeout, malformed response)
- [ ] Generation log is saved for debugging

### Study Path Experience
- [ ] Path displays correctly with progress tracking
- [ ] "Mark Complete" toggles item and updates progress bar
- [ ] Path completion detection works (all items → status = 'completed')
- [ ] Premium locked items show lock state for free users
- [ ] "Start" opens content appropriately by type (embed vs. new tab)
- [ ] Path regeneration creates a new path and archives the old one
- [ ] Regeneration with feedback modifies the generation context
- [ ] Back to dashboard navigation works

### Subscription
- [ ] Stripe subscription checkout works in USD
- [ ] Stripe subscription checkout works in JPY
- [ ] Webhook correctly updates user subscription tier
- [ ] Premium access check works across all content gating points
- [ ] Subscription cancellation sets expiry date correctly
- [ ] Grace period allows access until subscription_expires_at
- [ ] Stripe Customer Portal accessible and functional
- [ ] Upgrading mid-path immediately unlocks premium items

### Integration
- [ ] Dashboard shows both cohort courses and study paths
- [ ] Content library premium gating consistent with subscription status
- [ ] Premium upgrade CTAs appear at all specified touchpoints
- [ ] Admin path stats widget shows accurate data
- [ ] Admin subscription stats show accurate MRR and counts

### Mobile
- [ ] Intake form works on mobile (full-width, proper spacing)
- [ ] Path view scrolls properly with all item states
- [ ] Content viewer (video embeds) works on iOS/Android
- [ ] Premium upgrade modal displays correctly on mobile

---

*HonuVibe.AI — Phase 2C Build Specification v1.0*
*Made in Hawaii with Aloha 🐢*
