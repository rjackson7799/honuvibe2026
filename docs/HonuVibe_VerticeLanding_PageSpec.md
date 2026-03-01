# HonuVibe.AI — Vertice Society Landing Page
**Page Specification for Cursor/Claude Build | v1.0**
*Confidential — Ryan Jackson / HonuVibe.AI | 2026*

---

## How to Use This Document

This spec defines a gated landing page for the Vertice Society × HonuVibe.AI partnership. It is designed to be fed into Cursor IDE with Claude integration alongside the existing HonuVibe Tech Spec (`HonuVibe_TechSpec_v1.md`) and PRD (`HonuVibe_PRD_v1.md`).

**Reference the Tech Spec** for: design system tokens, color variables, typography, Tailwind config, Supabase patterns, i18n setup, component primitives.

**Reference this document** for: page layout, form logic, security code validation, data model, copy, and confirmation flow.

---

## Table of Contents

1. [Page Overview](#1-page-overview)
2. [URL & Routing](#2-url--routing)
3. [Layout & Visual Design](#3-layout--visual-design)
4. [Content Sections](#4-content-sections)
5. [Form Specification](#5-form-specification)
6. [Security Code Logic](#6-security-code-logic)
7. [Confirmation Screen](#7-confirmation-screen)
8. [Data Model (Supabase)](#8-data-model-supabase)
9. [API Routes](#9-api-routes)
10. [Email Notification](#10-email-notification)
11. [i18n / Bilingual Support](#11-i18n--bilingual-support)
12. [SEO & Metadata](#12-seo--metadata)
13. [Analytics Events](#13-analytics-events)
14. [Mobile Specifications](#14-mobile-specifications)
15. [File Map](#15-file-map)
16. [Copy (EN & JP)](#16-copy-en--jp)

---

## 1. Page Overview

### Purpose

A co-branded landing page for the **AI Mastery — From Curious to Confident** course, offered exclusively to Vertice Society members. The page serves three functions:

1. **Inform** — Communicate the course value proposition clearly and concisely
2. **Capture** — Collect qualified lead data (name, email, AI level, interests, motivation)
3. **Gate** — Require a shared security code (distributed directly to Vertice members) before granting access to the full course curriculum PDF

### Emotional Job

Make Vertice members feel they are entering something exclusive, premium, and trustworthy. The page should feel like a private invitation — not a public marketing funnel. Simple, sophisticated, light, and warm.

### Key Behaviors

- No auth required — this is a public page gated only by the security code
- Form submission stores data in Supabase AND triggers an email notification to Ryan
- On successful submission with valid code, the confirmation screen displays a download link for the course curriculum PDF
- Full bilingual support via the site-wide language toggle (EN / 日本語)
- Page is linked from the main site footer under "Vertice Society"

---

## 2. URL & Routing

| Locale | URL |
|---|---|
| English | `/partners/vertice-society` |
| Japanese | `/ja/partners/vertice-society` |

> The footer link label should read "Vertice Society" in EN and "Vertice Society" in JP (keep the English name — it is a proper noun).

### File Location

```
app/
└── [locale]/
    └── partners/
        └── vertice-society/
            └── page.tsx
```

### Footer Integration

Add "Vertice Society" as a link in the site footer's navigation column. Position it under a "Partners" group or at the end of the existing nav links.

```
Footer nav links:
  Home | HonuHub | Exploration | Learn | Blog | About | Apply
  Partners: Vertice Society
```

---

## 3. Layout & Visual Design

### Overall Approach

**Split-panel layout** on desktop (inspired by the reference mockups). Left panel contains the branded content and form. Right panel contains atmospheric imagery. On mobile, the layout stacks vertically with the hero image above the form.

### Desktop Layout (xl: 1280px+)

```
┌─────────────────────────────────┬──────────────────────────────┐
│                                 │                              │
│  [Vertice Logo] × [HonuVibe]   │                              │
│                                 │                              │
│  AI Mastery                     │     Full-bleed atmospheric   │
│  From Curious to Confident      │     image or gradient        │
│                                 │     (ocean/technology)       │
│  ─── ✦ ───                      │                              │
│                                 │                              │
│  A 5-Week AI Education Program  │                              │
│  Exclusively for Vertice        │                              │
│  Society Members                │                              │
│                                 │                              │
│  [ Form fields ]                │                              │
│  [ ... ]                        │                              │
│  [ Submit button ]              │                              │
│                                 │                              │
│  Spring 2026 · Honolulu, HI     │                              │
│                                 │                              │
└─────────────────────────────────┴──────────────────────────────┘
```

- **Left panel:** ~55% width, `bg-primary` (adapts to theme), generous padding (48–64px)
- **Right panel:** ~45% width, full-height image or gradient overlay, `object-cover`
- **Split ratio class:** `grid grid-cols-1 xl:grid-cols-[55fr_45fr] min-h-screen`

### Tablet Layout (md: 768px — lg: 1024px)

- Same split layout but 60/40 ratio
- Form fields remain single column
- Image panel narrows but stays visible

### Mobile Layout (< 768px)

- Stacked: hero image at top (40vh max), form content below
- Hero image has a subtle gradient overlay at bottom edge for smooth transition
- Full-width form with standard mobile padding (`px-5`)
- No split panel

### Visual Tone

- **Light and sophisticated** — default to a clean, warm aesthetic (closer to light mode feel regardless of site theme, OR respect the global theme toggle)
- **Decision: Respect global theme.** Dark mode = dark left panel with light text. Light mode = warm off-white left panel. Right panel image adapts with overlay opacity.
- Both logos displayed at the top, side by side with "×" between them
- Typography follows the existing design system: DM Serif Display for "AI Mastery" heading, DM Sans for body
- Gold accent divider (`var(--accent-gold)`) between heading and subtitle — the "✦" ornament or simple horizontal rule
- Form inputs styled per Tech Spec §4.1 (min 48px height, 16px font, themed borders)

### Right Panel Image

- Use a high-quality atmospheric image: ocean technology blend, Waikiki aerial, or abstract AI/ocean texture
- Apply a subtle dark overlay (`bg-black/30`) for depth on dark mode, lighter overlay on light mode
- Alternative: use a CSS gradient that blends the ocean palette (`--ocean-surface` → `--ocean-deep`) with a subtle noise or caustic texture
- Image should feel premium and calm — not flashy or stock-like
- If no suitable image is available at build time, use a rich gradient:
  ```css
  /* Dark mode fallback */
  background: linear-gradient(135deg, var(--ocean-surface), var(--ocean-deep));
  
  /* Light mode fallback */
  background: linear-gradient(135deg, #c8dce6, #a8c4d4);
  ```

---

## 4. Content Sections

### 4.1 Co-Branded Header

Both logos displayed horizontally with a "×" separator between them.

```
[Vertice Society Crest]  ×  [HonuVibe.AI Logo]
```

- Vertice crest: ~48px height on desktop, ~36px mobile
- HonuVibe logo: scaled proportionally to match visual weight (~64px wide on desktop)
- "×" in `var(--fg-tertiary)`, DM Sans 400, sized to match
- Centered on mobile, left-aligned on desktop
- Spacing: `mb-8` (32px) below logos

### 4.2 Heading Block

```
AI Mastery                          ← DM Serif Display, text-h1, var(--accent-teal) or var(--fg-primary)
From Curious to Confident           ← DM Sans 400, text-h3, var(--fg-secondary)

─── ✦ ───                           ← Gold divider ornament, var(--accent-gold)

A 5-Week AI Education Program       ← DM Sans 500, text-base, var(--accent-teal)
Exclusively for Vertice Society     ← DM Sans 400, text-sm, var(--fg-secondary)
Members
```

- Left-aligned on desktop, centered on mobile
- Spacing: heading block has `mb-8` before the form

### 4.3 Form Area

See §5 for full form specification.

### 4.4 Footer Note

Below the form, a subtle footer line:

```
Spring 2026 · Honolulu, Hawaii          ← DM Sans 400, text-xs, var(--fg-tertiary)
```

Centered on mobile, left-aligned on desktop.

---

## 5. Form Specification

### Form Fields

All fields are required unless marked optional. Form uses single-column layout on all breakpoints.

| # | Field | Type | Label (EN) | Label (JP) | Required | Notes |
|---|---|---|---|---|---|---|
| 1 | Full Name | Text input | Full Name | お名前 | ✅ | Placeholder: "Taro Yamada" (EN) / "山田太郎" (JP) |
| 2 | Email | Email input | Email | メールアドレス | ✅ | Placeholder: "taro@example.com" |
| 3 | Current AI Level | Button group (single select) | Current AI Level | 現在のAI知識レベル | ✅ | Options: Beginner/初心者, Intermediate/中級者, Advanced/上級者 |
| 4 | Interests | Checkbox group (multi-select) | Areas of Interest | 興味のある分野 | ✅ (min 1) | See options below |
| 5 | Why Study | Textarea | Why are you interested in this course? | この講座に興味を持った理由は？ | ✅ | Max 300 chars, show character count |
| 6 | Access Code | Text input | Access Code | アクセスコード | ✅ | Monospace font, uppercase transform, placeholder: "Enter your code" / "コードを入力" |

### AI Level Options (Button Group)

Styled as a row of toggle buttons (not a dropdown). Only one can be selected at a time. Each button shows EN on top and JP below in smaller text.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Beginner   │  │ Intermediate │  │   Advanced   │
│    初心者     │  │    中級者     │  │    上級者     │
└──────────────┘  └──────────────┘  └──────────────┘
```

- Default: none selected
- Selected state: `bg-accent-teal-subtle`, `border-accent`, `color: var(--accent-teal)`
- Unselected: `bg-transparent`, `border-primary`, `color: var(--fg-secondary)`
- Min height: 48px each
- On mobile: full width, 3 equal columns

### Interest Checkboxes

Styled as card-like checkboxes with EN label and JP subtitle.

| Value | Label (EN) | Label (JP) |
|---|---|---|
| `prompting` | ChatGPT & Prompting | プロンプト作成 |
| `image_gen` | Image Generation | 画像生成 |
| `automation` | Workflow Automation | 業務効率化 |
| `data_analysis` | Data Analysis | データ分析 |
| `custom_assistants` | Custom AI Assistants | カスタムAIアシスタント |
| `ai_landscape` | AI Industry Overview | AI業界の概要 |

- Layout: 2-column grid on desktop, 1-column on mobile
- Each checkbox: card-style with border, 44px+ touch target, check icon on selection
- Selected state: subtle fill (`bg-accent-teal-subtle`), accent border, checkmark visible
- At least one must be selected to submit

### Access Code Field

- Styled distinctly from other fields to signal "this is special"
- Monospace font (`font-mono` / JetBrains Mono)
- `text-transform: uppercase` applied visually
- Slightly larger text (`text-lg`)
- Subtle lock icon (🔒) prepended inside the input or as a label icon
- On invalid code submission: show inline error "Invalid access code. Please check with your Vertice Society coordinator." / "アクセスコードが無効です。Vertice Societyのコーディネーターにご確認ください。"
- **Code is validated server-side only** — never expose the valid code in client-side JavaScript

### Submit Button

```
[ Join the Waitlist  ✦ ]        (EN)
[ ウェイトリストに参加  ✦ ]      (JP)
```

- Full width on mobile, auto width on desktop (min 280px)
- Primary button style: `bg-accent-teal`, white text, 48px height, `rounded-lg`
- Hover: `bg-accent-teal-hover`
- Loading state: spinner replaces icon, button disabled, text changes to "Submitting..." / "送信中..."
- Disabled until all required fields are filled and valid

### Form Validation

Client-side validation on blur and on submit:

| Field | Validation | Error Message (EN) | Error Message (JP) |
|---|---|---|---|
| Full Name | Non-empty, min 2 chars | Please enter your full name | お名前を入力してください |
| Email | Valid email format | Please enter a valid email | 有効なメールアドレスを入力してください |
| AI Level | One option selected | Please select your current AI level | 現在のAI知識レベルを選択してください |
| Interests | At least 1 checked | Please select at least one area of interest | 興味のある分野を1つ以上選択してください |
| Why Study | Non-empty, min 10 chars | Please tell us why you're interested (min 10 characters) | 興味を持った理由を入力してください（10文字以上） |
| Access Code | Matches server-side code | Invalid access code | アクセスコードが無効です |

- Errors shown inline below each field in `text-sm`, `color: #e53e3e` (red)
- Shake animation on submit if validation fails (subtle, 300ms)
- After one failed submission attempt, validate on blur for remaining interactions

### Form UX Best Practices

- **Progressive disclosure:** Form fields are always visible (no multi-step wizard — the form is short enough)
- **Auto-focus:** Focus the first field (Full Name) on page load on desktop only (not mobile — avoids keyboard popup)
- **Tab order:** Sequential through all fields
- **Paste support:** Allow paste in the access code field
- **Duplicate submissions:** Prevent double-click with button disable on submit
- **Email uniqueness:** If the same email submits again, update the existing record (upsert) rather than creating a duplicate. Show a friendly message: "Welcome back! Your information has been updated." / "おかえりなさい！情報が更新されました。"

---

## 6. Security Code Logic

### How It Works

- A single shared code is distributed to Vertice Society members by their coordinator (Scott Perry) or by Ryan directly
- The code is stored as an environment variable on the server: `VERTICE_ACCESS_CODE`
- Validation happens server-side in the API route — **never in client-side code**
- Code comparison is case-insensitive and trims whitespace

### Environment Variable

```env
# .env.local
VERTICE_ACCESS_CODE=ALOHA2026
```

> **Ryan:** Set this to whatever code you want to share with Vertice members. Change it anytime by updating the env var and redeploying. Consider something memorable and on-brand.

### Validation Logic

```typescript
// In API route
const submittedCode = formData.accessCode.trim().toUpperCase();
const validCode = process.env.VERTICE_ACCESS_CODE?.trim().toUpperCase();

if (submittedCode !== validCode) {
  return NextResponse.json(
    { error: 'invalid_code', message: 'Invalid access code' },
    { status: 403 }
  );
}
```

### Rate Limiting

- Limit to 5 submission attempts per IP per 15-minute window
- On rate limit exceeded: "Too many attempts. Please try again in a few minutes." / "試行回数が多すぎます。数分後に再度お試しください。"
- Implementation: Use Vercel Edge middleware or a simple in-memory counter (acceptable for low-traffic page)

---

## 7. Confirmation Screen

On successful form submission with valid code, the page transitions to a confirmation state. This can be implemented as:
- **Option A:** Same page, form replaced by confirmation content (preferred — no page navigation, smoother UX)
- **Option B:** Redirect to `/partners/vertice-society/confirmed` with the download token in the URL

**Recommended: Option A** — in-place transition with smooth fade animation.

### Confirmation Content

```
┌─────────────────────────────────┬──────────────────────────────┐
│                                 │                              │
│  [Vertice Logo] × [HonuVibe]   │                              │
│                                 │                              │
│  ✓ You're In!                   │     Same image panel         │
│                                 │                              │
│  Thank you, [First Name].       │                              │
│  Welcome to AI Mastery.         │                              │
│                                 │                              │
│  ─── ✦ ───                      │                              │
│                                 │                              │
│  Download your course           │                              │
│  curriculum below:              │                              │
│                                 │                              │
│  ┌─────────────────────────┐    │                              │
│  │ 📄 AI Mastery            │    │                              │
│  │    Course Curriculum     │    │                              │
│  │    PDF · 2.1 MB          │    │                              │
│  │                          │    │                              │
│  │  [ Download PDF  ↓ ]     │    │                              │
│  └─────────────────────────┘    │                              │
│                                 │                              │
│  We'll be in touch with         │                              │
│  next steps and scheduling      │                              │
│  details soon.                  │                              │
│                                 │                              │
│  Questions? ryan@honuvibe.ai    │                              │
│                                 │                              │
│  Spring 2026 · Honolulu, HI    │                              │
│                                 │                              │
└─────────────────────────────────┴──────────────────────────────┘
```

### Download Card

- Styled as an elevated card: `bg-secondary`, `border-accent`, `shadow-md`, `rounded-lg`
- PDF icon (document emoji or a clean SVG icon)
- Course title: "AI Mastery — Course Curriculum" / "AI Mastery — 講座カリキュラム"
- File info: "PDF · X.X MB"
- Download button: secondary style (ghost or gold variant), triggers direct download
- **File location:** Store the PDF in `/public/downloads/AIMastery_CourseOverview.pdf`
- **Download method:** Simple `<a href="/downloads/AIMastery_CourseOverview.pdf" download>` — no additional gating needed since the form already validated the code

### Confirmation Animation

- Form content fades out (300ms, opacity 1→0)
- Confirmation content fades in (500ms, opacity 0→1, translateY 16px→0)
- Green checkmark icon animates in with a subtle scale (0.8→1.0)
- Confetti is NOT appropriate for this audience — keep it clean and understated

---

## 8. Data Model (Supabase)

### Table: `vertice_leads`

```sql
create table vertice_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  ai_level text not null check (ai_level in ('beginner', 'intermediate', 'advanced')),
  interests text[] not null default '{}',
  why_study text not null,
  locale text default 'en' check (locale in ('en', 'ja')),
  submitted_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for quick lookups and preventing duplicates
create unique index vertice_leads_email_idx on vertice_leads(email);

-- RLS: No public read access. Only service role can insert/read.
alter table vertice_leads enable row level security;

-- Allow inserts from the API route (using service role key)
-- No public select/update/delete policies needed
```

### Upsert Logic

On duplicate email, update the existing record:

```sql
insert into vertice_leads (full_name, email, ai_level, interests, why_study, locale)
values ($1, $2, $3, $4, $5, $6)
on conflict (email)
do update set
  full_name = excluded.full_name,
  ai_level = excluded.ai_level,
  interests = excluded.interests,
  why_study = excluded.why_study,
  locale = excluded.locale,
  updated_at = now();
```

---

## 9. API Routes

### POST `/api/vertice/submit`

Handles form submission, code validation, database insert, and email notification.

```typescript
// app/api/vertice/submit/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // 1. Validate access code (server-side only)
  const submittedCode = body.accessCode?.trim().toUpperCase();
  const validCode = process.env.VERTICE_ACCESS_CODE?.trim().toUpperCase();
  
  if (!validCode || submittedCode !== validCode) {
    return NextResponse.json(
      { error: 'invalid_code' },
      { status: 403 }
    );
  }
  
  // 2. Validate required fields
  const { fullName, email, aiLevel, interests, whyStudy, locale } = body;
  
  if (!fullName || !email || !aiLevel || !interests?.length || !whyStudy) {
    return NextResponse.json(
      { error: 'missing_fields' },
      { status: 400 }
    );
  }
  
  // 3. Upsert into Supabase
  const supabase = createClient(); // service role client
  const { error: dbError } = await supabase
    .from('vertice_leads')
    .upsert({
      full_name: fullName,
      email: email.toLowerCase().trim(),
      ai_level: aiLevel,
      interests,
      why_study: whyStudy,
      locale: locale || 'en',
    }, { onConflict: 'email' });
  
  if (dbError) {
    console.error('Supabase insert error:', dbError);
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    );
  }
  
  // 4. Send email notification to Ryan
  await sendNotificationEmail({ fullName, email, aiLevel, interests, whyStudy, locale });
  
  // 5. Return success with first name for personalization
  const firstName = fullName.split(' ')[0];
  return NextResponse.json({
    success: true,
    firstName,
    downloadUrl: '/downloads/AIMastery_CourseOverview.pdf'
  });
}
```

### Email Notification

Send a notification email to `ryan@honuvibe.ai` on each submission. Implementation options (choose based on existing stack):

**Option A: Beehiiv transactional (if supported)**
**Option B: Resend (recommended — simple, free tier covers this)**
**Option C: Supabase Edge Function with SMTP**

```typescript
async function sendNotificationEmail(data: {
  fullName: string;
  email: string;
  aiLevel: string;
  interests: string[];
  whyStudy: string;
  locale: string;
}) {
  // Using Resend as an example
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'HonuVibe Notifications <notifications@honuvibe.ai>',
      to: 'ryan@honuvibe.ai',
      subject: `🐢 New Vertice Lead: ${data.fullName}`,
      html: `
        <h2>New Vertice Society Course Interest</h2>
        <p><strong>Name:</strong> ${data.fullName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>AI Level:</strong> ${data.aiLevel}</p>
        <p><strong>Interests:</strong> ${data.interests.join(', ')}</p>
        <p><strong>Why:</strong> ${data.whyStudy}</p>
        <p><strong>Language:</strong> ${data.locale}</p>
        <p><em>Submitted at ${new Date().toISOString()}</em></p>
      `,
    }),
  });
}
```

> **Env vars needed:**
> - `VERTICE_ACCESS_CODE` — the shared code
> - `RESEND_API_KEY` — for email notifications (or equivalent for chosen email service)

---

## 10. i18n / Bilingual Support

### Language Toggle

This page uses the **same site-wide language toggle** (EN / 日本語) as all other pages. The toggle is in the navigation header, persistent across the site.

### Translation Strategy

- All UI strings for this page are defined in `messages/en.json` and `messages/ja.json` under a `vertice` namespace
- Form labels show **only the active locale's text** (not both simultaneously) — the bilingual display from the mockup was a stylistic choice, but since we have a full language toggle, each language should feel native
- Placeholders, validation errors, and confirmation copy all switch with the toggle

### Translation File Addition

```json
// messages/en.json — add under root
{
  "vertice": {
    "heading": "AI Mastery",
    "subheading": "From Curious to Confident",
    "program_label": "A 5-Week AI Education Program",
    "exclusive_label": "Exclusively for Vertice Society Members",
    "form": {
      "full_name": "Full Name",
      "full_name_placeholder": "Taro Yamada",
      "email": "Email",
      "email_placeholder": "taro@example.com",
      "ai_level": "Current AI Level",
      "ai_beginner": "Beginner",
      "ai_intermediate": "Intermediate",
      "ai_advanced": "Advanced",
      "interests_label": "Areas of Interest",
      "interest_prompting": "ChatGPT & Prompting",
      "interest_image_gen": "Image Generation",
      "interest_automation": "Workflow Automation",
      "interest_data": "Data Analysis",
      "interest_assistants": "Custom AI Assistants",
      "interest_landscape": "AI Industry Overview",
      "why_study": "Why are you interested in this course?",
      "why_study_placeholder": "Tell us about your goals and what you hope to learn...",
      "access_code": "Access Code",
      "access_code_placeholder": "Enter your code",
      "submit": "Join the Waitlist",
      "submitting": "Submitting..."
    },
    "errors": {
      "name_required": "Please enter your full name",
      "email_invalid": "Please enter a valid email",
      "level_required": "Please select your current AI level",
      "interests_required": "Please select at least one area of interest",
      "why_required": "Please tell us why you're interested (min 10 characters)",
      "code_invalid": "Invalid access code. Please check with your Vertice Society coordinator.",
      "rate_limit": "Too many attempts. Please try again in a few minutes.",
      "server_error": "Something went wrong. Please try again."
    },
    "confirmation": {
      "title": "You're In!",
      "greeting": "Thank you, {firstName}.",
      "welcome": "Welcome to AI Mastery.",
      "download_label": "Download your course curriculum below:",
      "file_title": "AI Mastery — Course Curriculum",
      "file_info": "PDF",
      "download_button": "Download PDF",
      "followup": "We'll be in touch with next steps and scheduling details soon.",
      "questions": "Questions?",
      "returning_user": "Welcome back! Your information has been updated."
    },
    "footer_note": "Spring 2026 · Honolulu, Hawaii"
  }
}
```

```json
// messages/ja.json — add under root
{
  "vertice": {
    "heading": "AI Mastery",
    "subheading": "好奇心から自信へ",
    "program_label": "5週間のAI教育プログラム",
    "exclusive_label": "Vertice Societyメンバー限定",
    "form": {
      "full_name": "お名前",
      "full_name_placeholder": "山田太郎",
      "email": "メールアドレス",
      "email_placeholder": "taro@example.com",
      "ai_level": "現在のAI知識レベル",
      "ai_beginner": "初心者",
      "ai_intermediate": "中級者",
      "ai_advanced": "上級者",
      "interests_label": "興味のある分野",
      "interest_prompting": "ChatGPT・プロンプト作成",
      "interest_image_gen": "画像生成",
      "interest_automation": "業務効率化・自動化",
      "interest_data": "データ分析",
      "interest_assistants": "カスタムAIアシスタント",
      "interest_landscape": "AI業界の概要",
      "why_study": "この講座に興味を持った理由は？",
      "why_study_placeholder": "目標や学びたいことについてお聞かせください...",
      "access_code": "アクセスコード",
      "access_code_placeholder": "コードを入力",
      "submit": "ウェイトリストに参加",
      "submitting": "送信中..."
    },
    "errors": {
      "name_required": "お名前を入力してください",
      "email_invalid": "有効なメールアドレスを入力してください",
      "level_required": "現在のAI知識レベルを選択してください",
      "interests_required": "興味のある分野を1つ以上選択してください",
      "why_required": "興味を持った理由を入力してください（10文字以上）",
      "code_invalid": "アクセスコードが無効です。Vertice Societyのコーディネーターにご確認ください。",
      "rate_limit": "試行回数が多すぎます。数分後に再度お試しください。",
      "server_error": "エラーが発生しました。もう一度お試しください。"
    },
    "confirmation": {
      "title": "登録完了！",
      "greeting": "{firstName}さん、ありがとうございます。",
      "welcome": "AI Masteryへようこそ。",
      "download_label": "講座カリキュラムをダウンロードしてください：",
      "file_title": "AI Mastery — 講座カリキュラム",
      "file_info": "PDF",
      "download_button": "PDFをダウンロード",
      "followup": "今後のスケジュールと詳細については、近日中にご連絡いたします。",
      "questions": "ご質問は？",
      "returning_user": "おかえりなさい！情報が更新されました。"
    },
    "footer_note": "2026年春 · ホノルル、ハワイ"
  }
}
```

---

## 11. SEO & Metadata

### Page Metadata

```typescript
// generateMetadata for /partners/vertice-society
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = params.locale;
  const isJP = locale === 'ja';
  
  return {
    title: isJP
      ? 'AI Mastery — Vertice Society × HonuVibe.AI'
      : 'AI Mastery — Vertice Society × HonuVibe.AI',
    description: isJP
      ? 'Vertice Societyメンバー限定の5週間AI教育プログラム。好奇心から自信へ。'
      : 'A 5-week AI education program exclusively for Vertice Society members. From curious to confident.',
    robots: {
      index: false,  // Do not index — this is a private/gated page
      follow: false,
    },
    openGraph: {
      title: 'AI Mastery — From Curious to Confident',
      description: 'Vertice Society × HonuVibe.AI — Exclusive AI Education Program',
      images: ['/api/og?title=AI+Mastery&subtitle=Vertice+Society'],
    },
  };
}
```

- **noindex, nofollow** — This is a gated page for a specific partner. It should not appear in search results.
- OG image should use the dynamic OG route with co-branded styling
- No JSON-LD schema needed for this page

---

## 12. Analytics Events

Track these via Plausible custom events:

| Event | Trigger | Props |
|---|---|---|
| `vertice_page_view` | Page load | `locale` |
| `vertice_form_start` | First field interaction | `locale`, `first_field` |
| `vertice_form_submit` | Submit button click | `locale`, `ai_level` |
| `vertice_form_success` | Successful submission | `locale`, `ai_level`, `interests_count` |
| `vertice_form_error` | Failed submission | `locale`, `error_type` (invalid_code, missing_fields, rate_limit) |
| `vertice_pdf_download` | Download button click | `locale` |

---

## 13. Mobile Specifications

| Element | Mobile | Desktop |
|---|---|---|
| Layout | Stacked (image top, form below) | Split panel (55/45) |
| Hero image | 40vh max, gradient overlay at bottom | Full-height right panel |
| Logos | Centered, 36px height each | Left-aligned, 48px height |
| Heading | Centered, `text-h2` size | Left-aligned, `text-h1` size |
| AI Level buttons | 3 equal columns, full width | 3 equal columns, fit content |
| Interest checkboxes | 1 column, full width | 2 columns |
| Submit button | Full width, sticky bottom (optional) | Auto width, min 280px |
| Form padding | `px-5` (20px) | `px-12` to `px-16` (48–64px) |
| Confirmation | Same stack layout | Same split layout |

### Touch Targets
- All interactive elements: minimum 44×44px
- Form inputs: 48px height, 16px font (prevents iOS zoom)
- Checkbox cards: minimum 48px height with generous padding

### Sticky Submit (Mobile Option)

Consider making the submit button sticky at the bottom of the viewport on mobile when the user has scrolled past it. This reduces scroll-back friction.

```
position: sticky;
bottom: env(safe-area-inset-bottom, 16px);
```

Only show the sticky button when the form fields above are at least partially filled.

---

## 14. File Map

### New Files to Create

```
app/
└── [locale]/
    └── partners/
        └── vertice-society/
            └── page.tsx                # Main page component

components/
└── vertice/
    ├── VerticeForm.tsx                 # Form component with validation
    ├── VerticeLevelSelect.tsx          # AI Level button group
    ├── VerticeInterests.tsx            # Interest checkbox grid
    ├── VerticeConfirmation.tsx         # Post-submission confirmation
    └── VerticeImagePanel.tsx           # Right-side image/gradient panel

app/
└── api/
    └── vertice/
        └── submit/
            └── route.ts               # Form handler API route

public/
└── downloads/
    └── AIMastery_CourseOverview.pdf    # Downloadable curriculum PDF
```

### Files to Modify

```
messages/en.json                        # Add vertice namespace
messages/ja.json                        # Add vertice namespace
components/layout/Footer.tsx            # Add "Vertice Society" link
```

---

## 15. Implementation Checklist

### Phase 1 — Core Build
- [ ] Create page route at `app/[locale]/partners/vertice-society/page.tsx`
- [ ] Build split-panel layout component (responsive)
- [ ] Implement form with all fields and client-side validation
- [ ] Build AI Level button group component
- [ ] Build Interest checkbox grid component
- [ ] Create API route `api/vertice/submit`
- [ ] Set up `VERTICE_ACCESS_CODE` env var
- [ ] Create `vertice_leads` table in Supabase
- [ ] Implement server-side code validation
- [ ] Build confirmation screen with download card
- [ ] Place PDF in `/public/downloads/`
- [ ] Add i18n strings for EN and JP
- [ ] Add footer link

### Phase 2 — Polish
- [ ] Email notification integration (Resend or alternative)
- [ ] Rate limiting on API route
- [ ] Form transition animation (form → confirmation)
- [ ] Mobile sticky submit button
- [ ] Right panel image/gradient implementation
- [ ] Test theme toggle (dark/light) on all states
- [ ] Test language toggle on all states (form, errors, confirmation)
- [ ] Test on iPhone Safari, Chrome Android

### Phase 3 — QA
- [ ] Verify noindex/nofollow in page source
- [ ] Test invalid code flow
- [ ] Test duplicate email upsert
- [ ] Test rate limiting
- [ ] Verify email notifications arriving
- [ ] Verify Supabase records storing correctly
- [ ] Test PDF download on mobile Safari and Chrome
- [ ] Accessibility: keyboard nav, screen reader, contrast ratios
- [ ] Lighthouse audit (90+ performance)

---

## 16. Design Reference

The following screenshots were used as design inspiration for this page:

1. **Gamma auth screen** — Clean centered layout, blue gradient background, simple form
2. **Gamma sign-in** — Split layout with form left and visual content right
3. **HonuVibe × Vertice mockup** — Co-branded header, split panel, dark right image with laptop/tech, bilingual form labels, card-style inputs
4. **Mockup continued** — AI Level button group with bilingual labels, interest checkboxes, maroon "Join the Waitlist" CTA button

Key takeaways from the mockups applied to this spec:
- Split-panel layout with form left, atmospheric image right ✅
- Co-branded logos at top ✅
- Card-style form inputs with generous spacing ✅
- Button group for AI Level (not dropdown) ✅
- Checkbox cards for interests ✅
- Prominent, colored CTA button ✅
- Clean, sophisticated, light feeling with premium typography ✅

---

*HonuVibe.AI — Vertice Landing Page Spec v1.0 | Prepared for Ryan Jackson | Confidential*

*Made in Hawaii with Aloha 🐢*
