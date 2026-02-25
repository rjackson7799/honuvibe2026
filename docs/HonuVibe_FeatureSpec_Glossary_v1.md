# HonuVibe.AI — Feature Spec: AI Glossary
**Bilingual AI Dictionary — Build-Ready Implementation Guide**
*v1.0 | February 2026*

---

## Overview

The AI Glossary is a bilingual (EN/JP) reference of AI terminology written in plain language for beginners. Each term has its own page for SEO, with English and Japanese definitions, practical context, and cross-links to related content. This is an evergreen SEO traffic machine — beginners search these terms constantly, and a clean bilingual glossary is a genuine differentiator in the Japan market.

**No auth required. No database tables. Sanity-managed content. Individual term pages for SEO.**

---

## Routes

| Locale | URL | Description |
|---|---|---|
| EN | `/glossary` | Glossary index — all terms |
| EN | `/glossary/[slug]` | Individual term page |
| JP | `/ja/glossary` | Glossary index (Japanese) |
| JP | `/ja/glossary/[slug]` | Individual term page (Japanese) |

### Redirects

Add to `next.config.ts` redirects array:

```typescript
{ source: '/dictionary', destination: '/glossary', permanent: true },
{ source: '/ja/dictionary', destination: '/ja/glossary', permanent: true },
{ source: '/ai-glossary', destination: '/glossary', permanent: true },
{ source: '/ja/ai-glossary', destination: '/ja/glossary', permanent: true },
```

---

## Footer Placement

Add "AI Glossary" to the **RESOURCES** column in the footer, directly below "Resources":

```
NAVIGATE              RESOURCES            LEGAL
HonuHub               Resources            Privacy Policy
Explore               AI Glossary          Terms of Service
Learn                 Blog                 Cookie Notice
Community             About
                      Contact
```

**Implementation:** Update your `Footer` component to include the new link. The link text should come from i18n strings (see §i18n section below). Route: `/${locale}/glossary`.

---

## Sanity Schema

### glossaryTerm

```typescript
// sanity/schemas/glossaryTerm.ts
import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'glossaryTerm',
  title: 'Glossary Term',
  type: 'document',
  fields: [
    defineField({
      name: 'term_en',
      title: 'Term (English)',
      type: 'string',
      description: 'The term as it appears in English. E.g., "Large Language Model"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'term_jp',
      title: 'Term (Japanese)',
      type: 'string',
      description: 'The term in Japanese. E.g., "大規模言語モデル"',
    }),
    defineField({
      name: 'abbreviation',
      title: 'Abbreviation',
      type: 'string',
      description: 'Common abbreviation if one exists. E.g., "LLM", "RAG", "API"',
    }),
    defineField({
      name: 'reading_jp',
      title: 'Japanese Reading',
      type: 'string',
      description: 'Katakana/hiragana reading for search and accessibility. E.g., "エルエルエム" for LLM.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: (doc) => {
          // Use abbreviation if it exists, otherwise the English term
          return (doc.abbreviation as string) || (doc.term_en as string);
        },
        maxLength: 96,
        slugify: (input: string) =>
          input.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 96),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'definition_short_en',
      title: 'Short Definition (EN)',
      type: 'text',
      rows: 2,
      description: 'One-sentence plain-language definition. Shown on the index page card. Max 150 chars.',
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'definition_short_jp',
      title: 'Short Definition (JP)',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'definition_full_en',
      title: 'Full Definition (EN)',
      type: 'blockContent',
      description: 'Detailed explanation in plain language. 2-3 paragraphs. This is the main content of the term page.',
    }),
    defineField({
      name: 'definition_full_jp',
      title: 'Full Definition (JP)',
      type: 'blockContent',
    }),
    defineField({
      name: 'why_it_matters_en',
      title: 'Why It Matters (EN)',
      type: 'text',
      rows: 3,
      description: 'Practical context: why should an entrepreneur or business owner care about this concept?',
    }),
    defineField({
      name: 'why_it_matters_jp',
      title: 'Why It Matters (JP)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'example_en',
      title: 'Example in Practice (EN)',
      type: 'text',
      rows: 3,
      description: 'A concrete, real-world example of this concept in action.',
    }),
    defineField({
      name: 'example_jp',
      title: 'Example in Practice (JP)',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Core Concepts', value: 'core-concepts' },
          { title: 'Models & Architecture', value: 'models-architecture' },
          { title: 'Tools & Platforms', value: 'tools-platforms' },
          { title: 'Business & Strategy', value: 'business-strategy' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'difficulty',
      title: 'Difficulty',
      type: 'string',
      options: {
        list: [
          { title: 'Beginner', value: 'beginner' },
          { title: 'Intermediate', value: 'intermediate' },
          { title: 'Advanced', value: 'advanced' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'relatedTerms',
      title: 'Related Terms',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'glossaryTerm' }] }],
      description: 'Other glossary terms that are closely related. These appear as links on the term page.',
    }),
    defineField({
      name: 'relatedCourseSlug',
      title: 'Related Course Slug',
      type: 'string',
      description: 'Slug of a course that teaches this concept (if any).',
    }),
    defineField({
      name: 'relatedBlogSlug',
      title: 'Related Blog Post Slug',
      type: 'string',
      description: 'Slug of a blog post that covers this topic (if any).',
    }),
    defineField({
      name: 'relatedLibraryVideoSlug',
      title: 'Related Library Video Slug',
      type: 'string',
      description: 'Slug of a Library video explaining this concept (if any).',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order Override',
      type: 'number',
      description: 'Override alphabetical sort. Lower numbers appear first. Leave empty for default alphabetical.',
    }),
    defineField({
      name: 'isPublished',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  orderings: [
    { title: 'Alphabetical (EN)', name: 'termAZ', by: [{ field: 'term_en', direction: 'asc' }] },
    { title: 'Category', name: 'category', by: [{ field: 'category', direction: 'asc' }, { field: 'term_en', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'term_en',
      subtitle: 'category',
      abbreviation: 'abbreviation',
    },
    prepare({ title, subtitle, abbreviation }) {
      return {
        title: abbreviation ? `${title} (${abbreviation})` : title,
        subtitle: subtitle,
      };
    },
  },
});
```

**Register the schema** in your Sanity schema index file alongside `resource`, `influencer`, and `blogPost`.

---

## GROQ Queries

```typescript
// lib/sanity/queries.ts (add to existing file)

// All published terms for the index page — lightweight, no full definitions
export const glossaryIndexQuery = `*[_type == "glossaryTerm" && isPublished == true] | order(term_en asc) {
  term_en,
  term_jp,
  abbreviation,
  reading_jp,
  slug,
  definition_short_en,
  definition_short_jp,
  category,
  difficulty
}`;

// Single term by slug — full content for the term page
export const glossaryTermQuery = `*[_type == "glossaryTerm" && slug.current == $slug && isPublished == true][0] {
  term_en,
  term_jp,
  abbreviation,
  reading_jp,
  slug,
  definition_short_en,
  definition_short_jp,
  definition_full_en,
  definition_full_jp,
  why_it_matters_en,
  why_it_matters_jp,
  example_en,
  example_jp,
  category,
  difficulty,
  relatedTerms[]-> {
    term_en,
    term_jp,
    abbreviation,
    slug,
    definition_short_en,
    definition_short_jp,
    difficulty
  },
  relatedCourseSlug,
  relatedBlogSlug,
  relatedLibraryVideoSlug
}`;

// All slugs for generateStaticParams
export const glossarySlugQuery = `*[_type == "glossaryTerm" && isPublished == true] {
  "slug": slug.current
}`;
```

---

## i18n Strings

Add to `messages/en.json`:

```json
{
  "glossary": {
    "title": "AI Glossary",
    "subtitle": "Plain-language definitions for the AI era. Every term explained for real people, not researchers.",
    "meta_title": "AI Glossary — Plain-Language AI Definitions | HonuVibe",
    "meta_description": "Clear, beginner-friendly definitions of AI terms like LLM, RAG, fine-tuning, and more. Bilingual English and Japanese.",
    "search_placeholder": "Search terms...",
    "filter_all": "All",
    "filter_core": "Core Concepts",
    "filter_models": "Models & Architecture",
    "filter_tools": "Tools & Platforms",
    "filter_business": "Business & Strategy",
    "difficulty_beginner": "Beginner",
    "difficulty_intermediate": "Intermediate",
    "difficulty_advanced": "Advanced",
    "why_it_matters": "Why It Matters",
    "example": "Example in Practice",
    "related_terms": "Related Terms",
    "learn_more": "Go Deeper",
    "learn_more_course": "Related Course",
    "learn_more_blog": "Related Article",
    "learn_more_video": "Watch Tutorial",
    "back_to_glossary": "← Back to Glossary",
    "empty_state": "No terms match your search. Try a different keyword.",
    "cta_heading": "Want to understand AI, not just define it?",
    "cta_sub": "Our courses teach you to build with these concepts, not just memorize them.",
    "cta_button": "Explore Courses",
    "term_count": "{count} terms",
    "footer_link": "AI Glossary"
  }
}
```

Add to `messages/ja.json`:

```json
{
  "glossary": {
    "title": "AI用語辞典",
    "subtitle": "AIの時代に必要な用語を、わかりやすい言葉で解説します。",
    "meta_title": "AI用語辞典 — わかりやすいAI用語解説 | HonuVibe",
    "meta_description": "LLM、RAG、ファインチューニングなど、AI用語をわかりやすく解説。英語・日本語バイリンガル対応。",
    "search_placeholder": "用語を検索...",
    "filter_all": "すべて",
    "filter_core": "基本概念",
    "filter_models": "モデル・アーキテクチャ",
    "filter_tools": "ツール・プラットフォーム",
    "filter_business": "ビジネス・戦略",
    "difficulty_beginner": "初級",
    "difficulty_intermediate": "中級",
    "difficulty_advanced": "上級",
    "why_it_matters": "なぜ重要か",
    "example": "実際の活用例",
    "related_terms": "関連用語",
    "learn_more": "さらに学ぶ",
    "learn_more_course": "関連コース",
    "learn_more_blog": "関連記事",
    "learn_more_video": "チュートリアルを見る",
    "back_to_glossary": "← 用語辞典に戻る",
    "empty_state": "該当する用語が見つかりません。別のキーワードをお試しください。",
    "cta_heading": "AIを定義だけでなく、理解したいですか？",
    "cta_sub": "HonuVibeのコースでは、これらの概念を暗記するのではなく、実際に使いこなす方法を学べます。",
    "cta_button": "コースを見る",
    "term_count": "{count}件の用語",
    "footer_link": "AI用語辞典"
  }
}
```

**Footer link i18n:** Update your footer component to use `t('glossary.footer_link')` for the link text.

---

## File Structure

```
app/
├── [locale]/
│   ├── glossary/
│   │   ├── page.tsx                    # Glossary index
│   │   └── [slug]/
│   │       └── page.tsx                # Individual term page

components/
├── glossary/
│   ├── GlossaryTermCard.tsx            # Card for index page
│   ├── GlossarySearch.tsx              # Search + category filter (client component)
│   ├── GlossaryAlphaNav.tsx            # A-Z letter jump navigation
│   ├── RelatedTerms.tsx                # Related terms links on term page
│   └── DifficultyBadge.tsx             # Beginner/Intermediate/Advanced badge
```

---

## Page Implementation: Glossary Index

### `app/[locale]/glossary/page.tsx`

```
Data fetching: Server component. Fetch all terms from Sanity via glossaryIndexQuery (ISR, 60s revalidation).
Pass terms array to client components for filtering and search.
```

**Page structure (top to bottom):**

1. **SectionHeading**
   - Overline: "GLOSSARY" / "用語辞典"
   - Heading: `t('glossary.title')`
   - Sub: `t('glossary.subtitle')`
   - Term count badge: `t('glossary.term_count', { count: terms.length })`

2. **GlossarySearch** (client component)
   - Search input + category filter pills in a single row
   - Search: text input, filters terms by `term_en`, `term_jp`, `abbreviation`, `reading_jp`, and `definition_short` in real-time
   - Category pills: All | Core Concepts | Models & Architecture | Tools & Platforms | Business & Strategy
   - Both filters apply simultaneously (search within category)

3. **GlossaryAlphaNav**
   - Horizontal row of letters A–Z
   - Each letter is a jump link (anchor) to the first term starting with that letter
   - Letters with no matching terms are rendered in `fg-muted` and not clickable
   - Sticky on desktop (below nav), hidden on mobile (scrolling is sufficient)
   - On JP locale: still shows A–Z (most AI terms use English/katakana even in Japanese contexts)

4. **Term list**
   - Grouped by first letter with letter headings (e.g., **A**, **B**, **C**)
   - Each letter group has an `id` anchor for the alpha nav (e.g., `id="letter-a"`)
   - Within each group: terms rendered as `GlossaryTermCard`
   - 1-column stack on all breakpoints (glossary is a vertical scan, not a grid)
   - If search/filter returns 0 results: show `t('glossary.empty_state')`

5. **CTAStrip** (existing reusable component)
   - Heading: `t('glossary.cta_heading')`
   - Sub: `t('glossary.cta_sub')`
   - Button: `t('glossary.cta_button')` → `/learn`

---

## Page Implementation: Individual Term

### `app/[locale]/glossary/[slug]/page.tsx`

```
Data fetching: Server component. Fetch term from Sanity via glossaryTermQuery with slug param.
Static generation: Use generateStaticParams with glossarySlugQuery for all published slugs.
ISR: 60s revalidation.
404: If term not found, return notFound().
```

**Page structure (top to bottom):**

1. **Back link**
   - `t('glossary.back_to_glossary')` — "← Back to Glossary"
   - Links to `/glossary` (or `/ja/glossary`)
   - `text-sm`, `fg-secondary`, hover `accent-teal`

2. **Term header**
   - Term name: `font-serif`, `text-h1`, `fg-primary`
   - If abbreviation exists: show in parentheses after the term, `fg-tertiary`
   - JP term displayed below EN term (both always visible, regardless of locale): `font-jp`, `text-h3`, `fg-secondary`
   - If `reading_jp` exists: shown in parentheses next to JP term, `fg-tertiary`, `text-base`
   - `DifficultyBadge` + category tag inline, below the term names
   - Layout: left-aligned, generous vertical spacing

3. **Full definition**
   - Rendered from Portable Text (`definition_full_en` or `definition_full_jp` based on locale)
   - Standard prose styling: `fg-secondary`, `text-base`, `leading-relaxed` (EN) / `leading-loose` (JP)
   - If the non-active locale definition exists, do NOT show it here — the language toggle handles locale switching

4. **"Why It Matters" section** (only if field is populated)
   - Overline: `t('glossary.why_it_matters')`
   - Body: `why_it_matters_en` or `why_it_matters_jp` based on locale
   - Styled as a subtle callout: `bg-tertiary`, `rounded-lg`, `p-6`, `border-l-2 border-accent-teal`

5. **"Example in Practice" section** (only if field is populated)
   - Overline: `t('glossary.example')`
   - Body: `example_en` or `example_jp` based on locale
   - Same callout styling but with `border-accent-gold` instead

6. **Related Terms** (only if `relatedTerms` array is non-empty)
   - Heading: `t('glossary.related_terms')`
   - Horizontal row of linked term chips (on mobile: wrap to multiple lines)
   - Each chip shows: term name (+ abbreviation if exists), difficulty badge
   - Clicking a chip navigates to that term's page

7. **"Go Deeper" section** (only if any related slugs are populated)
   - Heading: `t('glossary.learn_more')`
   - Conditional links:
     - If `relatedCourseSlug`: show `t('glossary.learn_more_course')` → `/learn/[slug]`
     - If `relatedBlogSlug`: show `t('glossary.learn_more_blog')` → `/blog/[slug]`
     - If `relatedLibraryVideoSlug`: show `t('glossary.learn_more_video')` → `/learn/library/[slug]`
   - Each link styled as a card-like row with icon + label + arrow

8. **CTAStrip** (reused)
   - Same as index page CTA

---

## Component Specifications

### GlossaryTermCard

```
File: components/glossary/GlossaryTermCard.tsx
Type: Server component (receives pre-filtered data)
```

**Visual structure:**

```
┌──────────────────────────────────────────────────┐
│  LLM                              [Beginner] badge│
│  Large Language Model                              │
│  大規模言語モデル                                    │
│                                                    │
│  A type of AI model trained on massive amounts     │
│  of text data that can understand and generate...  │
└──────────────────────────────────────────────────┘
```

**Props:**

```typescript
interface GlossaryTermCardProps {
  term_en: string;
  term_jp?: string;
  abbreviation?: string;
  slug: { current: string };
  definition_short: string;       // Locale-resolved by parent
  category: string;
  difficulty: string;
  locale: string;
}
```

**Styling:**
- Container: full-width row, `py-4`, `border-b border-secondary`. No card background — clean list aesthetic
- Entire row is a link to `/glossary/[slug]` (or `/ja/glossary/[slug]`)
- Hover: `bg-tertiary` subtle background, smooth transition
- Term name: `font-sans`, `text-base`, `font-medium`, `fg-primary`
  - If abbreviation: show as the primary display, full term in `fg-tertiary` next to it
  - E.g., **LLM** · Large Language Model
- JP term: `font-jp`, `text-sm`, `fg-tertiary`, shown on a second line
- Short definition: `text-sm`, `fg-secondary`, 2-line clamp on mobile, 1-line on desktop
- `DifficultyBadge`: aligned right on desktop, below term on mobile

### GlossarySearch

```
File: components/glossary/GlossarySearch.tsx
Type: Client component ("use client")
```

**Behavior:**
- Combined search input + category filter pills
- Search is instant (client-side filtering, no API calls — full term list is already on page)
- Search matches against: `term_en`, `term_jp`, `abbreviation`, `reading_jp`, `definition_short_en`, `definition_short_jp`
- Search is case-insensitive
- Category filter + search work simultaneously
- Debounce search input by 150ms to avoid excessive re-renders
- Communicate filtered results to parent via callback or manage state internally and render the list

**Props:**

```typescript
interface GlossarySearchProps {
  terms: GlossaryTerm[];           // Full list from Sanity
  locale: string;
  onFilteredTermsChange: (filtered: GlossaryTerm[]) => void;
  translations: {
    searchPlaceholder: string;
    filterAll: string;
    filterCore: string;
    filterModels: string;
    filterTools: string;
    filterBusiness: string;
    emptyState: string;
  };
}
```

**Layout:**
- Search input: full-width on mobile, `max-w-sm` on desktop. Left-aligned
- Filter pills: below search on mobile, inline right of search on desktop
- Uses the same pill styling as Resources filter (consistency)

### GlossaryAlphaNav

```
File: components/glossary/GlossaryAlphaNav.tsx
Type: Client component (needs scroll-to behavior)
```

**Behavior:**
- Renders A–Z as clickable letters
- Clicking a letter smooth-scrolls to the `#letter-{x}` anchor
- Letters with no terms in the current filtered set: `fg-muted`, `pointer-events-none`
- Desktop: sticky below the nav bar (`position: sticky`, `top: 64px` to clear nav height), `z-index: 100`
- Mobile: hidden entirely (`hidden md:flex`). Mobile users scroll naturally
- Updates active letter state based on scroll position (IntersectionObserver on each letter heading)

**Styling:**
- Container: `flex gap-1`, `justify-center`, `py-3`, `bg-primary` with subtle bottom border
- Each letter: `w-8 h-8`, `flex items-center justify-center`, `rounded`, `text-sm`, `font-mono`
- Active (in viewport): `accent-teal`, `bg-accent-teal-subtle`
- Inactive with terms: `fg-secondary`, hover `fg-primary`
- Inactive without terms: `fg-muted`

### DifficultyBadge

```
File: components/glossary/DifficultyBadge.tsx
Type: Server component
```

**Props:**

```typescript
interface DifficultyBadgeProps {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  locale: string;
}
```

**Styling:**
- Uses the existing `Tag` component pattern
- Beginner: `accent-teal` subtle bg, `accent-teal` text
- Intermediate: `accent-gold` subtle bg, `accent-gold` text
- Advanced: `bg-tertiary`, `fg-secondary`
- Size: `text-xs`, `px-2 py-0.5`

### RelatedTerms

```
File: components/glossary/RelatedTerms.tsx
Type: Server component
```

**Props:**

```typescript
interface RelatedTermsProps {
  terms: Array<{
    term_en: string;
    term_jp?: string;
    abbreviation?: string;
    slug: { current: string };
    difficulty: string;
  }>;
  locale: string;
}
```

**Styling:**
- `flex flex-wrap gap-2`
- Each term rendered as a chip/pill: `border border-primary`, `rounded-full`, `px-3 py-1.5`
- Shows abbreviation or term name, `text-sm`, `fg-secondary`
- Hover: `border-accent`, `accent-teal` text
- Links to `/glossary/[slug]`

---

## SEO & Metadata

### Glossary Index

```typescript
// app/[locale]/glossary/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'glossary' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: locale === 'en' ? '/glossary' : '/ja/glossary',
      languages: { en: '/glossary', ja: '/ja/glossary' },
    },
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
      url: locale === 'en' ? '/glossary' : '/ja/glossary',
      locale: locale === 'en' ? 'en_US' : 'ja_JP',
      type: 'website',
    },
  };
}
```

### Individual Term Page

```typescript
// app/[locale]/glossary/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const term = await sanityClient.fetch(glossaryTermQuery, { slug });

  if (!term) return {};

  const title = locale === 'en'
    ? `${term.abbreviation || term.term_en} — AI Glossary | HonuVibe`
    : `${term.term_jp || term.term_en} — AI用語辞典 | HonuVibe`;

  const description = locale === 'en'
    ? term.definition_short_en
    : term.definition_short_jp || term.definition_short_en;

  return {
    title,
    description,
    alternates: {
      canonical: locale === 'en' ? `/glossary/${slug}` : `/ja/glossary/${slug}`,
      languages: {
        en: `/glossary/${slug}`,
        ja: `/ja/glossary/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: locale === 'en' ? `/glossary/${slug}` : `/ja/glossary/${slug}`,
      locale: locale === 'en' ? 'en_US' : 'ja_JP',
      type: 'article',
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
  url: `https://honuvibe.ai${locale === 'en' ? '/glossary' : '/ja/glossary'}`,
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://honuvibe.ai' },
      { '@type': 'ListItem', position: 2, name: t('title'), item: `https://honuvibe.ai${locale === 'en' ? '/glossary' : '/ja/glossary'}` },
    ],
  },
};
```

**Term page** — `DefinedTerm` (this is the SEO power move — enables rich results for definitions):

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  name: term.abbreviation || term.term_en,
  description: locale === 'en' ? term.definition_short_en : (term.definition_short_jp || term.definition_short_en),
  inDefinedTermSet: {
    '@type': 'DefinedTermSet',
    name: 'HonuVibe AI Glossary',
    url: 'https://honuvibe.ai/glossary',
  },
  url: `https://honuvibe.ai${locale === 'en' ? '' : '/ja'}/glossary/${term.slug.current}`,
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://honuvibe.ai' },
      { '@type': 'ListItem', position: 2, name: locale === 'en' ? 'AI Glossary' : 'AI用語辞典', item: `https://honuvibe.ai${locale === 'en' ? '/glossary' : '/ja/glossary'}` },
      { '@type': 'ListItem', position: 3, name: term.abbreviation || term.term_en },
    ],
  },
};
```

### Static Generation

```typescript
// app/[locale]/glossary/[slug]/page.tsx
export async function generateStaticParams() {
  const slugs = await sanityClient.fetch(glossarySlugQuery);
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
// Glossary index
{
  url: 'https://honuvibe.ai/glossary',
  lastModified: new Date(),
  alternates: {
    languages: { en: 'https://honuvibe.ai/glossary', ja: 'https://honuvibe.ai/ja/glossary' },
  },
},

// Individual term pages (dynamically generated)
...glossaryTermSlugs.map((slug: string) => ({
  url: `https://honuvibe.ai/glossary/${slug}`,
  lastModified: new Date(),
  alternates: {
    languages: {
      en: `https://honuvibe.ai/glossary/${slug}`,
      ja: `https://honuvibe.ai/ja/glossary/${slug}`,
    },
  },
})),
```

---

## Analytics Events

| Event | Trigger | Props |
|---|---|---|
| `glossary_view` | Index page load | `locale`, `term_count` |
| `glossary_search` | Search input used (fire on debounced change, not per keystroke) | `search_query`, `results_count`, `locale` |
| `glossary_filter` | Category filter changed | `category`, `locale` |
| `glossary_term_view` | Individual term page load | `term_slug`, `category`, `difficulty`, `locale` |
| `glossary_related_click` | Related term chip clicked | `source_term`, `target_term`, `locale` |
| `glossary_course_click` | "Related Course" link clicked | `term_slug`, `course_slug`, `locale` |
| `glossary_cta_click` | Bottom "Explore Courses" CTA | `source_page`, `locale` |

---

## Mobile Behavior

| Element | Mobile (default) | Tablet (md) | Desktop (xl) |
|---|---|---|---|
| Alpha nav | Hidden | Visible, sticky | Visible, sticky |
| Search input | Full width | `max-w-sm` left-aligned | `max-w-sm` left-aligned |
| Filter pills | Below search, horizontal scroll | Inline with search | Inline with search |
| Term cards | Full width, stacked | Full width, stacked | Full width, stacked |
| Term page "Why/Example" callouts | Full width | Full width | `max-w-content` (880px) |
| Related term chips | Wrap to multiple lines | Single row if fits | Single row |
| Difficulty badge | Below term name | Right-aligned | Right-aligned |

- Term card is a single full-width row — glossaries are vertical scan patterns, not grids
- All touch targets meet 44×44px minimum
- Search input is 16px font minimum (prevents iOS zoom)

---

## Content: Initial Seed Data (40 Terms)

Ryan populates through Sanity Studio. Below is the suggested launch set organized by category.

### Core Concepts (15 terms)

| Term | Abbreviation | Difficulty |
|---|---|---|
| Artificial Intelligence | AI | Beginner |
| Machine Learning | ML | Beginner |
| Deep Learning | — | Intermediate |
| Neural Network | — | Intermediate |
| Large Language Model | LLM | Beginner |
| Natural Language Processing | NLP | Intermediate |
| Prompt | — | Beginner |
| Prompt Engineering | — | Beginner |
| Token | — | Beginner |
| Context Window | — | Intermediate |
| Hallucination | — | Beginner |
| Temperature | — | Intermediate |
| Inference | — | Intermediate |
| Training Data | — | Beginner |
| Bias (in AI) | — | Intermediate |

### Models & Architecture (10 terms)

| Term | Abbreviation | Difficulty |
|---|---|---|
| Transformer | — | Advanced |
| GPT (Generative Pre-trained Transformer) | GPT | Intermediate |
| Fine-tuning | — | Intermediate |
| Retrieval-Augmented Generation | RAG | Intermediate |
| Embedding | — | Advanced |
| Vector Database | — | Advanced |
| Agent | — | Intermediate |
| Model Context Protocol | MCP | Intermediate |
| Multimodal | — | Intermediate |
| Open Source vs Closed Source (AI Models) | — | Beginner |

### Tools & Platforms (10 terms)

| Term | Abbreviation | Difficulty |
|---|---|---|
| ChatGPT | — | Beginner |
| Claude | — | Beginner |
| Gemini | — | Beginner |
| Midjourney | — | Beginner |
| Stable Diffusion | — | Intermediate |
| Cursor | — | Beginner |
| GitHub Copilot | — | Beginner |
| API (Application Programming Interface) | API | Beginner |
| Webhook | — | Intermediate |
| N8N / Workflow Automation | — | Beginner |

### Business & Strategy (5 terms)

| Term | Abbreviation | Difficulty |
|---|---|---|
| AI Strategy | — | Beginner |
| Automation | — | Beginner |
| Micro-SaaS | — | Intermediate |
| AI Integration | — | Beginner |
| ROI of AI | — | Intermediate |

**JP translations:** Write the short definitions in both EN and JP for all 40 terms at launch. Full definitions (`definition_full_jp`, `why_it_matters_jp`, `example_jp`) can be added progressively — the page renders cleanly even when JP full definitions are missing (it falls back to EN content or simply omits the section).

---

## Acceptance Criteria

The feature is complete when:

- [ ] Sanity schema for `glossaryTerm` is deployed and content is enterable in Sanity Studio
- [ ] `/glossary` index page renders with all sections (heading, search, alpha nav, term list, CTA)
- [ ] `/ja/glossary` renders with Japanese UI strings
- [ ] `/glossary/[slug]` term pages render with full content, "Why It Matters," "Example," related terms, and "Go Deeper" links
- [ ] `/ja/glossary/[slug]` renders JP content where available, falls back gracefully where not
- [ ] Search filters terms in real-time across EN and JP fields
- [ ] Category filter pills work, combinable with search
- [ ] Alpha nav letters are clickable and smooth-scroll to the correct section
- [ ] Alpha nav letters with no terms are visually muted and not clickable
- [ ] Alpha nav is hidden on mobile, sticky on desktop
- [ ] DifficultyBadge renders correct colors for each level
- [ ] Related terms chips link to the correct term pages
- [ ] "Go Deeper" links only render when the corresponding slug is populated
- [ ] `generateStaticParams` pre-generates all term pages at build time
- [ ] `generateMetadata` produces correct title, description, OG, and hreflang for both locales on both page types
- [ ] JSON-LD `DefinedTerm` schema is present and valid on term pages
- [ ] JSON-LD `CollectionPage` schema is present on index page
- [ ] All new pages included in sitemap with locale alternates
- [ ] Redirects from `/dictionary` and `/ai-glossary` working
- [ ] Footer updated with "AI Glossary" link in RESOURCES column
- [ ] All Plausible analytics events fire correctly
- [ ] Section reveal animations work on scroll
- [ ] Dark mode and light mode render correctly
- [ ] Minimum 40 terms loaded in Sanity with EN short definitions
- [ ] Minimum 20 terms have JP short definitions
- [ ] Lighthouse mobile score: 90+
- [ ] Tested on iPhone Safari and Chrome Android

---

## Cross-Links to Future Features

Do not build these now. Documented for future wiring.

| Future Feature | Connection Point |
|---|---|
| **Library** | `relatedLibraryVideoSlug` links become active once Library pages exist |
| **Blog** | `relatedBlogSlug` links connect terms to relevant blog posts |
| **Resources** | Resource tool descriptions can link inline to glossary terms (e.g., "LLM" links to `/glossary/llm`) |
| **Comparisons** | Comparison pages can link to glossary definitions for technical terms |
| **Industry Pages** | Industry pages reference glossary terms when explaining AI concepts for that vertical |
| **Courses** | Course descriptions can link to glossary terms for prerequisite knowledge |

---

*HonuVibe.AI — Feature Spec: AI Glossary v1.0 | Prepared for Ryan Jackson*

*Made in Hawaii with Aloha 🐢*
