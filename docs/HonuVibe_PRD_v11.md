# HonuVibe.AI — Product Requirements Document
**Consumer-Facing Website | v1.1**
*Confidential — Ryan Jackson / HonuVibe.AI | 2026*

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Strategic Goals & The Flywheel](#2-strategic-goals--the-flywheel)
3. [Design Philosophy & Brand Direction](#3-design-philosophy--brand-direction)
4. [Site Architecture](#4-site-architecture)
5. [Page-by-Page Specifications](#5-page-by-page-specifications)
6. [Bilingual (EN/JP) Localization Requirements](#6-bilingual-enjp-localization-requirements)
7. [Technical Architecture & Stack](#7-technical-architecture--stack)
8. [Legal & Compliance](#8-legal--compliance)
9. [Launch Phases & Roadmap](#9-launch-phases--roadmap)
10. [Open Items & Decisions Needed](#10-open-items--decisions-needed)

---

## 1. Product Overview

HonuVibe.AI is a Hawaii-based AI consulting, education, and community company founded by Ryan Jackson. The name is a deliberate play on words — Honu (the Hawaiian green sea turtle, a symbol of wisdom and longevity) and the phrase "Whole New Vibe," reflecting a fresh, grounded approach to artificial intelligence education and implementation.

This PRD defines the requirements for HonuVibe.AI's consumer-facing website — a bilingual (English/Japanese) platform that serves as the primary hub for course enrollment, community building, portfolio discovery, and personal brand amplification for Ryan Jackson and the HonuVibe team.

### 1.1 Mission Statement

To make cutting-edge AI education approachable, actionable, and community-driven — for Hawaii's local business community, ambitious entrepreneurs across the US, and Japanese students eager to access emerging AI technologies from the source.

### 1.2 Core Competencies

- AI prototype building and rapid product development
- Micro-SaaS design and deployment
- AI integration into existing organizations and workflows
- AI training, education, and curriculum development

### 1.3 Target Audiences

| Segment | Who They Are | Primary Need |
|---|---|---|
| **Hawaii Local** | Small business owners, entrepreneurs, professionals in the Honolulu/Waikiki area | Accessible AI education, in-person community, local innovation network |
| **US National** | Remote learners, entrepreneurs, enterprise clients seeking AI strategy | Online courses, consulting access, Ryan's personal brand content |
| **Japanese Students** | Tech-curious students in Japan seeking cutting-edge US AI education and English fluency | Bilingual AI curriculum, cultural bridge, community access |
| **Enterprise / HNW** | High-net-worth clients seeking strategic AI advice or board participation | Gated application process, strategic guidance from Ryan |

---

## 2. Strategic Goals & The Flywheel

The website is not a brochure — it is the central engine of HonuVibe's growth flywheel. Every element should be designed to move visitors through a deliberate journey.

### 2.1 The Growth Flywheel

```
Social Content (TikTok / Instagram / YouTube)
  → Website
  → Newsletter + Skool Community
  → Courses / HonuHub
  → Case Studies in Exploration Island
  → Builds Ryan's Brand
  → More Social Content
```

The community layer (newsletter subscribers, Skool members) acts as a re-entry valve — drawing members back into new courses, HonuHub events, and collaborative projects. The portfolio (Exploration Island) validates expertise and drives inbound inquiries. Ryan's personal brand is the connective tissue.

### 2.2 Primary Conversion Goal

The single most important action a visitor should take: **enroll in a course or learning program.** All secondary CTAs (newsletter, Skool community, HonuHub booking) should support and feed into this primary goal.

### 2.3 Success Metrics (Launch KPIs — 90 Days)

| Metric | Target | Notes |
|---|---|---|
| Course enrollments | 50+ | Primary conversion metric |
| Newsletter signups | 500+ | Social traffic funnel |
| Skool community joins | 100+ | Community activation |
| Consulting applications received | 5–10 quality inquiries | Gated, high-intent |
| HonuHub session bookings | 10+ in-person sessions | Local market focus |
| JP-language page sessions | 10%+ of traffic | Validate Japan market |

---

## 3. Design Philosophy & Brand Direction

HonuVibe.AI should feel like what happens when Apple's design sensibility meets the warmth of Hawaiian aloha spirit. The goal is a site that is unmistakably premium and innovative, yet never cold or inaccessible. Visitors from Hawaii, New York, and Tokyo should all feel equally welcome.

### 3.1 Design Principles

- **Simplicity over complexity** — every element earns its place on screen
- **Warmth over polish** — innovation should feel human, not corporate
- **Bilingual by design** — language toggle is a first-class feature, not an afterthought
- **Mobile-first** — social traffic will be predominantly mobile; desktop is secondary
- **Deliberate scroll** — use scrolling as a storytelling device, not just navigation
- **Accessibility** — WCAG 2.1 AA compliant; Japanese type handling must be tested
- **No hard sell** — the site invites and demonstrates; it never pressures. Visitors who are right for HonuVibe will feel it without being pushed
- **The Honu pace** — smooth, unhurried. Things reveal themselves as you move through. Urgency is never manufactured

### 3.2 Visual Identity Direction

> **Note:** Brand assets are currently in development. The following represents creative direction to be validated and formalized with a designer.

| Element | Direction |
|---|---|
| **Color Palette** | Ocean teal (primary) + warm coral/orange (accent) + deep navy (text) + white space as a design element. Draw from Hawaii's natural palette — ocean, lava, tropical flora. |
| **Typography** | Clean sans-serif primary (e.g., Inter or Neue Haas Grotesk). Japanese body text in Noto Sans JP. Avoid decorative fonts — let white space and imagery carry the visual weight. |
| **Photography Style** | Real, documentary-style photography of the Waikiki HonuHub space, Ryan in action, students learning. No stock photos. Ocean and nature imagery as atmospheric texture. |
| **Motion / Animation** | Subtle, purposeful. Smooth scroll reveals. Parallax on hero section. No autoplay video. Avoid anything that feels like a 2010s startup template. |
| **Logo** | Honu (turtle) motif integrated into wordmark. Should read well at all sizes, in both EN and JP contexts. To be designed. |

### 3.3 Tone of Voice

- **English:** Warm, confident, knowledgeable. Speak like a trusted mentor, not a salesperson.
- **Japanese:** Polished and respectful while remaining approachable. Avoid overly formal keigo in casual UX copy.
- Neither language should feel translated — each should feel written for its audience natively.

### 3.4 The Aloha Standard

Aloha is not a marketing tagline — it is the actual operating standard for how HonuVibe shows up. This must be felt in every interaction on the site:

- **Give generously** — free content, free community access, transparent information. Trust that generosity compounds.
- **Pro-bono work is real work** — when a nonprofit or community organization comes to HonuVibe, they receive the same quality of attention as any paying client. This should be visible on the site — featured in Exploration Island, celebrated in the Community page.
- **Celebrate the community** — member wins (launched apps, grown businesses, shipped projects) are HonuVibe moments. The site makes space for those stories.
- **Never fear-based** — do not use urgency tactics or "AI is coming for your job" framing. Ever.

---

## 4. Site Architecture

### 4.1 Navigation Structure

The site uses a minimal top navigation with a persistent language toggle (EN / 日本語). Navigation collapses to a hamburger on mobile. Primary nav items:

- Home
- HonuHub
- Exploration Island
- Learn *(Online Courses / Custom LMS)*
- Blog
- Community
- About Ryan
- Apply to Work Together *(gated consulting)*
- **EN / 日本語** toggle — persistent, top-right

### 4.2 URL Structure

| Page | EN URL | JP URL |
|---|---|---|
| Home | `/` | `/ja` |
| HonuHub | `/honuhub` | `/ja/honuhub` |
| Exploration Island | `/exploration` | `/ja/exploration` |
| Courses (LMS) | `/learn` | `/ja/learn` |
| Individual Course | `/learn/[slug]` | `/ja/learn/[slug]` |
| Blog | `/blog` | `/ja/blog` |
| Blog Post | `/blog/[slug]` | `/ja/blog/[slug]` |
| Community | `/community` | `/ja/community` |
| About Ryan | `/about` | `/ja/about` |
| Apply | `/apply` | `/ja/apply` |

### 4.3 Domain Architecture

The site is structured across three domains, each with a defined purpose. All share the same visual identity, navigation header, and language toggle — moving between them should feel seamless.

| Domain | Purpose | Auth Required |
|---|---|---|
| `honuvibe.ai` | Brand, community, lead capture | No |
| `learn.honuvibe.ai` | Course delivery, LMS, student dashboard | Yes |
| `consult.honuvibe.ai` | Consulting intake, application, scheduling | No (application) / Yes (client portal — Phase 4) |

> Language preference should be stored in a cookie/localStorage after first selection. Browser language detection should auto-suggest JP for Japanese-language browsers.

---

## 5. Page-by-Page Specifications

### 5.1 Homepage

The homepage is the single most important page. It must immediately communicate what HonuVibe is, establish trust, and funnel visitors toward course enrollment. It should feel like an experience, not a landing page.

#### Hero Section
- Full-viewport hero with cinematic background — either a high-quality photo/video still of the Waikiki HonuHub or an abstract ocean/technology texture
- Primary headline in both EN and JP displayed simultaneously (not toggle-dependent) — a signature design moment
  - EN: *"A Whole New Vibe for AI Learning"*
  - JP: *"新しいAI学習のスタイル"*
- Sub-headline: Brief, evocative. E.g., *"Hawaii-born. Globally minded. Built for the AI age."*
- Primary CTA: **Explore Courses** → `/learn`
- Secondary CTA: **Join the Community** → Skool link

#### Mission Strip
- 3–4 icon-driven value propositions in a horizontal strip (vertical on mobile)
- Examples: "Learn in Waikiki or online globally" | "EN/JP bilingual community" | "Real projects. Real results." | "Built by practitioners, not academics"

#### Featured From HonuHub
- Photography-forward visual card showcasing the HonuHub space
- Brief explanation + invitation to join or book
- CTA: **Discover HonuHub** → `/honuhub`

#### Featured Courses (LMS Preview)
- 3 course cards: title, short description, language badge (EN/JP), enrollment CTA
- "See all courses" link below

#### Exploration Island Preview
- Teaser of 2–3 featured projects with visual thumbnails
- CTA: **Explore our work** → `/exploration`

#### Ryan Jackson Bio Strip
- Photo of Ryan + brief personal brand statement
- Social icons: TikTok, Instagram, YouTube
- CTA: **Read more about Ryan** → `/about`

#### Newsletter Signup
- Email capture with a compelling one-line hook
- Suggested copy: *"Join 1,000+ entrepreneurs learning AI the HonuVibe way."*
- Double opt-in. GDPR + Japan APPI compliant.
- Connect to email platform (Beehiiv or ConvertKit recommended)

#### Social Proof / Community
- Testimonials or community member quotes (seeded with early students/beta testers at launch)
- Skool community join CTA

#### Footer
- HonuVibe logo + tagline
- Nav links, social links (TikTok, Instagram, YouTube)
- Language toggle (EN / 日本語)
- Legal: Privacy Policy, Terms of Use, Cookie Notice
- *"Made in Hawaii with Aloha"* — brand moment

---

### 5.2 HonuHub

HonuHub is the physical heart of HonuVibe.AI — a learning space in Waikiki, Hawaii that functions as a classroom, conference room, and innovation lab. The page should feel like stepping into the space digitally.

#### What is HonuHub?
- Rich photography of the space — multiple angles, people learning, collaborative sessions
- Clear written explanation in both EN and JP
- Three modes clearly articulated:
  - **In-person Training**
  - **Conference / Collaboration**
  - **Remote Live Streaming**

#### In-Person Programs
- List of current and upcoming in-person seminars and workshops
- Each listing includes: title, date, duration, audience level, language (EN/JP), capacity, price, "Book Now" CTA
- Integrate with a booking system (Calendly, Acuity, or Square Appointments)

#### Remote Learning from HonuHub
- Explanation that all HonuHub sessions are streamed live and recorded
- Remote ticket purchase option for livestream access
- Link to full course catalog → `/learn`

#### How to Join / Membership
- Tiered access model (to be defined by Ryan) — e.g., drop-in / monthly member / founding member
- **Future HonuHubs teaser:** *"We are building a global network of HonuHubs. Interested in bringing one to your city? Get in touch."*
  - This teaser plants the scalability seed and captures franchise/partner interest early

#### Location & Logistics
- Google Maps embed for Waikiki location
- Address, hours, parking/transit notes
- Contact/inquiry form for group bookings and corporate sessions

---

### 5.3 Exploration Island (Portfolio)

Exploration Island is HonuVibe's project showcase. The name is a brand asset — the design should honor it. Rather than a conventional portfolio grid, consider an **interactive island-map metaphor** where each "territory" represents a category of work. This is a signature differentiator designed to be screenshot-worthy and shareable.

#### Project Categories

- **Website Design & Redesign** — visually impactful, before/after where possible
- **Database-Driven Applications** — explain the business problem solved
- **SaaS / Internal Efficiency Tools** — focus on outcomes and time saved
- **Automations** — Zapier, N8N workflows; show before/after process complexity
- **Pro-Bono & Nonprofit Work** — featured prominently, not hidden. These projects reflect the Aloha Standard and are a brand differentiator. Show the mission and the outcome, not just the tech.

#### Project Card Specification

Each project card should include:
- Project title + short tagline
- Client industry (anonymized if needed) + geography
- Technologies used — displayed as clean tags
- Outcome/result — quantified where possible *(e.g., "60% reduction in manual reporting time")*
- Visual — screenshot, demo video, or designed graphic
- Optional: "Related Course" link if a project inspired a curriculum module

> At launch, aim for a minimum of 3 projects per category, or 2–3 hero projects across categories. Quality over quantity. Empty categories should not be shown at launch.

#### Design Concept: Interactive Island Map

- The "island" is rendered as a stylized illustrated or SVG map
- Each territory/landmark represents a project category
- Hovering or clicking a territory reveals project cards for that category
- On mobile, the island collapses to a tabbed or card-based navigation
- **This requires custom illustration work — flag as a design deliverable**

---

### 5.4 Learn (Custom LMS)

The Learn section is the primary revenue driver and conversion destination. It is powered by a custom LMS built on the HonuVibe.AI site — no third-party course platform. This gives full control over UX, branding, and data.

#### Course Catalog Page (`/learn`)
- Filter bar: by language (EN / JP), level (Beginner / Intermediate / Advanced), format (Self-paced / Live / HonuHub)
- Course cards: thumbnail, title, instructor, duration, language, price, rating (once populated), "Enroll" CTA
- Featured course hero at top of page
- "Upcoming Live Sessions" section linking HonuHub livestreams

#### Individual Course Page (`/learn/[slug]`)
- Hero: course title, tagline, instructor, language, duration, price, primary "Enroll Now" CTA
- Course overview: what you will learn, prerequisites, who this is for
- Curriculum outline: modules and lessons in collapsible accordion
- Instructor bio: Ryan or team member, links to socials
- Reviews/testimonials (once populated)
- Sticky "Enroll" sidebar on desktop

#### Student Dashboard (Post-Enrollment)
- Course progress tracker per enrolled course
- Resume lesson CTA
- Access to course materials, downloads, recordings
- Community link (Skool) integrated per course
- Certificate of completion — auto-generated PDF on course completion

#### LMS Technical Requirements
- **Auth:** email/password + Google OAuth + optional Apple Sign-In
- **Video hosting:** Vimeo Pro or MUX *(never YouTube-embedded for paid content)*
- **Payments:** Stripe — one-time purchase + optional subscription/bundle pricing
- **Progress tracking:** lesson-level completion state persisted per user
- **Bilingual:** all LMS UX strings must be translatable; course content may be EN-only with JP subtitles as a V1 approach
- **Mobile:** fully functional video playback and navigation on iOS/Android browsers

---

### 5.5 Blog

The blog serves dual purposes: SEO value and personal brand amplification for Ryan. Posts bridge the gap between Ryan's short-form social content and deeper dives that convert readers into course students or newsletter subscribers.

#### Blog Index (`/blog`)
- Featured post hero at top
- Filter by category: AI Tools | Entrepreneurship | Japan/US AI Scene | Behind the Build | HonuHub Stories
- Language filter: EN | JP | Both
- Pagination or infinite scroll

#### Blog Post (`/blog/[slug]`)
- Reading time estimate displayed
- Social share buttons: X (Twitter), LinkedIn, **LINE** *(critical for Japan market)*
- In-article CTAs: *"Want to learn this? Enroll in [Course Name]"*
- Newsletter signup block embedded mid-post and at end
- Related posts suggestions
- Author bio: Ryan or team member

#### Content Strategy Notes
- EN posts launch first; JP translations added progressively (human-reviewed, AI-assisted draft)
- YouTube videos embedded in relevant posts to cross-pollinate the channel
- Blog should have an RSS feed for newsletter/Substack-style syndication

---

### 5.6 Community (`/community`)

The Community page exists to show that the HonuVibe community is real, active, and worth belonging to. This is the warmest page on the site. It should feel like walking into a room full of people you want to know.

#### Primary Sections
- **Community hero** — photography of people together, learning, celebrating; not stock
- **What the community is** — honest, warm description of the Skool space and what members actually do together
- **Member stories** — real wins: businesses launched, projects shipped, grants won. Anonymized or consented.
- **Impact wall** — a running highlight of community milestones and member achievements
- **Pro-bono spotlight** — a featured nonprofit or community organization story, updated regularly. Demonstrates the Aloha Standard in action.
- **Free vs. paid tiers** — transparent explanation of what's included at each level (tiers TBD)
- **Join CTA** → Skool community

> The Community page and Exploration Island's pro-bono category are the two places on the site that most directly express HonuVibe's values. They should be treated as brand-critical, not secondary content.

---

### 5.7 About Ryan

This page is the personal brand anchor. It should feel personal, direct, and slightly cinematic — not a corporate bio page. Ryan is the face of HonuVibe and this page makes the human connection.

- Full-length editorial photo of Ryan — professional but warm
- Ryan's story: from Hawaii, to AI, to entrepreneurship — told narratively
- Core philosophy: *"Leveraging AI to foster entrepreneurship, learning, and better business practices"*
- What Ryan is building and why (the HonuVibe vision)
- Clear statement on what Ryan does NOT do: *"I take on a small number of passion projects and high-impact engagements. If you want to work together, I'd love to hear from you."*
- Links to TikTok, Instagram, YouTube with embed of latest video or content preview
- CTA: **Apply to Work Together** → `/apply`

---

### 5.8 Apply to Work Together

This page is intentionally gated and selective. The design and copy should signal that Ryan's time is limited and valuable, while remaining warm and not arrogant. An application process — not a contact form — is the right mechanism.

#### Page Copy Direction
> *"I work with a small number of partners each year on projects that genuinely excite me — or where I believe I can make a measurable difference. If that sounds like you, tell me about your vision."*

#### Application Form Fields

| Field | Type |
|---|---|
| Name, Email | Text |
| Company / Project Name | Text |
| Website | Text (optional) |
| Type of engagement | Select: Consulting / Advisory / Board Seat / Passion Project / Other |
| Tell me about your project | Free text (500 char limit) |
| What outcome are you hoping for? | Free text |
| How did you find HonuVibe? | Select (source attribution) |
| Timeline / urgency | Select: Exploratory / 3 months / ASAP |
| Budget range | Select: <$10K / $10K–$50K / $50K+ / Not sure yet |

- Submit button: **"Send My Application"**

> **Confirmation:** Auto-reply email acknowledging receipt, setting expectation of 5–7 business day response. Ryan reviews applications personally.

---

## 6. Bilingual (EN/JP) Localization Requirements

### 6.1 Language Toggle
- Persistent toggle in top navigation: `EN | 日本語`
- Toggle state stored in cookie (30-day expiry)
- Browser language detection: if `navigator.language` includes `ja`, prompt user to switch to JP
- All URLs have JP equivalents under `/ja/` prefix (see §4.2)
- Google Sitemap must include `hreflang` tags for EN/JP

### 6.2 Translation Scope at Launch

| Content Area | Launch Status | Notes |
|---|---|---|
| Homepage | ✅ Full EN + JP | Hero shows both languages simultaneously |
| HonuHub page | ✅ Full EN + JP | Critical for Japan market |
| Exploration Island | ✅ Full EN + JP | Project descriptions translated |
| Course Catalog | ✅ Full EN + JP | UI and course descriptions translated |
| Course Content (video/curriculum) | EN with JP subtitles | Full JP dub/transcript is V2 roadmap |
| LMS Student Dashboard | ✅ Full EN + JP | All UI strings via i18n library |
| Blog posts | EN first; JP progressive | New posts EN; JP translation within 1–2 weeks |
| About Ryan | ✅ Full EN + JP | Personal brand requires quality JP translation |
| Apply to Work Together | ✅ Full EN + JP | Essential for Japan enterprise clients |
| Legal pages (Privacy, Terms) | ✅ Full EN + JP | Required for APPI compliance |

### 6.3 Translation Workflow
- Use a professional AI-assisted translation tool (DeepL Pro recommended for EN-JP quality)
- All JP translations must be reviewed by a native Japanese speaker before publishing
- Build site with an i18n framework (e.g., `next-intl` for Next.js) from day one — retrofitting i18n is expensive
- Maintain a translation glossary: HonuVibe brand terms, course titles, and UI strings must be consistent across all JP pages

---

## 7. Technical Architecture & Stack

### 7.1 Confirmed Stack

The following stack has been confirmed by Ryan and is the target for the build. All tooling decisions should be made in the context of this stack.

> **Build environment:** Cursor IDE with Claude integration.

| Layer | Confirmed Choice | Rationale |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | SSR + SSG, excellent i18n support, SEO-optimized, ideal for LMS |
| **Hosting** | Vercel | Zero-config Next.js deployment, global CDN, strong Japan edge presence |
| **Database** | PostgreSQL via Supabase | Managed, scalable, row-level security, built-in auth |
| **Auth** | Supabase Auth + Google OAuth | Email, social login, JWT — all built-in |
| **Payments** | Stripe | Industry standard, supports JPY billing, subscriptions, one-time |
| **Video Hosting** | MUX or Vimeo Pro *(decide before Phase 2)* | DRM-protected, adaptive streaming, analytics |
| **Email / Newsletter** | Beehiiv or ConvertKit *(decide before Phase 1 end)* | Creator-focused, audience segmentation, automation |
| **CMS (Blog)** | Sanity.io or Payload CMS *(decide before Phase 1)* | Headless, bilingual content support, flexible schema |
| **i18n** | next-intl | Best-in-class for Next.js i18n, URL-based locale routing |
| **Analytics** | Plausible + Vercel Analytics | GDPR/APPI compliant by default, no cookie banner needed |
| **Booking** | Cal.com (self-hosted) or Calendly *(decide before Phase 1)* | HonuHub session booking, consulting calls |

### 7.2 HonuHub Scalability Architecture

The HonuHub model must be built for multi-location scalability from day one. The data model supports multiple HonuHub locations, each with their own:
- Location profile (name, address, photos, hours, amenities)
- Event/session calendar (independent per location)
- Booking and capacity management
- Local instructor/team profiles
- Aggregate reporting under a single HonuVibe admin dashboard

> At launch, only Waikiki is active. But the schema must support `location_id` as a first-class field throughout the event, booking, and reporting data models.

### 7.3 Custom LMS Data Model (Simplified)

```
Users          id, email, name, language_preference, created_at, skool_linked
Courses        id, slug, title_en, title_jp, description_en, description_jp,
               price, language, format, is_published
Modules        id, course_id, order, title_en, title_jp
Lessons        id, module_id, order, title_en, title_jp, video_url,
               duration_seconds, is_free_preview
Enrollments    id, user_id, course_id, enrolled_at, completed_at
Progress       id, user_id, lesson_id, completed_at
Certificates   id, user_id, course_id, issued_at, certificate_url
```

---

## 8. Legal & Compliance

### 8.1 US Compliance
- Privacy Policy covering CCPA (California residents)
- Terms of Service for LMS access and course content IP
- Cookie consent notice (minimal — Plausible analytics is cookie-free)
- ADA / WCAG 2.1 AA accessibility compliance
- Stripe handles PCI compliance for payment processing

### 8.2 Japan Compliance (APPI)
- Act on the Protection of Personal Information (APPI) requires explicit notice of data collection purpose
- Privacy Policy must be available in Japanese and specifically address APPI obligations
- Users in Japan must have the right to request data access, correction, and deletion
- Do not transfer Japan user data outside Japan without consent or APPI-approved mechanisms
- A Japanese-language contact method for privacy inquiries must be provided

---

## 9. Launch Phases & Roadmap

### Phase 1 — Foundation *(Weeks 1–6)*
- [ ] Brand identity finalized (logo, color palette, type system)
- [ ] Next.js project scaffolded with i18n, Supabase, and Stripe integrated
- [ ] Homepage, HonuHub, Exploration Island, About, Apply pages built
- [ ] Blog CMS configured; 3–5 launch posts written in EN
- [ ] Newsletter integration live (Beehiiv)
- [ ] 3+ projects loaded into Exploration Island
- [ ] Full EN site QA and performance testing

### Phase 2 — LMS Launch *(Weeks 7–12)*
- [ ] Course catalog and individual course pages built
- [ ] Video hosting configured (MUX/Vimeo)
- [ ] Payment flow (Stripe) tested end-to-end
- [ ] Student dashboard and progress tracking live
- [ ] First 2–3 courses published (EN minimum)
- [ ] Certificate generation working
- [ ] Skool community linked from site

### Phase 3 — Japan Market *(Weeks 10–16)*
- [ ] JP translations complete for all Phase 1 pages (human-reviewed)
- [ ] Course descriptions and LMS UI translated to JP
- [ ] JP blog posts published or EN posts translated
- [ ] APPI-compliant privacy policy and JP contact channel live
- [ ] LINE share button added to blog posts
- [ ] Japan-specific SEO: hreflang tags, JP keyword research applied
- [ ] Performance testing for Japan CDN latency

### Phase 4 — Growth & Scale *(Month 4+)*
- [ ] HonuHub "Future Locations" inquiry page launched
- [ ] JP course subtitles and video translations added
- [ ] Advanced LMS features: cohort learning, live session integration
- [ ] Affiliate/referral program for community members
- [ ] Analytics review and conversion rate optimization

---

## 10. Open Items & Decisions Needed

> **Launch priority is ASAP.** All decisions below are blocking or near-blocking. Resolve in order.

| Question | Context | Priority | Owner |
|---|---|---|---|
| First courses to launch? | Titles, outlines, and pricing needed before LMS build can begin | 🔴 Blocking | Ryan + Team |
| Newsletter platform: Beehiiv or ConvertKit? | Must be decided before Phase 1 ends to configure signup flows | 🔴 Blocking | Ryan |
| CMS: Sanity.io or Payload CMS? | Must be decided before blog is built in Phase 1 | 🔴 Blocking | Ryan / Dev |
| HonuHub booking pricing model? | Drop-in vs. membership vs. event-based; needed before HonuHub page goes live | 🟡 High | Ryan |
| Video hosting: MUX or Vimeo Pro? | Needed before Phase 2 LMS build begins | 🟡 High | Ryan / Dev |
| Design partner / agency? | Brand identity and Exploration Island illustration are design deliverables, not dev ones | 🟡 High | Ryan |
| JP translator / partner identified? | Needed for Phase 3 human-reviewed translations | 🟡 High | Ryan |
| Skool community structure? | Free vs. paid tiers; integration depth with LMS | 🟠 Medium | Ryan |
| Domain and hosting confirmed? | honuvibe.ai registered? Vercel org set up? | 🔴 Blocking | Ryan / Dev |
| APPI legal review? | Japan-qualified attorney should review privacy policy before JP launch | 🟠 Medium | Ryan |

---

*HonuVibe.AI — PRD v1.1 | Prepared for Ryan Jackson | Confidential*

*Made in Hawaii with Aloha 🐢*
