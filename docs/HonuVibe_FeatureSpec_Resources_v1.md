# HonuVibe.AI — Feature Spec: Resources Page
**"Ryan's Toolkit" — Build-Ready Implementation Guide**
*v1.0 | February 2026*

---

## Overview

The Resources page is a curated directory of tools, platforms, and influencers that Ryan personally recommends. It positions Ryan as a knowledgeable practitioner-curator, builds trust with visitors before they commit to a course, and serves as a top-of-funnel SEO magnet.

**No auth required. No database tables. No payments.** This is a Sanity-managed content page with filtering — one of the fastest features to ship.

---

## Routes

| Locale | URL | Description |
|---|---|---|
| EN | `/resources` | Resources page |
| JP | `/ja/resources` | Resources page (Japanese) |

No individual detail pages per resource. Each tool/influencer is rendered on the single page as a card. If a resource needs more depth, it links out to its own site or to a related Library video or blog post.

### Redirects

| From | To | Reason |
|---|---|---|
| `/tools` | `/resources` | Common alias |
| `/toolkit` | `/resources` | Common alias |
| `/stack` | `/resources` | Social traffic alias |

Add these to `next.config.ts` redirects array.

---

## Navigation Placement

**Option A (recommended):** Add "Resources" to the primary nav between "Blog" and "About":

```
Home   HonuHub   Exploration   Learn   Blog   Resources   About   Apply   [☀/☾] [EN|日本語]
```

**Option B:** Keep nav unchanged and let Resources be discoverable through footer, homepage cross-links, and SEO. Use this option if nav is already feeling crowded on tablet.

**Footer:** Add under a new "Resources" column:

```
Resources
├── Ryan's Toolkit
├── Templates (future)
├── AI Glossary (future)
└── Tool Comparisons (future)
```

For now, only "Ryan's Toolkit" links to `/resources`. The others are placeholders for future features and should not render until those pages exist.

---

## Sanity Schema

Two document types: `resource` (tools) and `influencer` (people to follow). Separated because they have different fields and display differently on the page.

### resource

```typescript
// sanity/schemas/resource.ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'resource',
  title: 'Resource',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Tool Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description_en',
      title: 'Description (EN)',
      type: 'text',
      rows: 2,
      description: "Ryan's one-line recommendation. Why he uses this tool.",
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'description_jp',
      title: 'Description (JP)',
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
          { title: 'Build', value: 'build' },
          { title: 'Create', value: 'create' },
          { title: 'Learn', value: 'learn' },
          { title: 'Run Your Business', value: 'business' },
          { title: 'Communicate', value: 'communicate' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'pricing',
      title: 'Pricing',
      type: 'string',
      options: {
        list: [
          { title: 'Free', value: 'free' },
          { title: 'Freemium', value: 'freemium' },
          { title: 'Paid', value: 'paid' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Tool URL',
      type: 'url',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
      description: 'Square logo, minimum 80x80px. PNG or SVG preferred.',
    }),
    defineField({
      name: 'relatedLibraryVideoSlug',
      title: 'Related Library Video Slug',
      type: 'string',
      description: 'Slug of a Library video tutorial for this tool (if one exists). Leave blank if none.',
    }),
    defineField({
      name: 'relatedCourseSlug',
      title: 'Related Course Slug',
      type: 'string',
      description: 'Slug of a course that uses this tool (if any). Leave blank if none.',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Lower numbers appear first within their category. Default: 0.',
      initialValue: 0,
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured',
      type: 'boolean',
      description: 'Featured tools appear in a highlighted row at the top of the page.',
      initialValue: false,
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
    { title: 'Name', name: 'name', by: [{ field: 'name', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'category', media: 'logo' },
  },
});
```

### influencer

```typescript
// sanity/schemas/influencer.ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'influencer',
  title: 'Influencer / Creator',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description_en',
      title: 'Why Follow (EN)',
      type: 'text',
      rows: 2,
      description: "One line on why this person is worth following.",
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'description_jp',
      title: 'Why Follow (JP)',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'avatar',
      title: 'Avatar',
      type: 'image',
      options: { hotspot: true },
      description: 'Headshot or profile image. Square, minimum 80x80px.',
    }),
    defineField({
      name: 'platforms',
      title: 'Platforms',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({
            name: 'platform',
            title: 'Platform',
            type: 'string',
            options: {
              list: [
                { title: 'YouTube', value: 'youtube' },
                { title: 'TikTok', value: 'tiktok' },
                { title: 'X (Twitter)', value: 'x' },
                { title: 'Instagram', value: 'instagram' },
                { title: 'LinkedIn', value: 'linkedin' },
                { title: 'Podcast', value: 'podcast' },
                { title: 'Newsletter', value: 'newsletter' },
                { title: 'Website', value: 'website' },
              ],
            },
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'url',
            title: 'URL',
            type: 'url',
            validation: (Rule) => Rule.required(),
          }),
        ],
        preview: {
          select: { title: 'platform', subtitle: 'url' },
        },
      }],
    }),
    defineField({
      name: 'specialty',
      title: 'Specialty',
      type: 'string',
      description: 'Short tag like "AI Engineering", "Prompt Design", "Business Automation".',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      initialValue: 0,
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
    { title: 'Name', name: 'name', by: [{ field: 'name', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'specialty', media: 'avatar' },
  },
});
```

**Register both schemas** in your Sanity schema index file alongside the existing `blogPost` schema.

---

## GROQ Queries

```typescript
// lib/sanity/queries.ts (add to existing file)

// Fetch all published resources, ordered by category then sortOrder
export const resourcesQuery = `*[_type == "resource" && isPublished == true] | order(category asc, sortOrder asc) {
  name,
  slug,
  description_en,
  description_jp,
  category,
  pricing,
  url,
  "logoUrl": logo.asset->url,
  relatedLibraryVideoSlug,
  relatedCourseSlug,
  isFeatured,
  sortOrder
}`;

// Fetch all published influencers, ordered by sortOrder
export const influencersQuery = `*[_type == "influencer" && isPublished == true] | order(sortOrder asc) {
  name,
  slug,
  description_en,
  description_jp,
  "avatarUrl": avatar.asset->url,
  platforms,
  specialty,
  sortOrder
}`;
```

---

## i18n Strings

Add to `messages/en.json`:

```json
{
  "resources": {
    "title": "Ryan's Toolkit",
    "subtitle": "The tools, platforms, and people I actually use and recommend.",
    "meta_title": "Ryan's Toolkit — Recommended AI Tools & Creators | HonuVibe",
    "meta_description": "Curated tools, platforms, and creators that Ryan Jackson uses and recommends for AI development, business automation, and creative work.",
    "filter_all": "All",
    "filter_build": "Build",
    "filter_create": "Create",
    "filter_learn": "Learn",
    "filter_business": "Run Your Business",
    "filter_communicate": "Communicate",
    "pricing_free": "Free",
    "pricing_freemium": "Freemium",
    "pricing_paid": "Paid",
    "visit_tool": "Visit",
    "watch_tutorial": "Watch Tutorial",
    "used_in_course": "Used in Course",
    "featured_label": "Ryan's Picks",
    "influencers_heading": "Creators & Voices Worth Following",
    "influencers_sub": "People who are doing exceptional work in AI and tech education.",
    "follow_on": "Follow on",
    "cta_heading": "Ready to put these tools to work?",
    "cta_sub": "Our courses teach you how to build real projects with the tools above.",
    "cta_button": "Explore Courses",
    "empty_state": "No tools match that filter. Try another category."
  }
}
```

Add to `messages/ja.json`:

```json
{
  "resources": {
    "title": "Ryanのツールキット",
    "subtitle": "実際に使っているおすすめのツール、プラットフォーム、クリエイター。",
    "meta_title": "Ryanのツールキット — おすすめAIツール＆クリエイター | HonuVibe",
    "meta_description": "Ryan Jacksonが実際に使用し、おすすめするAI開発、ビジネス自動化、クリエイティブ制作のためのツールとクリエイターを紹介。",
    "filter_all": "すべて",
    "filter_build": "開発",
    "filter_create": "制作",
    "filter_learn": "学習",
    "filter_business": "ビジネス運営",
    "filter_communicate": "コミュニケーション",
    "pricing_free": "無料",
    "pricing_freemium": "フリーミアム",
    "pricing_paid": "有料",
    "visit_tool": "サイトへ",
    "watch_tutorial": "チュートリアルを見る",
    "used_in_course": "コースで使用",
    "featured_label": "Ryanのおすすめ",
    "influencers_heading": "フォローすべきクリエイター",
    "influencers_sub": "AIとテック教育で優れた活動をしている人たち。",
    "follow_on": "フォロー",
    "cta_heading": "これらのツールを使いこなしたいですか？",
    "cta_sub": "HonuVibeのコースでは、上記のツールを使って実際のプロジェクトを構築する方法を学べます。",
    "cta_button": "コースを見る",
    "empty_state": "該当するツールが見つかりません。他のカテゴリをお試しください。"
  }
}
```

---

## File Structure

```
app/
├── [locale]/
│   ├── resources/
│   │   └── page.tsx                    # Resources page

components/
├── resources/
│   ├── ResourceCard.tsx                # Individual tool card
│   ├── InfluencerCard.tsx              # Individual creator card
│   ├── ResourceFilter.tsx              # Category filter pills
│   └── PlatformIcon.tsx                # Platform logo/icon helper
```

---

## Page Implementation

### `app/[locale]/resources/page.tsx`

```
Data fetching: Server component. Fetch resources + influencers from Sanity at build time (ISR, 60s revalidation).
Layout: Standard page layout (nav, footer, section reveals).
```

**Page structure (top to bottom):**

1. **SectionHeading** (existing component)
   - Overline: "RESOURCES"
   - Heading: `t('resources.title')` — "Ryan's Toolkit"
   - Sub: `t('resources.subtitle')`

2. **Featured row** (only if any resources have `isFeatured: true`)
   - Overline label: `t('resources.featured_label')` — "Ryan's Picks"
   - Horizontal scroll on mobile, 3-column grid on desktop
   - Uses `ResourceCard` with a subtle highlight border (`border-accent`)

3. **ResourceFilter**
   - Horizontal pill bar: All | Build | Create | Learn | Run Your Business | Communicate
   - Client component (needs `useState` for active filter)
   - Default: "All"
   - Filters the tool grid below in real-time (client-side, no API call — all data is already on page)

4. **Tool grid**
   - Filtered by active category
   - 1-column mobile, 2-column tablet (md), 3-column desktop (xl)
   - Uses `ResourceCard`
   - If filter returns 0 results: show `t('resources.empty_state')` in `fg-tertiary`

5. **Divider** (existing component)

6. **Influencers section**
   - `SectionHeading`: overline "CREATORS", heading `t('resources.influencers_heading')`, sub `t('resources.influencers_sub')`
   - 1-column mobile, 2-column tablet, 3-column desktop
   - Uses `InfluencerCard`

7. **CTAStrip** (existing component, reused)
   - Heading: `t('resources.cta_heading')`
   - Sub: `t('resources.cta_sub')`
   - Button: `t('resources.cta_button')` → `/learn`

---

## Component Specifications

### ResourceCard

```
File: components/resources/ResourceCard.tsx
Type: Server component (no client interactivity needed)
```

**Visual structure:**

```
┌─────────────────────────────────────────────┐
│  [Logo]   Tool Name              [Free] badge│
│           Ryan's one-line description...     │
│                                              │
│  [Build] tag    [Visit →]  [▶ Tutorial]      │
└─────────────────────────────────────────────┘
```

**Props:**

```typescript
interface ResourceCardProps {
  name: string;
  description: string;          // Already locale-resolved by parent
  logoUrl?: string;
  category: string;
  pricing: 'free' | 'freemium' | 'paid';
  url: string;
  relatedLibraryVideoSlug?: string;
  relatedCourseSlug?: string;
  isFeatured?: boolean;
  locale: string;
}
```

**Styling:**
- Container: `bg-secondary`, `border border-primary`, `rounded-lg`, `p-5`, hover: `border-hover` + `shadow-sm`
- If `isFeatured`: `border-accent` instead of `border-primary`
- Logo: 40×40px, `rounded` (6px), `object-contain`. If no logo, show a colored circle with first letter of tool name
- Tool name: `font-sans`, `text-base`, `font-medium`, `fg-primary`
- Description: `font-sans`, `text-sm`, `fg-secondary`, 2-line clamp (`line-clamp-2`)
- Pricing badge: `Tag` component. Colors:
  - Free: `accent-teal` bg subtle, `accent-teal` text
  - Freemium: `accent-gold` bg subtle, `accent-gold` text  
  - Paid: `bg-tertiary`, `fg-tertiary`
- Category tag: `Tag` component, `bg-tertiary`, `fg-secondary`
- "Visit" link: `text-sm`, `fg-secondary`, hover `accent-teal`. Opens in new tab (`target="_blank"`, `rel="noopener noreferrer"`)
- "Watch Tutorial" link: only rendered if `relatedLibraryVideoSlug` is truthy. `text-sm`, `accent-teal`. Links to `/learn/library/[slug]`
- "Used in Course" link: only rendered if `relatedCourseSlug` is truthy. `text-sm`, `accent-gold`. Links to `/learn/[slug]`

**Accessibility:**
- Card is not a single link (has multiple interactive elements)
- Each link has descriptive text. "Visit" includes `aria-label={name + " website"}`
- External links include `rel="noopener noreferrer"` and visually indicate external (→ arrow)

### InfluencerCard

```
File: components/resources/InfluencerCard.tsx
Type: Server component
```

**Visual structure:**

```
┌─────────────────────────────────────────────┐
│  [Avatar]   Creator Name                     │
│             "AI Engineering" specialty tag    │
│             Why Ryan recommends them...      │
│                                              │
│  [YouTube]  [X]  [Newsletter]  platform icons│
└─────────────────────────────────────────────┘
```

**Props:**

```typescript
interface InfluencerCardProps {
  name: string;
  description: string;          // Locale-resolved
  avatarUrl?: string;
  platforms: Array<{ platform: string; url: string }>;
  specialty?: string;
  locale: string;
}
```

**Styling:**
- Container: same card pattern as `ResourceCard`
- Avatar: 48×48px, `rounded-full`, `object-cover`. If no avatar, colored circle with initials
- Name: `font-sans`, `text-base`, `font-medium`, `fg-primary`
- Specialty: `Tag` component, `bg-tertiary`, `fg-secondary`
- Description: `text-sm`, `fg-secondary`, 2-line clamp
- Platform icons: 24×24px, `fg-tertiary`, hover `accent-teal`. Each links to platform URL in new tab. Use `PlatformIcon` helper component for consistent icons

### ResourceFilter

```
File: components/resources/ResourceFilter.tsx
Type: Client component ("use client")
```

**Props:**

```typescript
interface ResourceFilterProps {
  categories: Array<{ value: string; label: string }>;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}
```

**Styling:**
- Horizontal row of pill buttons, `gap-2`, `overflow-x-auto` on mobile with `-webkit-overflow-scrolling: touch`
- Each pill: `px-4 py-2`, `rounded-full`, `text-sm`, `font-medium`
- Inactive: `bg-tertiary`, `fg-secondary`, hover `fg-primary`
- Active: `bg-accent-teal-subtle`, `accent-teal` text, `border border-accent`
- Transition: `duration-fast` (150ms) on background and color

### PlatformIcon

```
File: components/resources/PlatformIcon.tsx
Type: Server component
```

Simple mapping function that returns the appropriate SVG icon for each platform string. Use Lucide React icons where available (YouTube, Twitter/X, LinkedIn, Instagram). For TikTok, Podcast, Newsletter, Website — use simple custom SVGs or generic icons.

---

## SEO & Metadata

### generateMetadata

```typescript
// app/[locale]/resources/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'resources' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: locale === 'en' ? '/resources' : '/ja/resources',
      languages: {
        en: '/resources',
        ja: '/ja/resources',
      },
    },
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
      url: locale === 'en' ? '/resources' : '/ja/resources',
      locale: locale === 'en' ? 'en_US' : 'ja_JP',
      type: 'website',
      // Use the default HonuVibe OG image or generate a dynamic one
    },
  };
}
```

### JSON-LD

```typescript
// Include on the resources page
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: t('title'),
  description: t('subtitle'),
  url: `https://honuvibe.ai${locale === 'en' ? '/resources' : '/ja/resources'}`,
  isPartOf: {
    '@type': 'WebSite',
    name: 'HonuVibe.AI',
    url: 'https://honuvibe.ai',
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://honuvibe.ai' },
      { '@type': 'ListItem', position: 2, name: t('title'), item: `https://honuvibe.ai${locale === 'en' ? '/resources' : '/ja/resources'}` },
    ],
  },
};
```

### Sitemap

Add to `app/sitemap.ts`:

```typescript
// Add to the existing sitemap generation
{
  url: 'https://honuvibe.ai/resources',
  lastModified: new Date(),
  alternates: {
    languages: {
      en: 'https://honuvibe.ai/resources',
      ja: 'https://honuvibe.ai/ja/resources',
    },
  },
},
```

---

## Analytics Events

| Event | Trigger | Props |
|---|---|---|
| `resource_click` | "Visit" link clicked on any tool card | `resource_name`, `category`, `locale` |
| `resource_tutorial_click` | "Watch Tutorial" link clicked | `resource_name`, `video_slug`, `locale` |
| `resource_course_click` | "Used in Course" link clicked | `resource_name`, `course_slug`, `locale` |
| `resource_filter` | Category filter changed | `category`, `locale` |
| `influencer_click` | Any platform link clicked on influencer card | `influencer_name`, `platform`, `locale` |
| `resource_cta_click` | Bottom "Explore Courses" CTA clicked | `locale` |

**Implementation:** Use the existing `trackEvent()` helper from `lib/analytics.ts`:

```typescript
import { trackEvent } from '@/lib/analytics';

// On "Visit" click
trackEvent('resource_click', {
  resource_name: resource.name,
  category: resource.category,
  locale,
});
```

Note: "Visit" and platform links open in a new tab, so fire the event `onClick` before navigation. The link's `target="_blank"` ensures the parent page stays open for Plausible to send the event.

---

## Mobile Behavior

| Element | Mobile (default) | Tablet (md) | Desktop (xl) |
|---|---|---|---|
| Filter pills | Horizontal scroll, no wrap | Horizontal scroll | Single row, all visible |
| Featured row | Horizontal scroll strip | 2-column grid | 3-column grid |
| Tool grid | 1-column stack | 2-column grid | 3-column grid |
| Influencer grid | 1-column stack | 2-column grid | 3-column grid |
| Card padding | `p-4` | `p-5` | `p-5` |

- Filter bar uses `scroll-snap-type: x mandatory` with `scroll-snap-align: start` on each pill for clean mobile scrolling
- No sticky elements on this page (it's a browse page, not a conversion page)
- All external links have 44×44px minimum touch targets

---

## Content: Initial Seed Data

Ryan populates these through the Sanity Studio. Below is a suggested starting set for launch.

### Tools (20 minimum)

**Build:**
| Tool | Pricing | Description (EN) |
|---|---|---|
| Cursor | Freemium | The AI-native code editor I build everything in. |
| Claude | Freemium | My go-to AI assistant for reasoning, writing, and code. |
| Vercel | Freemium | Where all my sites live. Zero-config deploys, global CDN. |
| Supabase | Freemium | Open-source Firebase alternative. Postgres + auth + storage. |
| GitHub | Freemium | Version control and collaboration. Non-negotiable. |
| Next.js | Free | The React framework behind HonuVibe and most of my projects. |

**Create:**
| Tool | Pricing | Description (EN) |
|---|---|---|
| Midjourney | Paid | Best AI image generation for creative and brand work. |
| Runway | Paid | AI video generation and editing. The future of video. |
| Figma | Freemium | Design and prototyping. Where every UI starts. |
| Canva | Freemium | Quick graphics and social content. Underrated for speed. |

**Learn:**
| Tool | Pricing | Description (EN) |
|---|---|---|
| ChatGPT | Freemium | The AI tool most people start with. Great for exploration. |
| Perplexity | Freemium | AI-powered search. Better than Google for research questions. |
| Notion | Freemium | Where I organize everything — notes, projects, course outlines. |

**Run Your Business:**
| Tool | Pricing | Description (EN) |
|---|---|---|
| Stripe | Paid (per transaction) | Payment processing. Handles USD and JPY beautifully. |
| Resend | Freemium | Modern email API. Clean, fast, developer-friendly. |
| N8N | Freemium | Open-source automation. My Zapier replacement. |
| Cal.com | Freemium | Open-source scheduling. Powers HonuHub bookings. |
| Beehiiv | Freemium | Newsletter platform. Where the HonuVibe newsletter lives. |

**Communicate:**
| Tool | Pricing | Description (EN) |
|---|---|---|
| LINE | Free | Essential for the Japan market. Our community's home in JP. |
| Loom | Freemium | Quick video messages. Better than long emails. |

### Influencers (10 minimum)

Suggested starting list (Ryan to finalize — these are placeholders based on the AI/tech education space):

| Name | Specialty | Primary Platform |
|---|---|---|
| Fireship (Jeff Delaney) | Web dev & AI tutorials | YouTube |
| Lenny Rachitsky | Product management & startups | Newsletter / Podcast |
| Greg Isenberg | Community-led business | YouTube / X |
| Matt Wolfe | AI tools & news | YouTube |
| Tina Huang | Tech career & AI learning | YouTube / TikTok |
| Simon Willison | AI engineering & open source | Blog / X |
| Wes Bos | Web development | YouTube / Podcast |
| Riley Brown | AI coding tutorials | YouTube |
| Rachel Woods | AI for business | Newsletter / X |
| Sahil Lavingia | Entrepreneurship & building | X / Newsletter |

**Ryan should review and personalize this list.** The whole point is that these are his genuine recommendations, not a generic "top AI influencers" list.

---

## Acceptance Criteria

The feature is complete when:

- [ ] Sanity schemas for `resource` and `influencer` are deployed and content is enterable in Sanity Studio
- [ ] `/resources` page renders with all sections (hero, featured row, filter, tool grid, influencers, CTA)
- [ ] `/ja/resources` renders with Japanese UI strings and JP descriptions where available
- [ ] Category filter works client-side, instantly filtering the tool grid
- [ ] All external links open in new tabs with `rel="noopener noreferrer"`
- [ ] "Watch Tutorial" and "Used in Course" links render only when the relevant slug is populated
- [ ] Page is responsive: 1→2→3 column grid across breakpoints
- [ ] Filter pills scroll horizontally on mobile with snap behavior
- [ ] Empty filter state shows the empty state message
- [ ] `generateMetadata` produces correct title, description, and hreflang for both locales
- [ ] JSON-LD `CollectionPage` schema is present and valid
- [ ] Page is included in sitemap with both locale alternates
- [ ] Redirects from `/tools`, `/toolkit`, `/stack` are working
- [ ] All Plausible analytics events fire correctly
- [ ] Section reveal animations work on scroll (using existing `useReveal` hook)
- [ ] Dark mode and light mode both render correctly with proper contrast
- [ ] Footer includes Resources link
- [ ] Minimum 20 tools + 10 influencers loaded in Sanity
- [ ] Lighthouse mobile score: 90+
- [ ] All links tested on iPhone Safari and Chrome Android

---

## Cross-Links to Future Features

Once these features are built, add the following connections to the Resources page. **Do not build these now** — they are documented here so the wiring is easy later.

| Future Feature | Connection Point |
|---|---|
| **Library** | "Watch Tutorial" links on ResourceCards become active once Library videos exist |
| **Glossary** | Tool descriptions can link to glossary terms inline (e.g., "LLM" links to `/glossary/llm`) |
| **Templates** | A "Templates" sub-section or tab could be added to the Resources page |
| **Comparisons** | Tools that appear in a comparison page can show a "See Comparison" link |
| **Industry Pages** | Industry pages link back to relevant tools in the Resources page |

---

*HonuVibe.AI — Feature Spec: Resources Page v1.0 | Prepared for Ryan Jackson*

*Made in Hawaii with Aloha 🐢*
