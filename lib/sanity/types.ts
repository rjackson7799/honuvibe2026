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
