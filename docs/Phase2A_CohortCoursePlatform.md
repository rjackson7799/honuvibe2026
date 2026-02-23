# HonuVibe.AI — Phase 2A Build Specification
## Cohort Course Platform
**Build-Ready Engineering Blueprint | v1.0**
*Weeks 8–11 | Revenue-Critical Path*

---

## Overview

Phase 2A delivers everything needed to enroll students in HVAI-101 (AI Foundations for Modern Professionals) and deliver the cohort learning experience. This is the revenue-critical path — all other LMS features depend on this foundation.

### What Ships in Phase 2A

1. Authentication (Supabase Auth)
2. Cohort course database schema
3. Course.md upload pipeline (Claude API parser)
4. Public course catalog + individual course pages
5. Stripe checkout for course enrollment
6. Post-enrollment student course hub with weekly view
7. Admin panel (courses, students, course upload, session management)

### What Does NOT Ship in Phase 2A

- Content library (Phase 2B)
- Self-study / AI path generation (Phase 2C)
- Certificates (deferred — nice-to-have for first cohort, not blocking)
- Reviews/ratings (no students yet to review)
- Custom video player (using Vimeo/YouTube unlisted embeds)

---

## 1. Database Schema

All tables in Supabase PostgreSQL. Row-level security (RLS) enabled.

### 1.1 Users (Extend Existing)

```sql
-- Add to existing users table from Phase 1
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'student'
  CHECK (role IN ('student', 'admin', 'instructor'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
```

### 1.2 Courses

```sql
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  course_id_code text UNIQUE,                    -- e.g., 'HVAI-101'
  course_type text NOT NULL DEFAULT 'cohort'
    CHECK (course_type IN ('cohort', 'self-study')),

  -- Basic info
  title_en text NOT NULL,
  title_jp text,
  description_en text,
  description_jp text,
  instructor_name text,

  -- Pricing (store smallest unit: cents for USD, yen for JPY)
  price_usd integer,                              -- e.g., 50000 = $500.00
  price_jpy integer,                              -- e.g., 65000 = ¥65,000

  -- Course metadata
  language text DEFAULT 'en' CHECK (language IN ('en', 'ja', 'both')),
  subtitle_language text,
  level text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  format text,                                    -- e.g., 'live + self-paced'

  -- Cohort-specific
  start_date date,
  end_date date,
  total_weeks integer,
  live_sessions_count integer,
  recorded_lessons_count integer,
  max_enrollment integer,
  current_enrollment integer DEFAULT 0,

  -- Learning outcomes (stored as JSON arrays for flexibility)
  learning_outcomes_en jsonb,                     -- ["Outcome 1", "Outcome 2", ...]
  learning_outcomes_jp jsonb,
  prerequisites_en text,
  prerequisites_jp text,
  who_is_for_en jsonb,                            -- ["Audience 1", "Audience 2", ...]
  who_is_for_jp jsonb,
  tools_covered jsonb,                            -- ["Claude", "ChatGPT", "Perplexity", ...]

  -- Community
  community_platform text,                        -- 'line', 'skool', 'discord'
  community_duration_months integer,
  community_link text,                            -- invite link (only shown post-enrollment)

  -- Logistics
  zoom_link text,                                 -- persistent Zoom link (only shown post-enrollment)
  schedule_notes_en text,                         -- "Weekly, same day/time..."
  schedule_notes_jp text,
  cancellation_policy_en text,
  cancellation_policy_jp text,

  -- Completion requirements
  completion_requirements_en jsonb,               -- ["Attend 3/4 live sessions", ...]
  completion_requirements_jp jsonb,

  -- Materials summary (for the course page)
  materials_summary_en jsonb,                     -- [{material, language, provided_with}, ...]
  materials_summary_jp jsonb,

  -- Media
  thumbnail_url text,
  hero_image_url text,

  -- Tags for filtering
  tags jsonb,                                     -- ["ai-fundamentals", "prompting", ...]

  -- Status
  is_published boolean DEFAULT false,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'in-progress', 'completed', 'archived')),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 1.3 Course Weeks

```sql
CREATE TABLE course_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  week_number integer NOT NULL,

  title_en text NOT NULL,                         -- "The AI Landscape in 2026"
  title_jp text,
  subtitle_en text,                               -- "Understanding what's real, what's hype..."
  subtitle_jp text,
  description_en text,                            -- Full week overview
  description_jp text,

  -- Phase indicator (maps to course structure sections)
  phase text,                                     -- e.g., 'live-sessions', 'recorded-lessons'

  -- Content gating
  unlock_date date,                               -- calculated from course start_date + (week_number - 1) * 7
  is_unlocked boolean DEFAULT false,              -- can be manually overridden

  created_at timestamptz DEFAULT now(),

  UNIQUE(course_id, week_number)
);
```

### 1.4 Course Sessions

```sql
CREATE TABLE course_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid REFERENCES course_weeks(id) ON DELETE CASCADE,
  session_number integer NOT NULL DEFAULT 1,       -- within the week (1 or 2)

  title_en text NOT NULL,
  title_jp text,

  -- Session details
  format text NOT NULL CHECK (format IN ('live', 'recorded', 'hybrid')),
  duration_minutes integer,
  scheduled_at timestamptz,                        -- for live sessions
  materials_en jsonb,                              -- ["Bilingual slide deck", "AI platform setup guide"]
  materials_jp jsonb,

  -- Topics covered (rich structured content)
  topics_en jsonb,                                 -- [{title, subtopics: [...]}, ...]
  topics_jp jsonb,

  -- Zoom
  zoom_link text,                                  -- session-specific override, or inherit from course

  -- Post-session content (null until session is delivered)
  replay_url text,                                 -- Vimeo/MUX/YouTube unlisted URL
  transcript_url text,                             -- PDF or text file URL
  slide_deck_url text,                             -- downloadable slides

  -- Status
  status text DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'live', 'completed')),

  created_at timestamptz DEFAULT now(),

  UNIQUE(week_id, session_number)
);
```

### 1.5 Course Assignments (Homework / Action Challenges)

```sql
CREATE TABLE course_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid REFERENCES course_weeks(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 1,

  title_en text NOT NULL,                          -- "Homework" or "Action Challenge"
  title_jp text,
  description_en text NOT NULL,                    -- Full assignment description
  description_jp text,

  assignment_type text DEFAULT 'homework'
    CHECK (assignment_type IN ('homework', 'action-challenge', 'project')),

  -- Optional due date
  due_date date,

  created_at timestamptz DEFAULT now()
);
```

### 1.6 Course Vocabulary (JP Key Terms)

```sql
CREATE TABLE course_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid REFERENCES course_weeks(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 1,

  term_en text NOT NULL,                           -- "Large Language Model"
  term_jp text NOT NULL,                           -- "大規模言語モデル"

  created_at timestamptz DEFAULT now()
);
```

### 1.7 Course Resources

```sql
CREATE TABLE course_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Can attach to a week OR a session (one must be set)
  week_id uuid REFERENCES course_weeks(id) ON DELETE CASCADE,
  session_id uuid REFERENCES course_sessions(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 1,

  title_en text NOT NULL,
  title_jp text,
  url text,
  resource_type text CHECK (resource_type IN ('article', 'video', 'tool', 'template', 'download', 'guide')),
  description_en text,
  description_jp text,

  -- Access control
  is_public boolean DEFAULT false,                 -- true = visible pre-enrollment (teaser)

  created_at timestamptz DEFAULT now(),

  -- Ensure at least one parent is set
  CHECK (week_id IS NOT NULL OR session_id IS NOT NULL)
);
```

### 1.8 Enrollments

```sql
CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,

  -- Payment
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_paid integer,                             -- cents (USD) or yen (JPY)
  currency text DEFAULT 'usd',

  -- Status
  status text DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'refunded', 'cancelled')),

  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,

  UNIQUE(user_id, course_id)
);
```

### 1.9 Course Uploads (Audit Trail)

```sql
CREATE TABLE course_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES users(id),
  filename text,
  raw_markdown text NOT NULL,
  parsed_json jsonb,
  course_id uuid REFERENCES courses(id),           -- set after confirmation

  status text DEFAULT 'parsed'
    CHECK (status IN ('parsing', 'parsed', 'confirmed', 'failed')),
  error_message text,

  uploaded_at timestamptz DEFAULT now()
);
```

### 1.10 Applications (from Phase 1 — included for completeness)

```sql
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  website text,
  engagement_type text,
  project_description text,
  desired_outcome text,
  referral_source text,
  timeline text,
  budget_range text,
  locale text DEFAULT 'en',
  status text DEFAULT 'received'
    CHECK (status IN ('received', 'reviewing', 'responded', 'archived')),
  notes text,                                      -- admin notes
  submitted_at timestamptz DEFAULT now()
);
```

### 1.11 Row-Level Security Policies

```sql
-- Courses: public read for published courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_public_read" ON courses
  FOR SELECT USING (is_published = true);
CREATE POLICY "courses_admin_all" ON courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Course weeks: public read for published courses
ALTER TABLE course_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weeks_public_read" ON course_weeks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = course_weeks.course_id AND courses.is_published = true)
  );

-- Sessions: public read for published courses (replay_url/zoom_link filtered in application layer)
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_public_read" ON course_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_weeks w
      JOIN courses c ON c.id = w.course_id
      WHERE w.id = course_sessions.week_id AND c.is_published = true
    )
  );

-- Enrollments: users see only their own
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments_own_read" ON enrollments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "enrollments_admin_all" ON enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Admin-only tables
ALTER TABLE course_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uploads_admin_only" ON course_uploads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_admin_only" ON applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

---

## 2. Authentication

### 2.1 Supabase Auth Setup

**Methods enabled:**
- Email + password (with email confirmation)
- Google OAuth

**Session management:**
- JWT stored in httpOnly cookie via `@supabase/ssr`
- Cookie name: `sb-access-token` / `sb-refresh-token`
- Session refresh on each server request via middleware

### 2.2 Auth Pages

Create a dedicated auth flow within the learn section:

```
/learn/auth              → Login / Signup page
/learn/auth/callback     → OAuth callback handler
```

**Login/Signup Page (`/[locale]/learn/auth/page.tsx`):**
- Single page with tab toggle: Sign In / Sign Up
- Email + password fields
- Google OAuth button ("Continue with Google")
- Redirect back to original destination after auth (store in query param `?redirect=`)
- Bilingual — all strings from `messages/` files
- Design: centered card on ocean background, HonuVibe branding
- Mobile: full-width card, 16px minimum font on all inputs

### 2.3 Auth Middleware

```typescript
// middleware.ts additions
// Routes requiring auth:
const PROTECTED_ROUTES = [
  '/learn/dashboard',
  '/learn/account',
  '/admin',
];

// In middleware:
// 1. Check if route matches PROTECTED_ROUTES
// 2. Verify Supabase session from cookie
// 3. If no session → redirect to /learn/auth?redirect={original_path}
// 4. If session exists but role !== 'admin' and route starts with /admin → 403 page
// 5. Refresh session token on every request
```

### 2.4 Auth Callback Route

```
/api/auth/callback/route.ts
```

Handles OAuth redirect from Google. Exchanges code for session, sets cookies, redirects to stored destination or `/learn/dashboard`.

---

## 3. Course.md Upload Pipeline

### 3.1 Flow Overview

```
Admin uploads .md file
  → Frontend reads file content
  → POST /api/admin/courses/parse
  → API sends markdown to Claude API with structured extraction prompt
  → Claude returns JSON matching course schema
  → API validates JSON structure
  → Returns parsed data to frontend
  → Admin reviews preview, edits if needed
  → Admin clicks "Confirm & Create"
  → POST /api/admin/courses/create
  → API inserts records across all course tables in a transaction
  → Course appears in admin panel as draft
  → Audit trail saved to course_uploads table
```

### 3.2 Claude API Parsing Prompt

The system prompt sent to Claude for course markdown parsing:

```
You are a course content parser for HonuVibe.AI's learning platform.

Given a course markdown file, extract ALL content into the following JSON structure. Be thorough — extract every piece of information from the document.

Return ONLY valid JSON with no markdown formatting, no backticks, no commentary.

{
  "course": {
    "course_id_code": "string (e.g., HVAI-101)",
    "slug": "string (kebab-case, derived from title)",
    "title_en": "string",
    "title_jp": "string or null",
    "description_en": "string (full course description paragraph)",
    "description_jp": "string or null",
    "instructor_name": "string",
    "price_usd": "integer (dollars, e.g., 500)",
    "price_jpy": "integer (yen, e.g., 65000)",
    "language": "en | ja | both",
    "subtitle_language": "string or null",
    "level": "beginner | intermediate | advanced",
    "format": "string (e.g., 'live + self-paced')",
    "start_date": "null (to be set by admin)",
    "total_weeks": "integer",
    "live_sessions_count": "integer",
    "recorded_lessons_count": "integer",
    "max_enrollment": "integer",
    "learning_outcomes_en": ["string array"],
    "learning_outcomes_jp": ["string array or null"],
    "prerequisites_en": "string",
    "prerequisites_jp": "string or null",
    "who_is_for_en": ["string array"],
    "who_is_for_jp": ["string array or null"],
    "tools_covered": ["string array"],
    "community_platform": "string (line, skool, etc.)",
    "community_duration_months": "integer",
    "schedule_notes_en": "string",
    "schedule_notes_jp": "string or null",
    "cancellation_policy_en": "string",
    "cancellation_policy_jp": "string or null",
    "completion_requirements_en": ["string array"],
    "completion_requirements_jp": ["string array or null"],
    "materials_summary": [
      {
        "material": "string",
        "language": "string",
        "provided_with": "string"
      }
    ],
    "tags": ["string array"]
  },
  "weeks": [
    {
      "week_number": "integer",
      "title_en": "string (week title)",
      "title_jp": "string or null",
      "subtitle_en": "string (tagline under the title)",
      "subtitle_jp": "string or null",
      "description_en": "string (what this week covers — synthesize from topics)",
      "phase": "string (e.g., 'live-sessions' or 'recorded-lessons')",
      "sessions": [
        {
          "session_number": 1,
          "title_en": "string (same as week title for single-session weeks)",
          "title_jp": "string or null",
          "format": "live | recorded",
          "duration_minutes": "integer",
          "materials_en": ["string array (listed materials)"],
          "materials_jp": ["string array or null"],
          "topics_en": [
            {
              "title": "string (topic heading)",
              "subtopics": ["string array (bullet points under topic)"]
            }
          ],
          "topics_jp": "same structure or null"
        }
      ],
      "assignments": [
        {
          "title_en": "Homework | Action Challenge",
          "title_jp": "string or null",
          "description_en": "string (full assignment text)",
          "description_jp": "string or null",
          "assignment_type": "homework | action-challenge"
        }
      ],
      "vocabulary": [
        {
          "term_en": "string",
          "term_jp": "string"
        }
      ],
      "resources": [
        {
          "title_en": "string",
          "url": "string or null",
          "resource_type": "article | video | tool | template | guide",
          "description_en": "string or null"
        }
      ]
    }
  ]
}
```

### 3.3 Parse API Route

```
/api/admin/courses/parse/route.ts
```

```typescript
// Pseudocode:
// 1. Verify admin role from session
// 2. Receive { markdown: string, filename: string } in request body
// 3. Call Anthropic API:
//    - model: "claude-sonnet-4-20250514"
//    - system: parsing prompt from §3.2
//    - user: the raw markdown content
//    - max_tokens: 8000
// 4. Parse Claude's response as JSON
// 5. Validate required fields exist (course_id_code, title_en, weeks array, etc.)
// 6. Save to course_uploads table with status 'parsed'
// 7. Return { upload_id, parsed_data } to frontend
```

### 3.4 Create API Route

```
/api/admin/courses/create/route.ts
```

```typescript
// Pseudocode:
// 1. Verify admin role from session
// 2. Receive { upload_id, course_data } (admin may have edited the parsed data)
// 3. Begin Supabase transaction
// 4. Insert into courses table → get course_id
// 5. For each week in course_data.weeks:
//    a. Calculate unlock_date = course.start_date + (week_number - 1) * 7 days
//    b. Insert into course_weeks → get week_id
//    c. For each session in week.sessions:
//       - Insert into course_sessions
//    d. For each assignment in week.assignments:
//       - Insert into course_assignments
//    e. For each vocabulary item in week.vocabulary:
//       - Insert into course_vocabulary
//    f. For each resource in week.resources:
//       - Insert into course_resources
// 6. Update course_uploads: set course_id, status = 'confirmed'
// 7. Convert price_usd from dollars to cents (multiply by 100) before storing
// 8. Return { course_id, slug }
```

---

## 4. API Routes

### 4.1 Route Inventory

```
-- Public
GET  /api/courses                    → List published courses (catalog)
GET  /api/courses/[slug]             → Single course detail (public view)

-- Auth required
GET  /api/enrollments                → Current user's enrollments
GET  /api/enrollments/[course-slug]  → Check enrollment status for a course
POST /api/enrollments/check-access   → Verify access to gated content

-- Stripe
POST /api/stripe/checkout            → Create Checkout Session
POST /api/stripe/webhook             → Handle Stripe events

-- Admin only
POST /api/admin/courses/parse        → Upload & parse course.md
POST /api/admin/courses/create       → Confirm & create course from parsed data
PUT  /api/admin/courses/[id]         → Update course fields
PUT  /api/admin/sessions/[id]        → Update session (add replay URL, transcript, etc.)
GET  /api/admin/students             → List all students
GET  /api/admin/students/[id]        → Student detail with enrollments
GET  /api/admin/applications         → List consulting applications
PUT  /api/admin/applications/[id]    → Update application status
```

### 4.2 Stripe Checkout Route

```
POST /api/stripe/checkout/route.ts
```

```typescript
// 1. Verify authenticated user
// 2. Receive { course_id, currency: 'usd' | 'jpy' }
// 3. Fetch course from DB — verify is_published, check capacity
// 4. Check if user already enrolled → if yes, redirect to dashboard
// 5. Get or create Stripe customer (store stripe_customer_id on user)
// 6. Create Stripe Checkout Session:
//    - mode: 'payment'
//    - line_items: [{
//        price_data: {
//          currency: currency,
//          unit_amount: currency === 'usd' ? course.price_usd : course.price_jpy,
//          product_data: { name: course.title_en, description: course.description_en }
//        },
//        quantity: 1
//      }]
//    - success_url: `${origin}/learn/dashboard/${course.slug}?enrolled=true`
//    - cancel_url: `${origin}/learn/${course.slug}`
//    - metadata: { user_id, course_id, currency }
// 7. Return { checkout_url }
```

### 4.3 Stripe Webhook Route

```
POST /api/stripe/webhook/route.ts
```

```typescript
// 1. Verify Stripe webhook signature
// 2. Handle event: 'checkout.session.completed'
//    a. Extract metadata: user_id, course_id, currency
//    b. Insert enrollment record
//    c. Increment courses.current_enrollment
//    d. Send confirmation email (optional Phase 2A — can be manual)
// 3. Handle event: 'charge.refunded'
//    a. Update enrollment status to 'refunded'
//    b. Decrement courses.current_enrollment
// 4. Return 200
```

---

## 5. Frontend — Public Pages

### 5.1 Course Catalog (`/[locale]/learn/page.tsx`)

**Layout:**
- Page title: "Learn" / "学ぶ"
- Subtitle: "Courses designed to move you from curious to capable."

**If ≤ 3 courses (V1 launch):**
- No filter bar needed — just show all courses as cards
- Featured course at top (flagged in DB or first published)

**Course Card Component (`components/learn/CourseCard.tsx`):**
```
┌─────────────────────────────────────┐
│  [Thumbnail image]                  │
│                                     │
│  BEGINNER · 8 WEEKS · EN/JP        │  ← Overline with tags
│  AI Foundations for Modern          │  ← Title (DM Serif Display)
│  Professionals                      │
│                                     │
│  An 8-week program for             │  ← Description (2-3 lines, truncated)
│  professionals ready to move...     │
│                                     │
│  Starts March 15 · 7/10 spots left │  ← Date + availability
│                                     │
│  $500 / ¥65,000                    │  ← Price
│                                     │
│  [ View Course → ]                 │  ← CTA button
└─────────────────────────────────────┘
```

**Availability logic:**
- If `current_enrollment < max_enrollment`: show "X spots left" in accent-teal
- If `current_enrollment >= max_enrollment`: show "Cohort Full — Join Waitlist" in accent-gold
- If `start_date` is in the past and `status = 'in-progress'`: show "In Progress — Next cohort TBD"

### 5.2 Individual Course Page (`/[locale]/learn/[slug]/page.tsx`)

This is the primary conversion page. It should feel like a premium program overview — not a generic course listing.

**Section order (mobile = vertical stack, desktop = main + sticky sidebar):**

**Hero Section:**
```
BEGINNER · LIVE + SELF-PACED · EN (JP MATERIALS)       ← Overline badges
AI Foundations for Modern Professionals                  ← Title (display size)
現代プロフェッショナルのためのAI基礎                        ← JP title below

An 8-week program for professionals and business owners  ← Description
ready to move beyond basic AI use...

┌──────────────┐  ┌───────────────────────┐
│ Enroll — $500│  │ Join the Community →  │             ← CTAs
└──────────────┘  └───────────────────────┘

8 Weeks · 4 Live + 4 Recorded · 10 Max · Starts Mar 15 ← Key stats strip
```

**What You'll Master:**
- Learning outcomes rendered as a numbered or check-marked list
- Each outcome is a concrete, actionable statement from `learning_outcomes_en`

**Tools You'll Learn:**
- Horizontal pill badges or icon grid from `tools_covered`
- Example: `[Claude] [ChatGPT] [Gemini] [Perplexity] [Zapier] [NotebookLM]`

**How It Works:**
- 4-step visual strip explaining the format:
  1. "Live on Zoom twice a week" (icon: video camera)
  2. "Replays + transcripts available next day" (icon: play button)
  3. "Mini-assignments to apply what you learned" (icon: pencil)
  4. "Private community for 3 months" (icon: people)

**Weekly Curriculum (Accordion):**
- Each week is a collapsible section
- Collapsed state shows: `Week 1 — The AI Landscape in 2026` + format badge (Live/Recorded) + duration
- Expanded state shows:
  - Subtitle/tagline
  - Topics covered (nested list from `topics_en`)
  - Materials list
  - Homework/Action Challenge summary (not full description — save that for enrolled students)
- **Future weeks (if start_date set):** All visible, all expandable
- **Vocabulary terms:** Shown inline at bottom of expanded week (especially relevant for JP audience)

**Who This Course Is For:**
- Rendered from `who_is_for_en` array as a styled list

**Prerequisites:**
- Simple text block from `prerequisites_en`

**Instructor:**
- Photo, name, brief bio
- Links to social profiles
- CTA: "Read more about Ryan" → `/about`

**Course Logistics:**
- Simple table or info cards: platform, schedule, cohort size, payment, cancellation policy
- From `schedule_notes_en`, `cancellation_policy_en`, etc.

**Materials You'll Receive:**
- Table rendered from `materials_summary` JSON

**Sticky CTA (Desktop):**
- Right sidebar, fixed on scroll:
  - Price ($500 / ¥65,000)
  - Start date
  - Spots remaining
  - "Enroll Now" button
  - "Questions? Apply to talk →" link to `/apply`

**Sticky CTA (Mobile):**
- Bottom bar (64px height, above safe area):
  - Price + "Enroll Now" button
  - Taps → initiates checkout flow

### 5.3 Enrollment Flow

```
User clicks "Enroll Now"
  → If not logged in:
      → Redirect to /learn/auth?redirect=/learn/[slug]
      → After auth, return to course page
  → If logged in:
      → POST /api/stripe/checkout { course_id, currency }
      → Redirect to Stripe Checkout (hosted page)
      → On success: Stripe webhook fires → enrollment created
      → User redirected to /learn/dashboard/[slug]?enrolled=true
      → Show welcome message / confetti / next steps
```

**Currency selection:**
- If user's locale is `ja` → default to JPY
- If user's locale is `en` → default to USD
- Show both prices on the course page; toggle or tabs for price display
- Currency is confirmed at checkout

---

## 6. Frontend — Post-Enrollment Student Experience

### 6.1 Student Dashboard (`/[locale]/learn/dashboard/page.tsx`)

**Auth required.** Redirects to `/learn/auth` if not logged in.

**Layout:**
```
Welcome back, [Name]                                    ← Greeting

┌─ Your Courses ─────────────────────────────────────┐
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ AI Foundations for Modern Professionals        │  │
│  │ Week 3 of 8 · Next session: Wed Mar 26, 10am │  │
│  │ ██████████░░░░░░░░░░ 37%                     │  │
│  │ [ Continue → ]                                │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  (Future: more enrolled course cards here)          │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─ Explore More Courses ─────────────────────────────┐
│  Cards for courses the student is NOT enrolled in   │
└─────────────────────────────────────────────────────┘
```

**Current week calculation:**
```typescript
function getCurrentWeek(startDate: Date): number {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(Math.floor(diffDays / 7) + 1, totalWeeks);
}
```

**Progress bar:**
- Based on week progress: `currentWeek / totalWeeks * 100`
- Not based on individual lesson completion (too granular for cohort model)

### 6.2 Course Hub (`/[locale]/learn/dashboard/[course-slug]/page.tsx`)

**Auth + enrollment required.** Check enrollment via `/api/enrollments/[course-slug]`. If not enrolled → redirect to course public page.

This is the primary learning interface. Think of it as the student's **course home base** — not a video player.

**Top Section:**
```
← Back to Dashboard

AI Foundations for Modern Professionals                  ← Course title
Week 3 of 8 · In Progress                              ← Current state
━━━━━━━━━━░░░░░░░░░░ 37%                               ← Timeline progress bar
```

**Tab Navigation:**
```
[ Overview ]  [ Weekly Plan ]  [ Resources ]  [ Community ]
```

**Overview Tab:**
- What you'll master (learning outcomes)
- Tools you'll learn
- How this course works (format explainer)
- Instructor info
- Completion requirements
- Community access info + link (LINE invite)
- Zoom link for live sessions (persistent, always accessible)

**Weekly Plan Tab (PRIMARY — default active):**

This is the heart of the experience. Each week renders as an expandable card:

```
┌─ CURRENT WEEK ──────────────────────────────────────┐
│                                                      │
│  ● Week 3 — AI for Your Business & Career           │
│    "Practical workflows that save real time"         │
│                                                      │
│  ┌─ Session 1: Live Zoom ──────────────────────┐    │
│  │  March 26, 2026 · 10:00 AM HST · 90 min    │    │
│  │                                              │    │
│  │  Topics:                                     │    │
│  │  • Use Case Deep-Dives                       │    │
│  │  • Live Demo: Production Workflows           │    │
│  │  • The "Should I Use AI?" Framework          │    │
│  │  • Tools Beyond Chat                         │    │
│  │  • Evaluating New AI Tools                   │    │
│  │                                              │    │
│  │  Materials: Bilingual slide deck, AI         │    │
│  │  decision framework, tool comparison chart   │    │
│  │                                              │    │
│  │  [ Join Live Session → ]  (Zoom link)       │    │
│  │                                              │    │
│  │  ── or if session is complete: ──           │    │
│  │                                              │    │
│  │  ▶ Watch Replay                             │    │
│  │  📄 Download Transcript                     │    │
│  │  📊 Download Slides                         │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌─ Homework ──────────────────────────────────┐    │
│  │  Implement one AI workflow that saves 2+     │    │
│  │  hours per week. Document the process...     │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌─ Key Vocabulary (日本語) ──────────────────┐    │
│  │  Workflow / ワークフロー                      │    │
│  │  Automation / 自動化                         │    │
│  │  Use Case / ユースケース                      │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘

┌─ COMPLETED ─────────────────────────────────────────┐
│  ✓ Week 2 — Beyond Single-Line Prompts              │
│    ▶ Replay · 📄 Transcript · 📊 Slides            │  ← Collapsed, expandable
│  ✓ Week 1 — The AI Landscape in 2026                │
│    ▶ Replay · 📄 Transcript · 📊 Slides            │
└──────────────────────────────────────────────────────┘

┌─ UPCOMING (LOCKED) ─────────────────────────────────┐
│  🔒 Week 4 — Building Your AI Operating System      │
│     Unlocks April 2, 2026                           │
│  🔒 Week 5 — AI for Content & Communication         │
│     Unlocks April 9, 2026                           │
│  🔒 Week 6 — AI for Research & Decision-Making      │
│     Unlocks April 16, 2026                          │
│  🔒 Week 7 — AI for Productivity & Daily Life       │
│     Unlocks April 23, 2026                          │
│  🔒 Week 8 — What's Next                            │
│     Unlocks April 30, 2026                          │
└──────────────────────────────────────────────────────┘
```

**Week unlock logic:**
```typescript
function isWeekUnlocked(week: CourseWeek, courseStartDate: Date): boolean {
  // Manual override
  if (week.is_unlocked) return true;
  // Date-based unlock
  const unlockDate = new Date(courseStartDate);
  unlockDate.setDate(unlockDate.getDate() + (week.week_number - 1) * 7);
  return new Date() >= unlockDate;
}
```

**Session status rendering:**
```typescript
type SessionStatus = 'upcoming' | 'live-soon' | 'live' | 'completed';

function getSessionStatus(session: CourseSession): SessionStatus {
  if (session.status === 'completed' || session.replay_url) return 'completed';
  if (!session.scheduled_at) return 'upcoming';

  const now = new Date();
  const sessionTime = new Date(session.scheduled_at);
  const thirtyMinBefore = new Date(sessionTime.getTime() - 30 * 60 * 1000);
  const sessionEnd = new Date(sessionTime.getTime() + session.duration_minutes * 60 * 1000);

  if (now >= thirtyMinBefore && now < sessionEnd) return 'live-soon'; // or 'live'
  return 'upcoming';
}
```

**For each session status, show:**
- `upcoming`: Date/time, topic list, materials. No Zoom link yet (or show "Link available 30 min before session")
- `live-soon` / `live`: "Join Live Session →" button with Zoom link, pulsing indicator
- `completed`: Replay embed (or link), transcript download, slide download. Topics still visible.

**Replay embed:**
- If `replay_url` is a Vimeo URL → embed Vimeo player
- If `replay_url` is a YouTube URL → embed YouTube player (unlisted)
- If `replay_url` is a MUX playback ID → embed MUX player
- Fallback: direct link to video

**Resources Tab:**
- All resources across all unlocked weeks, organized by week
- Downloadable materials, linked articles, tool references
- Essentially a consolidated "materials" view

**Community Tab:**
- LINE group invite link (or embedded info)
- Community guidelines
- Link to Skool community (if applicable)

---

## 7. Frontend — Admin Panel

### 7.1 Admin Layout

```
/admin                    → Dashboard
/admin/courses            → Course list
/admin/courses/[id]       → Course detail / edit
/admin/courses/upload     → Course.md upload flow
/admin/students           → Student list
/admin/students/[id]      → Student detail
/admin/applications       → Application list
```

**Admin layout wrapper:** Sidebar nav (desktop) / bottom nav (mobile). Simple, functional. English-only.

### 7.2 Admin Dashboard (`/[locale]/admin/page.tsx`)

Stat cards:
- Total active courses
- Total enrolled students (across all courses)
- Spots remaining (per active course)
- Upcoming sessions (next 7 days)
- Recent enrollments (last 7 days)
- Pending applications

Quick actions:
- "Upload New Course" → `/admin/courses/upload`
- "View Students" → `/admin/students`
- "View Applications" → `/admin/applications`

### 7.3 Course List (`/admin/courses/page.tsx`)

Table view:
| Course ID | Title | Status | Enrolled | Capacity | Start Date | Actions |
|---|---|---|---|---|---|---|
| HVAI-101 | AI Foundations... | Published | 7/10 | 10 | Mar 15 | Edit · View |

Filter by status: All / Draft / Published / In Progress / Completed / Archived

### 7.4 Course Detail/Edit (`/admin/courses/[id]/page.tsx`)

**Tabs:**

**Overview Tab:**
- Editable fields: title, description, price, dates, max enrollment, status
- Toggle: draft ↔ published
- Danger zone: archive course

**Curriculum Tab:**
- Week-by-week view (similar to student view, but editable)
- For each session: edit fields for replay_url, transcript_url, slide_deck_url
- "Mark Session Complete" button → sets status to 'completed'
- Add/edit assignments, vocabulary, resources inline

**Students Tab:**
- List of enrolled students for this course
- Enrollment date, payment amount, status
- Manual enrollment button (for comp/scholarship enrollments)

### 7.5 Course Upload (`/admin/courses/upload/page.tsx`)

**Step 1: Upload**
- Drag-and-drop zone for `.md` file, OR paste markdown directly into a textarea
- "Parse with AI" button

**Step 2: Preview (shown after parsing)**
- Course card preview (as it would appear in catalog)
- Full curriculum breakdown (expandable weeks)
- Editable fields — admin can modify any parsed field before confirming
- Start date picker (not in the .md file — set here)
- "Looks good — Create Course" button
- "Re-parse" button if admin made changes to the markdown

**Step 3: Confirmation**
- Success message with link to course in admin panel
- Option to publish immediately or keep as draft

### 7.6 Student List (`/admin/students/page.tsx`)

Table view:
| Name | Email | Enrolled Courses | Joined | Actions |
|---|---|---|---|---|
| Tanaka Yuki | tanaka@... | HVAI-101 | Mar 10 | View |

Search by name or email. Filter by course.

### 7.7 Student Detail (`/admin/students/[id]/page.tsx`)

- User info: name, email, language preference, created date
- Enrollments: list of courses with enrollment date, status, amount paid
- Manual actions: add enrollment (comp), remove enrollment, change status

### 7.8 Applications (`/admin/applications/page.tsx`)

List view with status badges: Received · Reviewing · Responded · Archived

Click into an application to see full details + add admin notes + change status.

---

## 8. Component Inventory (New for Phase 2A)

### 8.1 Learn Components (`components/learn/`)

| Component | Used On | Props |
|---|---|---|
| `CourseCard` | Catalog, Dashboard | course data, variant ('catalog' \| 'dashboard') |
| `CourseHero` | Course detail page | course data |
| `CourseMeta` | Course detail page | stats strip (weeks, format, level, etc.) |
| `CurriculumAccordion` | Course detail (public) | weeks + sessions data, is_enrolled flag |
| `WeekCard` | Course hub (enrolled) | week data, sessions, assignments, vocab, status |
| `SessionCard` | Inside WeekCard | session data, status, replay/transcript URLs |
| `AssignmentCard` | Inside WeekCard | assignment data |
| `VocabularyList` | Inside WeekCard | vocabulary terms array |
| `LearningOutcomes` | Course detail | outcomes array |
| `ToolsBadges` | Course detail | tools array |
| `HowItWorks` | Course detail | static 4-step strip |
| `StickyEnrollBar` | Course detail (mobile) | price, course_id, currency |
| `StickyEnrollSidebar` | Course detail (desktop) | price, spots, date, course_id |
| `EnrollButton` | Multiple | course_id, currency, variant |
| `PriceDisplay` | Multiple | price_usd, price_jpy, locale |
| `AvailabilityBadge` | CourseCard, CourseHero | current/max enrollment |

### 8.2 Auth Components (`components/auth/`)

| Component | Notes |
|---|---|
| `AuthForm` | Tab toggle: sign in / sign up, email/password fields, Google OAuth button |
| `AuthGuard` | Layout wrapper that checks session, redirects if unauthenticated |
| `AdminGuard` | Layout wrapper that checks role === 'admin' |

### 8.3 Admin Components (`components/admin/`)

| Component | Notes |
|---|---|
| `AdminLayout` | Sidebar nav + main content area |
| `AdminNav` | Sidebar with links to all admin sections |
| `StatCard` | Dashboard number card (icon, label, value, trend) |
| `CourseUploader` | Drag-drop zone + markdown paste area |
| `ParsePreview` | Renders parsed course data with inline editing |
| `SessionEditor` | Inline form for adding replay URL, transcript, slides |
| `DataTable` | Reusable sortable/filterable table for lists |
| `StatusBadge` | Colored badge for draft/published/etc. |
| `ApplicationCard` | Application detail with status management |

---

## 9. File Map (New Files for Phase 2A)

```
app/
├── [locale]/
│   ├── learn/
│   │   ├── page.tsx                    # Course catalog
│   │   ├── [slug]/
│   │   │   └── page.tsx                # Individual course page (public)
│   │   ├── auth/
│   │   │   ├── page.tsx                # Login / Signup
│   │   │   └── callback/
│   │   │       └── route.ts            # OAuth callback
│   │   ├── dashboard/
│   │   │   ├── layout.tsx              # Auth guard wrapper
│   │   │   ├── page.tsx                # Student dashboard
│   │   │   └── [course-slug]/
│   │   │       └── page.tsx            # Course hub (enrolled)
│   │   └── account/
│   │       └── page.tsx                # Account settings
│   ├── admin/
│   │   ├── layout.tsx                  # Admin guard + admin layout
│   │   ├── page.tsx                    # Admin dashboard
│   │   ├── courses/
│   │   │   ├── page.tsx                # Course list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx            # Course detail / edit
│   │   │   └── upload/
│   │   │       └── page.tsx            # Course.md upload flow
│   │   ├── students/
│   │   │   ├── page.tsx                # Student list
│   │   │   └── [id]/
│   │   │       └── page.tsx            # Student detail
│   │   └── applications/
│   │       └── page.tsx                # Applications list + detail
├── api/
│   ├── courses/
│   │   └── route.ts                    # GET published courses
│   ├── courses/
│   │   └── [slug]/
│   │       └── route.ts                # GET single course
│   ├── enrollments/
│   │   ├── route.ts                    # GET user enrollments
│   │   └── [course-slug]/
│   │       └── route.ts                # GET enrollment check
│   ├── stripe/
│   │   ├── checkout/
│   │   │   └── route.ts                # POST create checkout session
│   │   └── webhook/
│   │       └── route.ts                # POST Stripe webhook
│   ├── admin/
│   │   ├── courses/
│   │   │   ├── parse/
│   │   │   │   └── route.ts            # POST parse course.md
│   │   │   ├── create/
│   │   │   │   └── route.ts            # POST create course
│   │   │   └── [id]/
│   │   │       └── route.ts            # PUT update course
│   │   ├── sessions/
│   │   │   └── [id]/
│   │   │       └── route.ts            # PUT update session
│   │   ├── students/
│   │   │   ├── route.ts                # GET all students
│   │   │   └── [id]/
│   │   │       └── route.ts            # GET student detail
│   │   └── applications/
│   │       ├── route.ts                # GET all applications
│   │       └── [id]/
│   │           └── route.ts            # PUT update application

components/
├── learn/
│   ├── CourseCard.tsx
│   ├── CourseHero.tsx
│   ├── CourseMeta.tsx
│   ├── CurriculumAccordion.tsx
│   ├── WeekCard.tsx
│   ├── SessionCard.tsx
│   ├── AssignmentCard.tsx
│   ├── VocabularyList.tsx
│   ├── LearningOutcomes.tsx
│   ├── ToolsBadges.tsx
│   ├── HowItWorks.tsx
│   ├── StickyEnrollBar.tsx
│   ├── StickyEnrollSidebar.tsx
│   ├── EnrollButton.tsx
│   ├── PriceDisplay.tsx
│   └── AvailabilityBadge.tsx
├── auth/
│   ├── AuthForm.tsx
│   ├── AuthGuard.tsx
│   └── AdminGuard.tsx
├── admin/
│   ├── AdminLayout.tsx
│   ├── AdminNav.tsx
│   ├── StatCard.tsx
│   ├── CourseUploader.tsx
│   ├── ParsePreview.tsx
│   ├── SessionEditor.tsx
│   ├── DataTable.tsx
│   ├── StatusBadge.tsx
│   └── ApplicationCard.tsx

lib/
├── stripe/
│   ├── client.ts                       # Stripe client init
│   └── webhooks.ts                     # Webhook verification helpers
├── courses/
│   ├── parser.ts                       # Claude API parsing logic
│   ├── queries.ts                      # Supabase queries for courses
│   └── types.ts                        # TypeScript types for course data
├── enrollments/
│   ├── queries.ts                      # Enrollment check/create queries
│   └── types.ts
└── admin/
    └── queries.ts                      # Admin-specific queries

messages/
├── en.json                             # Add learn.*, admin.*, auth.* sections
└── ja.json                             # Add learn.*, auth.* sections (admin is EN-only)
```

---

## 10. i18n Additions

Add to `messages/en.json`:

```json
{
  "learn": {
    "catalog_title": "Learn",
    "catalog_subtitle": "Courses designed to move you from curious to capable.",
    "enroll_now": "Enroll Now",
    "spots_left": "{count} spots left",
    "cohort_full": "Cohort Full — Join Waitlist",
    "starts": "Starts {date}",
    "weeks": "{count} weeks",
    "live_sessions": "{count} live sessions",
    "recorded_lessons": "{count} recorded lessons",
    "what_youll_master": "What You'll Master",
    "tools_youll_learn": "Tools You'll Learn",
    "how_it_works": "How It Works",
    "weekly_curriculum": "Weekly Curriculum",
    "who_is_for": "Who This Course Is For",
    "prerequisites": "Prerequisites",
    "instructor": "Your Instructor",
    "logistics": "Course Logistics",
    "materials": "Materials You'll Receive",
    "week": "Week {number}",
    "unlocks": "Unlocks {date}",
    "locked": "Locked",
    "join_live": "Join Live Session",
    "watch_replay": "Watch Replay",
    "download_transcript": "Download Transcript",
    "download_slides": "Download Slides",
    "homework": "Homework",
    "action_challenge": "Action Challenge",
    "vocabulary": "Key Vocabulary",
    "overview": "Overview",
    "weekly_plan": "Weekly Plan",
    "resources": "Resources",
    "community": "Community",
    "back_to_dashboard": "Back to Dashboard",
    "welcome_back": "Welcome back, {name}",
    "your_courses": "Your Courses",
    "explore_more": "Explore More Courses",
    "continue": "Continue",
    "in_progress": "In Progress",
    "completed": "Completed",
    "upcoming": "Upcoming",
    "live_now": "Live Now",
    "price_usd": "${amount}",
    "price_jpy": "¥{amount}",
    "completion_requirements": "Completion Requirements",
    "cancellation_policy": "Cancellation Policy"
  },
  "auth": {
    "sign_in": "Sign In",
    "sign_up": "Sign Up",
    "email": "Email",
    "password": "Password",
    "name": "Full Name",
    "continue_google": "Continue with Google",
    "or": "or",
    "forgot_password": "Forgot password?",
    "no_account": "Don't have an account?",
    "has_account": "Already have an account?"
  }
}
```

Add corresponding Japanese translations to `messages/ja.json`.

---

## 11. Stripe Configuration

### Products to Create in Stripe Dashboard

For each course, create a Stripe Product with two Prices:
- USD price (e.g., $500.00 → 50000 cents)
- JPY price (e.g., ¥65,000 → 65000 — zero-decimal currency)

Alternatively, use Stripe Checkout with `price_data` (inline pricing) as shown in §4.2 — this avoids pre-creating products and lets the database be the source of truth.

### Webhook Events to Listen For

- `checkout.session.completed` — create enrollment
- `charge.refunded` — update enrollment status

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 12. QA Checklist

### Authentication
- [ ] Sign up with email/password works
- [ ] Sign in with email/password works
- [ ] Google OAuth sign up/in works
- [ ] Auth redirect preserves original destination
- [ ] Protected routes redirect to auth page
- [ ] Admin routes reject non-admin users
- [ ] Session persists across page reloads
- [ ] Session refreshes properly

### Course Catalog & Detail
- [ ] Published courses appear in catalog
- [ ] Draft courses do not appear
- [ ] Course detail page renders all sections
- [ ] Curriculum accordion expands/collapses
- [ ] Availability badge shows correct count
- [ ] "Cohort Full" state works when max reached
- [ ] Price displays correctly in USD and JPY
- [ ] Bilingual content renders in both locales

### Enrollment Flow
- [ ] "Enroll Now" redirects to auth if not logged in
- [ ] Stripe Checkout creates correctly in USD
- [ ] Stripe Checkout creates correctly in JPY
- [ ] Webhook fires and creates enrollment record
- [ ] User redirected to course hub after payment
- [ ] Duplicate enrollment prevented
- [ ] Enrollment count incremented on course

### Student Course Hub
- [ ] Only enrolled students can access
- [ ] Current week calculated correctly from start date
- [ ] Unlocked weeks show full content
- [ ] Locked weeks show title + unlock date only
- [ ] Zoom link visible for upcoming/live sessions
- [ ] Replay embed works for completed sessions
- [ ] Transcript/slides download links work
- [ ] Assignments and vocabulary display correctly
- [ ] All tabs (Overview, Weekly Plan, Resources, Community) work

### Admin Panel
- [ ] Only admins can access `/admin`
- [ ] Dashboard stats are accurate
- [ ] Course list shows all courses with correct status
- [ ] Course.md upload → parse → preview → create flow works end-to-end
- [ ] Session editor updates replay/transcript URLs
- [ ] Student list shows enrolled students
- [ ] Application list shows submissions with status management

### Mobile
- [ ] All pages function on iPhone SE (375px)
- [ ] Sticky enroll bar works on mobile
- [ ] Course hub weekly view scrolls properly
- [ ] Touch targets meet 44px minimum
- [ ] No horizontal overflow on any page

---

*HonuVibe.AI — Phase 2A Build Specification v1.0*
*Made in Hawaii with Aloha 🐢*
