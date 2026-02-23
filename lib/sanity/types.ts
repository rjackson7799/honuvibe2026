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
