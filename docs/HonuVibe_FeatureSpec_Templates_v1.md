# HonuVibe.AI — Feature Spec: Templates
**Downloadable Resources & Lead Capture — Build-Ready Implementation Guide**
*v1.0 | February 2026*

---

## Overview

Templates is a collection of downloadable practical resources — prompt libraries, workflow checklists, Notion dashboards, spreadsheet templates, and PDF guides. Each template solves a specific problem and demonstrates HonuVibe's practical expertise. Downloads are gated behind email capture (not auth), making this the primary list-building feature alongside the newsletter.

**No auth required. No Supabase tables. Sanity-managed content. Email gate for downloads.**

### Why This Matters Strategically

Templates sit at the intersection of SEO traffic and lead capture. Someone searching "AI prompt template for client emails" lands on the page, sees a high-quality free resource, gives their email, and enters the funnel. The template itself is a trust signal — if the free resource is this good, what are the courses like?

---

## Routes

| Locale | URL | Description |
|---|---|---|
| EN | `/templates` | Templates gallery |
| EN | `/templates/[slug]` | Individual template detail page |
| JP | `/ja/templates` | Templates gallery (Japanese) |
| JP | `/ja/templates/[slug]` | Individual template detail page (Japanese) |

### Redirects

```typescript
{ source: '/downloads', destination: '/templates', permanent: true },
{ source: '/ja/downloads', destination: '/ja/templates', permanent: true },
{ source: '/free-resources', destination: '/templates', permanent: true },
{ source: '/ja/free-resources', destination: '/ja/templates', permanent: true },
```

---

## Footer Placement

Add "Templates" to the **RESOURCES** column:

```
NAVIGATE              RESOURCES            LEGAL
HonuHub               Resources            Privacy Policy
Explore               AI Glossary          Terms of Service
Learn                 Newsletter           Cookie Notice
Community             Templates
                      Blog
                      About
                      Contact
```

Route: `/${locale}/templates`. Link text: `t('templates.footer_link')`.

---

## Download Gate: Email Capture (Not Auth)

Templates use email-gated downloads, not account auth. This is intentional:

- **Lower friction** than account signup — email + one click vs. email + password + confirmation
- **Builds the newsletter list** — every template download adds a subscriber to Beehiiv
- **No login required to re-download** — the download link is delivered via email and works permanently

### Gate Flow

1. User clicks "Download" on a template
2. Modal appears: email input + "Send me the download" button
3. On submit: POST to `/api/templates/download`
4. API route:
   - Subscribes email to Beehiiv (with tag `template-download` and tag for the specific template slug)
   - Returns the download URL
5. Modal shows success: "Check your email! We've also sent the direct link below."
6. Direct download link appears in the modal (instant access — don't make them wait for the email)
7. Email is also sent via Beehiiv with the download link + a welcome message

**Returning visitors:** If a user has already downloaded any template (tracked via `localStorage` key `hv_template_email`), pre-fill their email and allow one-click download without re-entering. The email is still sent to Beehiiv (idempotent — won't create duplicates).

**Why not auth-gate?** Templates are top-of-funnel. The goal is maximum distribution and email capture. Auth is a higher-friction gate reserved for ongoing value (Library videos, courses). Templates are a one-time download — auth is overkill.

---

## Sanity Schema

### template

```typescript
// sanity/schemas/template.ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'template',
  title: 'Template',
  type: 'document',
  fields: [
    defineField({
      name: 'title_en',
      title: 'Title (EN)',
      type: 'string',
      description: 'E.g., "50 AI Prompts for Client Communication"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title_jp',
      title: 'Title (JP)',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title_en', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description_en',
      title: 'Description (EN)',
      type: 'text',
      rows: 3,
      description: 'What this template is, who it's for, what problem it solves. Shown on the detail page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description_jp',
      title: 'Description (JP)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'excerpt_en',
      title: 'Excerpt (EN)',
      type: 'text',
      rows: 2,
      description: 'One-line preview for the gallery card. Max 120 chars.',
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: 'excerpt_jp',
      title: 'Excerpt (JP)',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Visual preview of the template (screenshot, mockup, or designed graphic). Required for gallery cards.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fileUrl',
      title: 'Download File URL',
      type: 'url',
      description: 'Direct URL to the downloadable file. Host on Vercel Blob, Supabase Storage, or a CDN. Not a Sanity asset — use a permanent, fast URL.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fileType',
      title: 'File Type',
      type: 'string',
      options: {
        list: [
          { title: 'PDF', value: 'pdf' },
          { title: 'Notion Template', value: 'notion' },
          { title: 'Google Sheets', value: 'google-sheets' },
          { title: 'Excel (.xlsx)', value: 'xlsx' },
          { title: 'CSV', value: 'csv' },
          { title: 'Markdown', value: 'markdown' },
          { title: 'ZIP Archive', value: 'zip' },
          { title: 'Figma', value: 'figma' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fileSize',
      title: 'File Size',
      type: 'string',
      description: 'Human-readable file size. E.g., "2.4 MB", "340 KB".',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Prompt Libraries', value: 'prompts' },
          { title: 'Workflow & Checklists', value: 'workflows' },
          { title: 'Dashboards & Trackers', value: 'dashboards' },
          { title: 'Business Documents', value: 'business' },
          { title: 'Learning Guides', value: 'guides' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'whatsInside_en',
      title: "What's Inside (EN)",
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Bullet points describing what the template includes. E.g., "50 tested prompts organized by use case".',
    }),
    defineField({
      name: 'whatsInside_jp',
      title: "What's Inside (JP)",
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'relatedCourseSlug',
      title: 'Related Course Slug',
      type: 'string',
    }),
    defineField({
      name: 'relatedLibraryVideoSlug',
      title: 'Related Library Video Slug',
      type: 'string',
      description: 'A Library video that shows how to use this template.',
    }),
    defineField({
      name: 'relatedBlogSlug',
      title: 'Related Blog Post Slug',
      type: 'string',
    }),
    defineField({
      name: 'downloadCount',
      title: 'Download Count',
      type: 'number',
      description: 'Manually updated social proof number. Update periodically from analytics.',
      initialValue: 0,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Lower numbers appear first. Leave empty for default order.',
    }),
    defineField({
      name: 'isPublished',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  orderings: [
    { title: 'Sort Order', name: 'sortOrder', by: [{ field: 'sortOrder', direction: 'asc' }] },
    { title: 'Title', name: 'titleAZ', by: [{ field: 'title_en', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'title_en',
      subtitle: 'category',
      media: 'previewImage',
    },
  },
});
```

---

## GROQ Queries

```typescript
// lib/sanity/queries.ts

// All published templates for the gallery
export const templatesIndexQuery = `*[_type == "template" && isPublished == true] | order(sortOrder asc, title_en asc) {
  title_en,
  title_jp,
  slug,
  excerpt_en,
  excerpt_jp,
  "previewImageUrl": previewImage.asset->url,
  fileType,
  fileSize,
  category,
  downloadCount
}`;

// Single template by slug
export const templateDetailQuery = `*[_type == "template" && slug.current == $slug && isPublished == true][0] {
  title_en,
  title_jp,
  slug,
  description_en,
  description_jp,
  excerpt_en,
  excerpt_jp,
  "previewImageUrl": previewImage.asset->url,
  fileUrl,
  fileType,
  fileSize,
  category,
  whatsInside_en,
  whatsInside_jp,
  relatedCourseSlug,
  relatedLibraryVideoSlug,
  relatedBlogSlug,
  downloadCount
}`;

// All slugs for static generation
export const templateSlugQuery = `*[_type == "template" && isPublished == true] {
  "slug": slug.current
}`;
```

---

## API Route: Download Handler

```typescript
// app/api/templates/download/route.ts
// POST { email: string, template_slug: string, locale: string }

export async function POST(request: Request) {
  const { email, template_slug, locale } = await request.json();

  // 1. Validate email
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // 2. Subscribe to Beehiiv with tags
  try {
    await fetch('https://api.beehiiv.com/v2/publications/{pub_id}/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BEEHIIV_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        utm_source: 'template_download',
        utm_medium: template_slug,
        custom_fields: [
          { name: 'locale', value: locale },
        ],
        // Beehiiv handles deduplication — existing subscribers just get the new tag
      }),
    });
  } catch (error) {
    console.error('Beehiiv subscription error:', error);
    // Don't block the download if Beehiiv fails
  }

  // 3. Fetch the template's file URL from Sanity
  const template = await sanityClient.fetch(
    `*[_type == "template" && slug.current == $slug][0] { fileUrl }`,
    { slug: template_slug }
  );

  if (!template?.fileUrl) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // 4. Return the download URL
  return NextResponse.json({
    success: true,
    downloadUrl: template.fileUrl,
  });
}
```

**Security note:** The `fileUrl` is technically accessible if someone guesses the URL. For free templates this is acceptable — the email gate is a soft gate for list building, not DRM. If premium/paid templates are added later, use signed URLs with expiration.

---

## i18n Strings

Add to `messages/en.json`:

```json
{
  "templates": {
    "title": "Free Templates & Resources",
    "subtitle": "Practical tools you can use today. Prompt libraries, checklists, dashboards, and more — all free.",
    "meta_title": "Free AI Templates & Resources — Prompts, Checklists, Guides | HonuVibe",
    "meta_description": "Download free AI prompt libraries, workflow checklists, Notion dashboards, and business templates. Practical resources for entrepreneurs and builders.",
    "filter_all": "All",
    "filter_prompts": "Prompt Libraries",
    "filter_workflows": "Workflow & Checklists",
    "filter_dashboards": "Dashboards & Trackers",
    "filter_business": "Business Documents",
    "filter_guides": "Learning Guides",
    "download_button": "Download Free",
    "download_count": "{count}+ downloads",
    "file_type_label": "{type} · {size}",
    "whats_inside": "What's Inside",
    "how_to_use": "How to Use This Template",
    "related_course": "Related Course",
    "related_video": "Watch the Tutorial",
    "related_blog": "Related Article",
    "gate_heading": "Enter your email to download",
    "gate_sub": "We'll send you the download link and add you to our weekly AI newsletter. Unsubscribe anytime.",
    "gate_email_placeholder": "your@email.com",
    "gate_button": "Send Me the Download",
    "gate_success": "Your download is ready!",
    "gate_success_sub": "We also sent the link to your email.",
    "gate_download_now": "Download Now",
    "gate_error": "Something went wrong. Please try again.",
    "back_to_templates": "← Back to Templates",
    "cta_heading": "Want more than templates?",
    "cta_sub": "Our courses teach you to build your own tools, not just use someone else's.",
    "cta_button": "Explore Courses",
    "empty_state": "No templates match that filter.",
    "footer_link": "Templates"
  }
}
```

Add to `messages/ja.json`:

```json
{
  "templates": {
    "title": "無料テンプレート＆リソース",
    "subtitle": "今日から使える実践ツール。プロンプト集、チェックリスト、ダッシュボードなど — すべて無料。",
    "meta_title": "無料AIテンプレート＆リソース — プロンプト集・チェックリスト・ガイド | HonuVibe",
    "meta_description": "無料のAIプロンプト集、ワークフローチェックリスト、Notionダッシュボード、ビジネステンプレートをダウンロード。",
    "filter_all": "すべて",
    "filter_prompts": "プロンプト集",
    "filter_workflows": "ワークフロー＆チェックリスト",
    "filter_dashboards": "ダッシュボード＆トラッカー",
    "filter_business": "ビジネス文書",
    "filter_guides": "学習ガイド",
    "download_button": "無料ダウンロード",
    "download_count": "{count}件以上のダウンロード",
    "file_type_label": "{type} · {size}",
    "whats_inside": "内容",
    "how_to_use": "このテンプレートの使い方",
    "related_course": "関連コース",
    "related_video": "チュートリアルを見る",
    "related_blog": "関連記事",
    "gate_heading": "メールアドレスを入力してダウンロード",
    "gate_sub": "ダウンロードリンクをお送りします。毎週のAIニュースレターにも登録されます。いつでも解除可能です。",
    "gate_email_placeholder": "your@email.com",
    "gate_button": "ダウンロードリンクを送る",
    "gate_success": "ダウンロードの準備ができました！",
    "gate_success_sub": "メールにもリンクをお送りしました。",
    "gate_download_now": "今すぐダウンロード",
    "gate_error": "エラーが発生しました。もう一度お試しください。",
    "back_to_templates": "← テンプレートに戻る",
    "cta_heading": "テンプレート以上のものを求めていますか？",
    "cta_sub": "HonuVibeのコースでは、他人のツールを使うだけでなく、自分のツールを作る方法を学べます。",
    "cta_button": "コースを見る",
    "empty_state": "該当するテンプレートが見つかりません。",
    "footer_link": "テンプレート"
  }
}
```

---

## File Structure

```
app/
├── [locale]/
│   ├── templates/
│   │   ├── page.tsx                    # Templates gallery
│   │   └── [slug]/
│   │       └── page.tsx                # Individual template detail

├── api/
│   ├── templates/
│   │   └── download/
│   │       └── route.ts               # Email capture + download URL

components/
├── templates/
│   ├── TemplateCard.tsx                # Gallery card
│   ├── TemplateFilter.tsx              # Category filter (client component)
│   ├── DownloadGateModal.tsx           # Email capture modal (client component)
│   ├── FileTypeBadge.tsx               # PDF/Notion/Sheets icon badge
│   └── WhatsInsideList.tsx             # Bullet list of contents
```

---

## Page Implementation: Templates Gallery

### `app/[locale]/templates/page.tsx`

**Page structure:**

1. **SectionHeading**
   - Overline: "TEMPLATES" / "テンプレート"
   - Heading: `t('templates.title')`
   - Sub: `t('templates.subtitle')`

2. **TemplateFilter** (client component)
   - Category filter pills: All | Prompt Libraries | Workflow & Checklists | Dashboards & Trackers | Business Documents | Learning Guides
   - No search input needed (template count is small enough to browse)
   - Client-side filtering

3. **Template grid**
   - 1-column mobile, 2-column tablet, 3-column desktop
   - Each template as `TemplateCard`
   - If filter returns 0: show `t('templates.empty_state')`

4. **CTAStrip**
   - Heading: `t('templates.cta_heading')`
   - Sub: `t('templates.cta_sub')`
   - Button: `t('templates.cta_button')` → `/learn`

---

## Page Implementation: Template Detail

### `app/[locale]/templates/[slug]/page.tsx`

**Page structure:**

1. **Back link** → `/templates`

2. **Template header**
   - Title: `font-serif`, `text-h1`, `fg-primary`
   - `FileTypeBadge` + file size + download count — metadata row
   - Category tag
   - Preview image: large, `rounded-lg`, `max-w-wide`

3. **Description**
   - Full description text, `fg-secondary`, `max-w-content`

4. **"What's Inside" section** (if `whatsInside` populated)
   - Heading: `t('templates.whats_inside')`
   - `WhatsInsideList` — bulleted list, each item with a checkmark icon
   - Styled as a card: `bg-tertiary`, `rounded-lg`, `p-6`

5. **Download CTA area**
   - Large `Button`: `t('templates.download_button')`
   - Click opens `DownloadGateModal`
   - Below button: `t('templates.download_count', { count })` social proof

6. **Related content** (only if slugs populated)
   - Related Library video → "Watch the Tutorial"
   - Related course → "Related Course" card
   - Related blog post → "Related Article" link

7. **CTAStrip**

---

## Component Specifications

### TemplateCard

```
Visual:
┌─────────────────────────────────────┐
│  ┌─────────────────────────────────┐│
│  │       PREVIEW IMAGE             ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│  50 AI Prompts for Client Emails    │
│  Ready-to-use prompts for...        │
│                                     │
│  [PDF · 2.4 MB]      [Download ↓]  │
└─────────────────────────────────────┘
```

- Container: `bg-secondary`, `border border-primary`, `rounded-lg`, overflow hidden
- Preview image: aspect-ratio 4:3, `object-cover`
- Title: `font-sans`, `text-sm`, `font-medium`, `fg-primary`, 2-line clamp
- Excerpt: `text-xs`, `fg-secondary`, 2-line clamp
- Bottom row: `FileTypeBadge` on left, download button on right
- Download button on card: opens the detail page (not the modal) — force users to see the full description first
- Entire card links to `/templates/[slug]`

### DownloadGateModal

```
File: components/templates/DownloadGateModal.tsx
Type: Client component ("use client")
```

**States:**
1. **Input state** — email field + submit button
2. **Loading state** — button shows spinner
3. **Success state** — download link visible + confirmation message
4. **Error state** — error message with retry

**Behavior:**
- Modal overlay with backdrop blur
- Check `localStorage.getItem('hv_template_email')` — if exists, pre-fill email
- On submit: POST to `/api/templates/download`
- On success: store email in `localStorage`, show download link, auto-trigger download
- Close button: top-right X
- Closes on backdrop click or Escape key
- Focus trapped inside modal (accessibility)

### FileTypeBadge

Maps file type to an icon + label:

| fileType | Icon | Label |
|---|---|---|
| pdf | PDF icon | PDF |
| notion | Notion icon | Notion |
| google-sheets | Sheets icon | Google Sheets |
| xlsx | Excel icon | Excel |
| csv | Table icon | CSV |
| markdown | Text icon | Markdown |
| zip | Archive icon | ZIP |
| figma | Figma icon | Figma |

Styled as: icon (16px) + label, `text-xs`, `fg-tertiary`, `bg-tertiary`, `rounded`, `px-2 py-1`.

---

## SEO & Metadata

### Gallery Index

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'templates' });
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: locale === 'en' ? '/templates' : '/ja/templates',
      languages: { en: '/templates', ja: '/ja/templates' },
    },
  };
}
```

### Individual Template

Title: `"{template title} — Free Download | HonuVibe"`
Description: excerpt
JSON-LD: `CreativeWork` with `isAccessibleForFree: true`

### Static Generation

Use `generateStaticParams` with `templateSlugQuery`. ISR 60s.

---

## Analytics Events

| Event | Trigger | Props |
|---|---|---|
| `templates_index_view` | Gallery page load | `locale`, `template_count` |
| `templates_filter` | Category changed | `category`, `locale` |
| `template_view` | Detail page load | `template_slug`, `category`, `file_type`, `locale` |
| `template_download_start` | Download modal opened | `template_slug`, `locale` |
| `template_download_complete` | Email submitted + download triggered | `template_slug`, `locale`, `is_new_email` (boolean) |
| `template_related_click` | Related content link clicked | `template_slug`, `target_type`, `locale` |
| `template_cta_click` | Bottom CTA | `locale` |

---

## Content: Initial Seed (8–10 Templates)

| # | Title | Category | File Type |
|---|---|---|---|
| 1 | 50 AI Prompts for Client Communication | prompts | PDF |
| 2 | The AI Tool Decision Framework | workflows | PDF |
| 3 | Weekly AI Productivity Tracker | dashboards | Google Sheets |
| 4 | AI Implementation Checklist for Small Business | workflows | PDF |
| 5 | Prompt Engineering Cheat Sheet | prompts | PDF |
| 6 | AI Project Scope Template | business | Notion |
| 7 | Social Media Content Calendar with AI Prompts | dashboards | Google Sheets |
| 8 | AI Ethics & Usage Policy Template | business | PDF |
| 9 | "Should I Build or Buy?" Decision Matrix | workflows | PDF |
| 10 | Beginner's Guide to AI — Visual Learning Map | guides | PDF |

**Hosting files:** Upload to Vercel Blob Storage or Supabase Storage. Use permanent URLs that don't expire. Put the URL in Sanity's `fileUrl` field.

---

## Acceptance Criteria

- [ ] Sanity schema for `template` deployed, content enterable in Studio
- [ ] `/templates` gallery renders with heading, filter, grid, and CTA
- [ ] `/ja/templates` renders with Japanese UI strings
- [ ] `/templates/[slug]` detail page renders all sections
- [ ] `/ja/templates/[slug]` renders JP content where available
- [ ] Download gate modal opens on "Download" click
- [ ] Email submission subscribes to Beehiiv with correct tags
- [ ] Download URL returned and auto-triggered on success
- [ ] `localStorage` pre-fills email for returning visitors
- [ ] Category filter works client-side
- [ ] `FileTypeBadge` shows correct icon for each file type
- [ ] "What's Inside" list renders when populated
- [ ] Related content links render only when slugs populated
- [ ] All SEO metadata, JSON-LD, hreflang, and sitemap entries correct
- [ ] All analytics events fire
- [ ] Footer updated with "Templates" link
- [ ] Minimum 8 templates loaded in Sanity with files hosted
- [ ] Dark/light mode correct
- [ ] Lighthouse mobile 90+

---

*HonuVibe.AI — Feature Spec: Templates v1.0 | Prepared for Ryan Jackson*

*Made in Hawaii with Aloha 🐢*
