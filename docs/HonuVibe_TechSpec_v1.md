# HonuVibe.AI — Technical Specification
**Build-Ready Engineering Blueprint | v1.0**
*Confidential — Ryan Jackson / HonuVibe.AI | 2026*

---

## How to Use This Document

This tech spec is the engineering companion to the HonuVibe PRD v1.1. Together, these two documents define everything needed to build the HonuVibe.AI site.

- **PRD** → What to build and why (business logic, page requirements, content strategy, audience)
- **Tech Spec** → How to build it (architecture, design system, components, data models, implementation)

Reference the PRD for content copy, page section ordering, and business rules. Reference this document for all implementation decisions.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Design System](#2-design-system)
3. [Signature Interactions](#3-signature-interactions)
4. [Component Inventory](#4-component-inventory)
5. [Mobile-First Specifications](#5-mobile-first-specifications)
6. [Internationalization (i18n)](#6-internationalization)
7. [Data Models](#7-data-models)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Payments](#9-payments)
10. [CMS & Content](#10-cms--content)
11. [SEO & Metadata](#11-seo--metadata)
12. [Analytics & Events](#12-analytics--events)
13. [Third-Party Integrations](#13-third-party-integrations)
14. [Performance Budgets](#14-performance-budgets)
15. [Build Phases & File Map](#15-build-phases--file-map)

---

## 1. Architecture

### 1.1 Stack

| Layer | Choice | Version / Notes |
|---|---|---|
| Framework | Next.js | 14+ (App Router) |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS | v3.4+ with custom config |
| Hosting | Vercel | Pro plan (Japan edge) |
| Database | PostgreSQL via Supabase | Managed, row-level security |
| Auth | Supabase Auth | Email/password + Google OAuth |
| Payments | Stripe | USD + JPY, one-time + subscriptions |
| Video | MUX or Vimeo Pro | Decision needed before Phase 2 |
| Email | Beehiiv | Newsletter, automation |
| CMS | Sanity.io | Blog, structured content |
| i18n | next-intl | URL-based locale routing |
| Analytics | Plausible + Vercel Analytics | GDPR/APPI compliant |
| Booking | Cal.com (cloud) | HonuHub sessions |
| IDE | Cursor | Claude integration |

### 1.2 Domain & Routing

Single domain: `honuvibe.ai`. No subdomains.

All locale routing is handled by next-intl via a `[locale]` dynamic segment. Default locale is `en`, secondary is `ja`. English URLs have no prefix; Japanese URLs use `/ja/`.

### 1.3 Directory Structure

```
honuvibe/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx                 # Root layout: ThemeProvider, nav, footer, i18n
│   │   ├── page.tsx                   # Homepage
│   │   ├── honuhub/
│   │   │   └── page.tsx
│   │   ├── exploration/
│   │   │   └── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── blog/
│   │   │   ├── page.tsx               # Blog index
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx           # Individual post
│   │   │   └── feed.xml/
│   │   │       └── route.ts           # RSS feed
│   │   ├── community/
│   │   │   └── page.tsx
│   │   ├── apply/
│   │   │   └── page.tsx
│   │   ├── learn/
│   │   │   ├── page.tsx               # Course catalog (public)
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx           # Course page (public)
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx         # Auth guard
│   │   │   │   ├── page.tsx           # Student dashboard
│   │   │   │   └── [course-slug]/
│   │   │   │       └── page.tsx       # Course player
│   │   │   ├── account/
│   │   │   │   └── page.tsx           # Settings (auth)
│   │   │   └── certificate/
│   │   │       └── [id]/
│   │   │           └── page.tsx       # Public certificate
│   │   ├── privacy/
│   │   │   └── page.tsx
│   │   ├── terms/
│   │   │   └── page.tsx
│   │   └── cookies/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/route.ts      # Supabase auth callback
│   │   ├── stripe/
│   │   │   └── webhook/route.ts       # Stripe webhooks
│   │   ├── newsletter/
│   │   │   └── subscribe/route.ts     # Beehiiv subscription
│   │   ├── apply/
│   │   │   └── submit/route.ts        # Application form handler
│   │   └── og/
│   │       └── route.tsx              # Dynamic OG image generation
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── ui/                            # Primitives (Button, Input, Card, etc.)
│   ├── layout/                        # Nav, Footer, ThemeToggle, LangToggle
│   ├── sections/                      # Page sections (Hero, MissionStrip, etc.)
│   ├── exploration/                   # Territory cards, project cards
│   ├── learn/                         # Course cards, filters, player
│   ├── blog/                          # Post cards, share buttons
│   └── ocean/                         # OceanCanvas, HonuMark, depth effects
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # Browser client
│   │   ├── server.ts                  # Server client
│   │   └── middleware.ts              # Auth middleware
│   ├── stripe/
│   │   ├── client.ts
│   │   └── webhooks.ts
│   ├── sanity/
│   │   ├── client.ts
│   │   └── queries.ts                # GROQ queries
│   ├── theme.ts                       # Theme utilities
│   ├── analytics.ts                   # Plausible event helpers
│   └── utils.ts
├── messages/
│   ├── en.json                        # English UI strings
│   └── ja.json                        # Japanese UI strings
├── public/
│   ├── llms.txt                       # AI discoverability
│   ├── fonts/                         # Self-hosted fonts if needed
│   └── images/
├── styles/
│   └── globals.css                    # Tailwind directives, CSS variables, animations
├── middleware.ts                       # next-intl locale detection + auth redirects
├── tailwind.config.ts
├── next.config.ts
└── i18n.ts                            # next-intl config
```

### 1.4 Middleware

```typescript
// middleware.ts
// 1. next-intl: detect locale from cookie → browser language → default (en)
// 2. If navigator.language includes 'ja' and no cookie set, suggest JP
// 3. Auth: redirect /learn/dashboard/* and /learn/account to /auth/login if no session
// 4. Redirects: www → non-www, legacy aliases
```

---

## 2. Design System

### 2.1 Theme Architecture

The site supports two modes: **Dark** (default) and **Light**. Dark mode is the brand's signature — the ocean depth aesthetic. Light mode is the surface — warm, airy, approachable.

Theme preference is stored in `localStorage` under key `honuvibe-theme` and applied via a `data-theme` attribute on `<html>`. On first visit, respect `prefers-color-scheme` system preference. If system is light, use light. Otherwise default to dark.

```typescript
// lib/theme.ts
type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('honuvibe-theme') as Theme | null;
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
```

### 2.2 Color Tokens

All colors are defined as CSS custom properties on `:root` (dark) and `[data-theme="light"]`. Tailwind is configured to reference these variables.

```css
/* styles/globals.css */

:root {
  /* === DARK MODE (Default) === */
  
  /* Backgrounds */
  --bg-primary: #080c18;              /* Page background — deep navy/black */
  --bg-secondary: #0d1220;            /* Card backgrounds, sections */
  --bg-tertiary: #131a2e;             /* Elevated surfaces, hover states */
  --bg-glass: rgba(8, 12, 24, 0.85);  /* Nav, overlays with backdrop-blur */
  
  /* Foreground / Text */
  --fg-primary: rgba(255, 255, 255, 0.92);     /* Headlines, primary text */
  --fg-secondary: rgba(255, 255, 255, 0.55);   /* Body text, descriptions */
  --fg-tertiary: rgba(255, 255, 255, 0.35);    /* Captions, metadata, placeholders */
  --fg-muted: rgba(255, 255, 255, 0.15);       /* Dividers as text, disabled */
  
  /* Brand */
  --accent-teal: #5eaaa8;             /* Primary accent — muted teal */
  --accent-teal-hover: #4d9997;
  --accent-teal-subtle: rgba(94, 170, 168, 0.12);
  --accent-gold: #b68d40;             /* Secondary accent — warm gold */
  --accent-gold-hover: #a47d38;
  --accent-gold-subtle: rgba(182, 141, 64, 0.12);
  
  /* Borders */
  --border-primary: rgba(255, 255, 255, 0.08);
  --border-secondary: rgba(255, 255, 255, 0.04);
  --border-hover: rgba(255, 255, 255, 0.15);
  --border-accent: rgba(94, 170, 168, 0.3);
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.4);
  --shadow-accent: 0 8px 24px rgba(94, 170, 168, 0.2);
  
  /* Ocean Canvas (generative hero background) */
  --ocean-surface: rgb(8, 24, 48);
  --ocean-deep: rgb(4, 12, 28);
  --ocean-caustic: rgba(120, 180, 200, 0.015);
  --ocean-wave: rgba(255, 255, 255, 0.025);
  --ocean-particle: rgba(180, 210, 220, 0.08);
  
  /* Exploration Island territory accents */
  --territory-web: #5eaaa8;
  --territory-db: #5b8fb9;
  --territory-saas: #b68d40;
  --territory-auto: #8b7ec8;
  --territory-pro: #5ea88e;
}

[data-theme="light"] {
  /* === LIGHT MODE === */
  
  /* Backgrounds */
  --bg-primary: #faf9f7;              /* Warm off-white — sand/paper tone */
  --bg-secondary: #ffffff;            /* Cards, elevated surfaces */
  --bg-tertiary: #f2f0ec;             /* Subtle sections, hover */
  --bg-glass: rgba(250, 249, 247, 0.88);
  
  /* Foreground / Text */
  --fg-primary: #1a1a2e;              /* Near-black with warm undertone */
  --fg-secondary: #4a4a5a;            /* Body text */
  --fg-tertiary: #8a8a96;             /* Captions, metadata */
  --fg-muted: #c8c8d0;               /* Dividers, disabled */
  
  /* Brand — slightly deeper for contrast on light */
  --accent-teal: #3d8a88;
  --accent-teal-hover: #327574;
  --accent-teal-subtle: rgba(61, 138, 136, 0.08);
  --accent-gold: #9a7530;
  --accent-gold-hover: #846528;
  --accent-gold-subtle: rgba(154, 117, 48, 0.08);
  
  /* Borders */
  --border-primary: rgba(0, 0, 0, 0.08);
  --border-secondary: rgba(0, 0, 0, 0.04);
  --border-hover: rgba(0, 0, 0, 0.12);
  --border-accent: rgba(61, 138, 136, 0.25);
  
  /* Shadows — softer, warmer */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.1);
  --shadow-accent: 0 8px 24px rgba(61, 138, 136, 0.12);
  
  /* Ocean Canvas — light mode uses a subtle surface-level palette */
  --ocean-surface: rgb(200, 220, 230);
  --ocean-deep: rgb(170, 200, 215);
  --ocean-caustic: rgba(255, 255, 255, 0.4);
  --ocean-wave: rgba(255, 255, 255, 0.15);
  --ocean-particle: rgba(255, 255, 255, 0.3);
  
  /* Territory accents — same hues, adjusted for light bg */
  --territory-web: #3d8a88;
  --territory-db: #4275a0;
  --territory-saas: #9a7530;
  --territory-auto: #6b5ea8;
  --territory-pro: #3d8870;
}
```

### 2.3 Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          glass: 'var(--bg-glass)',
        },
        fg: {
          primary: 'var(--fg-primary)',
          secondary: 'var(--fg-secondary)',
          tertiary: 'var(--fg-tertiary)',
          muted: 'var(--fg-muted)',
        },
        accent: {
          teal: 'var(--accent-teal)',
          'teal-hover': 'var(--accent-teal-hover)',
          'teal-subtle': 'var(--accent-teal-subtle)',
          gold: 'var(--accent-gold)',
          'gold-hover': 'var(--accent-gold-hover)',
          'gold-subtle': 'var(--accent-gold-subtle)',
        },
        border: {
          DEFAULT: 'var(--border-primary)',
          secondary: 'var(--border-secondary)',
          hover: 'var(--border-hover)',
          accent: 'var(--border-accent)',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Noto Sans JP', '-apple-system', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        jp: ['Noto Sans JP', 'sans-serif'],
      },
      fontSize: {
        // Fluid type scale using clamp
        'display': 'clamp(32px, 7vw, 64px)',
        'h1': 'clamp(26px, 5vw, 44px)',
        'h2': 'clamp(22px, 4vw, 32px)',
        'h3': 'clamp(18px, 3vw, 24px)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        accent: 'var(--shadow-accent)',
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '12px',
        xl: '16px',
      },
      spacing: {
        'section': '96px',     // Vertical spacing between page sections
        'section-mobile': '64px',
      },
      screens: {
        'xs': '375px',         // iPhone SE
        'sm': '640px',
        'md': '768px',         // Tablet
        'lg': '1024px',
        'xl': '1280px',        // Desktop
        '2xl': '1536px',
      },
      maxWidth: {
        'content': '880px',    // Primary content width
        'narrow': '600px',     // Narrow content (forms, newsletter)
        'wide': '1100px',      // Wide content (course catalog grid)
      },
    },
  },
  plugins: [],
};

export default config;
```

### 2.4 Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Headlines (EN) | DM Serif Display | 400 (regular) | Elegant serif; do not bold |
| Body (EN) | DM Sans | 300, 400, 500, 600, 700 | Primary workhorse |
| Body (JP) | Noto Sans JP | 300, 400, 500, 700 | Load only these weights |
| Code / Tags | JetBrains Mono | 400 | Tech tags, metadata |
| Overlines | DM Sans | 600 | 11px, uppercase, 0.18em letter-spacing |

**JP-specific rules:**
- `line-height`: 1.7–1.8 for JP body text (vs 1.6 for EN)
- `letter-spacing`: 0.02–0.04em for JP body
- Never `text-justify` on Japanese
- `word-break: break-all` is acceptable for JP
- `font-display: swap` on all font declarations

**Font loading strategy:**
- Self-host DM Sans and DM Serif Display (subset Latin + extended Latin)
- Noto Sans JP via Google Fonts with `font-display: swap`, subset to `japanese` + `latin`
- Preload the two most critical weights: DM Sans 400, DM Serif Display 400
- Total font budget: < 400KB combined

### 2.5 Spacing Scale

Use Tailwind's default spacing scale (4px base). Key architectural spacings:

| Context | Mobile | Desktop |
|---|---|---|
| Page horizontal padding | 20–24px (`px-5` or `px-6`) | 0 (max-width container handles it) |
| Section vertical gap | 64px (`py-16`) | 96px (`py-24`) |
| Card gap | 12–16px (`gap-3` or `gap-4`) | 16–24px (`gap-4` or `gap-6`) |
| Content max-width | 100% | 880px (`max-w-content`) |
| Narrow content | 100% | 600px (`max-w-narrow`) |

### 2.6 Animation Tokens

All animations use a consistent easing curve and duration scale. Defined in `globals.css` and referenced via Tailwind utilities or CSS classes.

```css
/* globals.css */

:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 500ms;
  --duration-reveal: 900ms;
}

/* Section reveal — used by IntersectionObserver */
.reveal {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity var(--duration-reveal) var(--ease-out),
              transform var(--duration-reveal) var(--ease-out);
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .reveal { transition: none; opacity: 1; transform: none; }
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}

/* Gradient flow — hero "Vibe" text */
@keyframes gradientFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Float — scroll hint, decorative elements */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
```

### 2.7 Theme Toggle Component

```
Location: Top navigation, between nav links and language toggle
Icon: Sun (light) / Moon (dark) — simple line icon, 20px
Touch target: 44×44px
Behavior: Toggles data-theme on <html>, persists to localStorage
Transition: 250ms cross-fade on all themed properties
Accessibility: aria-label="Switch to light mode" / "Switch to dark mode"
```

The toggle sits left of the language toggle in the nav:

```
[Logo]  HonuHub  Exploration  Learn  Blog  About  Apply  [☀/☾] [EN|日本語]
```

On mobile (hamburger open): theme toggle appears above social links at the bottom of the overlay menu.

### 2.8 Dark/Light Mode — Component Behavior

| Component | Dark Mode | Light Mode |
|---|---|---|
| Ocean canvas (hero) | Deep navy palette, subtle caustics | Light blue-grey surface palette, brighter caustics |
| Navigation | Glass blur over dark bg | Glass blur over light bg |
| Cards | `bg-secondary` with `border-primary` | `bg-secondary` (white) with subtle shadow |
| Territory accent bars | Full saturation on dark | Slightly deeper hues for contrast |
| CTA buttons (primary) | Teal on dark bg | Teal on white — ensure WCAG AA contrast |
| CTA buttons (ghost) | White text, white border 12% | Dark text, dark border 8% |
| Code/tech tags | Dark bg, light text | Light bg, dark text |
| Footer | Same as body bg | Slightly warm grey (`bg-tertiary`) |
| Form inputs | Dark bg 3% white, border 8% | White bg, border 8% black |
| Text shimmer (hero) | Teal→gold gradient on dark | Teal→gold gradient on light (darker stops) |

**Contrast requirements (WCAG 2.1 AA):**
- Body text on background: minimum 4.5:1
- Large text (18px+ or 14px bold): minimum 3:1
- Interactive elements: minimum 3:1 against adjacent colors
- Test both modes with Colour Contrast Analyser before launch

---

## 3. Signature Interactions

These are the elements that differentiate HonuVibe from template sites. They must be implemented with restraint — premium, not playful.

### 3.1 Generative Ocean Hero

**What:** A `<canvas>` element behind the hero section rendering animated wave layers, light caustics, and sparse floating particles. As the user scrolls, the palette shifts from surface teal-navy to deep navy-black (dark mode) or from bright sky-blue to warm grey-blue (light mode).

**Implementation:**
- 2D Canvas API, not WebGL (lighter, better mobile support)
- Render at device pixel ratio, capped at 2x
- 3 wave layers, 4 caustic spots, 8 particles
- Frame rate: `requestAnimationFrame`, no throttle needed (canvas is lightweight)
- Scroll-linked depth via `container.scrollTop / maxScroll`
- Reads `--ocean-*` CSS variables for theme-appropriate colors
- On `prefers-reduced-motion: reduce`: render a static gradient, no animation

**Performance:** < 2% CPU on modern mobile. Canvas element is `position: absolute` behind hero content, does not affect layout.

### 3.2 Scroll-Depth Color Journey

**What:** The page `background-color` transitions smoothly as the user scrolls from top to bottom. In dark mode: deep navy at top → near-black at bottom. In light mode: warm off-white at top → cool grey at bottom.

**Implementation:**
- Calculated in the root layout scroll handler
- Applied via inline `style` on the scroll container, or via CSS custom property `--scroll-depth` updated on scroll
- Uses `requestAnimationFrame` for smooth updates
- Transition is continuous and subtle — not stepped

### 3.3 Honu Scroll Companion

**What:** A small, refined Honu mark (the geometric SVG from the design system) that floats along the right edge of the viewport, tracking scroll position. It gently rotates as it "swims" downward.

**Implementation:**
- `position: fixed`, right: 16px (mobile) / 20px (desktop)
- Vertical position: mapped from scroll progress (top of content → bottom of viewport)
- Rotation: `Math.sin(scrollProgress * Math.PI * 4) * 12` degrees
- Opacity: fades in after 100px of scroll, fades out at page bottom
- Size: 28px on mobile, 32px on desktop
- Color: `var(--accent-teal)` with `drop-shadow`
- Hidden when `prefers-reduced-motion: reduce`
- Does not interfere with scroll — no pointer events (`pointer-events: none`)

### 3.4 Gradient Text Shimmer

**What:** The word "Vibe" (or "for AI Learning" phrase) in the hero headline uses a slowly animating gradient: teal → gold → teal. Achieved via `background-clip: text`.

**Implementation:**
```css
.text-shimmer {
  background: linear-gradient(135deg, var(--accent-teal), var(--accent-gold), var(--accent-teal));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradientFlow 6s ease infinite;
}
```

### 3.5 Glass Navigation

**What:** Top nav uses `backdrop-filter: blur(24px) saturate(180%)` with a semi-transparent background. Transparent when at scroll top, transitions to glass when scrolled.

**Implementation:**
- `background: transparent` when `scrollY < 50`
- `background: var(--bg-glass)` when `scrollY >= 50`
- `border-bottom: 1px solid var(--border-secondary)` added on scroll
- Transition: 400ms ease
- Sticky: `position: fixed; top: 0; z-index: 200`
- Height: 56px on mobile, 64px on desktop

### 3.6 Section Reveals

**What:** Each major page section fades up (opacity 0→1, translateY 32px→0) when it enters the viewport.

**Implementation:**
- Custom `useReveal()` hook using IntersectionObserver
- Threshold: 0.08 (triggers when 8% of section is visible)
- Once triggered, stays visible (no reverse)
- Staggered children: optional `data-delay` attribute adds sequential delay (100ms increments)
- Duration: `var(--duration-reveal)` (900ms)
- Easing: `var(--ease-out)`
- Disabled when `prefers-reduced-motion: reduce`

### 3.7 Hawaii Time-Aware Theming (Phase 1 Enhancement)

**What:** In dark mode only, the hero ocean canvas subtly shifts hue based on the current time in Hawaii (HST, UTC-10).

| Hawaii Time | Hero Tone |
|---|---|
| 5:00–7:00 AM | Warm gold undertones (dawn) |
| 7:00 AM–5:00 PM | Standard teal-navy (day) |
| 5:00–7:00 PM | Coral/amber warmth (sunset) |
| 7:00 PM–5:00 AM | Deep navy, brighter particles (night) |

**Implementation:**
- Calculate HST from `new Date()` (UTC - 10 hours)
- Blend multiplier applied to the ocean canvas color channels
- Subtle — a 5–10% hue shift, not a dramatic palette change
- Does not affect the rest of the page, only the hero canvas

### 3.8 Theme Toggle Transition

**What:** When switching between dark and light mode, a brief (300ms) cross-fade smoothly transitions all themed elements.

**Implementation:**
```css
html.theme-transitioning,
html.theme-transitioning * {
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease !important;
}
```
Add `theme-transitioning` class to `<html>` when toggling, remove after 300ms.

---

## 4. Component Inventory

### 4.1 Primitives (`components/ui/`)

| Component | Props | Notes |
|---|---|---|
| `Button` | `variant: 'primary' | 'ghost' | 'gold'`, `size: 'sm' | 'md' | 'lg'`, `fullWidth`, `children`, `icon` | All buttons: min 44px height, border-radius 6px |
| `Input` | `type`, `placeholder`, `label`, `error`, `locale` | Min 48px height, 16px font (prevents iOS zoom) |
| `Select` | `options`, `label`, `placeholder` | Uses native `<select>` on mobile |
| `Textarea` | `label`, `placeholder`, `maxLength`, `showCount` | Min 120px height |
| `Card` | `children`, `hover`, `padding` | `bg-secondary`, `border-primary`, hover lifts |
| `Tag` | `children`, `color` | JetBrains Mono, 11px, rounded 3px |
| `Overline` | `children` | DM Sans 600, 11px, uppercase, 0.18em tracking, accent-teal |
| `SectionHeading` | `overline`, `heading`, `sub` | Overline + serif heading + secondary text |
| `Divider` | `width` | 1px line, `border-secondary` |
| `IconButton` | `icon`, `label`, `size` | 44×44px touch target, aria-label |

### 4.2 Layout (`components/layout/`)

| Component | Notes |
|---|---|
| `Nav` | Fixed top, glass effect, hamburger on mobile, theme toggle + lang toggle |
| `MobileMenu` | Full-screen overlay, 56px row height, social links at bottom |
| `Footer` | Single column mobile, 4 column desktop, social icons, legal links |
| `ThemeToggle` | Sun/moon icon, 44×44px, persists to localStorage |
| `LangToggle` | EN / 日本語 chips, active state, persists to cookie |
| `Container` | `max-w-content` centered with horizontal padding |
| `Section` | Vertical padding `section-mobile` / `section`, wraps with reveal animation |
| `AuthGuard` | Layout wrapper for `/learn/dashboard` — redirects to login if no session |

### 4.3 Sections (`components/sections/`)

| Component | Page(s) | Notes |
|---|---|---|
| `HeroSection` | Homepage | Ocean canvas, bilingual headline, CTAs, scroll hint |
| `MissionStrip` | Homepage | 4 value props in grid (1-col mobile, 4-col desktop) |
| `HonuHubFeature` | Homepage | Photo + text + CTA card |
| `FeaturedCourses` | Homepage | 3 course cards stacked/grid |
| `ExplorationPreview` | Homepage | 2 project teasers |
| `RyanBioStrip` | Homepage | Photo, quote, social links, CTA |
| `NewsletterSignup` | Homepage, Blog | Email input + subscribe button |
| `SocialProof` | Homepage | Testimonial quotes, community CTA |
| `CTAStrip` | Multiple | Reusable CTA banner (e.g., "Inspired to build?") |

### 4.4 Feature Components

| Component | Page(s) | Notes |
|---|---|---|
| `TerritoryList` | Exploration | Accordion rows with accent bars, expandable project cards |
| `ProjectCard` | Exploration | Title, outcome, tech tags, optional course link |
| `CourseCard` | Learn, Homepage | Thumbnail, title, metadata row, CTA |
| `CourseFilter` | Learn | Bottom sheet on mobile, inline on desktop |
| `SessionCard` | HonuHub | Date, title, language, capacity, price, book CTA |
| `PhotoGallery` | HonuHub | Horizontal swipe, dot indicators, scroll-snap |
| `BlogPostCard` | Blog | Thumbnail, title, reading time, category tag |
| `ShareButtons` | Blog | LINE (first on JP), X, LinkedIn, Copy Link |
| `ApplicationForm` | Apply | Multi-field form with validation, native selects |

### 4.5 Ocean (`components/ocean/`)

| Component | Notes |
|---|---|
| `OceanCanvas` | 2D canvas, receives `scrollProgress` and reads theme variables |
| `HonuMark` | Geometric SVG turtle, accepts `size` and `color` |
| `HonuCompanion` | Fixed-position animated Honu that tracks scroll |
| `DepthIndicator` | Fixed right-edge progress bar, teal→gold gradient fill |

---

## 5. Mobile-First Specifications

### 5.1 Core Rules

These apply to every component and page:

| Rule | Specification |
|---|---|
| Minimum touch target | 44×44px (48px recommended for primary CTAs) |
| Minimum input font size | 16px (prevents iOS Safari auto-zoom) |
| Hero viewport unit | `100svh` not `100vh` (Safari address bar compatibility) |
| Safe area insets | `env(safe-area-inset-*)` on sticky bottom elements |
| Parallax effects | Disabled on mobile (causes scroll jank on iOS) |
| Carousels | Never for content navigation. Only for photo galleries. |
| Sticky CTA (course page) | Bottom bar (64px height, above safe area) — replaces desktop sidebar |
| Filter UI | Bottom sheet on mobile — replaces inline dropdowns |
| Form layout | Single column, labels above inputs, full-width buttons |
| Font loading | Noto Sans JP budget: 500KB max (weights 400 + 700 only) |
| Image serving | `srcset` with mobile-specific crops (never serve desktop images to phones) |
| Horizontal scroll | Never. On any page. If it overflows, it's a bug. |

### 5.2 Breakpoint Behavior Summary

| Element | Mobile (default) | Tablet (md: 768px) | Desktop (xl: 1280px) |
|---|---|---|---|
| Navigation | Hamburger + full-screen overlay | Hamburger + overlay | Full horizontal nav |
| Hero | Static bg, stacked CTAs | Static bg, inline CTAs | Subtle parallax, wider |
| Mission strip | 1-column stack | 2×2 grid | 4-column row |
| Course cards | 1-column stack | 2-column grid | 3-column grid |
| Exploration Island | Territory accordion | Territory accordion | Interactive SVG map (Phase 3) |
| Blog index | Stacked list | 2-column grid | 3-column grid + sidebar |
| Course "Enroll" CTA | Sticky bottom bar | Sticky bottom bar | Sticky sidebar |
| Filters | Bottom sheet | Bottom sheet | Inline bar |
| Photo galleries | Swipeable strip | Swipeable strip | Grid or lightbox |
| Footer | 1-column stacked | 2-column | 4-column |

### 5.3 Target Devices for QA

| Device | Browser | Priority |
|---|---|---|
| iPhone 15 | Safari | Critical |
| iPhone SE (3rd gen) | Safari | Critical (smallest screen) |
| iPhone 15 Pro Max | Safari | High |
| Samsung Galaxy S24 | Chrome | High |
| iPad 10th gen | Safari | Medium |
| Pixel 7a | Chrome | Medium |

---

## 6. Internationalization

### 6.1 Setup

Framework: `next-intl` with URL-based locale routing.

```typescript
// i18n.ts
export const locales = ['en', 'ja'] as const;
export const defaultLocale = 'en';
```

### 6.2 URL Routing

- English: `/about`, `/learn`, `/blog/my-post`
- Japanese: `/ja/about`, `/ja/learn`, `/ja/blog/my-post`
- Language toggle swaps between routes, preserving the path
- Cookie `NEXT_LOCALE` stores preference (30-day expiry)
- `middleware.ts` detects `navigator.language` containing `ja` on first visit → suggest JP

### 6.3 Translation Files

```
messages/
├── en.json          # All UI strings in English
└── ja.json          # All UI strings in Japanese
```

Structure mirrors component tree. Example:

```json
{
  "nav": {
    "home": "Home",
    "honuhub": "HonuHub",
    "exploration": "Exploration Island",
    "learn": "Learn",
    "blog": "Blog",
    "about": "About Ryan",
    "apply": "Apply",
    "community": "Community"
  },
  "hero": {
    "headline_en": "A Whole New Vibe",
    "headline_en_2": "for AI Learning",
    "headline_jp": "新しいAI学習のスタイル",
    "sub": "Hawaii-born. Globally minded. Built for the AI age.",
    "cta_primary": "Explore Courses",
    "cta_secondary": "Join the Community"
  },
  "theme": {
    "switch_to_light": "Switch to light mode",
    "switch_to_dark": "Switch to dark mode"
  }
}
```

### 6.4 Content Translation

- **UI strings:** Managed in `messages/` JSON files, always fully translated
- **Blog posts:** Managed in Sanity.io with `body_en` and `body_ja` fields. EN published first, JP within 1–2 weeks.
- **Course descriptions:** Stored in Supabase with `title_en`, `title_jp`, `description_en`, `description_jp` columns
- **Course video content:** EN with JP subtitles (V1). Full JP audio is V2.
- **Translation workflow:** AI draft (DeepL Pro) → human native speaker review → publish

### 6.5 JP-Specific UX

- LINE share button appears first in social share row on JP pages
- `line-height` for JP body: 1.75 (CSS variable `--lh-jp`)
- `letter-spacing` for JP body: 0.03em
- Blog post share on JP pages includes LINE deep link: `https://social-plugins.line.me/lineit/share?url=`
- JP legal pages must reference APPI obligations specifically

---

## 7. Data Models

All tables in Supabase PostgreSQL. Row-level security (RLS) enabled.

### 7.1 Users

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  language_preference text default 'en' check (language_preference in ('en', 'ja')),
  theme_preference text default 'dark' check (theme_preference in ('dark', 'light')),
  stripe_customer_id text,
  avatar_url text,
  skool_linked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.2 Courses

```sql
create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_en text not null,
  title_jp text,
  description_en text,
  description_jp text,
  price integer not null,                -- cents (USD) or yen (JPY)
  currency text default 'usd' check (currency in ('usd', 'jpy')),
  language text default 'en' check (language in ('en', 'ja', 'both')),
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  format text check (format in ('self-paced', 'live', 'honuhub')),
  thumbnail_url text,
  instructor_id uuid references users(id),
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 7.3 Modules & Lessons

```sql
create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  sort_order integer not null,
  title_en text not null,
  title_jp text,
  created_at timestamptz default now()
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  sort_order integer not null,
  title_en text not null,
  title_jp text,
  video_url text,                        -- MUX or Vimeo URL
  duration_seconds integer,
  is_free_preview boolean default false,
  created_at timestamptz default now()
);
```

### 7.4 Enrollments & Progress

```sql
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  stripe_session_id text,
  amount_paid integer,                   -- cents or yen
  currency text default 'usd',
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  unique(user_id, course_id)
);

create table progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  completed_at timestamptz default now(),
  unique(user_id, lesson_id)
);
```

### 7.5 Certificates

```sql
create table certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  issued_at timestamptz default now(),
  certificate_url text                   -- Generated image URL
);
```

### 7.6 Reviews

```sql
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  review_text_jp text,
  is_published boolean default false,
  created_at timestamptz default now()
);
```

### 7.7 Locations (HonuHub)

```sql
create table locations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  country text,
  postal_code text,
  latitude decimal,
  longitude decimal,
  timezone text default 'Pacific/Honolulu',
  phone text,
  email text,
  hours_json jsonb,                      -- { "mon": "9:00-17:00", ... }
  photos_json jsonb,                     -- ["url1", "url2", ...]
  is_active boolean default true,
  created_at timestamptz default now()
);
```

### 7.8 Events/Sessions

```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id),
  title_en text not null,
  title_jp text,
  description_en text,
  description_jp text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity integer,
  enrolled_count integer default 0,
  price integer,                         -- cents or yen
  currency text default 'usd',
  language text check (language in ('en', 'ja', 'both')),
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  format text check (format in ('in-person', 'remote', 'hybrid')),
  booking_url text,
  is_published boolean default false,
  created_at timestamptz default now()
);
```

### 7.9 Applications (Apply to Work Together)

```sql
create table applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  website text,
  engagement_type text,
  project_description text,
  desired_outcome text,
  referral_source text,
  timeline text,
  budget_range text,
  locale text default 'en',
  status text default 'received' check (status in ('received', 'reviewing', 'responded', 'archived')),
  submitted_at timestamptz default now()
);
```

---

## 8. Authentication & Authorization

### 8.1 Supabase Auth

- **Phase 1:** No auth required. All pages are public.
- **Phase 2:** Auth gates `/learn/dashboard`, `/learn/account`

Methods:
- Email + password (with email confirmation)
- Google OAuth
- Optional: Apple Sign-In (evaluate adoption before implementing)

### 8.2 Auth Flow

1. User clicks "Enroll Now" → if not logged in, redirect to login/signup page
2. Login page at `/learn/auth` (not a separate route tree — it's part of the learn section)
3. After auth, redirect back to the course page or checkout
4. Session managed via Supabase JWT in httpOnly cookie
5. `middleware.ts` checks session for `/learn/dashboard/*` and `/learn/account` routes

### 8.3 RLS Policies

```sql
-- Users can only read/update their own profile
alter table users enable row level security;
create policy "users_own" on users for all using (auth.uid() = id);

-- Enrollments: users see only their own
create policy "enrollments_own" on enrollments for select using (auth.uid() = user_id);

-- Progress: users see only their own
create policy "progress_own" on progress for all using (auth.uid() = user_id);

-- Courses, modules, lessons: public read if is_published
create policy "courses_public" on courses for select using (is_published = true);
create policy "modules_public" on modules for select
  using (exists (select 1 from courses where courses.id = modules.course_id and courses.is_published = true));
create policy "lessons_public" on lessons for select
  using (exists (select 1 from modules m join courses c on c.id = m.course_id where m.id = lessons.module_id and c.is_published = true));
```

---

## 9. Payments

### 9.1 Stripe Integration

- **Currencies:** USD (default) and JPY
- **Products:** Each course is a Stripe Product. Price variants for USD and JPY.
- **Checkout:** Stripe Checkout Sessions (hosted) — simplest, PCI-compliant, supports Apple Pay/Google Pay
- **Webhooks:** `checkout.session.completed` → create Enrollment record in Supabase
- **Refunds:** Handled in Stripe Dashboard manually (Phase 1)

### 9.2 Checkout Flow

1. User clicks "Enroll Now" on course page
2. If not authenticated → redirect to auth → return to course
3. API route `/api/stripe/checkout` creates Stripe Checkout Session
4. User redirected to Stripe-hosted checkout
5. On success: Stripe sends webhook → `/api/stripe/webhook` → insert into `enrollments` table
6. User redirected to `/learn/dashboard/[course-slug]`

### 9.3 JPY Handling

Stripe treats JPY as a zero-decimal currency. `price` field in database stores yen directly (not cents). API route must detect currency and format accordingly:
- USD: `price: 19900` = $199.00
- JPY: `price: 29800` = ¥29,800

---

## 10. CMS & Content

### 10.1 Sanity.io Schema

Blog is managed in Sanity.io. Course content is managed in Supabase.

```typescript
// Sanity schema: blogPost
{
  name: 'blogPost',
  type: 'document',
  fields: [
    { name: 'title_en', type: 'string' },
    { name: 'title_jp', type: 'string' },
    { name: 'slug', type: 'slug', options: { source: 'title_en' } },
    { name: 'body_en', type: 'blockContent' },    // Portable Text
    { name: 'body_jp', type: 'blockContent' },
    { name: 'excerpt_en', type: 'text' },
    { name: 'excerpt_jp', type: 'text' },
    { name: 'category', type: 'string', options: {
      list: ['ai-tools', 'entrepreneurship', 'japan-us', 'behind-the-build', 'honuhub-stories', 'impact']
    }},
    { name: 'featured_image', type: 'image' },
    { name: 'author', type: 'reference', to: [{ type: 'author' }] },
    { name: 'published_at', type: 'datetime' },
    { name: 'reading_time_en', type: 'number' },
    { name: 'reading_time_jp', type: 'number' },
  ]
}
```

### 10.2 Content Fetching

- Blog: Sanity GROQ queries via `@sanity/client`, ISR with 60s revalidation
- Courses: Supabase queries, ISR with 300s revalidation for catalog, on-demand for dashboard
- Exploration Island projects: Sanity.io (treated as structured content with rich media)

---

## 11. SEO & Metadata

### 11.1 Per-Page Metadata

Every page uses Next.js `generateMetadata()` to produce:
- `<title>` — max 60 chars, keyword-front-loaded, brand-suffixed
- `<meta name="description">` — max 155 chars, compelling
- OpenGraph: `og:title`, `og:description`, `og:image` (1200×630), `og:url`, `og:locale`
- Twitter Card: `summary_large_image`
- `hreflang` tags: EN ↔ JP pairs + `x-default` → EN
- Canonical: self-referencing

### 11.2 JSON-LD Schema

Every page includes `<script type="application/ld+json">`:
- **All pages:** `Organization` + `WebSite` + `Person` (Ryan) in `@graph`
- **Homepage:** `WebPage`
- **HonuHub:** `LocalBusiness` + `EducationalOrganization`
- **Blog posts:** `Article` with author, dates, section
- **Course pages:** `Course` with provider, instructor, offers
- **Exploration projects:** `CreativeWork`
- **All interior pages:** `BreadcrumbList`

### 11.3 Dynamic OG Images

API route at `/api/og` generates branded OG images using `@vercel/og` (Satori). Used for:
- Blog posts: title + category + reading time on branded template
- Certificates: student name + course title on certificate template
- Default: HonuVibe brand card for pages without custom OG

### 11.4 Sitemap & Robots

- `app/sitemap.ts`: dynamic, includes all public pages in both locales with `hreflang`
- `app/robots.ts`: allows all crawlers including AI agents; disallows `/learn/dashboard`, `/learn/account`, `/api/`
- `public/llms.txt`: AI discoverability file (see PRD Addendum §A4)

---

## 12. Analytics & Events

### 12.1 Plausible Custom Events

| Event | Trigger | Props |
|---|---|---|
| `newsletter_signup` | Beehiiv form submit | `source_page`, `locale` |
| `community_click` | Skool CTA | `source_page`, `locale` |
| `course_view` | Course page load | `course_slug`, `locale` |
| `course_enroll_click` | "Enroll Now" click | `course_slug`, `locale`, `price` |
| `apply_submit` | Application form submit | `engagement_type`, `locale` |
| `honuhub_book_click` | Booking CTA | `session_type`, `locale` |
| `blog_share` | Share button | `post_slug`, `platform`, `locale` |
| `language_toggle` | Language switch | `from_locale`, `to_locale` |
| `theme_toggle` | Theme switch | `from_theme`, `to_theme` |
| `exploration_project_view` | Project card expand | `project_slug`, `category` |
| `cta_click` | Any primary CTA | `cta_label`, `source_page`, `locale` |

### 12.2 Helper

```typescript
// lib/analytics.ts
export function trackEvent(name: string, props?: Record<string, string>) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(name, { props });
  }
}
```

---

## 13. Third-Party Integrations

| Service | Integration Point | Notes |
|---|---|---|
| Supabase | Database + Auth | `@supabase/supabase-js` + `@supabase/ssr` |
| Stripe | Payments | `stripe` Node SDK + Stripe.js client |
| Sanity.io | Blog CMS | `@sanity/client` + `next-sanity` |
| Beehiiv | Newsletter | REST API for subscribe endpoint |
| Plausible | Analytics | Script tag + custom events API |
| Cal.com | Booking | Embed widget or direct links |
| MUX / Vimeo | Video | Player embed + API for upload/management |
| Google Maps | HonuHub page | Maps Embed API (no JS API needed) |
| Vercel Analytics | Web vitals | `@vercel/analytics` package |

---

## 14. Performance Budgets

| Metric | Target | Enforcement |
|---|---|---|
| Lighthouse Performance (mobile) | 90+ | CI check on every PR |
| LCP | < 2.5s | Image optimization, font preload |
| FID / INP | < 200ms | Minimal client JS, deferred hydration |
| CLS | < 0.1 | Explicit image dimensions, font-display: swap |
| Total page weight (initial) | < 800KB | Lazy-load below-fold, code splitting |
| Hero image (mobile) | < 150KB | WebP/AVIF, mobile-specific crop |
| Font payload | < 400KB total | Subset, preload critical weights only |
| JS bundle (initial) | < 200KB gzipped | Tree-shake, dynamic imports |
| Time to Interactive (4G) | < 3.5s | SSR, minimal client hydration |

---

## 15. Build Phases & File Map

### Phase 1 — Web Presence (Weeks 1–6)

**Scaffolding:**
- [ ] `npx create-next-app` with TypeScript, Tailwind, App Router
- [ ] next-intl configured with `[locale]` routing and EN/JA message files
- [ ] Tailwind config with full design system tokens (§2.3)
- [ ] `globals.css` with CSS variables for dark/light mode (§2.2), animations (§2.6)
- [ ] ThemeProvider component (§2.1)
- [ ] Supabase client configured (DB only — no auth yet)
- [ ] Sanity.io project created, blog schema deployed (§10.1)

**Components:**
- [ ] All UI primitives (§4.1)
- [ ] Nav, Footer, ThemeToggle, LangToggle (§4.2)
- [ ] OceanCanvas, HonuMark, HonuCompanion, DepthIndicator (§4.5)
- [ ] SectionReveal hook

**Pages (EN):**
- [ ] Homepage — all sections (§4.3)
- [ ] HonuHub — photo gallery, modes, sessions, map
- [ ] Exploration Island — territory list + project cards
- [ ] About Ryan
- [ ] Blog index + post template
- [ ] Community
- [ ] Apply to Work Together — full form with validation
- [ ] Privacy, Terms, Cookies

**Infrastructure:**
- [ ] Sitemap, robots.txt, llms.txt
- [ ] JSON-LD schema on every page
- [ ] OpenGraph + Twitter Cards meta
- [ ] Dynamic OG image route
- [ ] RSS feed route
- [ ] Plausible + Vercel Analytics instrumented
- [ ] Beehiiv newsletter integration
- [ ] Vercel deployment configured

### Phase 1.5 — Japan Market (Weeks 5–10)

- [ ] Complete `ja.json` message file
- [ ] All Phase 1 pages translated (human-reviewed)
- [ ] hreflang tags validated
- [ ] APPI-compliant privacy policy (JP)
- [ ] LINE share button on blog posts
- [ ] JP SEO: meta descriptions, blog translations
- [ ] CDN latency testing for Japan

### Phase 2 — LMS (Weeks 8–14)

- [ ] Supabase Auth (email/password + Google OAuth)
- [ ] Auth middleware for dashboard routes
- [ ] Course catalog page with filters
- [ ] Individual course page with curriculum accordion
- [ ] Sticky bottom CTA bar (mobile) / sticky sidebar (desktop)
- [ ] Stripe Checkout integration (USD + JPY)
- [ ] Webhook handler for enrollment creation
- [ ] Student dashboard with progress tracking
- [ ] Course player with video embed
- [ ] Certificate generation (Satori/OG image)
- [ ] Public certificate page with OpenGraph

### Phase 3 — Growth (Month 4+)

- [ ] Exploration Island interactive SVG map (desktop)
- [ ] HonuHub "Future Locations" page
- [ ] JP course subtitles
- [ ] Advanced LMS (cohorts, live sessions)
- [ ] Affiliate/referral program
- [ ] CRO based on analytics review

---

*HonuVibe.AI — Technical Specification v1.0 | Prepared for Ryan Jackson | Confidential*

*Made in Hawaii with Aloha 🐢*
