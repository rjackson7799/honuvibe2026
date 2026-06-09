# HonuVibe Studio — Sitemap & Positioning Brief
**`studio.honuvibe.ai`**
Version 1.1 · Ryan Jackson · HonuVibe.AI

> **Changes from v1.0:**
> Added §1.5 Phased Architecture, §11 Phase 2 Preview (App), §12 Phase 3 Preview (Portal). Resolved open questions (Creator-first industry, manual Stripe billing). Updated §5.9 Contact with Phase 2 integration note. Sections 2–10 are unchanged from v1.0.

---

## 1. Executive Summary

HonuVibe Studio is the production arm of HonuVibe.AI — a subdomain housing all client-facing build work (websites, CRMs, AI-native systems). It exists for one reason: most HonuVibe visitors come to *learn* AI, but a meaningful segment wants someone to *build it for them*. Trying to serve both on the main site creates a muddled brand and weak conversion. Studio gives the build offering a focused home, a portfolio-forward storefront, and a clean upsell path from $500 marketing sites all the way to bespoke AI-native systems.

Studio is positioned as the production lab run by the AI educators — proof that the people teaching AI are also the people shipping it.

---

## 1.5 Phased Architecture

The full HonuVibe Studio ecosystem ships in three phases. **This document specifies Phase 1 in full.** Phase 2 and Phase 3 are previewed in §11 and §12 so the foundation is laid correctly.

| Phase | Subdomain | Scope | Status |
|---|---|---|---|
| **Phase 1: Storefront** | `studio.honuvibe.ai` | Marketing site, case studies, services, pricing, manual lead capture | **Current build** |
| **Phase 2: Intake Engine** | `app.honuvibe.ai` | Streamlined AI-powered discovery, PRD generation, admin review (internal codename: *Reef*) | Next |
| **Phase 3: Client Portal** | `app.honuvibe.ai/portal` | Billing, change requests, preview dev server, GA integration, asset management | Later |

### Critical implication for Phase 1

**Don't over-engineer the contact form.** It's a placeholder for the real intake engine that arrives in Phase 2. Keep it minimal: 8–10 fields, write to Supabase, email Ryan, auto-reply to lead. Done. The rich discovery experience belongs in `app.honuvibe.ai`, not on the marketing site.

When Phase 2 ships, the "Start a Project" CTA on Studio rewires to route qualified leads to `app.honuvibe.ai/discover` instead of the local form. The Studio storefront does not change visibly — only the destination URL behind the button.

### The internal codename

The intake engine + portal is referred to internally as **Reef Platform**. This name does not appear in any client-facing surface. Externally, everything is HonuVibe Studio. Internally, Reef is a useful shorthand for "the operational engine that powers Studio."

---

## 2. Strategic Positioning

*(Unchanged from v1.0 — see §2.1 through §2.5 in the original spec)*

Core positioning statement:
> **HonuVibe Studio builds AI-native websites and systems for small businesses that want to grow without growing a team.**

---

## 3. Offering Architecture

*(Unchanged from v1.0)*

Three tiers:
- **Studio Starter** — $500 build / $25/mo care
- **Studio Pro** — $2,500 build / $75/mo care
- **Studio AI-Native** — From $7,500 build / From $200/mo care (custom-quoted)

Plus standalone care plans and à la carte add-ons.

---

## 4. Sitemap

*(Unchanged from v1.0)*

```
studio.honuvibe.ai
├── / (Home)
├── /services/[starter|pro|ai-native]
├── /industries/[creator|healthcare|...]
├── /work, /work/[slug]
├── /process
├── /pricing
├── /about
├── /contact
└── /legal/[privacy|terms]
```

Primary nav: `Work · Services · Industries · Process · Pricing · Contact` + "Start a Project" CTA.

---

## 5. Page Specifications

*(Sections 5.1 through 5.8 unchanged from v1.0)*

### 5.9 Contact / Start a Project (`/contact`) — Phase 1 Implementation

> **⚠️ Phase 2 will replace this form.** In Phase 2, the "Start a Project" CTA across the site redirects to `app.honuvibe.ai/discover` instead of this local form. Build Phase 1 simply — don't add discovery logic, branching, asset uploads, or AI-powered fields to this form. That's all Phase 2 work.

**Layout:**
- Left column: form
- Right column: "What happens next" (you'll hear back within 1 business day, discovery call booking, proposal within 5 days)

**Form fields (Phase 1 — minimal):**
- Name
- Email
- Company / project name
- Industry (dropdown — Creator, Healthcare, Service Business, Professional, Other)
- Project type (Starter / Pro / AI-Native / Not sure)
- Budget range (optional)
- Timeline (optional)
- Tell us about your project (textarea)
- How did you hear about us? (optional)

**Submission flow (Phase 1):**
1. Form posts to Supabase `leads` table
2. Resend transactional email to Ryan
3. Auto-reply email to lead with "what happens next"
4. Lead status: `new → qualified → proposal → won/lost` (Ryan manages manually)

**What NOT to build in Phase 1:**
- ❌ Discovery questionnaire
- ❌ Logo/asset upload
- ❌ Playwright site scraping
- ❌ AI-powered brand voice generation
- ❌ Pricing calculator on the contact page
- ❌ Project portal access
- ❌ Stripe subscription integration (manual Stripe links at launch)

All of the above is Phase 2 / Phase 3 work and would be wasted effort if built here.

### 5.10 Insights / Blog — Phase 2 timing recommended

---

## 6. Visual System

*(Unchanged from v1.0)*

Inherits from HonuVibe brand with coral more prominent for action surfaces. Logo lockup: **HonuVibe** *Studio*.

---

## 7. Technical Architecture

*(Unchanged from v1.0 — Next.js 14, Supabase, Sanity, Vercel, Plausible, Resend, next-intl)*

**Phase 1 addition:** Separate Vercel project from honuvibe.ai. DNS `studio` CNAME → Vercel. Architect i18n for EN/JP from day one; JP content ships v1.1.

---

## 8. Cross-Linking & Flywheel

*(Unchanged from v1.0)*

Studio's case studies become proof points for honuvibe.ai. honuvibe.ai's audience funnels project inquiries into Studio. Each side feeds the other.

---

## 9. Launch Plan

*(Unchanged from v1.0 — 4-week MVP)*

Ship Phase 1 with: Home, 3 service pages, **Creator industry page** (confirmed), 3 case studies (Kwame, HCI, HonuVibe), Process, Pricing, About, Contact, Legal.

---

## 10. Resolved Decisions (was: Open Questions)

The following decisions were made during spec review and are now locked for Phase 1 build:

| Question | Decision |
|---|---|
| **Which industry page launches first?** | **Creator** — more dynamic, anchors to Kwame Brathwaite case study |
| **Care plan billing at launch?** | **Manual Stripe payment links** for v1.0. Full subscription integration deferred to Phase 3 portal |
| **Discovery booking tool?** | Cal.com embed on Contact page |
| **Studio newsletter at launch?** | Ride HonuVibe's existing newsletter; revisit only if audiences diverge |
| **Care plan minimum commitment?** | 6-month minimum on Starter/Pro, 12-month on AI-Native. 10% discount if paid annually upfront |
| **honuvibe.ai portfolio row?** | Stays visible; each card deep-links to full case study on Studio |
| **Logo wordmark treatment?** | "HonuVibe" full weight, "Studio" smaller and tracked — like *Linear · Method* |
| **Bilingual launch?** | English-only content for v1.0; i18n layer architected from day one; JP content ships v1.1 |
| **Reef Platform branding?** | Internal codename only. All client-facing surfaces use HonuVibe Studio |

---

## 11. Phase 2 Preview — `app.honuvibe.ai` (Reef Intake Engine)

Phase 2 builds the AI-powered intake engine that replaces the Phase 1 contact form. Full spec will be produced as **Build It AI v2** once Phase 1 ships.

### Scope summary

A narrowed, focused discovery questionnaire that captures only what's needed to scope a project and generate a usable PRD. Significantly tighter than the original 47-question Build It AI spec.

### Target capture (12–15 questions, ~15–20 min completion)

**Pre-qualify (3 questions)**
1. Name + email + business name
2. Business type/industry
3. Tier interest (Starter / Pro / AI-Native / Not sure)

**Current state (3–4 questions)**
4. Existing website? URL + Playwright auto-scrape if yes
5. What's working / what's broken
6. Up to 3 competitor URLs (auto-crawled)
7. Where customers currently find you

**Brand voice (3–4 questions)**
8. Logo upload (if exists)
9. Brand personality (5 archetypes: Clean & Pro / Warm / Bold / Natural / Classic)
10. Color preferences (logo colors / brand colors / preferences / avoid)
11. Voice & tone (formal / friendly / playful / authoritative)

**Project specifics (3–4 questions)**
12. Pages needed (interactive sitemap builder, drives pricing)
13. Must-have features (multi-select by category)
14. Timeline / launch deadline
15. Content readiness (have it / need help / start from scratch)

### Branching by tier

- **Starter/Pro path:** Full questionnaire above → auto-generated PRD → admin review → proposal
- **AI-Native path:** Pre-qualify only → booking link to a real scoping call (no questionnaire). Custom builds don't fit templated intake.

### PRD generation

Claude API generates a structured PRD covering: business overview, design direction, site structure, content status, technical requirements, visual assets, competitive context, pricing summary, timeline, open questions.

### Admin layer

- Lead qualification dashboard (the scoring logic from the original Build It AI spec can carry over)
- PRD review and editing
- Proposal generation
- Project kickoff workflow

### What carries over from the original Build It AI spec

- Database schema foundation (`leads`, `discovery_sessions`, `discovery_responses`, `projects`, `assets`)
- Playwright site scraping logic
- Pricing calculator math (now aligned to 3-tier Studio model, not single-tier)
- Email notification triggers
- Lead qualification scoring
- Auth/permissions model (clients vs admin via Supabase RLS)

### What changes from the original

- Questionnaire reduced from 47 questions to ~15
- Reef white-label/multi-tenancy explicitly **dropped** — single-tenant HonuVibe Studio only
- Pricing logic updated to 3-tier model (Starter/Pro/AI-Native)
- AI-Native tier bypasses questionnaire entirely → routes to booking
- No standalone "Reef Platform" branding anywhere external

---

## 12. Phase 3 Preview — Client Portal

Phase 3 extends `app.honuvibe.ai` with an authenticated client portal once the first cohort of Phase 2 clients is delivered and there's clear demand for self-service tooling.

### Scope summary

A client-facing dashboard for active engagements and ongoing care-plan customers.

### Core features

- **Authentication:** Supabase Auth, role-based access (client vs admin)
- **Project dashboard:** Status, timeline, current phase, contact
- **Billing management:** Stripe Customer Portal integration for subscription management, invoice history, payment method updates
- **Change request system:** Submit website updates, track status, view completion. Replaces ad-hoc email back-and-forth
- **Preview dev server access:** Authenticated URL to staging environment for review before changes go live
- **Google Analytics integration:** OAuth connection, embedded dashboard pulling client's GA4 property data
- **Asset library:** View, upload, delete project assets with thumbnails
- **Documentation:** Project PRD (simplified view), brand guidelines, content library

### Pricing implication

The portal is the upsell engine for higher care-plan tiers. Self-service change requests + preview access + GA dashboard justify the $75/mo Pro and $200+/mo AI-Native care plans. Without the portal, those plans rely entirely on Ryan's manual time.

### What gets retired when Phase 3 ships

- Manual Stripe payment links (Phase 1 fallback) → replaced by full subscription billing
- Email-based change requests → replaced by portal submissions
- Ad-hoc preview URLs → replaced by authenticated staging access

---

## 13. Build Sequencing Across Phases

```
Phase 1: studio.honuvibe.ai
   ├── 4-week MVP build
   ├── Ship → start filling pipeline
   └── First 2-3 client engagements run manually (Ryan handles intake personally)

Phase 2: app.honuvibe.ai (Build It AI v2 / Reef intake engine)
   ├── Triggered when manual intake becomes a bottleneck (~5 active leads/month)
   ├── 3-4 week build
   ├── Migrate Studio contact form → app discovery flow
   └── Ryan reviews PRDs and approves proposals in admin layer

Phase 3: app.honuvibe.ai/portal
   ├── Triggered when 3+ active care-plan clients exist
   ├── 4-6 week build
   ├── Migrate billing from manual Stripe links → full subscriptions
   └── Self-service capabilities reduce Ryan's per-client time
```

Each phase has a **trigger** rather than a deadline. Build the next phase when the current phase's manual process becomes the bottleneck — not before.

---

*End of v1.1 — Ready for Cursor (Phase 1 only).*
