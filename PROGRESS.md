# HonuVibe.AI — Build Progress Tracker

**Last updated:** 2026-04-06 (Vertice Society discount at Stripe Checkout, Enroll Now button on dashboard explore cards)

### Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked

---

## Phase 1 — Foundation (Weeks 1–6)

### Scaffolding
- [x] Create Next.js project with TypeScript, Tailwind, App Router
- [x] Configure next-intl with `[locale]` routing and EN/JA message files
- [x] Set up Tailwind config with full design system tokens
- [x] Create `globals.css` with CSS variables for dark/light mode and animations
- [x] Build ThemeProvider component
- [x] Configure Supabase client (browser + server clients)
- [!] Create Sanity.io project and deploy blog schema — blocked on CMS decision

### Brand & Design
- [x] Finalize brand identity (logo, color palette, type system)
- [ ] Source/create photography for HonuHub and team
- [x] Design Honu (turtle) SVG mark for scroll companion and branding

### UI Components
- [x] Button (primary, ghost, gold variants)
- [x] Input, Select, Textarea
- [x] Card, Tag, Overline
- [x] SectionHeading, Divider
- [x] IconButton
- [x] Modal (centered overlay, backdrop blur, scroll lock, Escape key, scale animation)

### Layout Components
- [x] Nav (fixed, glass effect, hamburger on mobile) — 6 links: HonuHub, Explore, Build, Learn, About, Contact
- [x] MobileMenu (full-screen overlay)
- [x] Footer (compact horizontal layout — brand left, 3 link columns right, wide container) — Navigate (HonuHub, Explore, Learn, Community), Resources (Resources, Blog, About, Contact), Legal
- [x] ThemeToggle (sun/moon, persists to localStorage)
- [x] LangToggle (EN/JP, persists to cookie)
- [x] Container, Section wrappers

### Ocean Components
- [x] OceanCanvas (2D canvas, animated waves/caustics/particles)
- [x] HonuMark (geometric SVG turtle)
- [x] HonuCompanion (fixed scroll-tracking turtle, hidden when authenticated)
- [x] ~~DepthIndicator~~ — removed, replaced by styled browser scrollbar
- [x] Custom scrollbar (teal-to-gold gradient thumb, themed track, Webkit + Firefox)

### Signature Interactions
- [x] Section reveal animations (IntersectionObserver)
- [x] Scroll-depth color journey (background transitions)
- [x] Glass navigation (transparent → blur on scroll)
- [x] Gradient text shimmer (teal → gold on hero)
- [x] Hawaii time-aware hero theming
- [x] Theme toggle cross-fade transition
- [x] Lighthouse hero background (canvas starfield, Hawaiian island silhouettes, sweeping beam with lens flare, Hokule'a guiding star)

### Pages (EN + JA)
- [x] Homepage — Hero, MissionStrip, HonuHub feature, Featured Courses, Exploration preview, Ryan bio, Newsletter, Social proof
- [x] HonuHub — Hero (opening badge, notify modal, glow orbs), about (real photo), three modes, upcoming events (4 placeholder), remote learning (i18n), membership tiers, location + contact form
- [x] Exploration Island — Lighthouse hero (canvas starfield, 3 Hawaiian island silhouettes, sweeping beam, Hokule'a star, ocean gradient), 2× featured builds (KwameBrathwaite + HCI Medical Group, side-by-side cards), bottom CTA strip linking to Build page. Restructured: territory grid, tech showcase, process timeline, and lead form moved to Build page.
- [x] Build — Hero (gradient bg, dual CTAs), 5 territory cards (accent colors, "See examples" links), tech logo grid (grayscale + hover), 5-step process timeline (horizontal desktop / vertical mobile), 3 engagement cards (Project Build, Consulting, Pro-Bono), proof strip (stats), full inquiry form (shared ApplicationForm with source_page tracking), advisory link to /apply. Full i18n (EN + JP), SEO metadata, Plausible analytics events, sitemap entry.
- [x] About — Brand-first redesign: HonuHub-style hero, Mission & Vision, Aloha Standard, Core Competencies + consulting CTA, Founder bio, social links
- [!] Blog index — Blocked on CMS decision (Sanity.io or Payload)
- [!] Blog post — Blocked on CMS decision
- [x] Community — Hero, about, member stories, impact wall, pro-bono spotlight, free/paid tiers, Skool CTA
- [x] Apply to Work Together — Full application form with all fields from PRD, validation, confirmation flow
- [x] Privacy Policy
- [x] Terms of Service
- [x] Cookie Notice

### Blog Content
- [!] Configure CMS blog schema — blocked on CMS decision
- [ ] Write 3–5 launch blog posts (EN)
- [ ] Set up ISR with 60s revalidation

### Infrastructure
- [x] Sitemap (dynamic, both locales, hreflang)
- [x] robots.txt
- [x] llms.txt (AI discoverability)
- [x] JSON-LD structured data (Organization + WebSite schema in layout)
- [x] OpenGraph + Twitter Cards metadata
- [ ] Dynamic OG image generation route (`/api/og`)
- [ ] RSS feed route for blog (blocked on blog/CMS)
- [ ] Plausible analytics integration with custom events
- [ ] Vercel Analytics integration
- [x] Beehiiv newsletter signup API route (ready — needs BEEHIIV_API_KEY env var)
- [x] Apply form API route (ready — needs Supabase for persistence)
- [ ] Vercel deployment configured
- [x] Load projects into Exploration Island (7 placeholder projects across 5 territories)
- [~] Full EN site QA and performance testing
  - [x] Fix horizontal scroll overflow (added `overflow-x: hidden` to `html`/`body`, clipped glow orbs in hero + bio sections)

---

## Phase 1.5 — Japan Market (Weeks 5–10)

### Translations
- [x] Complete `ja.json` message file for all UI strings (all pages translated)
- [ ] Translate Homepage (human-reviewed)
- [ ] Translate HonuHub page (human-reviewed)
- [ ] Translate Exploration Island project descriptions (human-reviewed)
- [ ] Translate About Ryan page (human-reviewed)
- [ ] Translate Apply page (human-reviewed)
- [ ] Translate Community page (human-reviewed)
- [ ] Translate Privacy Policy (APPI-compliant, human-reviewed)
- [ ] Translate Terms of Service (human-reviewed)
- [ ] Translate Cookie Notice (human-reviewed)

### JP-Specific Features
- [ ] LINE share button on blog posts
- [x] JP typography rules applied (line-height, letter-spacing via Noto Sans JP)
- [x] Browser language detection — via next-intl middleware Accept-Language header

### SEO & Compliance
- [x] Validate hreflang tags across all pages (via sitemap alternates)
- [ ] JP meta descriptions and keyword optimization
- [ ] APPI-compliant privacy policy live
- [ ] Japanese-language privacy contact method
- [ ] CDN latency testing for Japan edge nodes

### Blog (JP)
- [ ] Begin translating EN blog posts to JP
- [ ] Target: JP translations within 1–2 weeks of EN publish

---

## Glossary — AI Terminology Feature

### Foundation
- [x] TypeScript types: `GlossaryCategory`, `GlossaryDifficulty`, `GlossaryTermSummary`, `GlossaryTermRef`, `GlossaryTerm` (`lib/sanity/types.ts`)
- [x] GROQ queries: `glossaryIndexQuery`, `glossaryTermQuery`, `glossarySlugQuery` (`lib/sanity/queries.ts`)
- [x] JSON-LD helpers: `generateGlossaryCollectionSchema` (CollectionPage), `generateDefinedTermSchema` (DefinedTerm) (`lib/json-ld.ts`)
- [x] i18n strings: 32 keys EN + 32 keys JP in `glossary` namespace + footer links (`messages/en.json`, `messages/ja.json`)

### Components (7 new)
- [x] `DifficultyBadge` — Server component, wraps Tag with difficulty-based color (teal/gold/default)
- [x] `GlossaryTermCard` — Server component, full-width row link with abbreviation, JP term, definition, badge
- [x] `GlossarySearch` — Client component, search input + category filter pills, 150ms debounce, analytics events
- [x] `GlossaryAlphaNav` — Client component, A-Z sticky letter row, IntersectionObserver tracking, disabled inactive letters
- [x] `RelatedTerms` — Client component, chip row of linked related terms with analytics
- [x] `GlossaryIndexContent` — Client orchestrator, owns filter state, groups terms by letter, renders all subcomponents
- [x] `GlossaryTermAnalytics` — Client component, renders null, fires `glossary_term_view` event on mount

### Pages
- [x] `/glossary` — Index page with ISR 60s, CollectionPage JSON-LD, SectionHeading + GlossaryIndexContent
- [x] `/glossary/[slug]` — Term detail with ISR 60s, DefinedTerm JSON-LD, generateStaticParams, full bilingual content, Why It Matters + Example callouts, RelatedTerms, Go Deeper links

### Integration
- [x] Footer: glossary link in RESOURCES column (both locales)
- [x] Redirects: `/dictionary`, `/ai-glossary` (+ `/ja/` variants) → `/glossary`
- [x] Sitemap: `/glossary` static route + dynamic term entries (priority 0.6, monthly)
- [x] `llms.txt`: glossary added to Key Pages + Topics sections

### Tests (26 tests across 5 files)
- [x] `DifficultyBadge.test.tsx` — 6 tests: label rendering, color mapping per difficulty
- [x] `GlossaryTermCard.test.tsx` — 8 tests: abbreviation display, full term, JP term, links, badge
- [x] `GlossarySearch.test.tsx` — 4 tests: search input, category pills, debounced callback, active styling
- [x] `GlossaryAlphaNav.test.tsx` — 4 tests: 26 letters, disabled/enabled states, muted styling
- [x] `RelatedTerms.test.tsx` — 4 tests: chip rendering, abbreviation display, empty state, link URLs

### Verification
- [x] TypeScript: zero errors (`npx tsc --noEmit`)
- [x] Full test suite: 103/103 passed (26 glossary + 77 existing)
- [x] Production build: clean, `/glossary` and `/glossary/[slug]` in build output with ISR

---

## Phase 2A — Cohort Course Platform (LMS Core)

### Stage 1: Database Schema & Types
- [x] Full Supabase migration for all Phase 2A/2B/2C tables (`supabase/migrations/001_phase2_schema.sql`)
- [x] RLS policies for all user-facing tables
- [x] TypeScript types: courses, enrollments, content, paths, admin (`lib/*/types.ts`)
- [x] Users table with trigger on `auth.users` insert
- [x] GIN indexes on JSONB columns

### Stage 2: Authentication
- [x] Supabase Auth (email/password + Google OAuth)
- [x] Auth middleware — locale detection → session refresh → route protection
- [x] Login/signup page at `/learn/auth` with tab toggle
- [x] OAuth callback handler at `/api/auth/callback`
- [x] AuthGuard (session check) and AdminGuard (role check) server components
- [x] Protected routes: `/learn/dashboard/*`, `/learn/account`, `/admin/*`
- [x] i18n strings for auth namespace (EN + JA)
- [x] Forgot password flow — "Forgot password?" link on sign-in, sends reset email via `supabase.auth.resetPasswordForEmail()`
- [x] Password reset page at `/learn/auth/reset` — new password + confirm form via `supabase.auth.updateUser()`
- [x] Branded auth emails via Resend SMTP — custom HTML templates for reset password, confirm signup, magic link, change email (dark theme, teal accent, HonuVibe.AI branding)
- [x] Resend domain verified (`honuvibe.ai`) + Supabase custom SMTP configured (sender: `hello@honuvibe.ai`)

### Stage 3: Data Layer (Queries + Server Actions)
- [x] Course queries: `getPublishedCourses`, `getCourseBySlug`, `getCourseWithCurriculum`, `getAdminCourses`, `getAdminCourseById`
- [x] Course actions: `updateCourse`, `publishCourse`, `unpublishCourse`, `archiveCourse`, `updateCourseSession`, `createCourseFromParsedData`
- [x] Enrollment queries: `getUserEnrollments`, `checkEnrollment`, `getEnrollmentByCourseId`
- [x] Enrollment actions: `simulatedEnroll`, `cancelEnrollment`
- [x] Admin queries: `getDashboardStats`, `getStudentList`, `getStudentDetail`, `getApplications`
- [x] Admin actions: `updateApplicationStatus`, `manualEnroll`, `updateSessionContent`

### Stage 4: Course Catalog & Detail Pages (Public)
- [x] `/learn` — Course catalog with hero section (gradient + glow orbs), "3 Ways to Learn" tier cards (Courses/Vault/Library), level filter pills, CourseCard grid
- [x] `/learn/[slug]` — Full course detail page with full-bleed hero header (background image + gradient overlays, breadcrumb), outcomes, tools, curriculum, instructor, logistics, materials
- [x] 15 learn components: CourseCard (next/image, Link wrapping, hover zoom + teal title, SVG fallback), CourseDetailHero (full-bleed image with gradient overlays, breadcrumb, glow orb fallback), LevelFilter (URL-based pill filters via searchParams), CurriculumAccordion, LearningOutcomes, ToolsBadges, HowItWorks, EnrollButton, PriceDisplay, AvailabilityBadge, StickyEnrollBar, StickyEnrollSidebar (with thumbnail image)
- [x] Auth-aware enrollment button (redirect to login if not authenticated)
- [x] Locale-aware price display (USD primary for EN, JPY primary for JA)
- [x] `hero_image_url` field now rendered in CourseDetailHero (falls back to thumbnail_url, then glow orbs)
- [x] i18n strings for learn namespace — 84+ strings (EN + JA)

### Stage 5: Student Dashboard & Course Hub
- [x] `/learn/dashboard` — Enrolled courses with progress bars + explore more section
- [x] `/learn/dashboard/[course-slug]` — Course hub with tabbed interface
- [x] Dashboard layout with AuthGuard wrapper
- [x] Tab navigation: Overview, Weekly Plan, Resources, Community
- [x] WeekCard with states: current, completed, locked, upcoming
- [x] SessionCard with states: upcoming, live-soon, live, completed
- [x] AssignmentCard (homework, action-challenge, project types)
- [x] VocabularyList (EN/JP term pairs)
- [x] Week unlock logic: `courseStartDate + (weekNumber - 1) * 7 days`
- [x] Resources tab: consolidated materials from all unlocked weeks
- [x] Community tab: platform links + Zoom link (post-enrollment only)

### Stage 6: Enrollment Flow (Simulated Stripe)
- [x] Simulated enrollment Server Action (auth check → capacity check → create enrollment → increment count)
- [x] EnrollButton handles full flow: auth redirect → enroll → dashboard redirect
- [x] Skeleton Stripe files for future integration:
  - [x] `lib/stripe/client.ts` — placeholder
  - [x] `app/api/stripe/webhook/route.ts` — skeleton webhook handler
  - [x] `app/api/stripe/checkout/route.ts` — skeleton checkout route

### Stage 7: Admin Panel — Layout & Dashboard
- [x] Admin layout with AdminGuard + sidebar/bottom navigation
- [x] `/admin` — Dashboard with stat cards (active courses, total enrolled, upcoming sessions, pending applications)
- [x] Recent enrollments feed + upcoming sessions feed
- [x] Course capacity overview + quick actions panel
- [x] Shared admin components: StatCard, StatusBadge, DataTable

### Stage 8: Admin — Course Management
- [x] `/admin/courses` — Course list with status filter tabs
- [x] `/admin/courses/[id]` — Course detail with Overview, Curriculum, Students tabs
- [x] SessionEditor — Inline form for replay URL, transcript, slides, status
- [x] ManualEnrollForm — Add student by user ID (comp/scholarship)
- [x] Publish/Unpublish/Archive course actions

### Stage 9: Admin — Course.md Upload Pipeline (AI Parser)
- [x] `/admin/courses/upload` — 3-step upload flow (Upload → Preview → Confirm)
- [x] CourseUploader — Drag-drop zone + markdown paste area
- [x] Claude API parser (`lib/courses/parser.ts`) — system prompt for structured extraction
- [x] `/api/admin/courses/parse` — API route: receive markdown → Claude API → return parsed JSON
- [x] `/api/admin/courses/create` — API route: transactional insert across all course tables
- [x] ParsePreview — Rendered preview with inline editing + start date picker
- [x] Upload tracking via `course_uploads` table (parsing → parsed → confirmed)
- [x] Course Builder Template (`public/downloads/course-template.md`) — AI-guided interview prompt
  - [x] AI Coaching Rules — LLM always offers improved alternative for every major text field (titles, descriptions, outcomes, assignments, themes) with reasoning, user picks preferred version
  - [x] Mismatch detection — flags inconsistencies (e.g., advanced level with no prerequisites, bilingual course missing vocabulary)
  - [x] Phase 4 Summary Review & Acceptance — structured summary card, quality concern flags, explicit user confirmation required before generating final markdown

### Stage 10: Admin — Students & Applications
- [x] `/admin/students` — Student table with search by name/email
- [x] `/admin/students/[id]` — Student detail (profile, enrollments, manual actions)
- [x] `deleteStudent()` — fetches enrollments before deletion, decrements `current_enrollment` on each course, then removes enrollment rows (fix: count was not decremented on student delete)
- [x] `/admin/applications` — Application list with status filter tabs
- [x] ApplicationCard — Expandable detail with status management + admin notes
- [x] Status workflow: received → reviewing → responded → archived

### Stage 11: Course Image Management
- [x] Supabase Storage bucket `course-images` with RLS (public read, admin write) — `supabase/migrations/003_course_images_storage.sql`
- [x] Next.js image config updated for `*.supabase.co` storage URLs
- [x] `/api/admin/courses/upload-image` — Image upload API route (JPEG/PNG/WebP/AVIF, size validation, upsert to Storage)
- [x] `/api/admin/courses/generate-image` — AI image generation via Google Gemini (topic-focused prompt with course title, description, tools, level mood)
- [x] CourseImageUploader component — Drag-drop upload, AI generate, replace, remove, loading states
- [x] Admin course detail page — "Course Images" section on Overview tab (thumbnail 16:9 + hero 21:9)
- [x] CourseCard and DashboardCourseCard already render `thumbnail_url` conditionally

---

## Phase 1.75 — Newsletter Archive

- [x] TypeScript types: `NewsletterIssue`, `NewsletterIssueSummary`, `NewsletterAdjacent` (`lib/sanity/types.ts`)
- [x] GROQ queries: `newsletterIndexQuery`, `newsletterIssueQuery`, `newsletterAdjacentQuery`, `newsletterSlugQuery` (`lib/sanity/queries.ts`)
- [x] i18n strings: 25 keys in newsletter + footer namespaces (EN + JP)
- [x] `/newsletter` — Archive index page (SSG/ISR 60s, CollectionPage JSON-LD)
- [x] `/newsletter/[slug]` — Individual issue page (SSG/ISR 60s, Article JSON-LD, generateStaticParams)
- [x] `NewsletterIssueCard` component — issue card for index page
- [x] `IssueNavigation` component — prev/next issue links
- [x] `IssueShareButtons` client component — X, LinkedIn, LINE, Copy Link with analytics
- [x] `NewsletterSubscribeBlock` client component — reuses existing Beehiiv `/api/newsletter/subscribe`
- [x] Footer: Newsletter link added to Resources column
- [x] Sitemap: `/newsletter` index + dynamic issue slugs from Sanity
- [x] Redirects: `/emails`, `/archive` → `/newsletter` (EN + JP)
- [x] `llms.txt`: Newsletter Archive + Course Catalog URLs added
- [x] `robots.ts`: `/admin/` added to disallow list
- [x] Unit tests: 3 test files, 21 tests (NewsletterIssueCard, IssueNavigation, NewsletterSubscribeBlock)
- [ ] Sanity Studio: deploy `newsletterIssue` schema (manual step)
- [ ] Content: publish 5+ issues in Sanity Studio (manual step)

---

## HonuHub Page Enhancements

### Hero Section
- [x] Fixed double-padding bug — removed internal `py-16 md:py-24` that stacked with Section wrapper's 64px/96px padding
- [x] Background gradient now covers full section (moved from inner div to Section className)
- [x] Added glow orbs (teal top-right, gold bottom-left) using existing `.glow-orb` CSS class
- [x] "Opening April 3, 2026" badge — teal pill with pulsing gold dot
- [x] Replaced "Book a Session" CTA → "Update Me on the Hub" with Bell icon + newsletter modal
- [x] Localized location pin text (was hardcoded English)

### Newsletter Notify Modal
- [x] New reusable `Modal` component (`components/ui/modal.tsx`) — `fixed inset-0 z-[300]`, backdrop blur, scroll lock, Escape key, scale transition
- [x] Modal exported from `components/ui/index.ts`
- [x] `HonuHubNotifyForm` component (`components/sections/honuhub/honuhub-notify-form.tsx`) — reuses `/api/newsletter/subscribe`, fires `trackEvent('newsletter_signup', { source_page: 'honuhub_notify' })`, auto-closes modal 2s after success

### Sessions → Upcoming Events
- [x] Replaced "coming soon" placeholder with 2×2 event card grid (4 placeholder events: Grand Opening Week, Intro to AI, Community Meetup, Corporate AI Strategy)
- [x] Each card: left accent bar, colored icon, date/title/description, type + time metadata
- [x] Container upgraded to `wide` (1100px) for better card layout
- [x] "View Full Course Catalog" link retained below grid

### Remote Section i18n Fix
- [x] Replaced 3 hardcoded English feature strings with `t('features.streaming')`, `t('features.recording')`, `t('features.interactive')`

### About Section
- [x] Replaced gradient placeholder with actual `honu_hub.jpg` image via `next/image`

### Other
- [x] Hidden "Global HonuHub Network" (Future) section — component file retained for future use
- [x] i18n: added 30+ new keys to both `messages/en.json` and `messages/ja.json` (hero badge, modal, events, remote features)

### Files Modified/Created
- `components/ui/modal.tsx` (new)
- `components/ui/index.ts` (Modal export)
- `components/sections/honuhub/honuhub-notify-form.tsx` (new)
- `components/sections/honuhub/honuhub-hero.tsx` (spacing, badge, CTA, glow orbs)
- `components/sections/honuhub/honuhub-about.tsx` (real photo)
- `components/sections/honuhub/honuhub-sessions.tsx` (events grid)
- `components/sections/honuhub/honuhub-remote.tsx` (i18n fix)
- `app/[locale]/honuhub/page.tsx` (removed Future section)
- `messages/en.json`, `messages/ja.json` (new keys)

### Verification
- [x] Production build: clean, zero TypeScript errors

---

## Library — Quick-Learn Video Tutorials

### Foundation
- [x] Supabase migration: `library_videos`, `user_library_favorites`, `user_library_progress` tables with RLS (`supabase/migrations/005_library_videos.sql`)
- [x] TypeScript types: `LibraryVideoCategory`, `LibraryAccessTier`, `LibraryDifficulty`, `LibraryVideo`, `LibraryVideoWithUserState`, `LibraryVideoCardProps` (`lib/library/types.ts`)
- [x] Queries: `getPublishedLibraryVideos`, `getLibraryVideoBySlug`, `getLibraryVideosWithUserState`, `getUserLibraryData`, `getRelatedVideos`, `getLibraryVideoSlugs` (`lib/library/queries.ts`)
- [x] i18n strings: 42+ keys in `library` namespace (EN + JP)
- [x] Seed data: 15 demo videos across 6 categories (`supabase/seed_library_videos.sql`)

### API Routes
- [x] `/api/library/favorite` — POST toggle (add/remove) with auth check
- [x] `/api/library/progress` — POST upsert with auto-complete at 80%

### Components (9 new)
- [x] `ViewedBadge` — Server component, checkmark overlay (Lucide Check)
- [x] `FavoriteButton` — Client component, heart toggle with optimistic UI
- [x] `AccessGate` — Client component, blurred thumbnail + signup overlay with analytics
- [x] `LibraryPlayer` — Client component, placeholder player with simulated progress timer, real API calls at 25/50/75/80%
- [x] `LibraryVideoCard` — Server component, thumbnail + duration/viewed/lock/progress overlays
- [x] `LibraryFilter` — Client component, search input + category pills with debounced analytics
- [x] `LibraryContent` — Client wrapper for index page, manages filter/search state
- [x] `RelatedVideos` — Server component, heading + 3-column grid
- [x] `MyLibrarySection` — Client component, Continue Watching / Favorites / Recently Watched

### Pages
- [x] `/learn/library` — Library index (server component, CollectionPage JSON-LD, auth-aware user state)
- [x] `/learn/library/[slug]` — Video detail (server component, VideoObject JSON-LD, access tier check, related videos)
- [x] `/learn/dashboard/my-library` — Dashboard tab (auth-protected, user library data)

### Integration
- [x] Footer: Library link added to RESOURCES column
- [x] Learn page: "Browse the Library" CTA below hero
- [x] Student dashboard nav: 7th item "My Library" (PlaySquare icon, after Resources)
- [x] Redirects: `/tutorials`, `/library`, `/videos` → `/learn/library` (EN + JP variants)
- [x] Sitemap: `/learn/library` static route + dynamic video slug entries (priority 0.6)
- [x] JSON-LD: `generateLibraryCollectionSchema` (CollectionPage) + `generateLibraryVideoSchema` (VideoObject)

### Tests (31 tests across 5 files)
- [x] `ViewedBadge.test.tsx` — 3 tests
- [x] `FavoriteButton.test.tsx` — 4 tests
- [x] `AccessGate.test.tsx` — 6 tests
- [x] `LibraryVideoCard.test.tsx` — 11 tests
- [x] `LibraryFilter.test.tsx` — 7 tests

### Verification
- [x] TypeScript: zero errors (`pnpm tsc --noEmit`)
- [x] Full test suite: 103/103 passed (31 library + 72 existing)
- [x] Production build: clean, `/learn/library` and `/learn/library/[slug]` in build output
- [ ] Video hosting integration (placeholder player — needs MUX or Vimeo decision)
- [x] Admin UI for video content management (list, detail/create, publish/unpublish, delete)

### Admin Library Management
- [x] Server actions: `createLibraryVideo`, `updateLibraryVideo`, `publishLibraryVideo`, `unpublishLibraryVideo`, `deleteLibraryVideo` (`lib/library/actions.ts`)
- [x] Admin queries: `getAdminLibraryVideos`, `getAdminLibraryVideoById` (`lib/library/queries.ts`)
- [x] Input types: `LibraryVideoCreateInput`, `LibraryVideoUpdateInput` (`lib/library/types.ts`)
- [x] Thumbnail upload API: `/api/admin/library/upload-thumbnail` (Supabase Storage)
- [x] `/admin/library` — List page with search, status/featured filters, DataTable
- [x] `/admin/library/[id]` — Detail/edit page with form sections (core info, video content, classification, relations)
- [x] `/admin/library/new` — Create flow (same page, `video={null}`)
- [x] YouTube embed preview (inline iframe via `youtube-nocookie.com`)
- [x] `AdminLibraryList` component with DataTable, search, filter tabs
- [x] `AdminLibraryDetail` component with tabs (Details/Preview), publish/unpublish/delete actions
- [x] `LibraryThumbnailUploader` component (drag-drop, 16:9, 2MB max)
- [x] AdminNav: Library item added (between Instructors and Students)
- [x] StatusBadge: `featured` and `open` styles added
- [x] i18n: `admin_library` namespace (45+ keys, EN + JP)
- [x] Tests: 2 test files, 16 tests (AdminLibraryList, AdminLibraryDetail)
- [x] Full test suite: 119/119 passed
- [x] Production build: clean, all admin library routes in output
- [ ] Supabase Storage bucket `library-thumbnails` (infrastructure — create in dashboard)

---

## Learn Page Enhancement — Hero Consistency + 3 Ways to Learn

### Hero Consistency
- [x] Gradient background overlay: `bg-gradient-to-br from-accent-teal/10 via-bg-primary to-accent-gold/5` (matches HonuHub hero)
- [x] Fixed heading class: `text-[var(--text-h1)]` → `text-h1` (proper Tailwind token)
- [x] Unified gradient wrapper — encompasses hero text + LearnPathCards as single backdrop
- [x] Bottom fade repositioned after cards for smooth transition into course catalog

### "3 Ways to Learn" Tier Cards
- [x] `LearnPathCards` client component (`components/learn/LearnPathCards.tsx`)
- [x] 3-column responsive grid (`grid-cols-1 md:grid-cols-3`)
- [x] **Courses** card (teal accent) — teacher-led, per-session pricing, scrolls to `#courses` catalog
- [x] **The Vault** card (gold accent) — "Coming Soon" badge, email notify form (reuses Beehiiv `/api/newsletter/subscribe`), `vault_waitlist` analytics event
- [x] **Library** card (blue/territory-db accent) — free tier, links to `/learn/library`
- [x] Each card: colored top accent bar, icon in subtle-bg circle, serif h3, description, price indicator, CTA

### Integration
- [x] Removed standalone library link from hero (replaced by Library tier card)
- [x] Added `id="courses"` scroll anchor to catalog section
- [x] i18n: `learn.paths.*` namespace — 20 keys (EN + JP)
- [x] Reuses: `Section`, `Container`, `SectionHeading`, `Card`, `Button` components

### Files
- **Modified**: `app/[locale]/learn/page.tsx`, `messages/en.json`, `messages/ja.json`
- **Created**: `components/learn/LearnPathCards.tsx`

### Verification
- [x] TypeScript: zero errors
- [x] Production build: clean

---

## Dashboard UX Improvements

### Sticky Sidebar
- [x] AdminNav desktop sidebar: `sticky top-0 h-screen overflow-y-auto` (always visible on scroll)
- [x] StudentNav desktop sidebar: same sticky behavior with collapse support

### Sidebar Controls (Theme, Language, User)
- [x] AdminNav: ThemeToggle, LangToggle, UserMenu added to sidebar bottom (`mt-auto`)
- [x] StudentNav: same controls with collapsed-mode support (icons only when collapsed)
- [x] LangToggle: added `compact` prop — Globe icon button that cycles locale (for collapsed sidebar)
- [x] ~~UserMenu: added `dropdownPosition="above"` prop~~ — replaced with persistent inline links (see "UserMenu: Popup → Persistent Inline Links" section)

### Top Nav Cleanup on Auth Routes
- [x] Desktop: ThemeToggle, LangToggle, UserMenu hidden from top nav bar on admin/dashboard routes (controls in sidebar)
- [x] Mobile: controls remain in top nav bar (no sidebar on mobile)
- [x] Top nav bar on auth routes (desktop): logo only

### Footer Conditional Rendering
- [x] `ConditionalFooter` client wrapper — hides footer on `/admin` and `/learn/dashboard` routes
- [x] Locale layout updated to use `ConditionalFooter` instead of `Footer`

### Files Modified
- `components/layout/conditional-footer.tsx` (new)
- `components/layout/user-menu.tsx` (persistent inline links — no more popup)
- `components/layout/lang-toggle.tsx` (compact prop)
- `components/layout/nav-client.tsx` (hide controls on desktop auth routes)
- `components/admin/AdminNav.tsx` (sticky + sidebar controls)
- `components/learn/StudentNav.tsx` (sticky + sidebar controls)
- `app/[locale]/layout.tsx` (ConditionalFooter)

### Verification
- [x] TypeScript: zero errors
- [x] Full test suite: 119/119 passed
- [x] Production build: clean

---

## Contact Page Improvements

### Hero Consistency
- [x] Upgraded hero to match HonuHub/Learn sub-page pattern: gradient background (`from-accent-teal/10 via-bg-primary to-accent-gold/5`), teal + gold glow orbs
- [x] Added email badge pill (teal border, Mail icon, `hello@honuvibe.ai`)
- [x] Centered layout with Container (default width) instead of narrow

### Social Media Links
- [x] New `ContactSocial` component — 4-column grid (2-col mobile) with icon cards
- [x] Platforms: TikTok, Instagram, YouTube, LinkedIn
- [x] Hover effect: teal border glow + subtle background shift
- [x] Reuses SectionHeading with centered overline + heading

### Form Tightening
- [x] Reduced textarea rows: 6 → 4
- [x] Tightened form gap: `gap-5` → `gap-4`
- [x] Button: `size="lg"` → `size="md"`, left-aligned (`self-start`)

### i18n
- [x] Added `contact_page.social` namespace: `overline` + `heading` (EN + JP)

### Files Modified/Created
- `components/sections/contact/contact-hero.tsx` (gradient, glow orbs, email badge)
- `components/sections/contact/contact-social.tsx` (new — social links grid)
- `components/sections/contact/contact-form.tsx` (tighter spacing, smaller button)
- `app/[locale]/contact/page.tsx` (added ContactSocial)
- `messages/en.json`, `messages/ja.json` (social namespace)

### Verification
- [x] TypeScript: zero errors
- [x] Production build: clean

---

## About Page Redesign — Brand-First, Founder-Second

### Problem
- Old About page led with Ryan Jackson's photo and personal bio — read as a founder bio, not a brand page
- No mention of core competencies, consulting services, or operating values
- Hero was a 2-column photo + name layout, visually inconsistent with other sub-page heroes

### New Page Structure (6 sections)
- [x] **Hero** — HonuHub-style centered hero with gradient background (`from-accent-teal/10 via-bg-primary to-accent-gold/5`), glow orbs, `min-h-[70vh]`, "A Whole New Vibe for AI" headline
- [x] **Mission & Vision** — 2-card layout (teal accent = mission, gold accent = vision) with SectionHeading intro
- [x] **Aloha Standard** — 4-card grid of operating principles (Give Generously, Pro-Bono Is Real Work, Celebrate the Community, Never Fear-Based) with left accent bars and icons
- [x] **Core Competencies + Consulting CTA** — 4-card grid (AI Prototyping, Micro-SaaS Design, AI Integration, AI Education) + gold "Get in Touch" CTA → `/contact`
- [x] **Founder** — Ryan Jackson bio moved down, condensed to 2 paragraphs, photo placeholder, h2 (not h1)
- [x] **Social** — Unchanged (TikTok, Instagram, YouTube)

### i18n
- [x] Full EN + JP translations for all 6 sections (`about_page` namespace restructured)

### Files Created
- `components/sections/about/about-mission.tsx`
- `components/sections/about/about-aloha-standard.tsx`
- `components/sections/about/about-competencies.tsx`
- `components/sections/about/about-founder.tsx`

### Files Modified
- `components/sections/about/about-hero.tsx` (complete rewrite — HonuHub-style centered hero)
- `components/sections/about/index.ts` (updated barrel exports)
- `app/[locale]/about/page.tsx` (new section imports and order)
- `messages/en.json`, `messages/ja.json` (`about_page` namespace replaced)

### Files Deleted
- `components/sections/about/about-story.tsx` (replaced by about-mission)
- `components/sections/about/about-philosophy.tsx` (replaced by about-aloha-standard)
- `components/sections/about/about-work.tsx` (replaced by about-competencies)

### Verification
- [x] TypeScript: zero errors
- [x] Production build: clean, `/en/about` and `/ja/about` in output

---

## Exploration Page — Dual Featured Builds

### Problem
- Single featured project (KwameBrathwaite.com) didn't showcase the full range of our work
- Only one territory represented (arts/culture web redesign)

### Changes
- [x] Refactored `FeaturedBuild` from single 2-column layout to **2-card side-by-side grid**
- [x] Extracted `FeaturedCard` sub-component with independent carousel state per card
- [x] Data-driven via `ProjectConfig[]` array — easy to add/remove projects
- [x] Translation key restructured: `featured_build` → `featured_builds` with `kwame` + `hci` project keys
- [x] Section-level heading added above both cards ("Featured Builds" / "注目プロジェクト")

### Projects
1. **KwameBrathwaite.com** — Photography archive redesign (status: "In Development", pulsing dot)
2. **HCI Medical Group** — Healthcare platform + custom project management module (status: "Live", solid dot)

### Layout
- Desktop: `md:grid-cols-2` side-by-side cards
- Mobile: stacked vertically
- Each card: carousel on top → project details below (vertical stack fits 50% width)
- Cards have border + subtle background for visual separation

### Files Created
- `public/projects/hci-medical/screenshot-1.svg`, `screenshot-2.svg`, `screenshot-3.svg` (placeholders)

### Files Modified
- `components/sections/exploration/featured-build.tsx` (full refactor)
- `messages/en.json` (`featured_build` → `featured_builds` + HCI content)
- `messages/ja.json` (`featured_build` → `featured_builds` + HCI JP content)

### Verification
- [x] TypeScript: zero errors
- [x] Production build: clean
- [ ] Replace placeholder SVGs with real HCI Medical Group screenshots

---

## Hybrid Light Mode (Proton Mail Style)

### Approach
Dark-mode-first brand anchors (nav, hero, newsletter CTA, footer) stay dark in both themes. Content sections between them flip to light backgrounds in light mode, inspired by Proton Mail's dark header + light content pattern.

### Page Rhythm in Light Mode
```
Dark:  Nav → Hero
Light: MissionStrip → HonuHubFeature → FeaturedCourses
Light: ExplorationPreview → RyanBioStrip
Dark:  NewsletterSignup (branded CTA band)
Light: SocialProof
Dark:  Footer
```

### Implementation
- [x] `.dark-zone` CSS scope in `styles/globals.css` — forces all CSS variables to dark-mode values inside `.dark-zone` when `[data-theme="light"]` is active
- [x] `.light-zone-fade` CSS — gradient bridge for smooth dark→light transition after hero
- [x] Nav (`components/layout/nav-client.tsx`) — always dark via `dark-zone` class
- [x] Hero (`components/sections/hero-section.tsx`) — always dark via `dark-zone` class
- [x] Footer (`components/layout/footer.tsx`) — always dark via `dark-zone bg-bg-primary`
- [x] Newsletter signup (`components/sections/newsletter-signup.tsx`) — always dark via `dark-zone bg-[#080c18]`
- [x] Mobile menu (`components/layout/mobile-menu.tsx`) — always dark via `dark-zone` class
- [x] Homepage glow dividers (`app/[locale]/page.tsx`) — wrapped in `dark-zone` containers
- [x] MissionStrip wrapped in `light-zone-fade` for smooth hero→content transition

### Files Modified
- `styles/globals.css` (`.dark-zone` variable overrides + `.light-zone-fade` gradient)
- `components/layout/nav-client.tsx`
- `components/sections/hero-section.tsx`
- `components/layout/footer.tsx`
- `components/sections/newsletter-signup.tsx`
- `components/layout/mobile-menu.tsx`
- `app/[locale]/page.tsx`

### Verification
- [x] Production build: clean
- [~] Visual QA: dark mode unchanged, light mode shows dark anchors + light content zones

---

## AI Course Image Generation — Prompt Rewrite

### Problem
- Old prompt forced "completely abstract — no recognizable objects" + rigid brand hex palette
- Every course thumbnail looked the same regardless of topic
- `deriveVisualMotifs()` keyword lookup missed most courses (e.g., chatbot course matched zero keywords)

### Changes
- [x] Removed `deriveVisualMotifs()` — replaced by passing course title + description directly to Gemini
- [x] Renamed `getLevelComplexity()` → `getLevelMood()` — outputs visual mood ("approachable"/"professional"/"sophisticated") instead of abstract shape density
- [x] Added `getDescriptionSnippet()` — first two sentences of description (capped at 250 chars) for richer topic context
- [x] Rewrote `buildImagePrompt()` — topic-first prompt: "Create a high-quality background image for an online course about: {title}: {description}"
- [x] Removed abstract-only constraint — representational visual metaphors now welcome
- [x] Brand colors changed from forced hex values to soft preference ("dark backgrounds, teal/gold welcome if they suit")
- [x] Kept no-text constraint and thumbnail vs hero composition guidance

### Files Modified
- `app/api/admin/courses/generate-image/route.ts` (prompt rewrite)

---

## i18n Provider Fix

### Problem
- Clicking "Japanese" navigated to `/ja` but page content stayed in English
- `NextIntlClientProvider` had no explicit `locale`/`messages` props — relied on implicit server context propagation

### Changes
- [x] `app/[locale]/layout.tsx` — Added `getMessages()` call, passed explicit `locale` and `messages` props to `NextIntlClientProvider`
- [x] `components/layout/nav-client.tsx` — Fixed `usePathname` import from `next/navigation` → `@/i18n/navigation` (consistent with `lang-toggle.tsx`)

---

## The Vault — Content Library

### Phase V0: Database + Admin Foundation
- [x] Schema migration (`011_vault_schema.sql`) — 7 tables (vault_series, vault_downloads, vault_bookmarks, vault_notes, vault_feedback, vault_views, vault_content_requests) + content_items ALTERs
- [x] TypeScript types (`lib/vault/types.ts`) — all interfaces and union types
- [x] Query functions (`lib/vault/queries.ts`) — 17 queries (browse, trending, admin, freshness, tags, series, user state, related items, stats)
- [x] Server actions (`lib/vault/actions.ts`) — 18 actions (CRUD, publish, bookmarks, notes, feedback, views, content requests, series reorder, downloads)
- [x] Access control (`lib/vault/access.ts`) — subscription OR enrollment check
- [x] Admin UI — AdminVaultList, AdminVaultDetail, VaultFreshnessQueue, AdminVaultSeriesDetail + 5 admin pages
- [x] AdminNav — Vault + Series items added

### Phase V1: Core Browse + Detail Pages
- [x] API routes — `/api/vault/browse`, `/api/vault/view`, `/api/vault/downloads/[id]`
- [x] Browse components (11 files) — VaultContentCard, VaultFilters, VaultBrowseGrid, VaultPremiumGate, VaultContentDetail, VaultVideoPlayer, VaultActionBar, VaultFeedbackWidget, VaultDownloadList, VaultSeriesCard, VaultSeriesDetail
- [x] Browse page (`/learn/vault`) — server component, premium gating, free tier preview
- [x] Detail page (`/learn/vault/[slug]`) — full detail with downloads, feedback, related items, series nav
- [x] StudentNav updated to point to `/learn/vault`

### Phase V2: Series + Downloads
- [x] Series API routes — `/api/vault/series`, `/api/vault/series/[slug]`
- [x] Series pages — `/learn/vault/series` (browse), `/learn/vault/series/[slug]` (detail)
- [x] Download tracking via `/api/vault/downloads/[id]`
- [x] Admin series management — AdminVaultSeriesDetail

### Phase V3: Personal Features (Auth-Gated)
- [x] Completion migration (`012_vault_completion.sql`) — adds `completed` bookmark type
- [x] Types update — `VaultBookmarkType` now includes `'completed'`
- [x] Queries update — `getVaultRecentlyViewed(userId)`, `getVaultUserState` checks completion
- [x] Actions update — `markComplete` now functional (uses toggleBookmark pattern)
- [x] Bookmarks API (`/api/vault/bookmarks`) — GET list + POST toggle
- [x] Bookmarks page (`/learn/vault/bookmarks`) — auth-gated grid with empty state
- [x] Watch Later API (`/api/vault/watch-later`) — GET list + POST toggle
- [x] Watch Later page (`/learn/vault/watch-later`) — auth-gated video queue with empty state
- [x] Notes API (`/api/vault/notes`) — GET all + PUT upsert; `/api/vault/notes/[id]` — DELETE
- [x] Notes page (`/learn/vault/notes`) — auth-gated, notes grouped by content item with timestamps
- [x] VaultNoteEditor component — textarea with 2s debounce auto-save, 5000 char limit, timestamp support, save status indicator
- [x] Feedback API (`/api/vault/feedback`) — POST submit/toggle
- [x] VaultRecentlyViewed component — "Continue where you left off" horizontal scroll row on browse page
- [x] VaultCompletionToggle component — mark-as-done button with optimistic update
- [x] VaultContentCard — completion overlay (checkmark badge)
- [x] VaultContentDetail — NoteEditor + CompletionToggle integrated
- [x] VaultSubNav component — pill navigation (Browse, Series, Bookmarks, Watch Later, Notes) on all vault pages
- [x] Build verification — clean compile

### Phase V4: Polish + Intelligence
- [x] Related content priority logic — 4-tier: manual → same series → tag overlap ≥2 → same topic next difficulty
- [x] VaultRelatedItems component — extracted from VaultContentDetail, uses `useTranslations('vault')`
- [x] VaultDifficultyPath component — beginner → intermediate → advanced progression view per tag
- [x] Course-aware recommendations — VaultCourseRecommendations on student dashboard (enrolled courses' tags → vault items)
- [x] Content request system — VaultContentRequest form + `/api/vault/requests` API + VaultContentRequests admin view on freshness page
- [x] Admin VaultRelatedPicker — searchable multi-select for related_item_ids in AdminVaultDetail
- [x] Full i18n — ~85 vault namespace keys in EN + JP (`messages/en.json`, `messages/ja.json`)
- [x] SEO + sitemap — `generateMetadata()` with bilingual alternates on all vault pages, vault item + series slugs in sitemap
- [x] Analytics events — 12 Plausible events: vault_browse, vault_search, vault_item_view, vault_video_play, vault_video_complete, vault_bookmark, vault_watch_later, vault_feedback, vault_download, vault_series_view, vault_premium_gate, vault_subscribe_click
- [x] Library → Vault redirects — `/learn/library` → `/learn/vault`, `/learn/library/[slug]` → `/learn/vault/[slug]`
- [x] Keyboard shortcuts — `/` focus search, `b` bookmark, `j/k` series next/prev (VaultKeyboardShortcuts component)
- [x] VaultAnalyticsTracker — client component for tracking events from server components
- [x] Build verification — clean compile

## Phase 2C — Self-Study Mode

### Library Layer (`lib/paths/`)
- [x] Types — `PathIntakeInput`, `CatalogItem`, `ClaudePathResponse`, `PathStats` (extended existing `lib/paths/types.ts`)
- [x] Zod schemas — Claude response validation (`lib/paths/schemas.ts`)
- [x] Content catalog builder — queries published items, filters by tier (`lib/paths/catalog.ts`)
- [x] Claude generation prompt — v1.1 bilingual prompt with content library + student context (`lib/paths/prompt.ts`)
- [x] Generation orchestrator — Claude API call, JSON extraction, Zod validation, cross-validation, enrolled courses context (`lib/paths/generate.ts`)
- [x] Supabase queries — CRUD, rate limiting (3/day), admin stats, user progress counts, admin user joins (`lib/paths/queries.ts`)
- [x] Premium access check — role, tier, status, grace period (`lib/paths/access.ts`)

### API Routes
- [x] `POST /api/learn/paths/generate` — AI path generation with rate limiting + generation log
- [x] `GET /api/learn/paths` — List user's non-archived paths
- [x] `GET/PUT /api/learn/paths/[id]` — Path detail + archive
- [x] `POST /api/learn/paths/[id]/regenerate` — Regenerate with feedback (archives old path)
- [x] `PUT /api/learn/paths/[id]/items/[itemId]` — Toggle item completion, auto-complete path
- [x] `GET /api/admin/paths` — Admin: all paths with pagination
- [x] `GET /api/admin/paths/stats` — Admin: analytics (totals, completion rate, top topics, top content)

### Student Components (`components/learn/`)
- [x] `GoalTextarea` — controlled textarea with char count (0/500)
- [x] `DifficultySelector` — 3-option radio cards (beginner/intermediate/advanced)
- [x] `FocusAreaChips` — multi-select chips from tags table
- [x] `PathIntakeForm` — composed intake form with language selector
- [x] `PathGenerating` — animated loading state with HonuMark + progress bar
- [x] `PathItemCard` — item card with status (completed/next/upcoming/locked), completion toggle
- [x] `ContentViewer` — YouTube/Vimeo iframe embeds, external link cards
- [x] `PathPreview` — post-generation preview with stats, item list, regenerate feedback
- [x] `PathCard` — dashboard summary card with accurate progress (completed_items count from batch query)
- [x] `StudyPathView` — full path detail with progress bar, grouped items, inline viewer with real URLs, actions
- [x] `PremiumUpgradeCard` — upgrade CTAs (inline/banner variants), wired into dashboard + intake form

### Pages
- [x] `/learn/paths/new` — intake flow page with `PathIntakeFlow` state machine (intake → generating → preview)
- [x] `/learn/paths/[id]` — study path detail page with auth + ownership guard

### Dashboard Integration
- [x] Dashboard page — "Your Study Paths" section with `PathCard` grid + "Create New" link
- [x] `StudentNav` — added "Study Paths" nav item with Route icon

### Admin
- [x] `PathStatsWidget` — analytics widget (totals, rates, top topics, top content items)
- [x] Admin dashboard — added PathStatsWidget
- [x] `AdminNav` — added "Study Paths" nav item
- [x] `/admin/paths` page — table view of all study paths with user info, status, items, difficulty, created date
- [x] `AdminPathsList` component — search, status filter tabs (all/active/completed/archived), DataTable

### i18n
- [x] `study_paths` namespace — 45+ keys (EN + JP) for intake, generating, preview, path view, progress
- [x] `subscription` namespace — 14 keys (EN + JP) for premium upgrade CTAs
- [x] Dashboard keys — `nav_study_paths`, `section_study_paths`, `create_study_path`, `no_study_paths`

### Remaining Items (completed 2026-03-07)
- [x] ContentViewer URL fix — denormalized `item_url`/`item_embed_url` on `study_path_items` (migration `013_path_items_urls.sql`), StudyPathView passes real URLs to ContentViewer
- [x] PathCard progress accuracy — `getUserPaths()` batch-fetches completed item counts, PathCard shows actual % progress
- [x] Admin paths list page — `/admin/paths` with `AdminPathsList` component, `getAllPaths()` joins user email/name
- [x] Premium upgrade touchpoints — `PremiumUpgradeCard` banner on student dashboard (free users), `userTier` prop on `PathIntakeForm` with conditional free_note
- [x] Path generation enrolled courses context — `fetchStudentContext()` queries enrollments + completed items, prompt v1.1 includes `STUDENT CONTEXT` section
- [x] New types — `StudyPathWithProgress`, `AdminStudyPath` in `lib/paths/types.ts`

### Previously Completed
- [x] Stripe subscription integration (premium tier) — Vault $50/mo, webhook handlers, billing dashboard
- [x] Database schema deployed — `study_paths`, `study_path_items`, `path_generation_logs` tables with RLS

### Build Verification
- [x] TypeScript — clean compile
- [x] Next.js build — all routes registered, no errors

---

## Phase 2 — Future Items

### Payments (Real Stripe)
- [x] Stripe Checkout integration (swap simulated → real)
- [x] USD + JPY currency support
- [x] Webhook processing for `checkout.session.completed`
- [x] Vault monthly subscription checkout (`/api/stripe/subscribe`)
- [x] Stripe Customer Portal integration (`/api/stripe/portal`)
- [x] Subscription webhook handlers (`customer.subscription.created/updated/deleted`, `invoice.paid`)
- [x] Payments table migration (`supabase/migrations/008_payments_billing.sql`)
- [x] Vault access helper (`lib/vault/access.ts`) — subscription OR active enrollment
- [x] User billing dashboard (`/learn/dashboard/billing`) — Vault status card, payment history, subscribe/manage buttons
- [x] Admin revenue dashboard (`/admin/revenue`) — stats cards (USD/JPY totals, monthly, active subs/enrollments), transaction table
- [x] Admin student list — subscription status column added
- [x] Billing + revenue i18n keys (EN + JP)
- [x] Student nav — Billing item added
- [x] Admin nav — Revenue item added
- [ ] End-to-end payment flow testing (needs Stripe Price IDs configured)
- [ ] Stripe CLI webhook forwarding testing

### Stripe Embedded Checkout (2026-03-12)
- [x] Replaced hosted Stripe redirect with Embedded Checkout — users stay on HonuVibe throughout payment
- [x] New `/api/stripe/checkout-embed` route — returns `clientSecret` for embedded UI (`ui_mode: 'embedded'`)
- [x] New `/learn/[slug]/checkout` dedicated checkout page — two-column layout (course summary left, Stripe form right)
- [x] New `/learn/[slug]/checkout/return` post-payment handler — verifies session, redirects to dashboard on success
- [x] `CourseCheckoutSummary` component — conversion-optimized left column: thumbnail, price, scarcity (spots remaining, color-coded), learning outcomes, instructor mini-card, trust strip ("Secure checkout · 14-day refund policy")
- [x] `EmbeddedCheckoutForm` client component — wraps `@stripe/react-stripe-js` `<EmbeddedCheckout>` with `fetchClientSecret` callback
- [x] `EnrollButton` updated — paid courses navigate to `/learn/[slug]/checkout` (no more API call + redirect)
- [x] Auth guard on checkout page — unauthenticated users redirect to `/learn/auth?redirect=/learn/[slug]/checkout`
- [x] Bilingual: JP locale uses JPY pricing + Stripe JP locale on embedded form
- [x] Translation keys added: `learn.checkout.*` namespace (EN + JP)
- [x] Installed `@stripe/react-stripe-js` + `@stripe/stripe-js`
- [x] Live Stripe webhook endpoint configured at `https://honuvibe.ai/api/stripe/webhook`
- [x] Live Stripe keys + webhook secret deployed to Vercel environment variables

### Admin Payment Link (2026-04-03 → 2026-04-05)
- [x] New `/api/admin/stripe/send-payment-link` route — generates a Stripe Checkout Session (USD) for a given email and sends the link via Resend
- [x] `ManualEnrollForm` component updated — Send Payment Link form added to admin course Students tab; enter any email to trigger checkout link delivery
- [x] `lib/email/send.ts` / `lib/email/payment-link.ts` — payment-link email sending utilities
- [x] `lib/email/types.ts` — email type definitions
- [x] Fixed Vercel build blocker in payment-link email CTA call (`lib/email/send.ts`)
- [x] Improved API error handling — route now returns actionable admin-facing errors instead of generic `Server error`
- [x] Added publish guard — payment links can only be sent for published courses
- [x] Fixed Stripe expiry window — Checkout link now expires in 23 hours (within Stripe’s `< 24h` requirement)
- [x] Added localized payment-link support — JP option sets Stripe Checkout locale to `ja`, uses JP course title when available, and sends Japanese email copy

### New Student Onboarding Flow (2026-04-05)
- [x] `supabase/migrations/026_onboarded_flag.sql` — `onboarded boolean NOT NULL DEFAULT false` on `users` table (deployed)
- [x] `components/learn/WelcomeScreen.tsx` — full-page takeover for first login: bilingual heading, 3 CTA cards (Courses → main site, Vault, Library), skip link; calls `markOnboarded()` on any action
- [x] `lib/students/actions.ts` — `markOnboarded()` server action sets `onboarded = true` for current user
- [x] `lib/email/types.ts` — `StudentOnboardingEmailData` type
- [x] `lib/email/send.ts` — `sendStudentOnboardingEmail()` — bilingual welcome email with 3 CTA links, sent fire-and-forget on first email confirmation
- [x] `app/api/auth/callback/route.ts` — detects new students (`onboarded = false`), sends welcome email, redirects to `/learn/dashboard?welcome=true`
- [x] `app/[locale]/learn/dashboard/page.tsx` — renders `WelcomeScreen` when `onboarded = false` or `?welcome=true`; normal dashboard for returning students

### Private Course Controls (2026-04-04)
- [x] Migration `025_course_privacy.sql` — `courses.is_private boolean NOT NULL DEFAULT false`
- [x] Public course discovery updated — `getPublishedCourses()` and `getFeaturedCourses()` now exclude private courses from `/learn` and homepage featured-course surfaces
- [x] Admin course detail updated — Overview now shows `Visibility`, `Make Private` toggle, and direct `Share URL`
- [x] Admin courses list updated — explicit `Visibility` column added
- [x] Existing courses remain public by default; private courses stay accessible by direct URL but are hidden from public catalog surfaces

### Admin Course Label Cleanup (2026-04-04)
- [x] `components/admin/AdminCourseList.tsx` — course filter tabs now use explicit labels (`Published`, `In Progress`, `Completed`, etc.)
- [x] `components/admin/StatusBadge.tsx` — status badges now use explicit display strings rather than deriving text from status keys

### Vertice Society — Membership Flag & Stripe Discount (2026-04-06)
- [x] Migration `028_vertice_member.sql` — `users.is_vertice_member boolean NOT NULL DEFAULT false` with descriptive column comment (deployed)
- [x] `lib/courses/types.ts` — `is_vertice_member: boolean` added to `EnrolledStudent` interface
- [x] `lib/courses/queries.ts` — `getEnrolledStudents()` now fetches `is_vertice_member` from users join, returns it on each student record
- [x] `app/api/stripe/checkout/route.ts` — checks `users.is_vertice_member` before creating session; if true and `STRIPE_VERTICE_COUPON_ID` is set, applies coupon via `discounts` array (mutually exclusive with `allow_promotion_codes`)

### Dashboard Explore Cards — Enroll Now Button (2026-04-06)
- [x] `components/learn/CourseCard.tsx` — dashboard variant now renders card as `<div>` wrapper (avoids nested `<a>` elements); CTA block replaced with stacked Enroll Now (teal primary) + View Course (ghost) buttons
- [x] Enroll Now handler — POSTs `{ courseId, locale }` to `/api/stripe/checkout`, redirects to Stripe on success; shows inline error on failure with `…` loading state; `disabled` during inflight request
- [x] Catalog variant unchanged — full card remains a `<Link>` with single View Course button
- [x] i18n: `enroll_now` key added to `learn` namespace in `messages/en.json` ("Enroll Now") and `messages/ja.json` ("今すぐ登録")

### Vault Upsell — Locked Preview Grid (2026-04-05)
- [x] `app/[locale]/learn/vault/page.tsx` — free users now see all published vault items (not just free-tier); removed old `VaultPremiumGate` empty-state pattern
- [x] `components/vault/VaultBrowseGrid.tsx` — added `hasAccess` prop; renders `VaultUpsellBanner` above filters and `VaultUnlockModal` when locked card is clicked
- [x] `components/vault/VaultContentCard.tsx` — new `locked` prop: blurs thumbnail, overlays centered lock icon, renders `<div onClick>` instead of `<Link>` (no navigation for locked items)
- [x] `components/vault/VaultUpsellBanner.tsx` *(new)* — compact teal banner with EN/JP headline, bilingual selling point ("the only AI learning platform with full English & Japanese content"), Subscribe CTA, and "Browse courses" secondary link
- [x] `components/vault/VaultUnlockModal.tsx` *(new)* — modal on locked card click with two unlock paths: Subscribe ($99/month) or enroll in a course (vault included for duration); bilingual, dismisses on Escape/backdrop, tracks analytics
- [x] `components/learn/StudentNav.tsx` — removed Study Paths nav item (feature not yet built)

### Certificates
- [ ] Auto-generated certificate on course completion
- [ ] Public certificate page with shareable URL
- [ ] Certificate OG image generation

### LMS Content
- [ ] First 2–3 courses published via AI upload pipeline
- [ ] Course descriptions translated to JP (via parser)
- [ ] Video replay embed testing (YouTube/Vimeo detection)

---

## Phase 3 — Growth & Scale (Month 4+)

### learn.honuvibe.com Subdomain (URL-Only) — Planned
Plan: `docs/plans/learn-subdomain-migration.md`
- [ ] `middleware.ts` — subdomain detection + path rewriting (`learn.honuvibe.com/dashboard` → serves `/learn/dashboard`)
- [ ] `middleware.ts` + `lib/supabase/server.ts` — cookie `domain: '.honuvibe.com'` so auth session is shared across subdomains
- [ ] `next.config.ts` — optional canonical redirects for `/learn/dashboard`, `/learn/auth`, `/admin` → `learn.` subdomain
- [ ] Vercel: add `learn.honuvibe.com` domain pointing to same deployment
- [ ] DNS: CNAME `learn` → `cname.vercel-dns.com`
- [ ] Supabase Auth: add `https://learn.honuvibe.com/**` to allowed redirect URLs

### Other
- [ ] Exploration Island interactive SVG map (desktop)
- [ ] HonuHub "Future Locations" inquiry page
- [ ] JP course subtitles and video translations
- [ ] Advanced LMS: live session Zoom integration
- [ ] Affiliate/referral program for community members
- [ ] Analytics review and conversion rate optimization

---

## Build Summary

### What's Live
- **16 public page routes** × 2 locales = **32 pages** (SSG) — includes `/glossary`, `/newsletter`, `/learn/library` index + detail routes
- **16 dynamic LMS routes** (learn catalog, course detail, library index, library detail, auth, dashboard, course hub, my-library, admin dashboard, courses, course detail, upload, students, student detail, applications, admin library list, admin library detail)
- **8 Vault routes** (browse, detail, series browse, series detail, bookmarks, watch-later, notes) + 5 admin vault pages + library redirects
- **30+ API routes** including 8 vault APIs: `/api/newsletter/subscribe`, `/api/apply/submit`, `/api/auth/callback`, `/api/admin/courses/parse`, `/api/admin/courses/create`, `/api/admin/courses/upload-image`, `/api/admin/courses/generate-image`, `/api/admin/library/upload-thumbnail`, `/api/admin/esl/update`, `/api/library/favorite`, `/api/library/progress`, `/api/stripe/webhook`, `/api/stripe/checkout`, `/api/stripe/subscribe`, `/api/stripe/portal`, `/api/esl/generate`, `/api/esl/[weekId]`, `/api/esl/[weekId]/publish`, `/api/esl/audio/generate`, `/api/esl/progress`, `/api/esl/purchase`
- **Sitemap + robots.txt + llms.txt**
- **Full design system**: dark/light themes, CSS variables, Tailwind v4 tokens
- **Ocean interactions**: animated canvas, scroll companion (auth-aware), custom themed scrollbar
- **Full i18n**: EN + JA translations for all pages including learn namespace (84+ strings) + glossary (32 keys) + newsletter archive (25 keys) + library (42+ keys) + admin library (45+ keys) + ESL (50+ keys) per locale
- **JSON-LD**: Organization + WebSite + CollectionPage (glossary, newsletter, library) + DefinedTerm (glossary) + Article (newsletter issues) + VideoObject (library) structured data
- **AI Glossary**: bilingual EN/JP terminology reference with search, category filters, A-Z navigation, related terms, SEO-optimized term pages
- **Newsletter Archive**: bilingual EN/JP newsletter archive with issue pages, share buttons, prev/next navigation, subscribe blocks, course CTAs
- **Library**: bilingual EN/JP quick-learn video tutorials with search, category filters, access tier gating, favorite/progress tracking, placeholder player, dashboard tab, related videos
- **Supabase Auth**: email/password + Google OAuth, middleware-based session management, forgot password/reset flow, branded auth emails via Resend SMTP (`hello@honuvibe.ai`)
- **Full LMS**: course catalog (hero + level filters), course detail (full-bleed hero header), enrollment, student dashboard, tabbed course hub
- **Admin panel**: dashboard with stats, course management with session editor, AI-powered course upload, student/application management, library video management (CRUD + YouTube preview + thumbnail upload), ESL lesson management (generate/review/publish per week)
- **AI course parser**: Claude API integration for markdown → structured course data
- **Course image management**: drag-drop upload + AI generation (Gemini), Supabase Storage with RLS

### New File Count (Phase 2A)
- **6 type definition files** (`lib/*/types.ts`)
- **3 SQL migrations** (Phase 2A/2B/2C schemas + RLS fix + course images storage)
- **6 query/action modules** (`lib/courses/`, `lib/enrollments/`, `lib/admin/`)
- **1 AI parser** (`lib/courses/parser.ts`)
- **13 page routes** (`app/[locale]/learn/`, `app/[locale]/admin/`)
- **7 API routes** (`app/api/`)
- **19 learn components** (`components/learn/`)
- **11 admin components** (`components/admin/`)
- **4 auth components** (`components/auth/`) + password reset page (`app/[locale]/learn/auth/reset/`)

### New File Count (Glossary)
- **7 glossary components** (`components/glossary/`)
- **2 page routes** (`app/[locale]/glossary/`, `app/[locale]/glossary/[slug]/`)
- **5 test files** (`__tests__/components/glossary/`) — 26 tests
- **Modified**: types, queries, JSON-LD, i18n (EN+JP), footer, redirects, sitemap, llms.txt

### New File Count (Newsletter Archive)
- **4 newsletter components** (`components/newsletter/`)
- **2 page routes** (`app/[locale]/newsletter/`, `app/[locale]/newsletter/[slug]/`)
- **3 test files** (`__tests__/components/newsletter/`) — 21 tests
- **Modified**: types, queries, i18n (EN+JP), footer, redirects, sitemap, llms.txt, robots.ts

### New File Count (Library)
- **9 library components** (`components/library/`)
- **3 page routes** (`app/[locale]/learn/library/`, `app/[locale]/learn/library/[slug]/`, `app/[locale]/learn/dashboard/my-library/`)
- **2 API routes** (`app/api/library/favorite/`, `app/api/library/progress/`)
- **1 types module** (`lib/library/types.ts`)
- **1 queries module** (`lib/library/queries.ts`)
- **1 SQL migration** (`supabase/migrations/005_library_videos.sql`)
- **1 seed file** (`supabase/seed_library_videos.sql`)
- **5 test files** (`__tests__/components/library/`) — 31 tests
- **Modified**: JSON-LD, i18n (EN+JP), footer, redirects, sitemap, StudentNav, Learn page

### New File Count (Admin Library Management)
- **3 admin components** (`components/admin/AdminLibraryList.tsx`, `AdminLibraryDetail.tsx`, `LibraryThumbnailUploader.tsx`)
- **2 page routes** (`app/[locale]/admin/library/`, `app/[locale]/admin/library/[id]/`)
- **1 API route** (`app/api/admin/library/upload-thumbnail/`)
- **1 server actions module** (`lib/library/actions.ts`)
- **2 test files** (`__tests__/components/admin/`) — 16 tests
- **Modified**: AdminNav, StatusBadge, library types, library queries, i18n (EN+JP)

### Tech Stack
- Next.js 16.1.6 (Turbopack) + React 19.2.3
- TypeScript strict mode
- Tailwind CSS v4 (inline @theme tokens)
- next-intl 4.8.3 (URL-based locale routing)
- Supabase (PostgreSQL + Auth + RLS + Storage)
- Claude API (course markdown parser — claude-sonnet-4, ESL content generator — claude-sonnet-4)
- OpenAI TTS API (ESL pronunciation audio — tts-1, nova voice)
- Google Gemini API (course image generation — gemini-3-pro-image-preview)
- Lucide React icons

### Architecture
- **Server Components** for data fetching (catalog, detail, dashboard, admin pages)
- **Server Actions** for mutations (enrollment, course CRUD, admin actions)
- **API Routes** only for external integrations (Claude API, Stripe, OAuth callback)
- **Client Components** only for interactivity (forms, accordions, tabs, buttons with state)

### Blocked Items
- Blog (need CMS decision: Sanity.io vs Payload)
- Real Stripe payments (skeleton ready, need Stripe account)
- Vercel deployment (need domain + org setup)
- Plausible analytics (need account setup)
- Claude API parsing (need `ANTHROPIC_API_KEY` env var)

---

## Floating Tech Showcase (Reusable Pattern)

### Effect
Organic floating icon layout with underwater theme — icons bob with staggered framer-motion animations, appear dimmed by default, and glow on hover with brand color + drop-shadow. An auto-illuminate cycle randomly highlights one icon every 3 seconds, pausing when user hovers.

### Key Behaviors
- **Bobbing**: framer-motion `animate={{ y: [0, -12, 0] }}` with staggered durations (3.5–5.5s) and delays per icon
- **Dimmed default**: `text-fg-secondary/50` — visible but muted
- **Hover glow**: full brand color + `drop-shadow(0 0 20px <color>)` + blurred glow circle behind icon
- **Dim siblings**: `group/container` pattern — `group-hover/container:opacity-20` with `hover:!opacity-100`
- **Auto-illuminate**: `useState`/`setInterval` picks random icon every 3s, applies glow; pauses on container hover
- **Labels**: hidden by default, fade in below icon on hover/auto-illuminate
- **Accessibility**: `useReducedMotion` disables all animation + auto-illuminate
- **Deep water gradient**: `bg-gradient-to-b from-transparent via-bg-primary/80 to-bg-primary` overlay

### Files
- `components/sections/exploration/tech-stack-showcase.tsx` — main component (currently Exploration-specific)
- `components/sections/exploration/tech-icon.tsx` — 12 SVG icons using `currentColor`

### Reuse Notes
To use this effect elsewhere (e.g., homepage, about page, course landing pages):
1. Extract floating layout + auto-illuminate logic into a generic `FloatingIconShowcase` component
2. Accept `items: { icon: ReactNode; color: string; label: string }[]` as props
3. Keep `TechIcon` for tech-specific usage, but the floating/glow pattern is icon-agnostic
4. The `scales`, `offsets`, `durations` arrays can be auto-generated based on item count

### Dependencies
- `framer-motion` (already installed — v12.34.3)

---

## Lighthouse Hero Background

### Effect
Cinematic Hawaiian night-sky scene behind the Exploration hero. Canvas-rendered starfield for performance, framer-motion beam sweep for the lighthouse, and layered SVG island silhouettes for depth.

### Layers (bottom to top)
1. **Base fill** — hardcoded `#02050f` (always nocturnal, ignores theme toggle)
2. **Sky gradient** — top 60%, three-stop navy gradient
3. **Star canvas** — 150 twinkling stars via `<canvas>` RAF loop (follows `ocean-canvas.tsx` pattern)
4. **Hokule'a star** — amber guiding star with subtle pulse animation
5. **Ocean gradient** — bottom 40%, dark gradient with SVG noise shimmer + teal horizon glow
6. **Island silhouettes** — 3 layered SVGs with smooth bezier curves: far rolling ridges, Diamond Head volcanic cone, Mokulua twin humps
7. **Lighthouse** — tower structure with sweeping 3D beam (`rotateY` + `rotateZ`, 12s cycle), inner bright beam, lens flare
8. **Vignette** — radial gradient darkening edges for cinematic focus

### Key Behaviors
- **Stars**: canvas RAF loop, each star oscillates alpha via `sin(frame * speed + phase)`
- **Beam sweep**: framer-motion `rotateY: [0, 60, 0]` with `perspective: 1000px` wrapper, `mix-blend-screen`
- **Lens flare**: pulsing blur circle synced to beam cycle
- **Reduced motion**: static stars at dim alpha, beam and flare hidden entirely
- **Hardcoded palette**: always dark — lighthouse scene is nocturnal regardless of theme

### Files
- `components/sections/exploration/lighthouse-background.tsx` — full component (canvas + motion.div)
- `components/sections/exploration/exploration-hero.tsx` — imports and renders `<LighthouseBackground />`

### Dependencies
- `framer-motion` (v12.34.3 — already installed)

---

## Build Page + Explore Page Restructure (2026-03-04)

### Rationale
The Exploration page was carrying two jobs: portfolio (social proof) and capabilities pitch (conversion). These serve different visitors at different stages, so they've been split into dedicated pages:
- **Explore** (`/explore`) — Pure portfolio: "Look at what they've built"
- **Build** (`/build`) — Capabilities + conversion: "Here's how they can build for me"

### Build Page Sections
1. **BuildHero** — Gradient background, "From Idea to Launch" headline, dual CTAs (Start a Project → #inquire, See Our Work → /explore)
2. **TerritoryCards** — 5 territory cards (Web, Database, SaaS, Automations, Pro-Bono) with accent colors and "See examples" links
3. **TechLogoGrid** — Grayscale tech logos with hover color reveal (migrated from Explore)
4. **BuildProcessTimeline** — 5-step timeline: Discovery → Blueprint → Build → Launch → Grow (horizontal desktop, vertical mobile)
5. **EngagementCards** — 3 cards: Project Build, Strategic AI Guidance, Nonprofit & Community
6. **ProofStrip** — 3 stats (20+ projects, 3 countries, 60% time saved)
7. **InquirySection** — Full ApplicationForm with source_page tracking (shared with /apply)
8. **AdvisoryLink** — Subtle link to /apply for strategic engagements

### Explore Page Changes
- **Removed**: TechStackShowcase, ProcessTimeline, TerritoryGrid, ExplorationCta (all moved to Build)
- **Removed**: ExplorationLeadForm modal from hero
- **Updated hero**: Dual CTAs — "Browse Projects" (scroll) + "Work With Us" (→ /build), lighthouse background kept
- **Added**: ExploreBottomCTA strip — "Inspired by what you see? Start a Project →" linking to /build
- **Added**: CategoryFilter component (pills: All, Web, Database, SaaS, Automations, Pro-Bono) — ready for project filtering

### Shared Infrastructure
- **ApplicationForm** (`components/forms/ApplicationForm.tsx`) — 10 fields, shared between /build and /apply, `sourcePage` prop tracks origin
- **CTAStrip** (`components/sections/CTAStrip.tsx`) — Reusable headline + CTA component
- **DB migration** (`009_application_source_page.sql`) — `source_page` column + `desired_outcome` column on applications table

### Navigation
Nav updated from 5 to 6 links: HonuHub, Explore, **Build**, Learn, About, Contact

### New File Count (Build Page + Explore Restructure)
- **8 build components** (`components/build/`)
- **1 form component** (`components/forms/ApplicationForm.tsx`)
- **1 page route** (`app/[locale]/build/page.tsx`)
- **1 CTA strip** (`components/sections/CTAStrip.tsx`)
- **1 explore CTA** (`components/sections/exploration/explore-bottom-cta.tsx`)
- **1 category filter** (`components/exploration/CategoryFilter.tsx`)
- **1 SQL migration** (`supabase/migrations/009_application_source_page.sql`)
- **Modified**: nav, explore page, explore hero, explore barrel exports, API route, sitemap, i18n (EN+JP)

### Analytics Events
`build_territory_click`, `build_engage_card_click`, `build_form_submit`, `build_advisory_click`, `explore_filter_change`, `explore_to_build_click`

---

## ESL Lesson Generator (2026-03-06)

### Overview
Auto-generates supplemental ESL (English as a Second Language) content from course materials using Claude API, with TTS pronunciation audio via OpenAI. Designed for Japanese professionals learning AI skills while improving their English. Configurable per course — some bundle ESL free, others sell as Stripe add-on.

### Phase 1: Database + Types + Access (Foundation)
- [x] Migration `supabase/migrations/010_esl_schema.sql` — ALTER courses (5 ESL columns), 4 new tables (`esl_lessons`, `esl_audio`, `esl_progress`, `esl_purchases`), RLS policies, indexes
- [x] TypeScript types `lib/esl/types.ts` — VocabularyItem, GrammarPoint, CulturalNote, ComprehensionItem, ESLSettings, ESLLesson, ESLAudio, ESLProgress, ESLPurchase, ESLLessonWithAudio, WeekESLContext, ESLAccessResult
- [x] Zod validation schemas `lib/esl/schemas.ts` — validates Claude API JSON output
- [x] Access control `lib/esl/access.ts` — `checkESLAccess(userId, courseId)` (admin bypass → esl_included + enrollment → esl_purchases)
- [x] Queries `lib/esl/queries.ts` — getESLLessonForWeek, getESLLessonsForCourse, getESLProgress, getESLProgressForCourse

### Phase 2: Generation Pipeline (Core Value)
- [x] ESL generator `lib/esl/generator.ts` — Claude API (`claude-sonnet-4-20250514`), specialized ESL prompt, Zod validation
- [x] TTS generator `lib/esl/tts.ts` — OpenAI TTS API (`tts-1`, `nova` voice, 0.9 speed), Supabase Storage upload, concurrency limiter (3 parallel)
- [x] `POST /api/esl/generate` — admin-only, accepts `{ courseId, weekIds? }`, background generation via `after()`
- [x] `GET /api/esl/[weekId]` — authenticated, checks ESL access, returns ESLLessonWithAudio
- [x] `POST /api/esl/[weekId]/publish` — admin-only, status → published
- [x] `POST /api/esl/audio/generate` — admin-only, background TTS via `after()`
- [x] `POST /api/esl/progress` — authenticated, upserts vocabulary_completed/comprehension_score/flashcard_known
- [x] `POST /api/admin/esl/update` — admin-only, saves manual edits to ESL content

### Phase 3: Student UI Components (10 new)
- [x] `AudioPlayButton` — inline play/pause using HTMLAudioElement, loading/playing/idle states
- [x] `VocabularyCard` — expandable card with term, IPA, translation, definition, usage sentences, audio, difficulty badge, "learned" toggle
- [x] `GrammarSpotlight` — collapsible grammar card with pattern, EN/JP explanation, examples with audio, common mistakes
- [x] `CulturalNoteCard` — collapsible card with category icon/color, bilingual content, practical tip
- [x] `ComprehensionCheck` — interactive quiz (multiple choice, fill-in-blank), progress indicator, score tracking
- [x] `ESLProgressBar` — horizontal bar showing vocab learned count + comprehension score
- [x] `FlashcardMode` — full-screen flip cards (EN↔JP), known/unknown marking, shuffle, progress tracking
- [x] `ESLPurchaseCard` — locked-state upsell CTA with bilingual copy, triggers Stripe checkout
- [x] `ESLLessonView` — container: progress bar → vocabulary + flashcard button → grammar → cultural notes → comprehension
- [x] `ESLTab` — week selector + data fetching + access check → renders ESLLessonView or ESLPurchaseCard
- [x] CourseHub integration — conditional ESL tab when `course.esl_enabled` (~10 lines changed)

### Phase 4: Admin Integration
- [x] `ESLAdminDashboard` — per-week status table (generating/review/published/failed/not started), Generate All/per-week actions
- [x] `ESLReviewPanel` — view/edit generated ESL content, Save Changes button
- [x] Admin ESL page `app/[locale]/admin/courses/[id]/esl/page.tsx` — server component with auth check
- [x] Wizard ESL settings in `WizardStepBasicInfo` — enable checkbox, vocab depth, grammar count, pricing (included vs add-on)
- [x] `createCourseFromParsedData` — passes ESL fields when inserting course

### Phase 5: Monetization (Stripe Add-on)
- [x] `POST /api/esl/purchase` — creates Stripe Checkout Session with `metadata.type = 'esl_addon'`
- [x] Webhook extension in `lib/stripe/webhooks.ts` — routes `esl_addon` checkouts to `handleESLPurchaseCompleted()`
- [x] i18n: full `esl` namespace (~50 keys each) in `messages/en.json` and `messages/ja.json`

### New File Count (ESL Lesson Generator)
- **7 lib modules** (`lib/esl/types.ts`, `schemas.ts`, `access.ts`, `queries.ts`, `generator.ts`, `tts.ts`)
- **8 API routes** (`app/api/esl/generate/`, `[weekId]/`, `[weekId]/publish/`, `audio/generate/`, `progress/`, `purchase/`, `app/api/admin/esl/update/`)
- **10 ESL components** (`components/esl/`)
- **2 admin components** (`components/admin/ESLAdminDashboard.tsx`, `ESLReviewPanel.tsx`)
- **1 admin page** (`app/[locale]/admin/courses/[id]/esl/page.tsx`)
- **1 SQL migration** (`supabase/migrations/010_esl_schema.sql`)
- **Modified**: `lib/courses/types.ts`, `components/learn/CourseHub.tsx`, `components/admin/wizard/WizardStepBasicInfo.tsx`, `lib/courses/actions.ts`, `lib/stripe/webhooks.ts`, `messages/en.json`, `messages/ja.json`

### Verification
- [x] TypeScript: zero errors (`tsc --noEmit`)
- [ ] Run migration against Supabase
- [ ] Create `esl-audio` storage bucket in Supabase dashboard
- [ ] Verify `OPENAI_API_KEY` is set in `.env.local`
- [ ] End-to-end testing: admin generates → reviews → publishes → student accesses ESL → plays audio → uses flashcards → completes quiz

---

## Multi-Instructor Support

### Database
- [x] Migration `015_multi_instructor.sql` — `course_instructors` join table (course_id, instructor_id, role, sort_order)
- [x] `course_sessions.instructor_id` column for per-session instructor assignment
- [x] RLS policies: public read (published courses), admin full access
- [x] Data migration: existing `courses.instructor_id` → join table rows with `role = 'lead'`
- [x] Migration run on Supabase — verified successful

### Types & Data Layer
- [x] `CourseInstructor`, `CourseInstructorWithProfile`, `CourseInstructorRole` types (`lib/instructors/types.ts`)
- [x] `CourseSession` updated with `instructor_id` + resolved `instructor` field (`lib/courses/types.ts`)
- [x] `CourseWithCurriculum` updated with `instructors` array (backward-compat `instructor` kept as lead)
- [x] `getInstructorsForCourse(courseId)` query — fetches from join table, resolves profiles (`lib/instructors/queries.ts`)
- [x] `getAdminCourseById` and `getCourseWithCurriculum` — fetch multi-instructor data + session-level instructor resolution
- [x] Instructor course counts now query `course_instructors` table (not legacy `courses.instructor_id`)

### Server Actions
- [x] `addInstructorToCourse(courseId, instructorId, role?)` — insert into join table, first instructor auto-lead
- [x] `removeInstructorFromCourse(courseId, instructorId)` — delete + clear session assignments for that instructor
- [x] `updateCourseInstructorRole(courseInstructorId, role)` — change role (lead/instructor/guest)
- [x] `syncLegacyInstructorId()` helper — keeps `courses.instructor_id` in sync for backward compat
- [x] `updateCourseSession` — now accepts `instructor_id` for per-session assignment
- [x] `demoteToStudent` — checks `course_instructors` table for active course assignments

### Admin UI
- [x] `InstructorAssignControl` rewritten for multi-instructor — list with role badges (Lead/Instructor/Guest), role dropdown, add/remove
- [x] `SessionEditor` — instructor dropdown appears when course has 2+ instructors ("Default" + all course instructors)
- [x] `AdminCourseDetail` — wired with new props, Instructor(s) info field shows comma-separated names

### Public UI
- [x] Course detail page — renders multiple `InstructorCard` components with role labels (Lead Instructor, Guest Instructor)
- [x] Heading pluralizes: "Your Instructor" vs "Your Instructors"
- [x] Backward-compatible: falls back to single `InstructorCard` + legacy `instructor_name`

### i18n
- [x] EN: `instructors`, `lead_instructor`, `guest_instructor`
- [x] JP: `講師陣`, `主任講師`, `ゲスト講師`

### Syllabus PDF
- [x] `generate-pdf.ts` — instructor field now lists all instructor display names (comma-separated)

### Files Modified/Created
- **Created**: `supabase/migrations/015_multi_instructor.sql`
- **Modified**: `lib/instructors/types.ts`, `lib/courses/types.ts`, `lib/instructors/queries.ts`, `lib/courses/queries.ts`, `lib/instructors/actions.ts`, `lib/courses/actions.ts`, `components/admin/InstructorAssignControl.tsx`, `components/admin/SessionEditor.tsx`, `components/admin/AdminCourseDetail.tsx`, `app/[locale]/learn/[slug]/page.tsx`, `lib/syllabus/generate-pdf.ts`, `messages/en.json`, `messages/ja.json`

### Verification
- [x] TypeScript: zero errors (`tsc --noEmit`)
- [x] Production build: compiled successfully (pre-existing vertice i18n warnings unrelated)
- [x] Migration: run on Supabase, verified successful

---

## Bonus Sessions for Courses

Ad-hoc bonus sessions (office hours, guest speakers, workshops, Q&A) that are not tied to weekly curriculum. Extends `course_sessions` with `is_bonus` flag approach — reuses existing infrastructure.

### Database
- [x] Migration `016_bonus_sessions.sql` — `is_bonus`, `bonus_type`, `description_en/jp` columns
- [x] `week_id` and `session_number` made nullable for bonus sessions
- [x] Check constraints: bonus sessions must have no week + must have a type; curriculum sessions must have a week + no type
- [x] Index on `(course_id, is_bonus, scheduled_at)` for efficient queries

### TypeScript Types
- [x] `BonusSessionType` union: `'office-hours' | 'guest-speaker' | 'workshop' | 'qa'`
- [x] `CourseSession` — `week_id` and `session_number` now nullable; added `is_bonus`, `bonus_type`, `description_en/jp`
- [x] `CourseWithCurriculum` — added `bonusSessions: CourseSession[]`

### Queries
- [x] `getCourseWithCurriculum` — filters `is_bonus = false` for curriculum; separate query for bonus sessions ordered by `scheduled_at`
- [x] `getAdminCourseById` — same separation; bonus sessions attached as `bonusSessions`
- [x] Instructor resolution applied to bonus sessions via existing instructor map

### Server Actions
- [x] `createBonusSession(courseId, data)` — insert with `is_bonus: true`, `week_id: null`
- [x] `updateBonusSession(sessionId, updates)` — all bonus session fields
- [x] `deleteBonusSession(sessionId)` — safety check: only deletes if `is_bonus = true`

### Admin UI
- [x] `BonusSessionEditor` — type dropdown, title EN/JP, description EN/JP, instructor dropdown, Zoom paste-parser, replay/transcript/slides URLs, date/time, duration, status, delete with confirmation
- [x] `AdminCourseDetail` — "Bonus Sessions" tab (after Curriculum, before Students) with count badge, "Add Bonus Session" button

### Public UI
- [x] `BonusSessionsSection` — renders on course detail page below curriculum
- [x] Cards with type badges (icon + color per type), title, description, instructor, date, duration, status
- [x] Enrollment gating: Zoom link hidden for non-enrolled, replay hidden until completed
- [x] Sorted: upcoming first, completed below, no-date last

### i18n
- [x] EN + JP keys under `learn.bonusSessions`: title, type labels, action labels, empty state

### Files Created/Modified
- **Created**: `supabase/migrations/016_bonus_sessions.sql`, `components/admin/BonusSessionEditor.tsx`, `components/learn/BonusSessionsSection.tsx`
- **Modified**: `lib/courses/types.ts`, `lib/courses/queries.ts`, `lib/courses/actions.ts`, `components/admin/AdminCourseDetail.tsx`, `components/learn/SessionCard.tsx`, `lib/syllabus/generate-pdf.ts`, `app/[locale]/learn/[slug]/page.tsx`, `messages/en.json`, `messages/ja.json`

### Verification
- [x] Production build: compiled successfully with zero type errors

---

## Teacher Prep Materials

On-demand generation of instructor teaching materials per session, plus an enrolled students roster in the admin panel. No new database tables — all data sourced from existing session, course, and enrollment records.

### Teacher's Presentation (PDF)
- [x] Landscape slide-style PDF via `@react-pdf/renderer`
- [x] 5 slide types: title, agenda (with time allocation), topic slides (subtopics + discussion prompt), materials checklist, wrap-up (takeaways + next session preview)
- [x] HonuVibe branding (dark header, teal accent, DM Sans / Noto Sans JP fonts)
- [x] Bilingual support (EN/JP via locale parameter)
- [x] API route: `GET /api/courses/[courseId]/sessions/[sessionId]/presentation?locale=en`

### Teacher's Notes (DOCX)
- [x] Editable lesson plan document via `docx` npm package (opens in Google Docs/Word)
- [x] Sections: header, session overview (metadata table), materials, detailed topic breakdown (time allocation, key points, discussion questions, vocabulary), resources, personal notes area
- [x] Template-based discussion questions (5 EN + 5 JP templates, rotated per topic)
- [x] Key vocabulary extraction from topic/subtopic text
- [x] Bilingual support (EN/JP)
- [x] API route: `GET /api/courses/[courseId]/sessions/[sessionId]/notes?locale=en`

### Admin UI
- [x] "Teacher Prep" section in `SessionEditor` — Download Presentation + Download Teacher's Notes buttons
- [x] Buttons only appear for sessions with topics; loading state during generation
- [x] Auth: admin + instructor roles allowed

### Enrolled Students Roster
- [x] `getEnrolledStudents(courseId)` query — joins `enrollments` + `users`
- [x] `EnrolledStudent` type (name, email, enrolled date, status)
- [x] Inline roster table on existing Students tab in `AdminCourseDetail` (replaces link-only display)
- [x] Status badges (active=teal, completed=gold)
- [x] Empty state for no enrollments

### Files Created/Modified
- **Created**: `lib/teaching-materials/types.ts`, `lib/teaching-materials/templates.ts`, `lib/teaching-materials/generate-presentation.ts`, `lib/teaching-materials/generate-notes.ts`, `app/api/courses/[courseId]/sessions/[sessionId]/presentation/route.ts`, `app/api/courses/[courseId]/sessions/[sessionId]/notes/route.ts`
- **Modified**: `components/admin/SessionEditor.tsx`, `components/admin/AdminCourseDetail.tsx`, `app/[locale]/admin/courses/[id]/page.tsx`, `lib/courses/queries.ts`, `lib/courses/types.ts`, `package.json`
- **New dependency**: `docx` (pure JS DOCX generation)

### Verification
- [x] TypeScript: zero type errors
- [x] Production build: compiled successfully

---

## Freemium Course Sessions

Per-course "try before you buy" — the first N sessions of any course are freely accessible to logged-in users. Drives enrollment conversions by letting students sample real content before paying.

### Database
- [x] Migration `017_freemium_sessions.sql` — `free_preview_count INTEGER NOT NULL DEFAULT 0` on `courses` table
- [x] No RLS changes needed — session metadata already public; content gating is at component level

### TypeScript Types
- [x] `Course` — added `free_preview_count: number`

### Utility Functions
- [x] `lib/courses/utils.ts` (new file) — `isSessionFree()` and `getFreeSessionIds()`
- [x] Pure functions: sort non-bonus sessions by `week_number ASC, session_number ASC`, first N are free
- [x] Bonus sessions excluded (always enrolled-only)

### Queries & Actions
- [x] No code changes needed — queries use `select('*')` which includes the new column; `updateCourse()` accepts `Record<string, unknown>`

### Public UI
- [x] `SessionCard` — new `isFree`, `isLoggedIn`, `isEnrolled` props; "Free Preview" badge, lock icon, login CTA, enroll CTA
- [x] `CurriculumAccordion` — "Free Preview" indicator on weeks containing free sessions
- [x] `WeekCard` — passes free session context to SessionCards
- [x] `StickyEnrollSidebar` — "First {N} session(s) free" marketing copy below price

### Admin UI
- [x] `AdminCourseDetail` overview tab — number input for "Free Preview Sessions" with save button

### Course Detail Page
- [x] Computes `freeSessionIds` via `getFreeSessionIds()`, passes to CurriculumAccordion and sidebar

### i18n
- [x] EN + JP keys under `learn.freemium`: freePreview, loginToAccess, enrollToUnlock, firstNFree, freePreviewCount, freePreviewHelper

### Access Control
- Enrolled: full access (unchanged)
- Logged in + free session: full access (replay, Zoom, slides, transcript)
- Logged in + paid session: metadata + lock icon + enroll CTA
- Not logged in + free session: metadata + login CTA
- Bonus sessions: always enrolled-only

### Files Created/Modified
- **Created**: `supabase/migrations/017_freemium_sessions.sql`, `lib/courses/utils.ts`, `docs/superpowers/specs/2026-03-26-freemium-sessions-design.md`
- **Modified**: `lib/courses/types.ts`, `components/learn/SessionCard.tsx`, `components/learn/CurriculumAccordion.tsx`, `components/learn/WeekCard.tsx`, `components/learn/StickyEnrollSidebar.tsx`, `components/admin/AdminCourseDetail.tsx`, `app/[locale]/learn/[slug]/page.tsx`, `messages/en.json`, `messages/ja.json`

### Verification
- [x] TypeScript: zero type errors from freemium changes
- [ ] Migration: apply `017_freemium_sessions.sql` to Supabase
- [ ] End-to-end: set `free_preview_count` on test course, verify all access tiers

---

## UserMenu: Popup → Persistent Inline Links

Replaced the avatar-button + portal dropdown pattern with persistent, always-visible navigation links rendered inline in the menu/sidebar.

### Changes
- [x] `UserMenu` refactored — removed popup/dropdown (portal, outside-click, escape-key, positioning). Now renders Dashboard, Admin, Sign Out as persistent inline links
- [x] New props: `compact` (icon-only mode for collapsed sidebar/navbar), `direction` (horizontal for top nav, vertical for sidebars), `onNavigate` (callback for closing mobile menu)
- [x] `StudentNav` — user links render persistently above theme/lang toggles, respects collapsed state
- [x] `AdminNav` — same persistent layout above theme/lang toggles
- [x] `MobileMenu` — passes `onNavigate={onClose}` so each link closes the drawer
- [x] `NavClient` — desktop top nav uses compact horizontal icon row

### Files Modified
- `components/layout/user-menu.tsx` (full rewrite — no more popup)
- `components/layout/mobile-menu.tsx` (onNavigate prop)
- `components/layout/nav-client.tsx` (compact + direction props)
- `components/learn/StudentNav.tsx` (new bottom layout)
- `components/admin/AdminNav.tsx` (new bottom layout)

---

## Survey Assignment — Pre-Course Surveys for Students

Token-based pre-course surveys optionally assigned when creating a student in the admin panel. Survey link is included in the welcome email (no login required). Responses are linked to the specific student for AI learning profile building, with pending/completed tracking in the admin UI.

### Database
- [x] Migration `022_surveys.sql` — `surveys` registry table (slug, title_en, title_jp, is_active), `survey_assignments` table (user_id, survey_id, token UUID, status, completed_at), token index
- [x] `survey_responses` — added nullable `user_id` and `assignment_id` columns (backward-compatible; anonymous submissions unchanged)
- [x] Migration `023_survey_summaries.sql` — `survey_summaries` table for AI-generated cohort analysis (survey_id, response_count, stats JSONB, summary_text, key_takeaways, tool_recommendations, instructor_notes, generated_at)
- [x] Seed: AI Essentials survey row in `surveys` table

### Backend
- [x] `lib/survey/actions.ts` — `validateSurveyToken(token)` server action: looks up assignment + survey + user via service role client, returns `{ userId, assignmentId, userName, surveySlug, status }` or null (graceful fallback to anonymous mode)
- [x] `lib/admin/actions.ts` — `assignSurvey(userId, surveyId)`: inserts `survey_assignments` row, returns `{ token, slug }`
- [x] `lib/admin/queries.ts` — `getActiveSurveys()`: fetches active surveys; `getStudentList()`: updated to include `survey_status` (most recent assignment per student)
- [x] `lib/admin/types.ts` — `ActiveSurvey` interface; `survey_status` added to `StudentListItem`

### Welcome Email
- [x] `lib/email/types.ts` — `courseTitle?` and `surveyUrl?` added to `StudentWelcomeEmailData`
- [x] `lib/email/send.ts` — `sendStudentWelcomeEmail()` fully rewritten: personalized greeting, conditional course block, password/dashboard CTA, link expiry note, conditional survey CTA, `help@honuvibe.com` support footer; bilingual (EN/JP)
- [x] `lib/students/actions.ts` — `sendStudentWelcomeEmailAction()` accepts optional `surveyUrl` and `courseTitle`

### Admin UI
- [x] `app/[locale]/admin/students/new/page.tsx` — fetches `activeSurveys` via `getActiveSurveys()` alongside courses
- [x] `components/admin/AddStudentFlow.tsx` — Step 2: "Assign Survey" dropdown; after save: calls `assignSurvey()`, constructs token URL (`NEXT_PUBLIC_SITE_URL/survey/[slug]?token=[uuid]`), passes to welcome email; Step 3: survey confirmation line; retry/resend buttons include survey URL
- [x] `components/admin/AdminStudentList.tsx` — Survey column with `Pending` (amber) / `Completed` (teal) / `—` badges

### Survey Page
- [x] `app/[locale]/survey/ai-essentials/page.tsx` — thin server wrapper, reads `searchParams.token`, passes to client component
- [x] `app/[locale]/survey/ai-essentials/survey-form.tsx` (new) — client component; on mount calls `validateSurveyToken`; shows "already completed" screen if status=completed; pre-fills name from token; includes `assignmentId` in submit payload

### Submit Route
- [x] `app/api/survey/submit/route.ts` — accepts optional `assignmentId`; looks up `user_id` from `survey_assignments`; stores both on `survey_responses` insert; marks assignment `status=completed` + `completed_at` after successful insert; fires `regenerateSurveySummary` via `after()` in background

### Verification
- [x] TypeScript: zero errors
- [x] Production build: clean
- [ ] DB migrations applied (`supabase db push`)
- [ ] End-to-end: create student → assign survey → check email → submit survey → verify completion status

---

## Manual Student Add (Admin)

Allows admins to manually create or find students and optionally enroll them in a course, bypassing Stripe. Designed for students who pay through Vertice Society, in-person, or other offline methods.

### Database
- [x] Migration `020_enrollment_notes.sql` — adds `notes TEXT` nullable column to `enrollments` for audit trail

### Server Actions
- [x] `lib/students/actions.ts` — `createNewUserAndStudent()`: creates auth user via admin client, polls for `handle_new_user()` trigger row, rolls back on failure
- [x] `lib/students/actions.ts` — `sendStudentWelcomeEmailAction()`: generates recovery/magic link, sends bilingual welcome email, always fires admin notification

### Queries & Actions
- [x] `lib/admin/queries.ts` — `getActiveCourses()` returns courses with status `published` or `in-progress` for the enrollment picker
- [x] `lib/admin/actions.ts` — `manualEnroll()` updated: `requireAdmin()` guard added, `notes` field persisted, `skipEnrollmentEmail` param to prevent double-email

### Email
- [x] `lib/email/types.ts` — `StudentWelcomeEmailData` interface
- [x] `lib/email/send.ts` — `sendStudentWelcomeEmail()` (bilingual, new/existing account variants) + `sendStudentWelcomeAdminNotification()`

### UI
- [x] `components/admin/AddStudentFlow.tsx` — 3-step wizard (Search → Enroll → Done): email search, existing user card or create-new form, course picker, notes field, welcome email toggle with EN/JP locale selector, post-completion email status with resend option
- [x] `app/[locale]/admin/students/new/page.tsx` — server page wrapper fetching active courses
- [x] `app/[locale]/admin/students/page.tsx` — "Add Student" button added to page header

### Files Created/Modified
- **Created**: `supabase/migrations/020_enrollment_notes.sql`, `lib/students/actions.ts`, `components/admin/AddStudentFlow.tsx`, `app/[locale]/admin/students/new/page.tsx`
- **Modified**: `lib/admin/actions.ts`, `lib/admin/queries.ts`, `lib/email/types.ts`, `lib/email/send.ts`, `app/[locale]/admin/students/page.tsx`

### Verification
- [x] TypeScript: zero type errors
- [x] Production build: compiled successfully
- [ ] Migration: apply `020_enrollment_notes.sql` to Supabase

---

## AI Cohort Survey Summary (Admin)

Auto-generated AI panel at the top of `/admin/surveys` showing cohort-level insights after each submission. Triggered fire-and-forget via Next.js `after()`. Designed to help instructors understand the cohort's background, goals, and tool usage before the course begins.

### Database
- [x] Migration `023_survey_summaries.sql` — `survey_summaries` table: `survey_id` FK to `surveys`, `response_count`, `stats JSONB`, `summary_text`, `key_takeaways TEXT[]`, `tool_recommendations`, `instructor_notes`, `generated_at` (depends on migration 022 from survey-assignment spec)

### Background Job
- [x] `lib/survey/summarize.ts` — `regenerateSurveySummary(courseSlug)`:
  - Looks up `survey_id` from `surveys` table by slug (graceful early return if table missing)
  - Fetches all `survey_responses` for the course slug; aggregates stats across 5 fields
  - Calls Claude API (`claude-sonnet-4-6`) with anonymized data — no PII sent
  - Parses JSON response with strict type guard; upserts `survey_summaries` on conflict
  - 20s AbortSignal timeout; full try/catch — never throws (safe for `after()`)

### API Route
- [x] `app/api/survey/submit/route.ts` — `after(() => regenerateSurveySummary('ai-essentials'))` fires after successful insert; does not block the 200 response

### UI
- [x] `components/admin/SurveySummaryPanel.tsx` — server component: null state placeholder, or populated panel with stat chips, key takeaways list, narrative summary, teal AI tool callout, gold instructor notes callout, generation timestamp footer
- [x] `app/[locale]/admin/surveys/page.tsx` — fetches summary via `surveys!inner(slug)` join; renders `<SurveySummaryPanel>` above `<AdminSurveyList>`; try/catch handles missing `surveys` table gracefully

### Files Created/Modified
- **Created**: `supabase/migrations/023_survey_summaries.sql`, `lib/survey/summarize.ts`, `components/admin/SurveySummaryPanel.tsx`
- **Modified**: `app/api/survey/submit/route.ts`, `app/[locale]/admin/surveys/page.tsx`

### Verification
- [x] TypeScript: zero type errors
- [x] Production build: compiled successfully
- [ ] Migrations: apply 022 (survey-assignment spec) then 023 to Supabase
- [ ] End-to-end: submit survey, verify `survey_summaries` row appears within seconds
- [ ] Admin panel: confirm panel renders at `/admin/surveys`

---

## Open Decisions

> These items need resolution before their associated phase can proceed.

| Decision | Context | Priority | Phase |
|---|---|---|---|
| First courses to launch | Upload via admin AI parser once content is ready | High | Phase 2A |
| CMS: Sanity.io or Payload? | Must decide before blog build | Blocking | Phase 1 |
| Newsletter: Beehiiv or ConvertKit? | API route built for Beehiiv — confirm | Medium | Phase 1 |
| Video hosting: MUX or Vimeo Pro? | Needed for replay embeds in course hub + Library player swap | High | Phase 2A / Library |
| HonuHub booking pricing model | Drop-in vs. membership vs. event-based | High | Phase 1 |
| Design partner/agency? | Brand identity + Exploration Island illustration | High | Phase 1 |
| JP translator/partner identified? | Needed for human-reviewed translations | High | Phase 1.5 |
| Stripe account setup | Needed to swap simulated → real payments | High | Phase 2A |
| ANTHROPIC_API_KEY | Needed for AI course upload pipeline | High | Phase 2A |
| Domain and hosting confirmed? | honuvibe.ai registered? Vercel org set up? | Blocking | Phase 1 |
| APPI legal review | Japan-qualified attorney for privacy policy | Medium | Phase 1.5 |

---

*HonuVibe.AI — Progress Tracker | Updated as build progresses*
