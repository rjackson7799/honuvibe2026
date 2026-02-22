# HonuVibe.AI

**A Whole New Vibe for AI Learning**

Hawaii-born. Globally minded. Built for the AI age.

---

HonuVibe.AI is a bilingual (English/Japanese) platform for AI consulting, education, and community. Founded by Ryan Jackson in Honolulu, Hawaii, the site serves as the primary hub for course enrollment, community building, portfolio discovery, and personal brand amplification.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript strict) |
| Styling | Tailwind CSS v3.4+ |
| Hosting | Vercel (Pro plan, Japan edge) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Payments | Stripe (USD + JPY) |
| Video | MUX or Vimeo Pro (TBD) |
| Email/Newsletter | Beehiiv |
| CMS (Blog) | Sanity.io |
| i18n | next-intl |
| Analytics | Plausible + Vercel Analytics |
| Booking | Cal.com |

## Directory Structure

```
honuvibe/
├── app/
│   ├── [locale]/          # All pages under locale routing (en, ja)
│   │   ├── page.tsx       # Homepage
│   │   ├── honuhub/
│   │   ├── exploration/
│   │   ├── about/
│   │   ├── blog/
│   │   ├── community/
│   │   ├── apply/
│   │   ├── learn/
│   │   ├── privacy/
│   │   ├── terms/
│   │   └── cookies/
│   ├── api/               # API routes (auth, stripe, newsletter, apply, og)
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ui/                # Primitives (Button, Input, Card, Tag, etc.)
│   ├── layout/            # Nav, Footer, ThemeToggle, LangToggle
│   ├── sections/          # Page sections (Hero, MissionStrip, etc.)
│   ├── exploration/       # Territory cards, project cards
│   ├── learn/             # Course cards, filters, player
│   ├── blog/              # Post cards, share buttons
│   └── ocean/             # OceanCanvas, HonuMark, HonuCompanion
├── lib/
│   ├── supabase/          # Browser + server clients, middleware
│   ├── stripe/            # Client + webhooks
│   ├── sanity/            # Client + GROQ queries
│   ├── theme.ts
│   ├── analytics.ts
│   └── utils.ts
├── messages/
│   ├── en.json            # English UI strings
│   └── ja.json            # Japanese UI strings
├── public/
│   ├── llms.txt           # AI discoverability
│   ├── fonts/
│   └── images/
├── styles/
│   └── globals.css        # Tailwind directives, CSS variables, animations
├── docs/
│   ├── HonuVibe_PRD_v11.md
│   └── HonuVibe_TechSpec_v1.md
├── middleware.ts           # next-intl locale detection + auth redirects
├── tailwind.config.ts
├── next.config.ts
└── i18n.ts                # next-intl config
```

## Domain Architecture

| Domain | Purpose |
|---|---|
| `honuvibe.ai` | Brand site, community, lead capture |
| `learn.honuvibe.ai` | Course delivery, LMS, student dashboard |
| `consult.honuvibe.ai` | Consulting intake, application, scheduling |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended package manager)

### Environment Variables

Create a `.env.local` file at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
SANITY_API_TOKEN=

# Beehiiv
BEEHIIV_API_KEY=
BEEHIIV_PUBLICATION_ID=

# Plausible
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=honuvibe.ai

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Development

```bash
pnpm install
pnpm dev
```

### Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript type checking |

## Documentation

- [Product Requirements Document (PRD v1.1)](docs/HonuVibe_PRD_v11.md)
- [Technical Specification (v1.0)](docs/HonuVibe_TechSpec_v1.md)
- [Build Progress Tracker](PROGRESS.md)

## License

Proprietary - All rights reserved. HonuVibe.AI / Ryan Jackson.

---

*Made in Hawaii with Aloha*
