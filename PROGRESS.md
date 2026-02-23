# HonuVibe.AI — Build Progress Tracker

**Last updated:** 2026-02-24

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

### Layout Components
- [x] Nav (fixed, glass effect, hamburger on mobile)
- [x] MobileMenu (full-screen overlay)
- [x] Footer (compact horizontal layout — brand left, 3 link columns right, wide container)
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
- [x] HonuHub — Hero, about, three modes, session listings, remote learning, membership tiers, future locations, location + contact form
- [x] Exploration Island — Territory accordion with accent bars, project cards with tech tags and outcomes, 5 categories
- [x] About Ryan — Photo placeholder, narrative bio, philosophy quote, social links, Apply CTA
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
- [x] `/learn` — Course catalog with hero section (glow orbs + centered title), level filter pills (All/Beginner/Intermediate/Advanced), grid of CourseCards
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
- [x] `/api/admin/courses/generate-image` — AI image generation via OpenAI DALL-E 3 (pulls course title/description/tools for prompt)
- [x] CourseImageUploader component — Drag-drop upload, AI generate, replace, remove, loading states
- [x] Admin course detail page — "Course Images" section on Overview tab (thumbnail 16:9 + hero 21:9)
- [x] CourseCard and DashboardCourseCard already render `thumbnail_url` conditionally

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
- **10 public page routes** × 2 locales = **20 pages** (SSG)
- **13 dynamic LMS routes** (learn catalog, course detail, auth, dashboard, course hub, admin dashboard, courses, course detail, upload, students, student detail, applications)
- **9 API routes**: `/api/newsletter/subscribe`, `/api/apply/submit`, `/api/auth/callback`, `/api/admin/courses/parse`, `/api/admin/courses/create`, `/api/admin/courses/upload-image`, `/api/admin/courses/generate-image`, `/api/stripe/webhook` (skeleton), `/api/stripe/checkout` (skeleton)
- **Sitemap + robots.txt + llms.txt**
- **Full design system**: dark/light themes, CSS variables, Tailwind v4 tokens
- **Ocean interactions**: animated canvas, scroll companion (auth-aware), custom themed scrollbar
- **Full i18n**: EN + JA translations for all pages including learn namespace (84+ strings)
- **JSON-LD**: Organization + WebSite structured data
- **Supabase Auth**: email/password + Google OAuth, middleware-based session management
- **Full LMS**: course catalog (hero + level filters), course detail (full-bleed hero header), enrollment, student dashboard, tabbed course hub
- **Admin panel**: dashboard with stats, course management with session editor, AI-powered course upload, student/application management
- **AI course parser**: Claude API integration for markdown → structured course data
- **Course image management**: drag-drop upload + AI generation (DALL-E 3), Supabase Storage with RLS

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

### Tech Stack
- Next.js 16.1.6 (Turbopack) + React 19.2.3
- TypeScript strict mode
- Tailwind CSS v4 (inline @theme tokens)
- next-intl 4.8.3 (URL-based locale routing)
- Supabase (PostgreSQL + Auth + RLS + Storage)
- Claude API (course markdown parser — claude-sonnet-4)
- OpenAI API (DALL-E 3 course image generation)
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
| Video hosting: MUX or Vimeo Pro? | Needed for replay embeds in course hub | High | Phase 2A |
| HonuHub booking pricing model | Drop-in vs. membership vs. event-based | High | Phase 1 |
| Design partner/agency? | Brand identity + Exploration Island illustration | High | Phase 1 |
| JP translator/partner identified? | Needed for human-reviewed translations | High | Phase 1.5 |
| Stripe account setup | Needed to swap simulated → real payments | High | Phase 2A |
| ANTHROPIC_API_KEY | Needed for AI course upload pipeline | High | Phase 2A |
| Domain and hosting confirmed? | honuvibe.ai registered? Vercel org set up? | Blocking | Phase 1 |
| APPI legal review | Japan-qualified attorney for privacy policy | Medium | Phase 1.5 |

---

*HonuVibe.AI — Progress Tracker | Updated as build progresses*
