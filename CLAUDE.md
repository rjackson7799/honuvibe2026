# CLAUDE.md — HonuVibe.AI Project Intelligence

## Project Overview

HonuVibe.AI is a bilingual (EN/JP) platform for AI education, consulting, and community. Founded by Ryan Jackson in Hawaii. The site is the central engine of a growth flywheel: social content → website → newsletter/community → courses → portfolio → brand → more content.

**Primary conversion goal:** Course enrollment. All secondary CTAs feed into this.

**Reference docs:**
- `docs/HonuVibe_PRD_v11.md` — What to build and why
- `docs/HonuVibe_TechSpec_v1.md` — How to build it

## Tech Stack

- **Framework:** Next.js 14+ with App Router, TypeScript strict mode
- **Styling:** Tailwind CSS v3.4+ with custom design tokens (CSS variables)
- **Database:** PostgreSQL via Supabase (row-level security enabled)
- **Auth:** Supabase Auth — email/password + Google OAuth (Phase 2)
- **Payments:** Stripe — USD + JPY, Checkout Sessions (Phase 2)
- **CMS:** Sanity.io for blog content, Supabase for course data
- **i18n:** next-intl with URL-based locale routing
- **Analytics:** Plausible (custom events) + Vercel Analytics
- **Email:** Beehiiv for newsletter
- **Booking:** Cal.com for HonuHub sessions
- **Hosting:** Vercel (Pro plan, Japan edge)

## Architecture Conventions

### Routing
- All pages live under `app/[locale]/` using next-intl
- English URLs have no prefix: `/about`, `/learn`
- Japanese URLs use `/ja/` prefix: `/ja/about`, `/ja/learn`
- API routes live under `app/api/` (not locale-prefixed)
- Middleware handles: locale detection from cookie → browser lang → default (en), auth redirects for dashboard routes

### Component Organization
- `components/ui/` — Primitives: Button, Input, Card, Tag, Select, Textarea, Overline, SectionHeading
- `components/layout/` — Nav, Footer, ThemeToggle, LangToggle, Container, Section, AuthGuard
- `components/sections/` — Page-level sections: HeroSection, MissionStrip, FeaturedCourses, etc.
- `components/exploration/` — Territory and project card components
- `components/learn/` — Course cards, filters, player
- `components/blog/` — Post cards, share buttons
- `components/ocean/` — OceanCanvas, HonuMark, HonuCompanion, DepthIndicator

### Library Utilities
- `lib/supabase/client.ts` — Browser Supabase client
- `lib/supabase/server.ts` — Server Supabase client
- `lib/supabase/middleware.ts` — Auth middleware helpers
- `lib/stripe/client.ts` — Stripe client
- `lib/stripe/webhooks.ts` — Webhook handlers
- `lib/sanity/client.ts` — Sanity client
- `lib/sanity/queries.ts` — GROQ queries
- `lib/theme.ts` — Theme detection and toggle utilities
- `lib/analytics.ts` — Plausible event tracking helper
- `lib/utils.ts` — General utilities

## Design System

### Theming
- **Dark mode is default.** Light mode is secondary.
- Theme stored in `localStorage` key `honuvibe-theme`
- Applied via `data-theme` attribute on `<html>`
- On first visit: respect `prefers-color-scheme` system preference
- All colors defined as CSS custom properties in `styles/globals.css`
- Tailwind references these variables — never use hardcoded colors

### Color Tokens (key ones)
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-glass`
- `--fg-primary`, `--fg-secondary`, `--fg-tertiary`, `--fg-muted`
- `--accent-teal` (primary), `--accent-gold` (secondary)
- `--border-primary`, `--border-secondary`, `--border-hover`, `--border-accent`
- Territory accents: `--territory-web`, `--territory-db`, `--territory-saas`, `--territory-auto`, `--territory-pro`
- Nav active states: teal (`--m-accent-teal`) for all primary nav links **except Partnerships**, which uses coral (`--m-accent-coral`) per `components/marketing/nav/marketing-nav-client.tsx:50-54`

### Typography
- **Section headings (EN):** DM Serif Display, weight 400 only — never bold. Applies to h2/h3 inside pages.
- **Hero headlines (EN):** Two-voice system — see "Hero Voice System" below.
- **Body (EN):** DM Sans, weights 300/400/500/600/700
- **Body (JP):** Noto Sans JP, weights 300/400/500/700
- **Code/Tags:** JetBrains Mono, weight 400
- **Overlines:** DM Sans 600, 11px, uppercase, 0.18em letter-spacing
- Fluid type scale using `clamp()` for display/h1/h2/h3

### Hero Voice System

Hero headlines use one of two voices, chosen by page intent:

- **Action voice** — bold DM Sans, tracking `-0.025em` to `-0.03em`, fluid size `clamp(40-42px, 5.5vw, 64-66px)`.
  Used for transactional/conversion pages where the user is being asked to *do* something.
  Current pages: Home, Contact.

- **Editorial voice** — italic DM Serif Display (weight 400), tight leading (~0.92–1.05).
  Used for narrative "chapter" pages where the user is being invited to *read*.
  Current pages: Learn, Explore, Partnerships, About.

Rules:
- Pick the voice from page intent, not aesthetics. CTA-first → action. Story-first → editorial.
- Section headings (h2/h3 inside a page) always stay upright DM Serif Display 400, regardless of which hero voice the page opens with. This keeps body-of-page typography stable across both hero voices.
- Don't invent a third hero voice. If a new page truly fits neither, default to editorial and flag it for review.

JP equivalents (pending visual verification on `/ja/*` routes):
- Action voice → Noto Sans JP weight 700.
- Editorial voice → Noto Serif JP italic if available; otherwise Noto Sans JP weight 500 (italic serif doesn't render well in JP — use a weight contrast instead).

### JP Typography Rules
- `line-height`: 1.7–1.8 for JP body text (vs 1.6 for EN)
- `letter-spacing`: 0.02–0.04em for JP body
- Never `text-justify` on Japanese text
- `word-break: break-all` is acceptable for JP
- `font-display: swap` on all font declarations

### Animation
- Easing: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`
- Duration tokens: `--duration-fast` (150ms), `--duration-normal` (250ms), `--duration-slow` (500ms), `--duration-reveal` (900ms)
- Section reveals: fade-up with IntersectionObserver, threshold 0.08
- Respect `prefers-reduced-motion: reduce` — disable all animations

### Spacing
- Section vertical gap: 64px mobile, 96px desktop
- Content max-width: 880px (primary), 600px (narrow/forms), 1100px (wide/grids)
- Page horizontal padding: 20-24px mobile, container handles desktop

## i18n Conventions

- Translation files: `messages/en.json`, `messages/ja.json`
- Structure mirrors component tree (e.g., `nav.home`, `hero.cta_primary`)
- Use `useTranslations('namespace')` hook in components
- Blog content: Sanity.io with `body_en`/`body_jp` fields
- Course data: Supabase with `title_en`/`title_jp`, `description_en`/`description_jp` columns
- Never machine-translate without human review for production
- LINE share button appears first in social share row on JP pages

## Database Conventions

- All tables use UUID primary keys via `gen_random_uuid()`
- Timestamps: `timestamptz` with `default now()`
- Bilingual fields: `_en` and `_jp` suffixes (e.g., `title_en`, `title_jp`)
- Row-level security enabled on all user-facing tables
- HonuHub data includes `location_id` for multi-location scalability
- Stripe customer ID stored on user record
- Enrollment uniqueness: `unique(user_id, course_id)`

## Key Integration Patterns

### Stripe
- Checkout Sessions (hosted) for course purchases
- Webhook at `/api/stripe/webhook` processes `checkout.session.completed`
- JPY is zero-decimal — store yen directly, not cents
- USD prices stored in cents

### Sanity.io
- GROQ queries for blog content
- ISR with 60s revalidation for blog
- Portable Text for rich content
- Blog categories: ai-tools, entrepreneurship, japan-us, behind-the-build, honuhub-stories, impact

### Beehiiv
- REST API at `/api/newsletter/subscribe`
- Double opt-in required
- GDPR + APPI compliant

### Plausible
- Custom events via `trackEvent(name, props)` helper in `lib/analytics.ts`
- Key events: newsletter_signup, course_enroll_click, apply_submit, language_toggle, theme_toggle

## Performance Budgets

- Lighthouse Performance (mobile): 90+
- LCP: < 2.5s
- Total page weight: < 800KB initial
- JS bundle: < 200KB gzipped
- Font payload: < 400KB total
- Hero image (mobile): < 150KB (WebP/AVIF)

## Build Phases

1. **Phase 1 (Foundation):** Scaffold Next.js, design system, all public pages (EN), blog CMS, newsletter, analytics
2. **Phase 1.5 (Japan):** Complete JP translations, hreflang, APPI compliance, LINE integration
3. **Phase 2 (LMS):** Auth, course catalog, Stripe payments, student dashboard, progress tracking, certificates
4. **Phase 3 (Growth):** Interactive Exploration Island map, future HonuHub locations, advanced LMS features

## Development Workflow

Every unit of work runs the same loop: **Plan → Execute → Review → Verify → Ship.**
Full detail in `docs/dev-workflow.md`; execution prompt in `docs/plans/_EXECUTION_TEMPLATE.md`.

- **Plan:** one file per unit at `docs/plans/<YYYY-MM-DD>-<slug>.md`. Pause for Ryan's
  explicit review of the plan before a full build.
- **Execute:** a fresh session per plan (clean context prevents drift). Fan out to
  parallel sub-agents only when phases are genuinely independent — most plans are one unit.
- **Review (required, before commit):** get an independent adversarial pass that tries to
  *refute* the diff — a code-reviewer sub-agent (`requesting-code-review`) for routine work,
  or `/code-review` / `/code-review ultra` (user-triggered, billed) for large features.
  Triage findings with `receiving-code-review`; verify each before acting, don't blindly apply.
- **Verify (required, before commit):** `pnpm verify` (type-check → tests → build) is the
  default gate; `pnpm verify:fast` for inner loops. If RLS/migrations changed, also run
  `pnpm test:rls` — local run needs the duplicate survey migrations (022/025) temp-renamed
  first, then restored. UI changes also get a browser EN + `/ja` smoke. Never claim done
  without the relevant gate green.
- **Ship:** stage only intentional files, commit directly to `main`, push. No branches,
  no PRs, hooks must pass (no `--no-verify`). Use **pnpm**, never npm.
- **Prod migrations are manual:** if a migration shipped, apply the `0NN_*.sql` in the
  Supabase dashboard SQL editor on `zvfwtndbxshrtpwcwynw` *after* deploy — the Vercel
  deploy does not run it, and the code 500s ahead of its schema until you do.
- One-keystroke helpers: **`/verify`** (run the gate) and **`/ship`** (verify → review →
  commit to main → push → report).

## Code Style

- TypeScript strict mode — no `any` types
- Tailwind CSS for all styling — no inline styles, no CSS modules
- Use CSS variables via Tailwind config — never hardcode colors
- Server Components by default; `'use client'` only when needed
- Prefer named exports for components
- File naming: kebab-case for files, PascalCase for component exports
- All images served via Next.js `<Image>` with explicit dimensions
- Mobile-first responsive design — style mobile default, add breakpoints up
- Minimum touch target: 44x44px
- Minimum input font size: 16px (prevents iOS zoom)
- WCAG 2.1 AA contrast compliance required for both themes

## Bash Command Guidelines

- Proceed without hesitation on routine dev commands: build, test, lint, install, clean
- Use `rm -rf` freely for temp/build/cache directories (`.next`, `node_modules`, temp scaffolds, test outputs)
- Don't ask for confirmation on standard file operations (copy, move, rename, delete temp files)
- When scaffolding or rebuilding, clean up previous artifacts automatically
