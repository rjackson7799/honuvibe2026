# HonuVibe.AI — Feature Spec: Newsletter Archive
**Evergreen Newsletter Content Hub — Build-Ready Implementation Guide**
*v1.0 | February 2026*

---

## Overview

The Newsletter Archive publishes every Beehiiv newsletter issue as a permanent, SEO-indexed page on the HonuVibe site. Content Ryan is already creating gets a second life as evergreen web content. Each issue becomes a discoverable page that drives organic traffic, builds trust with new visitors, and converts readers into subscribers.

**No auth required. No database tables. Sanity-managed content. Individual issue pages for SEO.**

### Content Workflow

After sending a newsletter through Beehiiv, manually create a matching Sanity document:

1. Open Sanity Studio → create new "Newsletter Issue"
2. Paste the newsletter title, body content, and excerpt
3. Set the issue number and publication date
4. Optionally add JP translation, related links, and the Beehiiv URL
5. Publish — live on the site within 60 seconds (ISR)

**Time per issue: ~5 minutes.** This manual step gives full control over formatting, cross-links, and bilingual content. Automation via Beehiiv API is a future optimization if volume warrants it.

---

## Routes

| Locale | URL | Description |
|---|---|---|
| EN | `/newsletter` | Newsletter archive index |
| EN | `/newsletter/[slug]` | Individual newsletter issue |
| JP | `/ja/newsletter` | Newsletter archive index (Japanese) |
| JP | `/ja/newsletter/[slug]` | Individual newsletter issue (Japanese) |

### Redirects

Add to `next.config.ts` redirects array:

```typescript
{ source: '/emails', destination: '/newsletter', permanent: true },
{ source: '/ja/emails', destination: '/ja/newsletter', permanent: true },
{ source: '/archive', destination: '/newsletter', permanent: true },
{ source: '/ja/archive', destination: '/ja/newsletter', permanent: true },
```

---

## Footer Placement

Add "Newsletter" to the **RESOURCES** column in the footer, below "AI Glossary":

```
NAVIGATE              RESOURCES            LEGAL
HonuHub               Resources            Privacy Policy
Explore               AI Glossary          Terms of Service
Learn                 Newsletter           Cookie Notice
Community             Blog
                      About
                      Contact
```

Route: `/${locale}/newsletter`. Link text from i18n: `t('newsletter.footer_link')`.

---

## Sanity Schema

### newsletterIssue

```typescript
// sanity/schemas/newsletterIssue.ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'newsletterIssue',
  title: 'Newsletter Issue',
  type: 'document',
  fields: [
    defineField({
      name: 'title_en',
      title: 'Title (EN)',
      type: 'string',
      description: 'The newsletter subject line or title.',
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
      name: 'issueNumber',
      title: 'Issue Number',
      type: 'number',
      description: 'Sequential issue number (1, 2, 3...). Used for display and ordering.',
      validation: (Rule) => Rule.required().positive().integer(),
    }),
    defineField({
      name: 'excerpt_en',
      title: 'Excerpt (EN)',
      type: 'text',
      rows: 2,
      description: 'One-line preview shown on the index page. Max 160 chars.',
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
      name: 'body_en',
      title: 'Body (EN)',
      type: 'blockContent',
      description: 'Full newsletter content. Paste from Beehiiv and adjust formatting as needed.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body_jp',
      title: 'Body (JP)',
      type: 'blockContent',
      description: 'Japanese translation. Optional — add progressively.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published Date',
      type: 'datetime',
      description: 'The date the newsletter was originally sent. Used for display and ordering.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'readingTime_en',
      title: 'Reading Time EN (minutes)',
      type: 'number',
      description: 'Estimated reading time. Calculate from word count (~200 words/min).',
    }),
    defineField({
      name: 'readingTime_jp',
      title: 'Reading Time JP (minutes)',
      type: 'number',
      description: 'JP reading time (~400-600 characters/min).',
    }),
    defineField({
      name: 'beehiivUrl',
      title: 'Beehiiv URL',
      type: 'url',
      description: 'Link to the original Beehiiv web version of this newsletter. Optional but recommended.',
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Optional hero image for the issue. Used in OG images and optionally on the page.',
    }),
    defineField({
      name: 'relatedBlogSlugs',
      title: 'Related Blog Post Slugs',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Slugs of blog posts referenced in or related to this issue.',
    }),
    defineField({
      name: 'relatedCourseSlugs',
      title: 'Related Course Slugs',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Slugs of courses mentioned or relevant to this issue.',
    }),
    defineField({
      name: 'isPublished',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  orderings: [
    {
      title: 'Issue Number (Newest)',
      name: 'issueDesc',
      by: [{ field: 'issueNumber', direction: 'desc' }],
    },
    {
      title: 'Issue Number (Oldest)',
      name: 'issueAsc',
      by: [{ field: 'issueNumber', direction: 'asc' }],
    },
    {
      title: 'Publish Date',
      name: 'publishDate',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title_en',
      issueNumber: 'issueNumber',
      date: 'publishedAt',
    },
    prepare({ title, issueNumber, date }) {
      const formattedDate = date ? new Date(date).toLocaleDateString() : 'No date';
      return {
        title: `#${issueNumber}: ${title}`,
        subtitle: formattedDate,
      };
    },
  },
});
```

**Register the schema** in your Sanity schema index file alongside existing schemas.

---

## GROQ Queries

```typescript
// lib/sanity/queries.ts (add to existing file)

// All published issues for the index page — lightweight
export const newsletterIndexQuery = `*[_type == "newsletterIssue" && isPublished == true] | order(issueNumber desc) {
  title_en,
  title_jp,
  slug,
  issueNumber,
  excerpt_en,
  excerpt_jp,
  publishedAt,
  readingTime_en,
  readingTime_jp
}`;

// Single issue by slug — full content
export const newsletterIssueQuery = `*[_type == "newsletterIssue" && slug.current == $slug && isPublished == true][0] {
  title_en,
  title_jp,
  slug,
  issueNumber,
  excerpt_en,
  excerpt_jp,
  body_en,
  body_jp,
  publishedAt,
  readingTime_en,
  readingTime_jp,
  beehiivUrl,
  "featuredImageUrl": featuredImage.asset->url,
  relatedBlogSlugs,
  relatedCourseSlugs
}`;

// Adjacent issues for prev/next navigation
export const newsletterAdjacentQuery = `{
  "prev": *[_type == "newsletterIssue" && isPublished == true && issueNumber < $issueNumber] | order(issueNumber desc) [0] {
    title_en, title_jp, slug, issueNumber
  },
  "next": *[_type == "newsletterIssue" && isPublished == true && issueNumber > $issueNumber] | order(issueNumber asc) [0] {
    title_en, title_jp, slug, issueNumber
  }
}`;

// All slugs for generateStaticParams
export const newsletterSlugQuery = `*[_type == "newsletterIssue" && isPublished == true] {
  "slug": slug.current
}`;
```

---

## i18n Strings

Add to `messages/en.json`:

```json
{
  "newsletter": {
    "title": "The HonuVibe Newsletter",
    "subtitle": "Weekly AI insights for builders and dreamers. Every issue archived here.",
    "meta_title": "Newsletter Archive — Weekly AI Insights | HonuVibe",
    "meta_description": "Browse the complete archive of the HonuVibe newsletter. Weekly AI insights, tools, and strategies for entrepreneurs and builders.",
    "subscribe_heading": "Get this in your inbox every week",
    "subscribe_sub": "Join entrepreneurs and builders learning AI the HonuVibe way.",
    "subscribe_button": "Subscribe",
    "subscribe_placeholder": "your@email.com",
    "issue_label": "Issue #{number}",
    "published_label": "Published {date}",
    "reading_time": "{minutes} min read",
    "read_issue": "Read Issue",
    "prev_issue": "← Previous Issue",
    "next_issue": "Next Issue →",
    "back_to_archive": "← Back to Archive",
    "view_on_beehiiv": "View original email version",
    "related_posts": "Related Articles",
    "related_courses": "Related Courses",
    "share_heading": "Share this issue",
    "cta_heading": "Like what you're reading?",
    "cta_sub": "The newsletter is just the surface. Our courses go deep.",
    "cta_button": "Explore Courses",
    "empty_state": "The first issue is coming soon. Subscribe to be notified.",
    "footer_link": "Newsletter"
  }
}
```

Add to `messages/ja.json`:

```json
{
  "newsletter": {
    "title": "HonuVibeニュースレター",
    "subtitle": "ビルダーと夢見る人のための、毎週のAIインサイト。すべてのバックナンバーをここで。",
    "meta_title": "ニュースレターアーカイブ — 毎週のAIインサイト | HonuVibe",
    "meta_description": "HonuVibeニュースレターの全アーカイブ。起業家やビルダーのための毎週のAIインサイト、ツール、戦略。",
    "subscribe_heading": "毎週メールでお届けします",
    "subscribe_sub": "AIをHonuVibeスタイルで学ぶ起業家やビルダーの仲間に。",
    "subscribe_button": "登録する",
    "subscribe_placeholder": "your@email.com",
    "issue_label": "第{number}号",
    "published_label": "{date}配信",
    "reading_time": "読了時間 {minutes}分",
    "read_issue": "読む",
    "prev_issue": "← 前の号",
    "next_issue": "次の号 →",
    "back_to_archive": "← アーカイブに戻る",
    "view_on_beehiiv": "メール版を見る",
    "related_posts": "関連記事",
    "related_courses": "関連コース",
    "share_heading": "この号をシェア",
    "cta_heading": "この内容、気に入りましたか？",
    "cta_sub": "ニュースレターはまだ入口です。コースではさらに深く学べます。",
    "cta_button": "コースを見る",
    "empty_state": "最初の号がもうすぐ届きます。通知を受け取るには登録してください。",
    "footer_link": "ニュースレター"
  }
}
```

---

## File Structure

```
app/
├── [locale]/
│   ├── newsletter/
│   │   ├── page.tsx                    # Newsletter archive index
│   │   └── [slug]/
│   │       └── page.tsx                # Individual issue page

components/
├── newsletter/
│   ├── NewsletterIssueCard.tsx         # Card for index page
│   ├── IssueNavigation.tsx             # Prev/Next issue links
│   └── NewsletterSubscribeBlock.tsx    # Inline subscribe form (reuses existing Beehiiv integration)
```

---

## Page Implementation: Archive Index

### `app/[locale]/newsletter/page.tsx`

```
Data fetching: Server component. Fetch all issues from Sanity via newsletterIndexQuery (ISR, 60s revalidation).
```

**Page structure (top to bottom):**

1. **SectionHeading**
   - Overline: "NEWSLETTER" / "ニュースレター"
   - Heading: `t('newsletter.title')`
   - Sub: `t('newsletter.subtitle')`

2. **NewsletterSubscribeBlock** (prominent placement — this page's primary conversion)
   - Heading: `t('newsletter.subscribe_heading')`
   - Sub: `t('newsletter.subscribe_sub')`
   - Email input + subscribe button
   - Uses the same Beehiiv API integration as your existing newsletter signup (likely already built for the homepage)
   - Styled as a card: `bg-secondary`, `border border-primary`, `rounded-lg`, `p-6`, centered, `max-w-narrow`

3. **Issue list**
   - Reverse chronological (newest first — Sanity query already handles this)
   - No grouping by date or year — simple flat list. If the archive grows past 50+ issues, add year separators later
   - Each issue rendered as `NewsletterIssueCard`
   - 1-column stack on all breakpoints (newsletter is a reading/scanning experience, not a grid)
   - If no issues exist: show `t('newsletter.empty_state')` centered, `fg-tertiary`

4. **CTAStrip** (existing reusable component)
   - Heading: `t('newsletter.cta_heading')`
   - Sub: `t('newsletter.cta_sub')`
   - Button: `t('newsletter.cta_button')` → `/learn`

---

## Page Implementation: Individual Issue

### `app/[locale]/newsletter/[slug]/page.tsx`

```
Data fetching: Server component. Fetch issue via newsletterIssueQuery + adjacent issues via newsletterAdjacentQuery.
Static generation: Use generateStaticParams with newsletterSlugQuery.
ISR: 60s revalidation.
404: If issue not found, return notFound().
```

**Page structure (top to bottom):**

1. **Back link**
   - `t('newsletter.back_to_archive')` — "← Back to Archive"
   - Links to `/newsletter` (or `/ja/newsletter`)
   - `text-sm`, `fg-secondary`, hover `accent-teal`

2. **Issue header**
   - Issue label: `t('newsletter.issue_label', { number: issue.issueNumber })` — "Issue #12" / "第12号"
   - `Overline` component style, `accent-teal`
   - Title: `font-serif`, `text-h1`, `fg-primary`
   - Metadata row: published date + reading time
     - Date: `t('newsletter.published_label', { date: formattedDate })` — formatted for locale (`en-US` / `ja-JP`)
     - Reading time: `t('newsletter.reading_time', { minutes })` — only if field is populated
     - Both in `text-sm`, `fg-tertiary`

3. **Body content**
   - Rendered from Portable Text (`body_en` or `body_jp` based on locale)
   - Standard prose styling matching your blog post template
   - `max-w-content` (880px), centered
   - `fg-secondary` body text, `leading-relaxed` (EN) / `leading-loose` (JP)
   - Images within body: full content width, `rounded-lg`
   - Links within body: `accent-teal`, underlined on hover

4. **Beehiiv link** (only if `beehiivUrl` is populated)
   - `t('newsletter.view_on_beehiiv')` — "View original email version"
   - `text-sm`, `fg-tertiary`, opens in new tab
   - Subtle, not prominent — the web version is the canonical reading experience

5. **Share buttons**
   - Heading: `t('newsletter.share_heading')`
   - Same `ShareButtons` component used on blog posts
   - Platforms: X (Twitter), LinkedIn, LINE (first on JP locale), Copy Link

6. **Related content** (only if slugs are populated)
   - If `relatedBlogSlugs`: heading `t('newsletter.related_posts')`, render as linked list items
   - If `relatedCourseSlugs`: heading `t('newsletter.related_courses')`, render as linked list items
   - `text-sm`, each link styled as a row with arrow indicator

7. **IssueNavigation** (prev/next)
   - Full-width row, split left/right
   - Left: `t('newsletter.prev_issue')` + previous issue title (linked)
   - Right: `t('newsletter.next_issue')` + next issue title (linked)
   - If no prev or next: that side is empty (don't show a disabled state)
   - `border-t border-primary`, `py-8`, `mt-8`

8. **NewsletterSubscribeBlock** (second placement — catch readers who finished the issue)
   - Same component as index page, same styling
   - Readers who just finished an issue are the highest-intent subscribers

---

## Component Specifications

### NewsletterIssueCard

```
File: components/newsletter/NewsletterIssueCard.tsx
Type: Server component
```

**Visual structure:**

```
┌──────────────────────────────────────────────────┐
│  Issue #12 · Jan 15, 2026           4 min read   │
│                                                    │
│  How I Built a SaaS MVP in 48 Hours Using Claude  │
│                                                    │
│  This week I walked through my process of going    │
│  from idea to working prototype using Claude...    │
│                                                    │
│                                    [Read Issue →]  │
└──────────────────────────────────────────────────┘
```

**Props:**

```typescript
interface NewsletterIssueCardProps {
  title: string;                    // Locale-resolved by parent
  excerpt: string;                  // Locale-resolved by parent
  slug: { current: string };
  issueNumber: number;
  publishedAt: string;
  readingTime?: number;
  locale: string;
}
```

**Styling:**
- Container: full-width, `py-6`, `border-b border-secondary`. Clean list aesthetic (same pattern as Glossary term cards)
- Entire card is a link to `/newsletter/[slug]` (or `/ja/newsletter/[slug]`)
- Hover: `bg-tertiary` subtle background, smooth transition
- Metadata row (top): issue number + date on left, reading time on right
  - `text-sm`, `fg-tertiary`, `font-mono` for issue number
  - Date formatted with `Intl.DateTimeFormat` for locale-appropriate display
- Title: `font-serif`, `text-h3`, `fg-primary`, `mt-2`
  - Hover: `accent-teal`
- Excerpt: `text-sm`, `fg-secondary`, 2-line clamp, `mt-1`
- "Read Issue →": `text-sm`, `accent-teal`, right-aligned on desktop, below excerpt on mobile

### IssueNavigation

```
File: components/newsletter/IssueNavigation.tsx
Type: Server component
```

**Props:**

```typescript
interface IssueNavigationProps {
  prev?: {
    title: string;                  // Locale-resolved
    slug: { current: string };
    issueNumber: number;
  };
  next?: {
    title: string;
    slug: { current: string };
    issueNumber: number;
  };
  locale: string;
}
```

**Styling:**
- Container: `flex justify-between`, `border-t border-primary`, `py-8`, `mt-8`, `gap-8`
- Each side: `max-w-[45%]`
- Label ("← Previous Issue" / "Next Issue →"): `text-xs`, `fg-tertiary`, uppercase, `tracking-wider`
- Title: `text-sm`, `fg-primary`, hover `accent-teal`, 1-line clamp
- If only one direction exists, it aligns to its natural side (left for prev, right for next)
- Links wrap full width of their side for larger touch target

### NewsletterSubscribeBlock

```
File: components/newsletter/NewsletterSubscribeBlock.tsx
Type: Client component ("use client" — handles form submission)
```

This likely reuses your existing Beehiiv newsletter signup logic. If you already have a `NewsletterSignup` component on the homepage, this is a styled wrapper around the same functionality.

**Props:**

```typescript
interface NewsletterSubscribeBlockProps {
  heading: string;
  sub: string;
  buttonText: string;
  placeholder: string;
  locale: string;
}
```

**Styling:**
- Container: `bg-secondary`, `border border-primary`, `rounded-lg`, `p-6 md:p-8`, `max-w-narrow`, `mx-auto`, `text-center`
- Heading: `font-serif`, `text-h3`, `fg-primary`
- Sub: `text-sm`, `fg-secondary`, `mt-2`
- Form row: `flex gap-3`, `mt-4`. Input + button inline on desktop, stacked on mobile
- Input: existing `Input` component, `type="email"`, 16px font minimum
- Button: existing `Button` component, `variant="primary"`
- Success state: replace form with "You're in! Check your inbox." message, `accent-teal`
- Error state: show error below input in `text-sm`, red

**Beehiiv integration:** Uses the same `/api/newsletter/subscribe` route that exists for the homepage signup. No new API work needed.

---

## SEO & Metadata

### Archive Index

```typescript
// app/[locale]/newsletter/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'newsletter' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: locale === 'en' ? '/newsletter' : '/ja/newsletter',
      languages: { en: '/newsletter', ja: '/ja/newsletter' },
    },
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
      url: locale === 'en' ? '/newsletter' : '/ja/newsletter',
      locale: locale === 'en' ? 'en_US' : 'ja_JP',
      type: 'website',
    },
  };
}
```

### Individual Issue

```typescript
// app/[locale]/newsletter/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const issue = await sanityClient.fetch(newsletterIssueQuery, { slug });

  if (!issue) return {};

  const title = locale === 'en'
    ? `${issue.title_en} — Newsletter #${issue.issueNumber} | HonuVibe`
    : `${issue.title_jp || issue.title_en} — ニュースレター第${issue.issueNumber}号 | HonuVibe`;

  const description = locale === 'en'
    ? issue.excerpt_en
    : issue.excerpt_jp || issue.excerpt_en;

  return {
    title,
    description,
    alternates: {
      canonical: locale === 'en' ? `/newsletter/${slug}` : `/ja/newsletter/${slug}`,
      languages: {
        en: `/newsletter/${slug}`,
        ja: `/ja/newsletter/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: locale === 'en' ? `/newsletter/${slug}` : `/ja/newsletter/${slug}`,
      locale: locale === 'en' ? 'en_US' : 'ja_JP',
      type: 'article',
      publishedTime: issue.publishedAt,
    },
  };
}
```

### JSON-LD

**Index page** — `CollectionPage`:

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: t('title'),
  description: t('subtitle'),
  url: `https://honuvibe.ai${locale === 'en' ? '/newsletter' : '/ja/newsletter'}`,
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://honuvibe.ai' },
      { '@type': 'ListItem', position: 2, name: t('title'), item: `https://honuvibe.ai${locale === 'en' ? '/newsletter' : '/ja/newsletter'}` },
    ],
  },
};
```

**Issue page** — `Article`:

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: locale === 'en' ? issue.title_en : (issue.title_jp || issue.title_en),
  description: locale === 'en' ? issue.excerpt_en : (issue.excerpt_jp || issue.excerpt_en),
  datePublished: issue.publishedAt,
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
  url: `https://honuvibe.ai${locale === 'en' ? '' : '/ja'}/newsletter/${issue.slug.current}`,
  isPartOf: {
    '@type': 'CreativeWorkSeries',
    name: 'The HonuVibe Newsletter',
    url: `https://honuvibe.ai${locale === 'en' ? '/newsletter' : '/ja/newsletter'}`,
  },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://honuvibe.ai' },
      { '@type': 'ListItem', position: 2, name: locale === 'en' ? 'Newsletter' : 'ニュースレター', item: `https://honuvibe.ai${locale === 'en' ? '/newsletter' : '/ja/newsletter'}` },
      { '@type': 'ListItem', position: 3, name: `#${issue.issueNumber}` },
    ],
  },
};
```

### Static Generation

```typescript
// app/[locale]/newsletter/[slug]/page.tsx
export async function generateStaticParams() {
  const slugs = await sanityClient.fetch(newsletterSlugQuery);
  const locales = ['en', 'ja'];

  return locales.flatMap((locale) =>
    slugs.map((item: { slug: string }) => ({
      locale,
      slug: item.slug,
    }))
  );
}
```

### Sitemap

Add to `app/sitemap.ts`:

```typescript
// Newsletter index
{
  url: 'https://honuvibe.ai/newsletter',
  lastModified: new Date(),
  alternates: {
    languages: { en: 'https://honuvibe.ai/newsletter', ja: 'https://honuvibe.ai/ja/newsletter' },
  },
},

// Individual issues (dynamically generated)
...newsletterSlugs.map((slug: string) => ({
  url: `https://honuvibe.ai/newsletter/${slug}`,
  lastModified: new Date(),
  alternates: {
    languages: {
      en: `https://honuvibe.ai/newsletter/${slug}`,
      ja: `https://honuvibe.ai/ja/newsletter/${slug}`,
    },
  },
})),
```

---

## Analytics Events

| Event | Trigger | Props |
|---|---|---|
| `newsletter_archive_view` | Index page load | `locale`, `issue_count` |
| `newsletter_issue_view` | Individual issue page load | `issue_slug`, `issue_number`, `locale` |
| `newsletter_subscribe` | Subscribe form submitted (reuse existing event if already tracked) | `source_page`, `locale` |
| `newsletter_share` | Share button clicked | `issue_slug`, `platform`, `locale` |
| `newsletter_nav_click` | Prev/Next navigation used | `direction` (prev/next), `from_issue`, `to_issue`, `locale` |
| `newsletter_related_click` | Related blog or course link clicked | `issue_slug`, `target_type` (blog/course), `target_slug`, `locale` |
| `newsletter_beehiiv_click` | "View original email version" clicked | `issue_slug`, `locale` |
| `newsletter_cta_click` | Bottom "Explore Courses" CTA | `locale` |

---

## Mobile Behavior

| Element | Mobile (default) | Tablet (md) | Desktop (xl) |
|---|---|---|---|
| Subscribe block | Full width, stacked input/button | Centered, `max-w-narrow`, inline input/button | Same as tablet |
| Issue cards | Full width, stacked | Full width, stacked | Full width, stacked |
| Issue metadata row | Stacked (number+date above, reading time below) | Single row | Single row |
| Issue body | Full width with padding | `max-w-content` centered | `max-w-content` centered |
| Prev/Next nav | Stacked vertically | Side by side | Side by side |
| Share buttons | Centered row | Left-aligned row | Left-aligned row |

- All touch targets meet 44×44px minimum
- Subscribe email input is 16px font minimum (prevents iOS zoom)
- Body content images scale to container width on mobile
- Prev/Next on mobile: stack vertically with prev on top, next below. Full-width touch targets.

---

## Content: Launch Checklist

- [ ] Publish at least 5 most recent newsletter issues in Sanity
- [ ] Each issue has: title (EN), excerpt (EN), body (EN), issue number, publish date
- [ ] At least 2 issues have JP translations (title + excerpt minimum)
- [ ] Beehiiv URLs populated where available
- [ ] Reading times calculated and entered
- [ ] Related blog/course slugs linked where relevant
- [ ] Subscribe form connected to same Beehiiv endpoint as homepage

### Ongoing Workflow (Post-Launch)

After each Beehiiv newsletter send:

1. Open Sanity Studio
2. Create new Newsletter Issue document
3. Copy: title, body content (reformat Portable Text as needed), excerpt
4. Set: issue number (increment), publish date, reading time
5. Optional: paste Beehiiv web URL, add related blog/course slugs, add JP translation
6. Publish

**Estimated time per issue: 5 minutes.** If JP translation is added same day: 15-20 minutes with DeepL draft + review.

---

## Acceptance Criteria

- [ ] Sanity schema for `newsletterIssue` is deployed and content is enterable in Sanity Studio
- [ ] `/newsletter` index page renders with subscribe block, issue list, and CTA
- [ ] `/ja/newsletter` renders with Japanese UI strings
- [ ] `/newsletter/[slug]` renders full issue content with header, body, share, related, and prev/next nav
- [ ] `/ja/newsletter/[slug]` renders JP content where available, falls back to EN where not
- [ ] Subscribe form works and connects to Beehiiv (same integration as homepage)
- [ ] Prev/Next navigation correctly links adjacent issues
- [ ] Prev/Next handles edge cases (first issue has no prev, latest has no next)
- [ ] Share buttons work (X, LinkedIn, LINE, Copy Link)
- [ ] "View original email version" link opens Beehiiv URL in new tab (only when populated)
- [ ] Related blog/course links render only when slugs are populated
- [ ] Issue cards show correct locale-formatted dates
- [ ] `generateStaticParams` pre-generates all issue pages at build time
- [ ] `generateMetadata` produces correct title, description, OG, and hreflang for both locales
- [ ] JSON-LD `Article` schema on issue pages, `CollectionPage` on index
- [ ] All new pages in sitemap with locale alternates
- [ ] Redirects from `/emails` and `/archive` working
- [ ] Footer updated with "Newsletter" link in RESOURCES column
- [ ] All Plausible analytics events fire correctly
- [ ] Dark mode and light mode render correctly
- [ ] Minimum 5 issues loaded in Sanity
- [ ] Lighthouse mobile score: 90+
- [ ] Tested on iPhone Safari and Chrome Android

---

## Cross-Links to Future Features

Do not build now. Documented for future wiring.

| Future Feature | Connection Point |
|---|---|
| **Library** | Newsletter issues can reference Library videos; add `relatedLibraryVideoSlugs` field later |
| **Glossary** | Newsletter body content can link to glossary terms inline |
| **Templates** | If a newsletter references a downloadable resource, link to the Templates page |
| **Blog** | `relatedBlogSlugs` already supported — wire up blog post cards once blog is populated |
| **Courses** | `relatedCourseSlugs` already supported — wire up course cards |

---

*HonuVibe.AI — Feature Spec: Newsletter Archive v1.0 | Prepared for Ryan Jackson*

*Made in Hawaii with Aloha 🐢*
