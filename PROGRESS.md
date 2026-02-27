# HonuVibe.AI — Build Progress Tracker

**Last updated:** 2026-02-26 (Exploration page — dual featured builds)

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
- [x] Nav (fixed, glass effect, hamburger on mobile) — 6 links: HonuHub, Explore, Learn, Resources, About, Contact
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

### Pages (EN + JA)
- [x] Homepage — Hero, MissionStrip, HonuHub feature, Featured Courses, Exploration preview, Ryan bio, Newsletter, Social proof
- [x] HonuHub — Hero (opening badge, notify modal, glow orbs), about (real photo), three modes, upcoming events (4 placeholder), remote learning (i18n), membership tiers, location + contact form
- [x] Exploration Island — Territory grid, 2× featured builds (KwameBrathwaite + HCI Medical Group, side-by-side cards), tech stack showcase, process timeline, lead form
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
- [x] UserMenu: added `dropdownPosition="above"` prop — dropdown opens upward from sidebar bottom

### Top Nav Cleanup on Auth Routes
- [x] Desktop: ThemeToggle, LangToggle, UserMenu hidden from top nav bar on admin/dashboard routes (controls in sidebar)
- [x] Mobile: controls remain in top nav bar (no sidebar on mobile)
- [x] Top nav bar on auth routes (desktop): logo only

### Footer Conditional Rendering
- [x] `ConditionalFooter` client wrapper — hides footer on `/admin` and `/learn/dashboard` routes
- [x] Locale layout updated to use `ConditionalFooter` instead of `Footer`

### Files Modified
- `components/layout/conditional-footer.tsx` (new)
- `components/layout/user-menu.tsx` (dropdownPosition prop)
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

## Phase 2B — Content Library (Planned)

- [ ] Content items table + tag system (schema deployed in Stage 1)
- [ ] Content catalog page with filters (type, difficulty, tags)
- [ ] Content detail pages (article, video, tool, template)
- [ ] YouTube metadata auto-fetch
- [ ] Admin content management UI
- [ ] Collections/playlists feature
- [ ] Access tier gating (free/premium)

## Phase 2C — Self-Study Mode (Planned)

- [ ] AI-generated learning paths via Claude API (schema deployed in Stage 1)
- [ ] Study path builder with topic selection
- [ ] Progress tracking for self-study items
- [ ] Stripe subscription integration (premium tier)
- [ ] Path generation logs and quality tracking

---

## Phase 2 — Future Items

### Payments (Real Stripe)
- [ ] Stripe Checkout integration (swap simulated → real)
- [ ] USD + JPY currency support
- [ ] Webhook processing for `checkout.session.completed`
- [ ] End-to-end payment flow testing

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
- **12 API routes**: `/api/newsletter/subscribe`, `/api/apply/submit`, `/api/auth/callback`, `/api/admin/courses/parse`, `/api/admin/courses/create`, `/api/admin/courses/upload-image`, `/api/admin/courses/generate-image`, `/api/admin/library/upload-thumbnail`, `/api/library/favorite`, `/api/library/progress`, `/api/stripe/webhook` (skeleton), `/api/stripe/checkout` (skeleton)
- **Sitemap + robots.txt + llms.txt**
- **Full design system**: dark/light themes, CSS variables, Tailwind v4 tokens
- **Ocean interactions**: animated canvas, scroll companion (auth-aware), custom themed scrollbar
- **Full i18n**: EN + JA translations for all pages including learn namespace (84+ strings) + glossary (32 keys) + newsletter archive (25 keys) + library (42+ keys) + admin library (45+ keys) per locale
- **JSON-LD**: Organization + WebSite + CollectionPage (glossary, newsletter, library) + DefinedTerm (glossary) + Article (newsletter issues) + VideoObject (library) structured data
- **AI Glossary**: bilingual EN/JP terminology reference with search, category filters, A-Z navigation, related terms, SEO-optimized term pages
- **Newsletter Archive**: bilingual EN/JP newsletter archive with issue pages, share buttons, prev/next navigation, subscribe blocks, course CTAs
- **Library**: bilingual EN/JP quick-learn video tutorials with search, category filters, access tier gating, favorite/progress tracking, placeholder player, dashboard tab, related videos
- **Supabase Auth**: email/password + Google OAuth, middleware-based session management
- **Full LMS**: course catalog (hero + level filters), course detail (full-bleed hero header), enrollment, student dashboard, tabbed course hub
- **Admin panel**: dashboard with stats, course management with session editor, AI-powered course upload, student/application management, library video management (CRUD + YouTube preview + thumbnail upload)
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
- **3 auth components** (`components/auth/`)

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
- Claude API (course markdown parser — claude-sonnet-4)
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
