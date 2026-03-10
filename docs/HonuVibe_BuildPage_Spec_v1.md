# HonuVibe.AI — Build Page Specification
**New Page Addition + Explore Page Restructure | v1.0**
*Confidential — Ryan Jackson / HonuVibe.AI | March 2026*

---

## Table of Contents
1. [Context & Rationale](#1-context--rationale)
2. [Navigation Update](#2-navigation-update)
3. [Build Page — Full Specification](#3-build-page--full-specification)
4. [Updated Explore Page](#4-updated-explore-page)
5. [Data Model Additions](#5-data-model-additions)
6. [Component Inventory](#6-component-inventory)
7. [i18n Additions](#7-i18n-additions)
8. [SEO & Metadata](#8-seo--metadata)
9. [Analytics Events](#9-analytics-events)
10. [Implementation Notes](#10-implementation-notes)

---

## 1. Context & Rationale

### Why Two Pages Instead of One

The original Exploration Island page (`/exploration`) was carrying two distinct jobs:

1. **Portfolio** — proving capability through completed work (social proof)
2. **Capabilities pitch** — explaining how we work, what tools we use, what we can build, and inviting project inquiries (conversion)

These serve different visitors at different stages:

| Visitor Intent | Current Page Job | New Page |
|---|---|---|
| "Are these people legit? Show me what they've done." | Portfolio section | **Explore** (`/exploration`) |
| "Can they build what I need? How do I start?" | Capabilities + CTA section | **Build** (`/build`) |

Splitting these into dedicated pages creates a cleaner narrative: Explore builds trust through proof, Build converts that trust into action.

### Relationship to Apply (`/apply`)

Both Build and Apply contain identical inquiry forms. They serve as parallel entry points — Build for visitors who arrive through the capabilities/process narrative, Apply for visitors who arrive through the About page or direct consulting interest. The form fields, validation, and submission handler are shared. The only difference is surrounding page context and copy.

> **Implementation note:** The inquiry form is a shared component (`ApplicationForm`) used on both `/build` and `/apply`. Both submit to the same `/api/apply/submit` endpoint and write to the same `applications` table.

---

## 2. Navigation Update

### Updated Primary Navigation

```
HonuHub    Explore    Build    Learn    About    Contact
```

| Item | Route | Purpose |
|---|---|---|
| HonuHub | `/honuhub` | Physical + virtual learning space |
| Explore | `/exploration` | Project portfolio — see what we've built |
| Build | `/build` | Capabilities, process, engagement — work with us |
| Learn | `/learn` | Course catalog and LMS |
| About | `/about` | Ryan's personal brand page |
| Contact | `/contact` | General contact (or redirects to Apply) |

### Navigation Flow Logic

The nav order tells a story: see the space → see the work → engage for a project → learn to do it yourself. Each page naturally leads to the next:

- **Explore → Build:** "Impressed by our work? Here's how we can build for you."
- **Build → Learn:** "Want to learn to build it yourself? Check out our courses."
- **Build → Apply:** "Looking for strategic advisory? Apply here." (linked from Build page, not in top nav)

### Mobile Navigation

Hamburger collapse remains unchanged. Six items is well within mobile menu capacity. Order matches desktop.

---

## 3. Build Page — Full Specification

### Route

| Locale | URL |
|---|---|
| English | `/build` |
| Japanese | `/ja/build` |

### Page Job

**Emotional job:** Make the visitor feel confident that HonuVibe can build what they need, understand the process, and take the first step toward working together. This page converts browsers into inquiries.

**Functional job:** Communicate capabilities, showcase process, present engagement options, and capture project inquiries through a form.

**Primary CTA:** Submit a project inquiry (form on-page).
**Secondary CTA:** Explore our work → `/exploration` (for visitors who need more proof first).

---

### Section-by-Section Specification

---

#### 3.1 Hero Section

**Layout:** Full-width section with dark background. Overline + serif headline + secondary text + CTA.

**Content:**

- **Overline:** `HOW WE BUILD`
- **Headline (EN):** *"From Idea to Launch"*
- **Headline (JP):** *"アイデアから実現へ"*
- **Sub-headline (EN):** *"A proven process refined across dozens of projects. Whether it's a website, a SaaS tool, a database application, or an intelligent automation — we build it with you, not just for you."*
- **Sub-headline (JP):** Equivalent JP copy — translated natively, not literally.
- **Primary CTA:** **Start a Project** → scrolls to inquiry form (anchor `#inquire`)
- **Secondary CTA:** **See Our Work** → `/exploration`

**Design notes:**
- No ocean canvas here — save that for the homepage. Use a subtle gradient or static background consistent with the site's dark mode palette.
- The headline "From Idea to Launch" already exists on the current Explore page — it migrates here as the page anchor.
- CTA buttons follow the existing design system: primary teal, secondary ghost.

---

#### 3.2 What We Build — Five Territories

**Layout:** Section with overline heading, followed by a grid of 5 territory cards. 1-column stack on mobile, 3+2 grid on tablet, 5-column row on desktop (or 3+2 if space is tight).

**Content:**

- **Overline:** `TERRITORIES`
- **Heading (EN):** *"Five Areas of Innovation"*
- **Heading (JP):** *"5つのイノベーション領域"*
- **Sub-heading (EN):** *"From web design to pro-bono work, we build across the full spectrum."*

**Territory Cards:**

Each card includes: icon (matching existing territory icons), title, brief description (2–3 sentences), and a "See examples →" link to the relevant category on the Explore page.

| Territory | Title (EN) | Description Direction | Accent Color |
|---|---|---|---|
| Web | **Website Design & Redesign** | Visually impactful, mobile-first websites built for performance and conversion. From brand-new builds to complete redesigns that transform digital presence. | `--territory-web` |
| Database | **Database-Driven Applications** | Custom applications that solve real business problems with smart data architecture. Inventory systems, client portals, scheduling tools — built to scale. | `--territory-db` |
| SaaS | **SaaS & Efficiency Tools** | Micro-SaaS products and internal tools that save time and reduce costs. Built lean, shipped fast, designed to grow. | `--territory-saas` |
| Automations | **Automations & Workflows** | Intelligent workflows that eliminate repetitive tasks and unlock capacity. Zapier, N8N, AI-powered pipelines — connecting your tools into a seamless system. | `--territory-auto` |
| Pro-Bono | **Pro-Bono & Nonprofit** | Giving back is core to the Aloha Standard. Featured projects for organizations making a difference — same quality, same commitment, no invoice. | `--territory-pro` |

**Design notes:**
- Cards use the existing territory accent color as a left border or top accent bar (consistent with current Explore page).
- Each card's "See examples →" link routes to `/exploration#[territory-slug]` or filters the Explore page to that category.
- Pro-bono territory is visually equal — not smaller, not de-emphasized. This is a brand differentiator.

---

#### 3.3 Technologies We Work With

**Layout:** Centered section with overline heading, brief copy, and a logo grid.

**Content:**

- **Overline:** `OUR TOOLKIT`
- **Heading (EN):** *"Technologies We Work With"*
- **Heading (JP):** *"活用するテクノロジー"*
- **Sub-heading (EN):** *"Modern tools and frameworks for building fast, scalable, and intelligent applications."*

**Logo Grid:**

Display technology logos in a clean grid (grayscale by default in dark mode, with subtle hover color). Organized by category but displayed as a single visual field — no category headers needed.

| Category | Technologies |
|---|---|
| Frontend | Next.js, React, Tailwind CSS, TypeScript |
| Backend & Data | Supabase, PostgreSQL, Node.js |
| AI & Automation | Claude (Anthropic), OpenAI, N8N, Zapier |
| Infrastructure | Vercel, Stripe, MUX |
| Design | Figma, Sanity.io |

**Design notes:**
- This section migrates from the current Explore page.
- Logos should be uniform height (~32px), horizontally centered, with adequate spacing.
- On mobile: 3-column grid. On desktop: single row or 2-row grid depending on count.
- Link to no external sites — these are informational only.

---

#### 3.4 How We Work — Process Overview

**Layout:** Horizontal step-by-step process visualization on desktop, vertical timeline on mobile.

**Content:**

- **Overline:** `OUR PROCESS`
- **Heading (EN):** *"From Idea to Launch"*
- **Heading (JP):** *"プロジェクトの進め方"*
- **Sub-heading (EN):** *"A proven process refined across dozens of projects. Clear milestones, transparent communication, and real results."*

**Process Steps:**

| Step | Title (EN) | Description (EN) |
|---|---|---|
| 01 | **Discovery** | We start by understanding your vision, your users, and your constraints. Every great build begins with great listening. |
| 02 | **Blueprint** | Architecture, design system, and technical plan — documented clearly so you always know what's being built and why. |
| 03 | **Build** | Iterative development with regular check-ins. You see progress weekly, not just at the end. Built with modern tools for speed and quality. |
| 04 | **Launch** | Deployment, testing, and handoff. We don't disappear after launch — we make sure everything works in the real world. |
| 05 | **Grow** | Post-launch support, iteration, and optimization. The best products evolve. We're here for the long game. |

**Design notes:**
- Each step has a step number (styled in `font-mono`, accent-teal), a title, and a description.
- On desktop: horizontal layout with connecting lines or a subtle progress bar between steps.
- On mobile: vertical timeline with step numbers on the left, content on the right.
- Consider subtle reveal animation — each step fades in as the user scrolls (using existing `useReveal` hook with stagger).
- Keep it simple — no complex SVG illustrations here. The typography and spacing do the work.

---

#### 3.5 Engagement Options

**Layout:** 2–3 card grid explaining how people can work with HonuVibe.

**Content:**

- **Overline:** `WORK WITH US`
- **Heading (EN):** *"Ways to Engage"*
- **Heading (JP):** *"ご依頼の方法"*

**Engagement Cards:**

| Card | Title (EN) | Description (EN) | CTA |
|---|---|---|---|
| **Project Build** | Build Something New | You have an idea — a website, a tool, an app, an automation. We scope it, design it, build it, and launch it together. Fixed scope or ongoing. | Start a Project ↓ (scrolls to form) |
| **Consulting** | Strategic AI Guidance | Need clarity on AI strategy, tool selection, or workflow optimization? Short engagements focused on decisions that matter. | Start a Project ↓ (scrolls to form) |
| **Pro-Bono** | Nonprofit & Community | Doing important work with limited resources? We take on a small number of pro-bono projects each year. Same quality, same commitment. Tell us about your mission. | Start a Project ↓ (scrolls to form) |

**Design notes:**
- Cards use `bg-secondary` with `border-primary`, consistent with site card style.
- All three CTAs scroll to the same inquiry form — the form's "Type of engagement" field captures the distinction.
- Pro-bono card should feel equally weighted — not smaller or less prominent. This reflects the Aloha Standard.

---

#### 3.6 Featured Proof Strip (Optional — Lightweight)

**Layout:** Horizontal strip with 2–3 key stats or testimonial quotes. Breaks up the page between engagement options and the form.

**Content options (choose 2–3):**

- *"20+ projects shipped across 5 territories"*
- *"Clients in Hawaii, the US mainland, and Japan"*
- *"60% average reduction in manual workflow time"*
- A brief client testimonial (1–2 sentences, attributed or anonymized)

**Design notes:**
- This is a trust reinforcer, not a full testimonial section. Keep it tight — one horizontal row.
- Uses `fg-secondary` text, no heavy styling. The numbers or quotes should do the work.
- If testimonials aren't available at launch, use the stat-based approach. Add testimonials progressively.

---

#### 3.7 Inquiry Form (`#inquire`)

**Layout:** Centered form section with overline, heading, brief copy, and the full application form.

**Content:**

- **Overline:** `LET'S BUILD`
- **Heading (EN):** *"Tell Us About Your Project"*
- **Heading (JP):** *"プロジェクトについて教えてください"*
- **Sub-heading (EN):** *"Whether it's a passion project, a business tool, or a nonprofit mission — we'd love to hear your vision. We respond to every inquiry within 5–7 business days."*

**Form Fields:**

This is the same `ApplicationForm` component used on `/apply`. Fields are identical:

| Field | Type | Required | Notes |
|---|---|---|---|
| Name | Text input | Yes | |
| Email | Email input | Yes | Validated |
| Company / Project Name | Text input | Yes | |
| Website | URL input | No | |
| Type of engagement | Select | Yes | Options: Consulting / Project Build / Pro-Bono / Advisory / Passion Project / Other |
| Tell me about your project | Textarea | Yes | 500 char limit, show character count |
| What outcome are you hoping for? | Textarea | Yes | |
| How did you find HonuVibe? | Select | Yes | Options: Social Media / Google Search / Referral / Vertice Society / Blog / Other |
| Timeline / urgency | Select | Yes | Options: Exploratory / 3 months / ASAP |
| Budget range | Select | Yes | Options: Pro-Bono / <$10K / $10K–$50K / $50K+ / Not sure yet |

> **Note:** "Pro-Bono" is added as a budget option (not present in the original `/apply` spec). This allows nonprofit inquiries to self-identify naturally.

**Submit button:** **"Send My Project Inquiry"**

**Post-submission:**
- Inline success message replacing the form: *"Thank you! We've received your inquiry and will respond within 5–7 business days."*
- Auto-reply email to the submitter (same template as `/apply` submissions)
- Entry written to `applications` table with `source_page = 'build'`

**Design notes:**
- Form uses existing `Input`, `Select`, and `Textarea` primitives from the design system.
- Single column layout on all screen sizes. Labels above inputs. Full-width submit button.
- All fields minimum 48px height, 16px font (prevents iOS zoom).
- Validation: inline error messages below fields, red border on invalid fields.
- Form section background: use `bg-secondary` or a very subtle card elevation to visually distinguish from surrounding sections.

---

#### 3.8 Strategic Advisory Link

**Layout:** Simple text block below the form, serving as a bridge to `/apply`.

**Content (EN):**

> *"Looking for strategic advisory, board participation, or a high-impact partnership? These engagements are handled through a separate application process."*
> **Apply for Strategic Engagement →** (links to `/apply`)

**Content (JP):**
Equivalent JP copy.

**Design notes:**
- Subdued styling — `fg-tertiary` text with an accent-teal link.
- This is a quiet escape hatch, not a primary CTA. It exists so high-intent visitors can self-select into the more curated `/apply` flow if they prefer.

---

#### 3.9 Footer

Standard site footer. No page-specific modifications.

---

## 4. Updated Explore Page

### What Changes

The Explore page (`/exploration`) becomes a pure portfolio page. The following sections are **removed** from Explore (they now live on Build):

| Section | Previous Location | New Location |
|---|---|---|
| Technologies We Work With (logo grid) | Explore | Build §3.3 |
| From Idea to Launch (process) | Explore | Build §3.4 |
| Five Areas of Innovation (territory overview cards) | Explore | Build §3.2 |
| "Have a Project in Mind?" CTA | Explore | Build §3.7 (form replaces CTA) |

### What Stays on Explore

- **Hero** — "Explore" headline, brief intro, CTA button
- **Featured Builds** — the 2 spotlight project cards (Kwame Brathwaite, HCI Medical Group)
- **Project gallery** — all projects browsable by category
- **Individual project detail views** — full case study cards with challenge, solution, outcomes, tech tags

### What's Added to Explore

- **Category filter** — allow visitors to filter projects by territory (Web, Database, SaaS, Automations, Pro-Bono). Tabs or pills at the top of the project section.
- **"Want us to build something like this?" CTA strip** — at the bottom of the page, routing to `/build`
  - EN: *"Inspired by what you see? Let's build something together."*
  - JP: *"私たちと一緒に作りましょう"*
  - CTA button: **Start a Project →** → `/build`
- **Per-project "Related Course" link** — if a project inspired a course module, include a subtle link to the relevant course on `/learn`

### Updated Explore Hero CTA

Change the hero CTA from a generic action to a split CTA:

- **Primary:** **Browse Projects** → scrolls to project gallery
- **Secondary:** **Work With Us →** → `/build`

---

## 5. Data Model Additions

### 5.1 Applications Table Update

Add `source_page` column to distinguish where inquiries originate:

```sql
-- Add source_page to applications table
alter table applications add column source_page text default 'apply'
  check (source_page in ('apply', 'build'));
```

Update the "Pro-Bono" budget option:

```sql
-- Update budget_range check constraint to include pro-bono
-- Current options: '<$10K', '$10K-$50K', '$50K+', 'Not sure yet'
-- New options: 'Pro-Bono', '<$10K', '$10K-$50K', '$50K+', 'Not sure yet'
```

### 5.2 Projects Table (for Explore page filtering)

If projects are managed in Sanity.io, add a `territory` field:

```typescript
// Sanity schema update: project
{
  name: 'territory',
  type: 'string',
  options: {
    list: [
      { title: 'Website Design & Redesign', value: 'web' },
      { title: 'Database-Driven Applications', value: 'database' },
      { title: 'SaaS & Efficiency Tools', value: 'saas' },
      { title: 'Automations & Workflows', value: 'automations' },
      { title: 'Pro-Bono & Nonprofit', value: 'pro-bono' },
    ]
  }
}
```

If projects are managed in Supabase, add a `territory` column:

```sql
alter table projects add column territory text
  check (territory in ('web', 'database', 'saas', 'automations', 'pro-bono'));
```

---

## 6. Component Inventory

### New Components

| Component | Location | Page(s) | Notes |
|---|---|---|---|
| `TerritoryCard` | `components/build/` | Build | Icon + title + description + "See examples" link. Uses territory accent colors. |
| `TechLogoGrid` | `components/build/` | Build | Grayscale logos with hover color. Responsive grid. |
| `ProcessTimeline` | `components/build/` | Build | Horizontal on desktop, vertical on mobile. Step number + title + description. |
| `EngagementCard` | `components/build/` | Build | Card with title, description, CTA. 3-card grid layout. |
| `ProofStrip` | `components/build/` | Build | Horizontal stat/testimonial strip. 2–3 items. |
| `CategoryFilter` | `components/exploration/` | Explore | Tab/pill filter for project territories. |
| `CTAStrip` | `components/sections/` | Explore, Build | Reusable — already in component inventory. Update copy props. |

### Shared Components (No Changes)

| Component | Used On | Notes |
|---|---|---|
| `ApplicationForm` | Build, Apply | Identical form. Add `sourcePage` prop to tag submissions. |
| `SectionHeading` | Build, Explore | Overline + heading + sub. Existing component. |
| `Button` | Build, Explore | Primary and ghost variants. Existing component. |
| `Card` | Build, Explore | Standard card styling. Existing component. |

### Updated Components

| Component | Change | Reason |
|---|---|---|
| `ApplicationForm` | Add `sourcePage` prop (default: `'apply'`). Add `'Pro-Bono'` to budget options. Pass `source_page` in form submission payload. | Distinguish inquiry origin in analytics and admin review. |
| `Nav` | Add "Build" link between "Explore" and "Learn". | New page in navigation. |

---

## 7. i18n Additions

### messages/en.json additions

```json
{
  "nav": {
    "build": "Build"
  },
  "build": {
    "hero": {
      "overline": "HOW WE BUILD",
      "headline": "From Idea to Launch",
      "sub": "A proven process refined across dozens of projects. Whether it's a website, a SaaS tool, a database application, or an intelligent automation — we build it with you, not just for you.",
      "cta_primary": "Start a Project",
      "cta_secondary": "See Our Work"
    },
    "territories": {
      "overline": "TERRITORIES",
      "headline": "Five Areas of Innovation",
      "sub": "From web design to pro-bono work, we build across the full spectrum.",
      "web_title": "Website Design & Redesign",
      "web_desc": "Visually impactful, mobile-first websites built for performance and conversion. From brand-new builds to complete redesigns that transform digital presence.",
      "db_title": "Database-Driven Applications",
      "db_desc": "Custom applications that solve real business problems with smart data architecture. Inventory systems, client portals, scheduling tools — built to scale.",
      "saas_title": "SaaS & Efficiency Tools",
      "saas_desc": "Micro-SaaS products and internal tools that save time and reduce costs. Built lean, shipped fast, designed to grow.",
      "auto_title": "Automations & Workflows",
      "auto_desc": "Intelligent workflows that eliminate repetitive tasks and unlock capacity. Zapier, N8N, AI-powered pipelines — connecting your tools into a seamless system.",
      "pro_title": "Pro-Bono & Nonprofit",
      "pro_desc": "Giving back is core to the Aloha Standard. Featured projects for organizations making a difference — same quality, same commitment, no invoice.",
      "see_examples": "See examples →"
    },
    "tech": {
      "overline": "OUR TOOLKIT",
      "headline": "Technologies We Work With",
      "sub": "Modern tools and frameworks for building fast, scalable, and intelligent applications."
    },
    "process": {
      "overline": "OUR PROCESS",
      "headline": "How We Work",
      "sub": "A proven process refined across dozens of projects. Clear milestones, transparent communication, and real results.",
      "step_1_title": "Discovery",
      "step_1_desc": "We start by understanding your vision, your users, and your constraints. Every great build begins with great listening.",
      "step_2_title": "Blueprint",
      "step_2_desc": "Architecture, design system, and technical plan — documented clearly so you always know what's being built and why.",
      "step_3_title": "Build",
      "step_3_desc": "Iterative development with regular check-ins. You see progress weekly, not just at the end. Built with modern tools for speed and quality.",
      "step_4_title": "Launch",
      "step_4_desc": "Deployment, testing, and handoff. We don't disappear after launch — we make sure everything works in the real world.",
      "step_5_title": "Grow",
      "step_5_desc": "Post-launch support, iteration, and optimization. The best products evolve. We're here for the long game."
    },
    "engage": {
      "overline": "WORK WITH US",
      "headline": "Ways to Engage",
      "project_title": "Build Something New",
      "project_desc": "You have an idea — a website, a tool, an app, an automation. We scope it, design it, build it, and launch it together. Fixed scope or ongoing.",
      "consulting_title": "Strategic AI Guidance",
      "consulting_desc": "Need clarity on AI strategy, tool selection, or workflow optimization? Short engagements focused on decisions that matter.",
      "probono_title": "Nonprofit & Community",
      "probono_desc": "Doing important work with limited resources? We take on a small number of pro-bono projects each year. Same quality, same commitment. Tell us about your mission.",
      "cta": "Start a Project ↓"
    },
    "form": {
      "overline": "LET'S BUILD",
      "headline": "Tell Us About Your Project",
      "sub": "Whether it's a passion project, a business tool, or a nonprofit mission — we'd love to hear your vision. We respond to every inquiry within 5–7 business days.",
      "submit": "Send My Project Inquiry",
      "success": "Thank you! We've received your inquiry and will respond within 5–7 business days."
    },
    "advisory_link": "Looking for strategic advisory, board participation, or a high-impact partnership?",
    "advisory_cta": "Apply for Strategic Engagement →"
  },
  "exploration": {
    "cta_strip": {
      "headline": "Inspired by what you see?",
      "sub": "Let's build something together.",
      "cta": "Start a Project →"
    },
    "filter": {
      "all": "All Projects",
      "web": "Web Design",
      "database": "Database Apps",
      "saas": "SaaS Tools",
      "automations": "Automations",
      "pro-bono": "Pro-Bono"
    },
    "hero_cta_primary": "Browse Projects",
    "hero_cta_secondary": "Work With Us →"
  }
}
```

### messages/ja.json additions

```json
{
  "nav": {
    "build": "Build"
  },
  "build": {
    "hero": {
      "overline": "私たちの開発手法",
      "headline": "アイデアから実現へ",
      "sub": "数十のプロジェクトで磨き上げたプロセス。ウェブサイト、SaaSツール、データベースアプリケーション、インテリジェントな自動化 — 私たちはお客様と共に作り上げます。",
      "cta_primary": "プロジェクトを始める",
      "cta_secondary": "実績を見る"
    },
    "territories": {
      "overline": "テリトリー",
      "headline": "5つのイノベーション領域",
      "sub": "ウェブデザインからプロボノまで、幅広い分野で開発しています。",
      "web_title": "ウェブサイトデザイン＆リデザイン",
      "web_desc": "パフォーマンスとコンバージョンを重視した、モバイルファーストのウェブサイト。新規構築からフルリニューアルまで。",
      "db_title": "データベース駆動アプリケーション",
      "db_desc": "スマートなデータアーキテクチャで実際のビジネス課題を解決するカスタムアプリケーション。",
      "saas_title": "SaaS＆効率化ツール",
      "saas_desc": "時間を節約しコストを削減するマイクロSaaS製品と社内ツール。",
      "auto_title": "自動化＆ワークフロー",
      "auto_desc": "反復作業を排除しキャパシティを解放するインテリジェントワークフロー。",
      "pro_title": "プロボノ＆非営利",
      "pro_desc": "アロハスタンダードの中核として、変化を生み出す組織のプロジェクトを支援します。",
      "see_examples": "事例を見る →"
    },
    "tech": {
      "overline": "使用技術",
      "headline": "活用するテクノロジー",
      "sub": "高速でスケーラブルなアプリケーションを構築するためのモダンなツールとフレームワーク。"
    },
    "process": {
      "overline": "開発プロセス",
      "headline": "プロジェクトの進め方",
      "sub": "明確なマイルストーン、透明性のあるコミュニケーション、確かな成果。",
      "step_1_title": "ディスカバリー",
      "step_1_desc": "お客様のビジョン、ユーザー、制約を理解することから始めます。",
      "step_2_title": "ブループリント",
      "step_2_desc": "アーキテクチャ、デザインシステム、技術計画を明確にドキュメント化します。",
      "step_3_title": "ビルド",
      "step_3_desc": "定期的なチェックインを伴う反復的な開発。進捗を毎週確認できます。",
      "step_4_title": "ローンチ",
      "step_4_desc": "デプロイ、テスト、引き渡し。ローンチ後も確実に機能することを確認します。",
      "step_5_title": "グロー",
      "step_5_desc": "ローンチ後のサポート、改善、最適化。長期的なパートナーとして。"
    },
    "engage": {
      "overline": "ご依頼方法",
      "headline": "3つのエンゲージメント",
      "project_title": "新しいものを作る",
      "project_desc": "ウェブサイト、ツール、アプリ、自動化のアイデアをお持ちですか？スコープの策定から設計、開発、ローンチまで一緒に進めます。",
      "consulting_title": "AI戦略コンサルティング",
      "consulting_desc": "AI戦略、ツール選定、ワークフロー最適化のクラリティが必要ですか？",
      "probono_title": "非営利＆コミュニティ",
      "probono_desc": "限られたリソースで重要な活動をされていますか？毎年少数のプロボノプロジェクトを受け付けています。",
      "cta": "プロジェクトを始める ↓"
    },
    "form": {
      "overline": "一緒に作りましょう",
      "headline": "プロジェクトについて教えてください",
      "sub": "パッションプロジェクト、ビジネスツール、非営利のミッション — あなたのビジョンをお聞かせください。5〜7営業日以内にご返信いたします。",
      "submit": "お問い合わせを送信",
      "success": "ありがとうございます！お問い合わせを受け付けました。5〜7営業日以内にご返信いたします。"
    },
    "advisory_link": "戦略的アドバイザリー、取締役会参加、またはハイインパクトなパートナーシップをお探しですか？",
    "advisory_cta": "戦略的エンゲージメントに応募する →"
  },
  "exploration": {
    "cta_strip": {
      "headline": "インスピレーションを得ましたか？",
      "sub": "私たちと一緒に作りましょう。",
      "cta": "プロジェクトを始める →"
    },
    "filter": {
      "all": "すべて",
      "web": "ウェブデザイン",
      "database": "データベースアプリ",
      "saas": "SaaSツール",
      "automations": "自動化",
      "pro-bono": "プロボノ"
    },
    "hero_cta_primary": "プロジェクトを見る",
    "hero_cta_secondary": "一緒に作る →"
  }
}
```

> **Translation note:** All JP strings above are directional drafts. They must go through the standard translation workflow: AI draft (DeepL Pro) → native Japanese speaker review → publish. Pay particular attention to the engagement card descriptions — the tone should be warm and inviting, not corporate.

---

## 8. SEO & Metadata

### Build Page Metadata

```typescript
// app/[locale]/build/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = params.locale;
  const isJP = locale === 'ja';

  return {
    title: isJP
      ? 'Build | HonuVibe.AI — アイデアから実現へ'
      : 'Build | HonuVibe.AI — From Idea to Launch',
    description: isJP
      ? 'ウェブサイト、SaaSツール、データベースアプリ、自動化 — HonuVibeと一緒にプロジェクトを実現しましょう。'
      : 'Websites, SaaS tools, database apps, and automations — work with HonuVibe to bring your project to life.',
    alternates: {
      canonical: `https://honuvibe.ai${isJP ? '/ja' : ''}/build`,
      languages: {
        'en': 'https://honuvibe.ai/build',
        'ja': 'https://honuvibe.ai/ja/build',
      },
    },
    openGraph: {
      title: isJP ? 'Build with HonuVibe.AI' : 'Build with HonuVibe.AI',
      description: isJP
        ? 'アイデアから実現へ。HonuVibeの開発プロセスをご覧ください。'
        : 'From idea to launch. See how HonuVibe builds.',
      url: `https://honuvibe.ai${isJP ? '/ja' : ''}/build`,
      type: 'website',
    },
  };
}
```

### JSON-LD Schema

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Build with HonuVibe.AI",
  "description": "Work with HonuVibe to build websites, SaaS tools, database applications, and intelligent automations.",
  "url": "https://honuvibe.ai/build",
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://honuvibe.ai" },
      { "@type": "ListItem", "position": 2, "name": "Build", "item": "https://honuvibe.ai/build" }
    ]
  },
  "mainEntity": {
    "@type": "Service",
    "name": "HonuVibe.AI Project Development",
    "provider": {
      "@type": "Organization",
      "name": "HonuVibe.AI"
    },
    "serviceType": ["Web Development", "SaaS Development", "AI Consulting", "Workflow Automation"],
    "areaServed": ["US", "JP"]
  }
}
```

### Sitemap Addition

Add to `app/sitemap.ts`:

```typescript
{
  url: 'https://honuvibe.ai/build',
  lastModified: new Date(),
  alternates: {
    languages: { ja: 'https://honuvibe.ai/ja/build' }
  }
}
```

---

## 9. Analytics Events

### New Plausible Events

| Event | Trigger | Props |
|---|---|---|
| `build_page_view` | Page load | `locale` |
| `build_territory_click` | "See examples →" on territory card | `territory`, `locale` |
| `build_process_view` | Process section enters viewport | `locale` |
| `build_engage_card_click` | CTA on engagement card | `engagement_type`, `locale` |
| `build_form_submit` | Form submission | `engagement_type`, `budget_range`, `locale` |
| `build_advisory_click` | "Apply for Strategic Engagement" link | `locale` |
| `explore_filter_change` | Category filter selection on Explore | `territory`, `locale` |
| `explore_to_build_click` | "Start a Project" CTA on Explore | `locale` |

---

## 10. Implementation Notes

### File Map

```
app/
├── [locale]/
│   ├── build/
│   │   └── page.tsx                   # Build page
│   ├── exploration/
│   │   └── page.tsx                   # Updated Explore page (remove migrated sections)
│   └── apply/
│       └── page.tsx                   # Apply page (unchanged — same form component)

components/
├── build/
│   ├── TerritoryCard.tsx
│   ├── TechLogoGrid.tsx
│   ├── ProcessTimeline.tsx
│   ├── EngagementCard.tsx
│   └── ProofStrip.tsx
├── exploration/
│   ├── CategoryFilter.tsx             # New: territory filter pills/tabs
│   └── ... (existing components)
├── sections/
│   └── CTAStrip.tsx                   # Reusable (may already exist)
└── forms/
    └── ApplicationForm.tsx            # Shared — add sourcePage prop
```

### Build Order

1. **Create shared form updates first** — add `sourcePage` prop to `ApplicationForm`, add `source_page` to API route and database insert, add "Pro-Bono" budget option.
2. **Build the Build page** — scaffold route, implement sections top to bottom. Each section is independent and can be built/reviewed incrementally.
3. **Update Explore page** — remove migrated sections, add category filter, add bottom CTA strip, update hero CTAs.
4. **Update navigation** — add "Build" to nav component in both desktop and mobile views.
5. **Add i18n strings** — EN first, JP review pass after.
6. **Instrument analytics** — add Plausible events to all new interactions.
7. **QA** — test both pages on target devices (iPhone 15 Safari, iPhone SE Safari, Samsung Galaxy S24 Chrome). Verify form submissions write to database with correct `source_page` value.

### Migration Checklist — Content Moving from Explore to Build

| Content Block | Source (Explore) | Destination (Build) | Action |
|---|---|---|---|
| "From Idea to Launch" heading + process steps | Mid-page section | §3.4 Process Overview | Move and expand |
| Technology logos (Vercel, Supabase, etc.) | Logo grid section | §3.3 Tech Logo Grid | Move directly |
| Five Areas of Innovation territory cards | Bottom section | §3.2 Territory Cards | Move and enhance with descriptions |
| "Have a Project in Mind?" CTA + "Get in Touch" button | Bottom CTA | §3.7 Inquiry Form | Replace CTA with full form |

---

## Appendix: Page Comparison

| Dimension | Explore (Updated) | Build (New) |
|---|---|---|
| **URL** | `/exploration` | `/build` |
| **Emotional job** | "Look at what they've built" | "Here's how they can build for me" |
| **Primary content** | Project cards, case studies, visual proof | Capabilities, process, engagement options, form |
| **Primary CTA** | Browse projects / filter by category | Submit project inquiry |
| **Secondary CTA** | "Work With Us →" → `/build` | "See Our Work →" → `/exploration` |
| **Form** | No | Yes (shared ApplicationForm) |
| **Visitor stage** | Awareness / consideration | Consideration / decision |
| **Cross-link** | Links to Build | Links to Explore and Apply |

---

*HonuVibe.AI — Build Page Specification v1.0 | Prepared for Ryan Jackson | Confidential*

*Made in Hawaii with Aloha 🐢*
