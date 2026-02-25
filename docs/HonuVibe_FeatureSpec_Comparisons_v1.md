# HonuVibe.AI — Feature Spec: AI Tool Comparisons
**Honest Practitioner Comparisons — Build-Ready Implementation Guide**
*v1.0 | February 2026*

---

## Overview

Comparisons is a collection of honest, practitioner-written comparison articles that help people choose the right AI tool for their specific use case. These aren't affiliate-driven "Top 10" listicles — they're opinionated, practical guides from someone who actually uses these tools daily. Each comparison covers 2–4 tools, explains when to use each one, and includes a recommendation.

**No auth required. No Supabase tables. Sanity-managed content. Individual pages for SEO.**

### Why This Matters Strategically

"Claude vs ChatGPT" and "best AI tool for [use case]" are among the highest-volume search queries in the AI space. Most comparison content is either affiliate-driven (biased) or surface-level (unhelpful). Ryan's practitioner perspective — someone who builds with these tools daily — is a genuine differentiator. Each comparison page becomes an SEO landing page that establishes HonuVibe's authority and funnels readers toward courses, Library videos, and the Resources page.

---

## Routes

| Locale | URL | Description |
|---|---|---|
| EN | `/comparisons` | Comparisons index |
| EN | `/comparisons/[slug]` | Individual comparison article |
| JP | `/ja/comparisons` | Comparisons index (Japanese) |
| JP | `/ja/comparisons/[slug]` | Individual comparison article (Japanese) |

### Redirects

```typescript
{ source: '/compare', destination: '/comparisons', permanent: true },
{ source: '/ja/compare', destination: '/ja/comparisons', permanent: true },
{ source: '/vs', destination: '/comparisons', permanent: true },
{ source: '/ja/vs', destination: '/ja/comparisons', permanent: true },
```

---

## Footer Placement

Add "Comparisons" to the **RESOURCES** column:

```
NAVIGATE              RESOURCES            LEGAL
HonuHub               Resources            Privacy Policy
Explore               AI Glossary          Terms of Service
Learn                 Newsletter           Cookie Notice
Community             Templates
                      Comparisons
                      Blog
                      About
                      Contact
```

Route: `/${locale}/comparisons`. Link text: `t('comparisons.footer_link')`.

---

## Content Structure: What Makes a Good Comparison

Each comparison follows a consistent structure that readers can rely on:

1. **The question** — frame the comparison as a decision the reader is trying to make
2. **Quick verdict** — one-paragraph up-front recommendation (don't bury the lede)
3. **Tool profiles** — brief overview of each tool
4. **Comparison matrix** — structured feature-by-feature comparison
5. **Use case recommendations** — "Use X when...", "Use Y when..."
6. **Ryan's pick** — honest personal recommendation with reasoning
7. **Cross-links** — related Library videos, Resources page tools, Glossary terms, courses

This structure means readers who just want the answer get it immediately (quick verdict), while readers who want depth can keep scrolling.

---

## Sanity Schema

### comparison

```typescript
// sanity/schemas/comparison.ts
import { defineType, defineField, defineArrayMember } from 'sanity';

export default defineType({
  name: 'comparison',
  title: 'Comparison',
  type: 'document',
  fields: [
    defineField({
      name: 'title_en',
      title: 'Title (EN)',
      type: 'string',
      description: 'SEO-friendly title. E.g., "Claude vs ChatGPT vs Gemini — Which AI Should You Use?"',
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
      name: 'excerpt_en',
      title: 'Excerpt (EN)',
      type: 'text',
      rows: 2,
      description: 'One-line summary for the index card. Max 160 chars.',
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'excerpt_jp',
      title: 'Excerpt (JP)',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'AI Assistants', value: 'ai-assistants' },
          { title: 'Coding Tools', value: 'coding-tools' },
          { title: 'Image & Video', value: 'image-video' },
          { title: 'Automation', value: 'automation' },
          { title: 'Writing & Content', value: 'writing-content' },
          { title: 'Business & Productivity', value: 'business-productivity' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),

    // --- TOOLS BEING COMPARED ---
    defineField({
      name: 'tools',
      title: 'Tools Compared',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'comparedTool',
          fields: [
            { name: 'name', title: 'Tool Name', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'logo_url', title: 'Logo URL', type: 'url', description: 'Small logo/icon for the tool.' },
            { name: 'website_url', title: 'Website URL', type: 'url' },
            { name: 'tagline_en', title: 'Tagline (EN)', type: 'string', description: 'One-line description. E.g., "Best for creative writing and nuanced conversation"' },
            { name: 'tagline_jp', title: 'Tagline (JP)', type: 'string' },
            { name: 'pricing_en', title: 'Pricing Summary (EN)', type: 'string', description: 'E.g., "Free tier + $20/mo Pro"' },
            { name: 'pricing_jp', title: 'Pricing Summary (JP)', type: 'string' },
            { name: 'relatedResourceSlug', title: 'Resources Page Slug', type: 'string', description: 'Slug of this tool on the Resources page (if listed).' },
          ],
          preview: {
            select: { title: 'name' },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(2).max(5),
      description: 'The tools being compared. Minimum 2, maximum 5.',
    }),

    // --- COMPARISON MATRIX ---
    defineField({
      name: 'comparisonMatrix',
      title: 'Comparison Matrix',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'matrixRow',
          fields: [
            { name: 'feature_en', title: 'Feature (EN)', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'feature_jp', title: 'Feature (JP)', type: 'string' },
            {
              name: 'ratings',
              title: 'Ratings per Tool',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'toolRating',
                  fields: [
                    { name: 'toolName', title: 'Tool Name', type: 'string', description: 'Must match a tool name from the Tools list above.' },
                    {
                      name: 'rating',
                      title: 'Rating',
                      type: 'string',
                      options: {
                        list: [
                          { title: '★★★★★ Excellent', value: '5' },
                          { title: '★★★★ Great', value: '4' },
                          { title: '★★★ Good', value: '3' },
                          { title: '★★ Fair', value: '2' },
                          { title: '★ Poor', value: '1' },
                          { title: '✓ Yes', value: 'yes' },
                          { title: '✗ No', value: 'no' },
                          { title: '~ Partial', value: 'partial' },
                          { title: 'N/A', value: 'na' },
                        ],
                      },
                    },
                    { name: 'note_en', title: 'Note (EN)', type: 'string', description: 'Optional brief note. E.g., "Via plugins only"' },
                    { name: 'note_jp', title: 'Note (JP)', type: 'string' },
                  ],
                  preview: {
                    select: { title: 'toolName', subtitle: 'rating' },
                  },
                }),
              ],
            },
          ],
          preview: {
            select: { title: 'feature_en' },
          },
        }),
      ],
      description: 'Feature-by-feature comparison table. Each row is a feature, each column is a tool.',
    }),

    // --- ARTICLE CONTENT ---
    defineField({
      name: 'quickVerdict_en',
      title: 'Quick Verdict (EN)',
      type: 'text',
      rows: 4,
      description: 'The TL;DR. One paragraph giving the upfront recommendation. Appears near the top of the page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'quickVerdict_jp',
      title: 'Quick Verdict (JP)',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'body_en',
      title: 'Full Article Body (EN)',
      type: 'blockContent',
      description: 'Detailed analysis. Include use case recommendations, pros/cons, and personal experience.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body_jp',
      title: 'Full Article Body (JP)',
      type: 'blockContent',
    }),
    defineField({
      name: 'ryansPickToolName',
      title: "Ryan's Pick — Tool Name",
      type: 'string',
      description: 'Which tool does Ryan recommend? Must match a tool name from the Tools list.',
    }),
    defineField({
      name: 'ryansPickReason_en',
      title: "Ryan's Pick — Reason (EN)",
      type: 'text',
      rows: 3,
      description: 'Brief explanation of why Ryan prefers this tool.',
    }),
    defineField({
      name: 'ryansPickReason_jp',
      title: "Ryan's Pick — Reason (JP)",
      type: 'text',
      rows: 3,
    }),

    // --- METADATA ---
    defineField({
      name: 'readingTime_en',
      title: 'Reading Time EN (minutes)',
      type: 'number',
    }),
    defineField({
      name: 'readingTime_jp',
      title: 'Reading Time JP (minutes)',
      type: 'number',
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last Updated',
      type: 'datetime',
      description: 'When this comparison was last reviewed for accuracy. Displayed prominently — freshness matters for comparison content.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),

    // --- CROSS-LINKS ---
    defineField({
      name: 'relatedGlossarySlugs',
      title: 'Related Glossary Term Slugs',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'relatedLibraryVideoSlugs',
      title: 'Related Library Video Slugs',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'relatedCourseSlug',
      title: 'Related Course Slug',
      type: 'string',
    }),
    defineField({
      name: 'relatedBlogSlug',
      title: 'Related Blog Post Slug',
      type: 'string',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
    }),
    defineField({
      name: 'isPublished',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  orderings: [
    { title: 'Last Updated', name: 'updated', by: [{ field: 'lastUpdated', direction: 'desc' }] },
    { title: 'Title', name: 'titleAZ', by: [{ field: 'title_en', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'title_en',
      subtitle: 'category',
    },
  },
});
```

---

## GROQ Queries

```typescript
// lib/sanity/queries.ts

// All published comparisons for the index page
export const comparisonsIndexQuery = `*[_type == "comparison" && isPublished == true] | order(sortOrder asc, lastUpdated desc) {
  title_en,
  title_jp,
  slug,
  excerpt_en,
  excerpt_jp,
  category,
  "toolNames": tools[].name,
  "toolLogos": tools[].logo_url,
  lastUpdated,
  readingTime_en,
  readingTime_jp
}`;

// Single comparison by slug — full content
export const comparisonDetailQuery = `*[_type == "comparison" && slug.current == $slug && isPublished == true][0] {
  title_en,
  title_jp,
  slug,
  excerpt_en,
  excerpt_jp,
  category,
  tools,
  comparisonMatrix,
  quickVerdict_en,
  quickVerdict_jp,
  body_en,
  body_jp,
  ryansPickToolName,
  ryansPickReason_en,
  ryansPickReason_jp,
  readingTime_en,
  readingTime_jp,
  lastUpdated,
  publishedAt,
  relatedGlossarySlugs,
  relatedLibraryVideoSlugs,
  relatedCourseSlug,
  relatedBlogSlug
}`;

// All slugs for static generation
export const comparisonSlugQuery = `*[_type == "comparison" && isPublished == true] {
  "slug": slug.current
}`;
```

---

## i18n Strings

Add to `messages/en.json`:

```json
{
  "comparisons": {
    "title": "AI Tool Comparisons",
    "subtitle": "Honest, practitioner-tested comparisons. No affiliate links. No fluff. Just what works.",
    "meta_title": "AI Tool Comparisons — Honest Reviews from a Practitioner | HonuVibe",
    "meta_description": "Unbiased AI tool comparisons from someone who uses them daily. Claude vs ChatGPT, Cursor vs Copilot, and more.",
    "filter_all": "All",
    "filter_ai_assistants": "AI Assistants",
    "filter_coding_tools": "Coding Tools",
    "filter_image_video": "Image & Video",
    "filter_automation": "Automation",
    "filter_writing_content": "Writing & Content",
    "filter_business_productivity": "Business & Productivity",
    "updated_label": "Updated {date}",
    "reading_time": "{minutes} min read",
    "quick_verdict": "Quick Verdict",
    "comparison_table": "Feature Comparison",
    "ryans_pick": "Ryan's Pick",
    "related_glossary": "Terms Explained",
    "related_videos": "Related Tutorials",
    "related_course": "Related Course",
    "related_blog": "Related Article",
    "share_heading": "Share this comparison",
    "back_to_comparisons": "← Back to Comparisons",
    "cta_heading": "Want to master these tools, not just compare them?",
    "cta_sub": "Our courses teach you to build real things with the tools that win these comparisons.",
    "cta_button": "Explore Courses",
    "empty_state": "No comparisons in this category yet.",
    "vs": "vs",
    "pricing_label": "Pricing",
    "visit_website": "Visit",
    "see_in_resources": "View in Resources →",
    "no_affiliate_note": "This comparison contains no affiliate links. All recommendations are based on actual usage.",
    "footer_link": "Comparisons"
  }
}
```

Add to `messages/ja.json`:

```json
{
  "comparisons": {
    "title": "AIツール比較",
    "subtitle": "実際に使っている人による正直な比較。アフィリエイトリンクなし。忖度なし。",
    "meta_title": "AIツール比較 — 実務者による正直なレビュー | HonuVibe",
    "meta_description": "毎日AIツールを使う実務者による公平な比較。Claude vs ChatGPT、Cursor vs Copilotなど。",
    "filter_all": "すべて",
    "filter_ai_assistants": "AIアシスタント",
    "filter_coding_tools": "コーディングツール",
    "filter_image_video": "画像・動画",
    "filter_automation": "自動化",
    "filter_writing_content": "ライティング・コンテンツ",
    "filter_business_productivity": "ビジネス・生産性",
    "updated_label": "{date}更新",
    "reading_time": "読了時間 {minutes}分",
    "quick_verdict": "結論",
    "comparison_table": "機能比較",
    "ryans_pick": "Ryanのおすすめ",
    "related_glossary": "解説用語",
    "related_videos": "関連チュートリアル",
    "related_course": "関連コース",
    "related_blog": "関連記事",
    "share_heading": "この比較をシェア",
    "back_to_comparisons": "← 比較に戻る",
    "cta_heading": "ツールを比較するだけでなく、使いこなしたいですか？",
    "cta_sub": "HonuVibeのコースでは、これらのツールを使って実際にものを作る方法を学べます。",
    "cta_button": "コースを見る",
    "empty_state": "このカテゴリにはまだ比較記事がありません。",
    "vs": "vs",
    "pricing_label": "料金",
    "visit_website": "サイトを見る",
    "see_in_resources": "リソースページで見る →",
    "no_affiliate_note": "この比較にはアフィリエイトリンクは含まれていません。すべて実際の使用経験に基づいた推奨です。",
    "footer_link": "ツール比較"
  }
}
```

---

## File Structure

```
app/
├── [locale]/
│   ├── comparisons/
│   │   ├── page.tsx                    # Comparisons index
│   │   └── [slug]/
│   │       └── page.tsx                # Individual comparison article

components/
├── comparisons/
│   ├── ComparisonCard.tsx              # Index page card
│   ├── ComparisonFilter.tsx            # Category filter (client component)
│   ├── ComparisonMatrix.tsx            # Feature comparison table
│   ├── ToolProfile.tsx                 # Tool overview card within article
│   ├── RyansPick.tsx                   # Recommendation callout
│   └── QuickVerdict.tsx                # TL;DR callout at top
```

---

## Page Implementation: Comparisons Index

### `app/[locale]/comparisons/page.tsx`

**Page structure:**

1. **SectionHeading**
   - Overline: "COMPARISONS" / "ツール比較"
   - Heading: `t('comparisons.title')`
   - Sub: `t('comparisons.subtitle')`

2. **ComparisonFilter** (client component)
   - Category pills: All | AI Assistants | Coding Tools | Image & Video | Automation | Writing & Content | Business & Productivity
   - Client-side filtering

3. **Comparison cards**
   - 1-column mobile, 2-column desktop
   - Each comparison as `ComparisonCard`
   - If filter returns 0: show `t('comparisons.empty_state')`

4. **CTAStrip**
   - Heading: `t('comparisons.cta_heading')`
   - Sub: `t('comparisons.cta_sub')`
   - Button: `t('comparisons.cta_button')` → `/learn`

---

## Page Implementation: Individual Comparison

### `app/[locale]/comparisons/[slug]/page.tsx`

**Page structure:**

1. **Back link** → `/comparisons`

2. **Article header**
   - Title: `font-serif`, `text-h1`, `fg-primary`
   - Metadata row: category tag + last updated date + reading time
   - **"Last updated" is prominent** — comparison freshness matters. Use `t('comparisons.updated_label', { date })` with locale-formatted date
   - Tool logos row: small logos of the tools being compared, inline

3. **QuickVerdict** (callout block)
   - Heading: `t('comparisons.quick_verdict')`
   - Body: `quickVerdict_en` or `quickVerdict_jp`
   - Styled as prominent callout: `bg-accent-teal-subtle`, `border-l-4 border-accent-teal`, `rounded-lg`, `p-6`
   - Appears before the main body — readers get the answer immediately

4. **Tool profiles** (one `ToolProfile` per tool)
   - Horizontal row on desktop (2–4 cards side by side), stacked on mobile
   - Each card: tool name, logo, tagline, pricing summary, website link
   - If `relatedResourceSlug`: show "View in Resources →" link

5. **ComparisonMatrix** (feature table)
   - Heading: `t('comparisons.comparison_table')`
   - Structured as an HTML table (not a grid — tables are semantically correct here)
   - Header row: feature label | Tool 1 | Tool 2 | Tool 3 | ...
   - Each cell: star rating (rendered as filled/unfilled stars), yes/no/partial checkmark, or "N/A"
   - If a cell has a `note`: shown as small text below the rating
   - Table is horizontally scrollable on mobile (`overflow-x-auto`)
   - Alternating row backgrounds for readability: `bg-secondary` / `bg-tertiary`
   - Sticky first column on mobile (feature names always visible)

6. **Article body** (full Portable Text)
   - Rendered from `body_en` or `body_jp`
   - Standard prose styling, `max-w-content`
   - This is where the detailed analysis, use case recommendations, and personal anecdotes live

7. **RyansPick** (callout block)
   - Heading: `t('comparisons.ryans_pick')`
   - Tool name: prominent, `font-serif`, `text-h3`
   - Reason: `ryansPickReason_en` or `ryansPickReason_jp`
   - Styled as a card: `bg-accent-gold-subtle`, `border-l-4 border-accent-gold`, `rounded-lg`, `p-6`
   - Includes link to the tool's website

8. **No-affiliate disclosure**
   - `t('comparisons.no_affiliate_note')`
   - Small text, `fg-tertiary`, `text-xs`, italic
   - Positioned after Ryan's Pick — trust signal

9. **Share buttons**
   - Same `ShareButtons` component as blog/newsletter
   - X, LinkedIn, LINE (first on JP), Copy Link

10. **Related content** (only if slugs populated)
    - Glossary terms as chips
    - Library video links
    - Related course card
    - Related blog post link

11. **CTAStrip**

---

## Component Specifications

### ComparisonCard

```
Visual:
┌──────────────────────────────────────────────────┐
│  [Claude logo] [ChatGPT logo] [Gemini logo]      │
│                                                    │
│  Claude vs ChatGPT vs Gemini —                     │
│  Which AI Should You Use?                          │
│                                                    │
│  An honest comparison of the three leading         │
│  AI assistants for everyday use...                 │
│                                                    │
│  AI Assistants · Updated Jan 15, 2026  · 8 min    │
└──────────────────────────────────────────────────┘
```

- Container: `bg-secondary`, `border border-primary`, `rounded-lg`, `p-6`, hover `border-hover` + `shadow-sm`
- Tool logos: small (24px), inline row at top, `gap-2`
- Title: `font-serif`, `text-h3`, `fg-primary`, 2-line clamp. Hover: `accent-teal`
- Excerpt: `text-sm`, `fg-secondary`, 2-line clamp
- Metadata row: category tag + updated date + reading time, `text-xs`, `fg-tertiary`
- Entire card links to `/comparisons/[slug]`

### ComparisonMatrix

```
File: components/comparisons/ComparisonMatrix.tsx
Type: Server component
```

**Props:**

```typescript
interface ComparisonMatrixProps {
  tools: Array<{ name: string }>;
  matrix: Array<{
    feature: string;                // Locale-resolved
    ratings: Array<{
      toolName: string;
      rating: '5' | '4' | '3' | '2' | '1' | 'yes' | 'no' | 'partial' | 'na';
      note?: string;                // Locale-resolved
    }>;
  }>;
}
```

**Rating rendering:**

| Value | Display |
|---|---|
| `5` | ★★★★★ (all filled, `accent-gold`) |
| `4` | ★★★★☆ |
| `3` | ★★★☆☆ |
| `2` | ★★☆☆☆ |
| `1` | ★☆☆☆☆ |
| `yes` | ✓ checkmark (green/`accent-teal`) |
| `no` | ✗ (red/muted) |
| `partial` | ~ or half checkmark (`accent-gold`) |
| `na` | — (`fg-muted`) |

**Mobile behavior:**
- Table wrapped in `overflow-x-auto` container
- First column (feature names) is sticky: `position: sticky; left: 0; z-index: 10; bg-secondary`
- Minimum column width: 120px for tool columns
- User swipes horizontally to see all tools

### ToolProfile

```
File: components/comparisons/ToolProfile.tsx
Type: Server component
```

A card showing a single tool's overview.

**Props:**

```typescript
interface ToolProfileProps {
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  tagline: string;                  // Locale-resolved
  pricing: string;                  // Locale-resolved
  relatedResourceSlug?: string;
  locale: string;
}
```

**Styling:**
- `bg-secondary`, `border border-primary`, `rounded-lg`, `p-4`
- Logo: 32px, `rounded`
- Name: `font-sans`, `font-medium`, `fg-primary`
- Tagline: `text-sm`, `fg-secondary`
- Pricing: `text-xs`, `fg-tertiary`
- Links: website + optional Resources page link, `text-xs`, `accent-teal`

### RyansPick

```
File: components/comparisons/RyansPick.tsx
Type: Server component
```

**Props:**

```typescript
interface RyansPickProps {
  toolName: string;
  reason: string;                   // Locale-resolved
  toolWebsiteUrl?: string;
  heading: string;                  // t('comparisons.ryans_pick')
}
```

**Styling:**
- `bg-accent-gold-subtle`, `border-l-4 border-accent-gold`, `rounded-lg`, `p-6`
- Heading: `Overline` component, `accent-gold`
- Tool name: `font-serif`, `text-h3`, `fg-primary`
- Reason: `text-base`, `fg-secondary`, `mt-2`

### QuickVerdict

```
File: components/comparisons/QuickVerdict.tsx
Type: Server component
```

**Props:**

```typescript
interface QuickVerdictProps {
  verdict: string;                  // Locale-resolved
  heading: string;                  // t('comparisons.quick_verdict')
}
```

**Styling:**
- `bg-accent-teal-subtle`, `border-l-4 border-accent-teal`, `rounded-lg`, `p-6`
- Heading: `Overline` component, `accent-teal`
- Body: `text-base`, `fg-primary`, `font-medium`

---

## SEO & Metadata

### Comparisons Index

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'comparisons' });
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: locale === 'en' ? '/comparisons' : '/ja/comparisons',
      languages: { en: '/comparisons', ja: '/ja/comparisons' },
    },
  };
}
```

### Individual Comparison

Title: `"{comparison title} | HonuVibe"`
Description: excerpt
JSON-LD: `Article` with `dateModified` set to `lastUpdated` (signals freshness to Google)

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title_resolved,
  description: excerpt_resolved,
  datePublished: comparison.publishedAt,
  dateModified: comparison.lastUpdated,    // Critical for comparison content freshness
  author: {
    '@type': 'Person',
    name: 'Ryan Jackson',
    url: 'https://honuvibe.ai/about',
  },
  publisher: {
    '@type': 'Organization',
    name: 'HonuVibe.AI',
    url: 'https://honuvibe.ai',
  },
};
```

### Static Generation

Use `generateStaticParams` with `comparisonSlugQuery`. ISR 60s.

---

## Analytics Events

| Event | Trigger | Props |
|---|---|---|
| `comparisons_index_view` | Index page load | `locale`, `comparison_count` |
| `comparisons_filter` | Category changed | `category`, `locale` |
| `comparison_view` | Article page load | `comparison_slug`, `category`, `tools_compared`, `locale` |
| `comparison_matrix_scroll` | User scrolls the comparison table horizontally (mobile) | `comparison_slug`, `locale` |
| `comparison_tool_click` | Tool website link clicked | `comparison_slug`, `tool_name`, `locale` |
| `comparison_resource_click` | "View in Resources" clicked | `comparison_slug`, `tool_name`, `locale` |
| `comparison_share` | Share button clicked | `comparison_slug`, `platform`, `locale` |
| `comparison_related_click` | Related content link clicked | `comparison_slug`, `target_type`, `locale` |
| `comparison_cta_click` | Bottom CTA | `locale` |

---

## Mobile Behavior

| Element | Mobile (default) | Tablet (md) | Desktop (xl) |
|---|---|---|---|
| Comparison cards | 1-column stack | 2-column grid | 2-column grid |
| Tool profiles | Stacked vertically | 2-column grid | Inline row (2–4 across) |
| Comparison matrix | Horizontal scroll, sticky first column | Horizontal scroll if > 3 tools | Full table visible |
| Quick verdict | Full width callout | Same | `max-w-content` |
| Ryan's Pick | Full width callout | Same | `max-w-content` |
| Article body | Full width with padding | `max-w-content` | `max-w-content` |
| Tool logos on card | Small row (20px logos) | Same | Same (24px logos) |

- Comparison matrix is the most complex mobile element — sticky first column + horizontal scroll is essential
- All touch targets 44×44px minimum
- Star ratings must be legible at small sizes (use filled/unfilled dots as fallback if stars are too small)

---

## Content: Initial Seed (5–6 Comparisons)

| # | Title | Category | Tools Compared |
|---|---|---|---|
| 1 | Claude vs ChatGPT vs Gemini — Which AI Should You Use? | ai-assistants | Claude, ChatGPT, Gemini |
| 2 | Cursor vs GitHub Copilot — AI Coding Tools Compared | coding-tools | Cursor, GitHub Copilot |
| 3 | Midjourney vs DALL-E vs Stable Diffusion — AI Image Generators | image-video | Midjourney, DALL-E, Stable Diffusion |
| 4 | N8N vs Zapier vs Make — Automation Platform Showdown | automation | N8N, Zapier, Make |
| 5 | Notion AI vs ChatGPT Plus — AI for Productivity | business-productivity | Notion AI, ChatGPT Plus |
| 6 | Runway vs Pika vs Kling — AI Video Generation | image-video | Runway, Pika, Kling |

**Content freshness:** Comparisons go stale fast. Set a calendar reminder to review each comparison quarterly. Update the `lastUpdated` field in Sanity after each review — even if nothing changed, confirming recency builds trust.

**Writing tip:** Lead with the verdict, not the methodology. Readers searching "Claude vs ChatGPT" want the answer, then the reasoning. The Quick Verdict + Ryan's Pick structure ensures this.

---

## Acceptance Criteria

- [ ] Sanity schema for `comparison` deployed, content enterable in Studio
- [ ] `/comparisons` index page renders with heading, filter, cards, and CTA
- [ ] `/ja/comparisons` renders with Japanese UI strings
- [ ] `/comparisons/[slug]` renders full article with all sections
- [ ] `/ja/comparisons/[slug]` renders JP content where available
- [ ] QuickVerdict callout renders prominently near top
- [ ] Tool profiles render with logos, taglines, pricing, and links
- [ ] ComparisonMatrix table renders correctly with star ratings, checkmarks, and notes
- [ ] ComparisonMatrix is horizontally scrollable on mobile with sticky first column
- [ ] RyansPick callout renders with tool name and reasoning
- [ ] No-affiliate disclosure text appears
- [ ] Share buttons work (X, LinkedIn, LINE, Copy Link)
- [ ] Category filter works client-side
- [ ] "View in Resources" links render only when `relatedResourceSlug` is populated
- [ ] Related content (glossary, videos, courses, blog) renders only when populated
- [ ] `lastUpdated` date displays prominently with locale formatting
- [ ] All SEO metadata, JSON-LD (with `dateModified`), hreflang, and sitemap entries correct
- [ ] All analytics events fire
- [ ] Footer updated with "Comparisons" link
- [ ] Minimum 4 comparisons loaded in Sanity
- [ ] Dark/light mode correct
- [ ] Lighthouse mobile 90+
- [ ] Comparison matrix tested on iPhone Safari (scroll + sticky column)

---

## Cross-Links

### Active now:

| Source | Target |
|---|---|
| Comparison → Resources | `relatedResourceSlug` on each tool links to Resources page |
| Comparison → Glossary | `relatedGlossarySlugs` renders term chips |
| Comparison → Library | `relatedLibraryVideoSlugs` links to tutorial videos |
| Comparison → Courses | `relatedCourseSlug` links to relevant course |
| Resources → Comparisons | Resources page tools can link to comparisons (add `relatedComparisonSlug` field to resource schema if desired) |

### Future:

| Future Feature | Connection |
|---|---|
| Industry Pages | Link to relevant comparisons per vertical |
| Challenges | Challenges can reference comparisons for tool selection guidance |

---

*HonuVibe.AI — Feature Spec: AI Tool Comparisons v1.0 | Prepared for Ryan Jackson*

*Made in Hawaii with Aloha 🐢*
