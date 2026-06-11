# Build It AI v2.1 — Product Requirements & Technical Spec
**AI-Powered Discovery Engine for HonuVibe Studio**
**`app.honuvibe.ai/discover`** · Internal codename: *Reef*
Version 2.1 · Ryan Jackson · HonuVibe.AI

> **Changes from v2.0:**
> Subdomain decision locked (`app.`, not `discovery.`). Pricing model rewritten (fixed tiers + transparent opt-in add-ons + tier-recommendation; live total visible throughout). Calculator reconciled to the live studio.honuvibe.ai pricing page. Multilingual + GBP add-ons added. Intake replaces "address" with business-location type. Email OTP verification before summary. New Security & Privacy section. Conditional branching layer + review-and-edit step added. Supabase confirmed as sole backbone (no Airtable). Lean scraping (homepage + 2 pages). Workflow clarified: discovery is pre-signup.

---

## Table of Contents
1. [Overview](#1-overview)
2. [Workflow: Where Discovery Sits](#2-workflow-where-discovery-sits)
3. [How It Connects to Studio](#3-how-it-connects-to-studio)
4. [Discovery Experience — Design Principles](#4-discovery-experience--design-principles)
5. [Conversational Architecture](#5-conversational-architecture)
6. [Pre-Discovery: Intake Gate & Analysis Pass](#6-pre-discovery-intake-gate--analysis-pass)
7. [The Core Questions + Conditional Branches](#7-the-core-questions--conditional-branches)
8. [Review & Edit Step](#8-review--edit-step)
9. [Tier Branching](#9-tier-branching)
10. [Pricing Model & Calculator](#10-pricing-model--calculator)
11. [Outputs](#11-outputs)
12. [Email Verification (OTP)](#12-email-verification-otp)
13. [Client Summary Screen](#13-client-summary-screen)
14. [Security & Privacy](#14-security--privacy)
15. [Data Model](#15-data-model)
16. [Claude API Integration](#16-claude-api-integration)
17. [Admin Layer](#17-admin-layer)
18. [i18n Strings (EN/JP)](#18-i18n-strings-enjp)
19. [API Routes](#19-api-routes)
20. [Component Inventory & File Map](#20-component-inventory--file-map)
21. [Analytics Events](#21-analytics-events)
22. [Build Order](#22-build-order)
23. [Acceptance Criteria](#23-acceptance-criteria)
24. [Open Questions](#24-open-questions)

---

## 1. Overview

Build It AI is the AI-powered intake engine for HonuVibe Studio — a conversational discovery experience that captures everything needed to (a) generate design concepts and (b) produce a project PRD with an accurate quote, in roughly 15 core questions and 15–20 minutes. Modeled on the claude.ai/design questioning pattern: analyze the client's assets and site first, then ask focused, context-aware questions with option chips, free-text escape hatches, and "Decide for me" defaults.

**Four artifacts per completed discovery:** Brand Voice Profile (client-facing wow), Project PRD (internal), Pricing Summary (client-facing), Design Concept Brief (internal, feeds design generation).

This is Studio **Phase 2**. Client portal (billing, change requests, preview server, GA) is **Phase 3**, out of scope here.

### Subdomain decision (locked)
Lives at **`app.honuvibe.ai/discover`** — NOT `discovery.honuvibe.ai`. Rationale: `app.` is durable across Phase 3 (portal, billing, analytics), where "discovery" would be a misnomer. The evocative framing lives in the route (`/discover`) and page copy ("Let's build something"), not the subdomain. Do not re-litigate during build.

---

## 2. Workflow: Where Discovery Sits

**Discovery is a PRE-SIGNUP sales experience, not post-purchase onboarding.** It is the tool that *earns* the sale by making a prospect feel understood before they pay.

```
studio.honuvibe.ai  →  "Start a Project"  →  app.honuvibe.ai/discover
   (browsing)            (interested)          (PROSPECT — no account, no payment)
        │
        ▼
   ~15 questions → Review & Edit → Email OTP verify → Generate
        │
        ▼
   Summary screen: Brand Voice wow + sitemap + transparent quote
        │
        ▼
   "Book your kickoff call" (Cal.com) + manual Stripe link to secure spot
        │
        ▼
   CLIENT PAYS → becomes a client → Phase 3 portal access (future)
```

**Implications:**
- Discovery is **free and frictionless** — no account required to complete it. Gating it behind signup would destroy its function as a conversion tool.
- **Email is captured + verified at intake**, so even an *abandoned* discovery is a warm, contactable lead.
- **Signup/payment happens at the proposal step**, after the quote is seen — via manual Stripe link (Phase 1/2 billing approach).

---

## 3. How It Connects to Studio

When this ships, Studio's "Start a Project" CTA rewires from the Phase 1 local contact form to `app.honuvibe.ai/discover`. The Studio marketing site does not otherwise change. Pricing shown in discovery MUST match the studio.honuvibe.ai pricing page exactly (see §10).

---

## 4. Discovery Experience — Design Principles

Distilled from the claude.ai/design reference pattern:

1. **Analyze first, then ask.** Inspect logo + scraped site + business type before any question. Questions reference real findings ("Your logo is red + charcoal…", "Phone is (626) 579-7400 from your current site…").
2. **Headline + subtext on every question.** The question, plus plain-language framing of why it matters.
3. **Chips + three escape hatches:** option chips, "Other…" (free text), "Decide for me" (defer to Claude), and "Explore a few options" where relevant.
4. **Progressive disclosure.** Questions stream in ~4 batches with a "Continue" button. Auto-save + resume.
5. **Conversational, not interrogative.** Warm, guiding tone (Aloha Standard). A collaborator who did their homework.
6. **Brand-aligned visuals.** Warm off-white canvas, seafoam accents, coral CTAs, Inter type, generous whitespace — mirrors the reference screenshots' calm feel.
7. **Value-framed pricing throughout.** A live running total is always visible; every add-on is framed as a benefit, not a bare cost (see §10).

---

## 5. Conversational Architecture

**Fixed backbone, dynamic surface, shallow conditional branches.**

### Fixed (deterministic)
- ~15 fixed core question slots, each mapped to a known schema field.
- Pricing calculator and PRD generator read these fields reliably.

### Dynamic (Claude-powered)
- Pre-fills options from scrape/logo analysis.
- Rewrites subtext to reference real findings.
- Skips irrelevant slots (no logo → skip palette Q; net-new → skip "what's broken" framing).
- Adds up to 2 adaptive free-text follow-ups (narrative only, never pricing-affecting).

### Conditional branches (pre-defined, triggered)
New questions surface ONLY when an answer triggers them — keeping the median experience short while scaling depth with complexity. **Branches that affect pricing resolve to fixed structured fields** (pre-defined, not freely generated). Keep branches mostly one level deep.

Examples:
- Selects **booking** feature → "Which scheduling tool, or need one set up?"
- Selects **sell products** → "Roughly how many products? Existing payment processor?"
- Business location = **physical/both** → address, hours, service-area; surfaces GBP upsell
- Industry = **healthcare** → compliance needs (HIPAA, etc.)
- Project = **refresh** (not new) → "What's working / what's broken about the current site?"

A simple project stays ~14 questions; a complex one expands to ~20 — but only ever feels as long as that project warrants.

---

## 6. Pre-Discovery: Intake Gate & Analysis Pass

### 6.1 Intake Gate (`/discover` landing)

| Field | Type | Notes |
|---|---|---|
| Name | text | required |
| Email | email | required — verified later via OTP (§12) |
| Business name | text | required |
| Business type / industry | dropdown | required — drives industry-aware pre-fill |
| **Business location type** | single select | **Online only · Physical location(s) · Both** — replaces asking for an address up front; drives branching |
| Tier interest | single select | Starter / Pro / AI-Native / Not sure |
| Existing website URL | url | optional — triggers scrape |
| Logo upload | file | optional — .png/.jpg/.svg/.pdf, max 10MB (SVG sanitized, §14) |
| Consent line | checkbox | "By continuing you agree to our Privacy Policy" (APPI/CCPA, §14) |

> **Why location type, not address:** many SMBs (especially startups) are online-only and have no physical address. Asking location type is lower-friction, never assumes a storefront, and *branches usefully*: physical/both → capture address/hours naturally + surface the GBP upsell; online-only → skip address, shift upsells to commerce/broad-reach SEO.

### 6.2 Analysis Pass (automated, ~15–30 sec, calm loading state)

**Lean scrape (NOT a full crawl):**
- **Homepage — always.** Brand, hero, primary CTA, contact info, colors, tech stack.
- **Up to 2 nav-detected priority pages**, chosen by priority list: **Services/Products > About > Contact > other**. (Services feeds offerings + PRD; About reveals voice + trust + years; Contact confirms phone/address/hours.)
- **3-page hard cap.** Per-page timeout (~10s). **Graceful homepage-only fallback** if nav detection finds nothing or site is a one-pager — a thin scrape still lets the questionnaire run.

**Logo analysis (if uploaded):** dominant colors (hex), style descriptor (script / sans / icon / wordmark).

**Claude synthesis (Call 1):** produces a `context_brief` used to personalize questions (pre-fill chips, dynamic subtext, skip flags).

> Loading copy: calm and boring for trust ("Taking a look at what you've got…"), not gimmicky.

---

## 7. The Core Questions + Conditional Branches

Presented in ~4 batches. Each: **headline**, *subtext*, type, options, `→ captures` / `→ feeds`. Conditional branches noted with ⤷.

### Batch 1 — Goals & Audience
**Q1. What's the main goal of this project?** *What should the new site do better?*
multi-select · Look modern & trustworthy · Drive calls/bookings · Showcase services · Local credibility · Mobile-friendly · Sell online · Explore options · Decide for me · Other…
`→ project_goals[]` `→ PRD, Design Brief`

**Q2. Who are you trying to reach?** *Your ideal customer.*
text + chip suggestions `→ target_audience` `→ PRD, Brand Voice, Design Brief`

**Q3. What's the primary call-to-action?** *The #1 thing visitors should do.*
single · Call now · Book/schedule · Get a quote · Buy now · Both call+book · Decide for me · Other…
`→ primary_cta` `→ PRD, Design Brief`
⤷ if **sell online / buy now** → "Roughly how many products? Existing payment processor?" `→ commerce_scope`

### Batch 2 — Brand Voice & Visual
**Q4. What overall vibe are you after?** *How should the brand feel?*
single (multi ok) · Bold & confident · Clean & professional · Friendly & local · Premium · Natural & eco · Explore options · Decide for me · Other…
`→ vibe` `→ Brand Voice, Design Brief`

**Q5. How should your brand sound?** *The voice of your copy.*
multi · Professional · Warm · Playful · Authoritative · Straight-talking · Inspiring · Decide for me · Other…
`→ voice_traits[]` `→ Brand Voice`

**Q6. Color direction?** *(skipped if no logo & no scraped palette)* *[dynamic: "Your logo is {colors}. How far can I push it?"]*
single · Stay close · Keep as accent + calmer base · Refreshed palette (on-brand) · Explore options · Decide for me · Other…
`→ color_direction` `→ Design Brief`

**Q7. Any sites you admire?** *Up to 3 — URL + quick note. Inspiration, not competitors.*
repeatable URL+note (max 3) `→ reference_sites[]` `→ Design Brief`

### Batch 3 — Content & Structure
**Q8. What pages do you need?** *Pre-checked for your industry.*
multi-select (industry-prechecked) + live count · Home · About · Services · Service details · Gallery · Reviews · Contact · Blog · Booking · Shop · FAQ · Other…
`→ pages[]` `→ PRD, tier-recommendation (page ceiling)`

**Q9. What must the site do?** *Features — pick all that apply.*
multi grouped · **Contact** (form, click-to-call, map) · **Booking** (scheduling, calendar) · **Proof** (reviews, testimonials, badges) · **Commerce** (payments, store) · **Engagement** (newsletter, chat, blog) · Decide for me · Other…
`→ features[]` `→ PRD, pricing (add-ons / tier signal)`
⤷ if **booking** → "Which scheduling tool, or need one set up?" `→ booking_tool`
⤷ if **healthcare industry** → "Any compliance needs? (HIPAA, etc.)" `→ compliance[]`

**Q10. What do you offer?** *Core services/products — become your service content.*
dynamic multi-entry (name + desc, optional price); pre-filled from scrape `→ offerings[]` `→ PRD, Design Brief`

**Q11. Where are you with content?** *Words/copy for the site.*
single · Have it all · Have some, need help · Need help writing it (+add-on) · Decide for me
`→ content_readiness` `→ PRD, pricing (copywriting add-on)`

**Q12. What about photos and images?** *Visuals.*
single · Have pro photos · Stock (included) · Generate AI images (+add-on) · A mix · Decide for me
`→ imagery_approach` `→ PRD, pricing (image add-on), Design Brief`

### Batch 4 — Competition, Proof & Details
**Q13. Who are your competitors?** *Up to 3 — URL + what makes you different. I'll take a look.*
repeatable URL+note (max 3); URLs lean-scraped (homepage only) `→ competitors[]` `→ PRD, Design Brief, Brand Voice`

**Q14. What builds trust for your customers?** *Proof to highlight.*
multi · Reviews · Years in business · Certifications/licenses · Guarantees · Awards · Notable clients · Photos of real work · Decide for me · Other…
`→ trust_signals[]` `→ PRD, Design Brief`

**Q15. Any real details I should use?** *[dynamic: "Phone is {scraped_phone}{, address {scraped_address} if physical}. Add a tagline, hours, email, or anything else — or leave blank for sensible placeholders."]*
free text + inline image upload + timeline sub-question
timeline chips: ASAP · 2–3 weeks · Within a month · No rush
`→ real_details, timeline` `→ PRD, pricing (rush)`
⤷ if location = **physical/both** → capture address, hours, service-area; surface **GBP upsell** (see §10)

---

## 8. Review & Edit Step

**Before generation**, show a consolidated review of every answer: "Here's everything you told us — fix anything that's off." Clients can edit any answer inline, then confirm.

**Purpose:** catches mis-clicked chips (accurate PRD), increases buy-in (reviewing your own answers is a commitment device), builds "you understood me" trust before the quote.

**Pricing on review (decision):** **Full pricing transparency throughout** — the live running total is visible during the questionnaire AND on the review step (not hidden until the end). This fits the Aloha Standard's no-gotcha posture. Guardrails (§10): base tier price always shown as the anchor; each add-on framed as value with a benefit line, not a bare cost; deselecting an add-on to lower the total is informed right-sizing, which is encouraged, not gaming.

**Corrected flow:** Questions → **Review & Edit** → Email OTP verify → Generate → Summary.

---

## 9. Tier Branching

Branching at intake (tier interest) refined by page/feature answers.

- **Starter / Pro:** full questionnaire → 4 outputs → review → verify → summary → admin → manual Stripe link.
- **AI-Native:** custom builds don't fit templated intake. 3-question pre-qualify (goal, rough budget, timeline) → **Cal.com scoping-call booking** + email Ryan. No auto-PRD.
- **Auto-upgrade signal:** Starter/Pro selecting AI-Native-level scope (custom backend, complex integrations, AI agent at scale) → admin flag: "Consider routing to scoping call." (See §10 tier-recommendation.)

---

## 10. Pricing Model & Calculator

### 10.1 Model (locked): Fixed tiers + transparent opt-in add-ons + tier-recommendation

**No silent metering.** The advertised tier price is the price for anyone who fits the tier. Discovery's pricing jobs are:
1. **Confirm which tier fits** (routing, not metering).
2. **Offer genuinely optional, opt-in add-ons** transparently (client knowingly chooses; base price intact).
3. **Recommend the next tier at a ceiling** — don't meter per-unit. Need a 6th page on Starter? Tool says "Pro fits you better," not "+$150."

AI-Native stays fully custom-quoted (no auto-price; routes to call).

### 10.2 Reconciled to the live studio.honuvibe.ai page

| | Starter | Pro | AI-Native |
|---|---|---|---|
| Build | $500 | $2,500 | from $7,500 (custom) |
| Care | $25/mo | $75/mo | from $200/mo |
| Page ceiling | up to 5 | **up to 12** | — |
| Bundled (no charge) | contact form, analytics, hosting/updates/monitoring, WCAG AA, mobile-first | **everything in Starter + blog/CMS, AI chat assistant, lead capture, SEO system + monthly content, priority support** | everything in Pro + custom AI agents/workflows, integrations (CRM/booking/pay), dedicated build team |

**Key reconciliations from v2.0 (which predated the live page):**
- Pro page ceiling: **12**, not 8.
- **AI chat: bundled in Pro — do NOT charge an add-on** (the v2.0 calculator's +$400 would contradict the page and break trust).
- **Lead capture: bundled in Pro.**
- **SEO + monthly content: bundled in Pro** (this is *ongoing content*, distinct from one-time build copywriting — don't double-count).
- **Booking / payments: bundled in AI-Native**, and offered as **Pro add-ons** (default — see §10.4).

### 10.3 À la carte add-ons (opt-in, value-framed)

| Add-on | Build | Monthly | Tiers | Value framing example |
|---|---|---|---|---|
| Copywriting (full) | +$300 | — | all | "We write all your copy so you don't have to" |
| Copywriting (partial) | +$150 | — | all | "We polish and finish what you've started" |
| AI-generated imagery | +$100 | — | all | "Professional AI imagery — no photographer needed" |
| Mixed imagery | +$50 | — | all | "Your photos + AI fill-ins where you need them" |
| **Multilingual** | **+$500 / language** | **+$20/mo / language** | **Pro & AI-Native** | "Reach your customers in their language — full bilingual site" |
| **Google Business Profile setup** | **+$150** | — | physical/both only | "Get found in Google Maps and local search" |
| **GBP management** | — | **+$50/mo** | physical/both only | "We keep your profile fresh — posts, reviews, hours" |
| Booking integration | +$250 | +$15/mo | Pro (bundled in AI-Native) | "Let customers book online, 24/7" |
| Payments | +$300 | +$25/mo | Pro (bundled in AI-Native) | "Take payments right on your site" |

> **Multilingual** is a split add-on (build + monthly, since two content trees need ongoing maintenance). Pro & AI-Native only — Starter is too lean. A genuine differentiator for your Japan/Asia overlap.
> **GBP** surfaces only for physical/both businesses. Use current name "Google Business Profile (GBP)" with "(formerly Google My Business)" on first mention.

### 10.4 Calculator logic (reads backbone fields only)

```javascript
// Base from tier (gate + page/feature signals). AI-Native → no auto-quote.
let build, monthly;
if (tier === 'starter') { build = 500;  monthly = 25; }
if (tier === 'pro')     { build = 2500; monthly = 75; }

// Page ceiling → RECOMMEND upgrade, do NOT meter
const ceiling = tier === 'starter' ? 5 : 12;
let recommendUpgrade = pages.length > ceiling; // surface tier nudge in UI

// Opt-in add-ons (only those the client consciously selected)
if (content_readiness === 'need_help') build += 300;
if (content_readiness === 'some_help') build += 150;
if (imagery_approach === 'ai_images')  build += 100;
if (imagery_approach === 'mix')        build += 50;

for (const lang of additional_languages) { build += 500; monthly += 20; } // Pro/AI-Native

if (location_type !== 'online') {
  if (addons.gbp_setup)  build += 150;
  if (addons.gbp_manage) monthly += 50;
}

// Pro-only add-ons (bundled at AI-Native)
if (tier === 'pro') {
  if (addons.booking)  { build += 250; monthly += 15; }
  if (addons.payments) { build += 300; monthly += 25; }
}

// Rush
if (timeline === 'asap') build = Math.round(build * 1.25);

// NOTE: database/Supabase cost is NEVER a line item — absorbed into care margin (§10.5).
```

### 10.5 Infrastructure costs are absorbed, never line items

The Supabase/DB cost (~$10/mo) is **cost of goods, absorbed into care-plan margin** — never shown to the customer. "Database hosting +$10/mo" is meaningless to an SMB owner and invites nickel-and-dime perception (anti-Aloha-Standard).
- **Starter ($25):** typically static, no DB → no cost.
- **Pro ($75) / AI-Native ($200+):** carry a DB (lead capture, AI chat, CMS) → $10 is a rounding error against margin. Absorb silently.
- **Edge case — Starter that needs a real DB:** treat "needs a database" as a **Pro signal** (recommend Pro, where cost is absorbed). Default Starter contact form is email-only (no DB). Customer never sees "DB add-on."

---

## 11. Outputs

Generated by Claude (Call 3) after review + verification.

### 11.1 Brand Voice Profile (client-facing wow)
From Q2/Q4/Q5/Q13: Personality (2–3 adjectives), Tone (2–3 sentences), Voice do's/don'ts (3 each), Sample headline in their voice. **Branded with HonuVibe.ai. Confidentiality footer** (§13).

### 11.2 Project PRD (internal)
Business Overview · Design Direction · Site Structure · Content Status · Visual Assets · Competitive Context · Current Site Analysis (if refresh) · Pricing Summary · Timeline & Next Steps · Open Questions (low-confidence extractions flagged).

### 11.3 Pricing Summary (client-facing)
Transparent breakdown: base tier (the anchor) + each opt-in add-on with its value line + monthly care. Matches the studio.honuvibe.ai page.

### 11.4 Design Concept Brief (internal)
Vibe + voice + color direction · reference sites + competitor visual notes · hero CTA priority · required sections in priority order · imagery direction. Bridges discovery → design generation (Nano Banana / Claude). *Auto-generating actual visual concepts is deferred to v2.2 — see §24.*

---

## 12. Email Verification (OTP)

Client must verify email **before the summary is revealed.**
- **6-digit OTP code** (inline), NOT a magic link — keeps them in-flow at the most exciting moment; magic links bounce them to inbox and back.
- Verified email kills most bot/spam discovery sessions for free.
- Sent via Resend. Code expires in 10 min, max 5 attempts, resend cooldown 60s.
- Placement: after Review & Edit, before Generate. "Confirm your email to see your results — we'll also send a copy."

---

## 13. Client Summary Screen

Shown after generation (NOT the full PRD):

```
🎉 We've got everything we need.

YOUR BRAND VOICE
[Personality + tone — the wow moment]
Sample headline in your voice: "..."

YOUR SITE AT A GLANCE
[Visual sitemap]  ·  Pages: X   ·   Key features: [list]

YOUR INVESTMENT
Base: [Tier] $X,XXX  ·  Add-ons: [itemized w/ value lines]  ·  Care: $XX/mo
(running total reflects exactly what was shown throughout)

WHAT HAPPENS NEXT
1. ✉️  Summary in your inbox
2. 📅  Book your kickoff call  [Cal.com]
3. 🚀  We start designing

─────────────────────────────────
This summary is confidential and prepared for [Business Name] by HonuVibe.ai.
[HonuVibe.ai branding/logo]
```

Brand Voice leads (most impressive proof the tool "got" them). **Confidentiality line + HonuVibe.ai branding in footer.**

---

## 14. Security & Privacy

A discovery tool that scrapes URLs and calls an LLM has specific exposure points. Build these as first-class requirements.

### 14.1 Architecture-specific (highest priority)
- **SSRF protection on the scraper.** A stranger hands your server a URL. Allow only http/https; **block private/internal IP ranges and cloud metadata endpoints (e.g. 169.254.169.254)**; don't follow redirects to internal addresses; hard timeouts; run scraper sandboxed. (Applies to existing-site URL AND competitor/reference URLs.)
- **SVG upload sanitization.** SVGs can embed JavaScript → stored XSS when rendered in admin. Sanitize on upload (strip scripts) OR serve uploads with `Content-Disposition: attachment` from an isolated domain. Validate by **magic bytes, not file extension**.

### 14.2 LLM-specific
- **Rate-limit `/api/discover/start`** (per-IP + per-email). Each session is 2–3 Claude calls — uncapped = bill-spike attack. Set an **Anthropic cost alarm.**
- **Treat scraped content + user free-text as untrusted DATA, never instructions** (prompt injection). In generation prompts, clearly delimit user/scraped content from instructions. **Pricing is computed in code, never by Claude** — injection can never alter a quote.

### 14.3 Standard but essential
- Server-side admin role checks on **every** admin route (not just hidden UI).
- `ANTHROPIC_API_KEY` + service keys **server-only** (never `NEXT_PUBLIC_`).
- Unguessable **UUID session IDs**; no PII in query strings.
- **Supabase RLS:** a client/lead can read only its own session.
- Secure `httpOnly` / `sameSite` session cookies.
- **Data-retention policy:** auto-purge unverified/abandoned discovery data after N days (keeps PII footprint small).

### 14.4 Compliance (serves US + Japan)
- **APPI (Japan)** + **CCPA**: Privacy Policy link + consent line at intake gate; deletion-on-request path.

---

## 15. Data Model

```sql
create table leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  email_verified boolean default false,
  business_name text not null,
  industry text,
  location_type text,            -- online | physical | both
  tier_interest text,            -- starter | pro | ai-native | not-sure
  existing_url text,
  logo_path text,
  status text default 'new',     -- new | in_progress | review | verified | completed | abandoned | booked_call
  qualification_score int default 0
);

create table discovery_sessions (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id),
  created_at timestamptz default now(),
  completed_at timestamptz,
  context_brief jsonb,
  scrape_data jsonb,             -- homepage + up to 2 pages
  logo_analysis jsonb,
  current_batch int default 1,
  recommend_upgrade boolean default false,
  locale text default 'en',
  expires_at timestamptz         -- for retention auto-purge
);

create table discovery_responses (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references discovery_sessions(id),
  question_id text not null,     -- q1..q15 + branch ids
  answer jsonb not null,
  is_decide_for_me boolean default false,
  created_at timestamptz default now()
);

create table discovery_followups (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references discovery_sessions(id),
  parent_question_id text,
  followup_text text,
  answer_text text
);

create table discovery_outputs (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references discovery_sessions(id),
  brand_voice_profile jsonb,
  prd jsonb,
  pricing_summary jsonb,
  design_brief jsonb,
  generated_at timestamptz default now()
);

create table assets (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references discovery_sessions(id),
  type text,                     -- logo | image | document
  storage_path text,
  thumbnail_path text,
  filename text,
  size_bytes int,
  sanitized boolean default false,  -- SVG safety
  created_at timestamptz default now()
);

create table email_otps (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id),
  code_hash text not null,       -- store hash, not plaintext
  expires_at timestamptz not null,
  attempts int default 0,
  created_at timestamptz default now()
);
```

RLS on all tables: owner-email (post-verify) + admin only.

---

## 16. Claude API Integration

Three calls per session (Claude API, consistent with stack):
1. **Context Synthesis** (post-analysis) → `context_brief` JSON (detected services/colors/contact, per-question personalization, skip flags).
2. **Adaptive Follow-up** (≤2/session) → single follow-up question; narrative only.
3. **Output Generation** (post-verify) → 4 artifacts JSON; low-confidence flagged to PRD Open Questions.

- All calls: try/catch + structured-output validation.
- Output failure → session preserved as `completed` with raw responses; admin can regenerate.
- **Pricing computed deterministically in code (§10.4), never by Claude.**
- Cost/latency: 2–3 calls/session is the main variable cost; cache synthesis; consider a smaller model for follow-ups.

---

## 17. Admin Layer (`/admin`)

- Lead queue: status, qualification score, tier interest, `recommend_upgrade` flag.
- Session detail: structured responses, PRD, brand voice, pricing, design brief.
- PRD editor: review/edit before sending.
- Proposal action: generate proposal + attach **manual Stripe payment link**.
- Booked calls view: AI-Native leads.
- Regenerate outputs.
- Auth: Supabase Auth, `profiles.role = 'admin'`, **server-side enforced**.

> Optional, additive: a **read-only one-way sync of completed leads into an Airtable base** for Ryan's personal pipeline view. Supabase stays authoritative; Airtable is just a lens. Not required for launch.

---

## 18. i18n Strings (EN/JP)

All UI strings in `messages/en.json` + `messages/ja.json` (next-intl). Questions, subtext, chips, outputs localizable. Claude generates Brand Voice/PRD in session `locale`; JP conventions (numbered steps, polite register) for JP output.

```json
{
  "discover.gate.title": "Let's build something",
  "discover.gate.locationType": "Where do you do business?",
  "discover.gate.location.online": "Online only",
  "discover.gate.location.physical": "Physical location(s)",
  "discover.gate.location.both": "Both online & physical",
  "discover.q1.headline": "What's the main goal of this project?",
  "discover.chip.decideForMe": "Decide for me",
  "discover.chip.exploreOptions": "Explore a few options",
  "discover.chip.other": "Other…",
  "discover.review.title": "Here's everything you told us",
  "discover.otp.title": "Confirm your email to see your results",
  "discover.continue": "Continue",
  "discover.loading.analyzing": "Taking a look at what you've got…",
  "discover.summary.confidential": "This summary is confidential and prepared for {business} by HonuVibe.ai."
}
```

---

## 19. API Routes

```
POST /api/discover/start          → create lead + session, trigger analysis
POST /api/discover/scrape         → lean scrape (homepage + 2 pages), SSRF-guarded
POST /api/discover/synthesize     → Claude Call 1 → context_brief
GET  /api/discover/questions/:id  → personalized batch (+ conditional branches)
POST /api/discover/answer         → save response, auto-save, maybe trigger follow-up
POST /api/discover/followup       → Claude Call 2
GET  /api/discover/review/:id     → consolidated answers for review step
POST /api/discover/review/:id     → save edits
POST /api/discover/otp/send       → send 6-digit code (Resend)
POST /api/discover/otp/verify     → verify code, set email_verified
POST /api/discover/complete       → Claude Call 3, generate outputs (requires verified)
GET  /api/discover/summary/:id    → summary screen data (requires verified)
POST /api/discover/book-call      → AI-Native → Cal.com + email Ryan

GET  /api/admin/leads             → queue
GET  /api/admin/session/:id       → full session + outputs
PUT  /api/admin/prd/:id           → edit PRD
POST /api/admin/proposal/:id      → proposal + Stripe link
POST /api/admin/regenerate/:id    → re-run generation
```

---

## 20. Component Inventory & File Map

```
app/
  (public)/discover/
    page.tsx                      # intake gate (+ location type, consent)
    [sessionId]/
      page.tsx                    # conversational flow + live price total
      review/page.tsx             # review & edit step
      verify/page.tsx             # OTP entry
      complete/page.tsx           # summary screen
  admin/
    page.tsx                      # lead queue
    session/[id]/page.tsx         # detail + PRD editor
  api/discover/...  api/admin/...

components/discover/
  IntakeGate.tsx
  LocationTypeSelect.tsx
  AnalysisLoader.tsx              # calm loading
  QuestionBatch.tsx
  QuestionCard.tsx
  OptionChips.tsx                 # chips + Other + Decide for me + Explore
  ConditionalBranch.tsx           # triggered sub-questions
  RepeatableUrlInput.tsx          # Q7 / Q13
  DynamicMultiEntry.tsx           # Q10 offerings
  PageSelector.tsx                # Q8 + live count + upgrade nudge
  FeatureGroups.tsx               # Q9
  RealDetailsInput.tsx            # Q15 + image upload
  LivePriceTotal.tsx              # running total, value-framed add-ons
  ReviewEdit.tsx
  OtpVerify.tsx
  SummaryScreen.tsx
  BrandVoiceCard.tsx

components/admin/
  LeadQueue.tsx  SessionDetail.tsx  PrdEditor.tsx  ProposalAction.tsx

lib/
  scrape.ts                       # lean, SSRF-guarded Playwright
  sanitize.ts                     # SVG sanitization
  claude.ts                       # 3 calls + JSON validation
  pricing.ts                      # deterministic calculator (§10.4)
  questions.ts                    # backbone + branch definitions
  otp.ts                          # generate/verify codes
  ratelimit.ts
  supabase/...
```

---

## 21. Analytics Events (Plausible)

```
discover_started        { tier_interest, industry, location_type, has_url, has_logo }
discover_batch_complete { batch_number }
discover_branch_shown   { branch_id }
discover_abandoned      { last_batch, email_verified }
discover_review_reached  { }
discover_otp_verified    { }
discover_completed       { tier, page_count, build_price, addons[] }
discover_addon_toggled   { addon, selected }     // which add-ons convert
discover_decide_for_me   { question_id }         // where clients defer
discover_upgrade_nudge   { from_tier }           // ceiling hits
discover_booked_call     { }                     // AI-Native
admin_proposal_sent      { tier, build_price }
```

---

## 22. Build Order

1. Schema + Supabase (tables, RLS, storage buckets, retention policy).
2. Intake gate (location type, consent, logo upload + SVG sanitize).
3. Lean scrape service (SSRF-guarded; can stub initially).
4. Question engine (`questions.ts` backbone + branches, batch rendering, chips, auto-save).
5. Live price total (value-framed, deterministic calculator).
6. Context synthesis (Call 1) + personalization wiring.
7. Conversational flow + conditional branches + resume.
8. Review & Edit step.
9. Email OTP (send/verify, Resend).
10. Output generation (Call 3) + 4 artifacts.
11. Summary screen (brand voice wow, confidentiality footer, branding).
12. Admin layer (queue, detail, PRD editor, proposal + Stripe link).
13. AI-Native branch (pre-qualify + Cal.com).
14. Adaptive follow-ups (Call 2) — can be v2.2.
15. Security hardening pass (rate-limit, cost alarm, prompt-injection delimiting, retention).
16. i18n (JP strings + localized output).
17. Analytics + QA + launch.

Ship Starter/Pro path first; AI-Native booking + follow-ups can fast-follow.

---

## 23. Acceptance Criteria

- [ ] Discovery completes in ≤20 min for a typical project.
- [ ] Every backbone question resolves to clean structured data, including "Decide for me."
- [ ] Conditional branches surface only on trigger; simple projects stay ~15 questions.
- [ ] **Live price total visible throughout AND on review**; matches studio.honuvibe.ai exactly.
- [ ] **AI chat / lead capture / SEO+content are NOT charged on Pro** (bundled).
- [ ] Pro page ceiling = 12; exceeding a ceiling shows a tier-upgrade nudge, not a per-page charge.
- [ ] Multilingual add-on (build + monthly/language) on Pro/AI-Native only.
- [ ] GBP add-ons surface only for physical/both businesses; use current GBP naming.
- [ ] DB/infra cost never appears as a customer line item.
- [ ] Dynamic subtext references scraped phone/colors/address when available.
- [ ] Scrape limited to homepage + ≤2 nav-detected pages; graceful homepage-only fallback.
- [ ] **SSRF protections block private IPs / metadata endpoints** on all scraped URLs.
- [ ] **SVG uploads sanitized**; uploads validated by magic bytes.
- [ ] `/api/discover/start` rate-limited; Anthropic cost alarm set.
- [ ] Scraped/free-text content delimited as untrusted data in LLM prompts; pricing never LLM-computed.
- [ ] Email OTP required before summary; codes hashed, expiring, attempt-capped.
- [ ] Review & Edit step lets clients correct any answer before generation.
- [ ] Brand Voice Profile generates and leads the summary; confidentiality footer + HonuVibe.ai branding present.
- [ ] PRD flags low-confidence extractions as Open Questions.
- [ ] Session auto-saves + resumes from correct batch.
- [ ] AI-Native routes to booking, not questionnaire.
- [ ] Admin role checks enforced server-side on every admin route.
- [ ] Supabase RLS: client reads only own session.
- [ ] Abandoned/unverified data auto-purges per retention policy.
- [ ] APPI/CCPA consent + Privacy Policy link at intake; deletion path exists.
- [ ] Full flow works in EN and JP.

---

## 24. Open Questions (For Ryan)

1. **Add-on prices** in §10.3 are my recommendations — tune to your actual effort before launch (esp. multilingual build fee and GBP management monthly).
2. **Design concept *generation* (actual visuals)** is deferred to v2.2; this spec produces the *brief* only. Confirm that's the right cut, or pull it forward.
3. **Magic-link vs session-cookie for resume:** OTP handles verification, but resuming a session on another device needs either a session cookie (same device only) or a resume-link emailed to the verified address. Recommend emailing a resume link post-verification. Confirm.
4. **Retention window (N days)** for abandoned/unverified data — recommend 30 days. Set your number.
5. **Where do generated PRDs land for the build?** Export Markdown into the project repo, push to Notion, or admin-panel only? Affects your Cursor workflow. (Still open from v2.0.)
6. **GBP management** — do you actually want to offer ongoing GBP management as a service? It's recurring revenue but also recurring work. If you'd rather not, keep setup-only (+$150) and drop the monthly.

---

*End of v2.1 — Ready for Cursor.*
