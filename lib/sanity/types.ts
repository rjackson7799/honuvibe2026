export type SanityImage = {
  _type: 'image';
  asset: {
    _ref: string;
    _type: 'reference';
  };
  alt?: string;
};

export type Author = {
  name: string;
  image?: SanityImage;
  bio?: string;
};

export type BlogCategory =
  | 'ai-tools'
  | 'entrepreneurship'
  | 'japan-us'
  | 'behind-the-build'
  | 'honuhub-stories'
  | 'impact';

import type { PortableTextBlock } from '@portabletext/react';

export type BlogPost = {
  _id: string;
  title_en: string;
  title_jp?: string;
  slug: { current: string };
  body_en?: PortableTextBlock[];
  body_jp?: PortableTextBlock[];
  excerpt_en: string;
  excerpt_jp?: string;
  category: BlogCategory;
  featured_image?: SanityImage;
  author?: Author;
  published_at: string;
  reading_time_en?: number;
  reading_time_jp?: number;
};

export type BlogPostSummary = Omit<BlogPost, 'body_en' | 'body_jp'>;

// Resources page types
export type ResourceCategory = 'build' | 'create' | 'learn' | 'business' | 'communicate';
export type ResourcePricing = 'free' | 'freemium' | 'paid';

export type Resource = {
  name: string;
  slug: { current: string };
  description_en: string;
  description_jp?: string;
  category: ResourceCategory;
  pricing: ResourcePricing;
  url: string;
  logoUrl?: string;
  relatedLibraryVideoSlug?: string;
  relatedCourseSlug?: string;
  isFeatured: boolean;
  sortOrder: number;
};

export type InfluencerPlatform = {
  platform: string;
  url: string;
};

export type Influencer = {
  name: string;
  slug: { current: string };
  description_en: string;
  description_jp?: string;
  avatarUrl?: string;
  platforms: InfluencerPlatform[];
  specialty?: string;
  sortOrder: number;
};

// ── Glossary ──────────────────────────────────────────────────────────────────

export type GlossaryCategory =
  | 'core-concepts'
  | 'models-architecture'
  | 'tools-platforms'
  | 'business-strategy';

export type GlossaryDifficulty = 'beginner' | 'intermediate' | 'advanced';

/** Lightweight shape returned by glossaryIndexQuery (index page only) */
export type GlossaryTermSummary = {
  term_en: string;
  term_jp?: string;
  abbreviation?: string;
  reading_jp?: string;
  slug: { current: string };
  definition_short_en: string;
  definition_short_jp?: string;
  category: GlossaryCategory;
  difficulty: GlossaryDifficulty;
};

/** Related term reference resolved by Sanity -> operator */
export type GlossaryTermRef = {
  term_en: string;
  term_jp?: string;
  abbreviation?: string;
  slug: { current: string };
  definition_short_en: string;
  definition_short_jp?: string;
  difficulty: GlossaryDifficulty;
};

/** Full shape returned by glossaryTermQuery (detail page) */
export type GlossaryTerm = GlossaryTermSummary & {
  definition_full_en?: PortableTextBlock[];
  definition_full_jp?: PortableTextBlock[];
  why_it_matters_en?: string;
  why_it_matters_jp?: string;
  example_en?: string;
  example_jp?: string;
  relatedTerms?: GlossaryTermRef[];
  relatedCourseSlug?: string;
  relatedBlogSlug?: string;
  relatedLibraryVideoSlug?: string;
};

// ── Newsletter Archive ───────────────────────────────────────────────────────

/** Full shape returned by newsletterIssueQuery (detail page) */
export type NewsletterIssue = {
  title_en: string;
  title_jp?: string;
  slug: { current: string };
  issueNumber: number;
  excerpt_en: string;
  excerpt_jp?: string;
  body_en?: PortableTextBlock[];
  body_jp?: PortableTextBlock[];
  publishedAt: string;
  readingTime_en?: number;
  readingTime_jp?: number;
  beehiivUrl?: string;
  featuredImageUrl?: string;
  relatedBlogSlugs?: string[];
  relatedCourseSlugs?: string[];
};

/** Lightweight shape returned by newsletterIndexQuery (index page only) */
export type NewsletterIssueSummary = Omit<
  NewsletterIssue,
  'body_en' | 'body_jp' | 'beehiivUrl' | 'featuredImageUrl' | 'relatedBlogSlugs' | 'relatedCourseSlugs'
>;

/** Adjacent issue references for prev/next navigation */
export type NewsletterAdjacent = {
  prev?: {
    title_en: string;
    title_jp?: string;
    slug: { current: string };
    issueNumber: number;
  };
  next?: {
    title_en: string;
    title_jp?: string;
    slug: { current: string };
    issueNumber: number;
  };
};
