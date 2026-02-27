// Library video TypeScript types
// Mirrors Supabase schema from supabase/migrations/005_library_videos.sql

import { resolveThumbnail } from '@/lib/library/youtube';

export type LibraryVideoCategory =
  | 'ai-basics'
  | 'coding-tools'
  | 'business-automation'
  | 'image-video'
  | 'productivity'
  | 'getting-started';

export type LibraryAccessTier = 'open' | 'free_account';
export type LibraryDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type LibraryVideoLanguage = 'en' | 'ja' | 'both';

export interface LibraryVideo {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  category: LibraryVideoCategory;
  language: LibraryVideoLanguage;
  access_tier: LibraryAccessTier;
  difficulty: LibraryDifficulty;
  related_course_id: string | null;
  related_resource_slug: string | null;
  related_glossary_slugs: string[] | null;
  tags: string[] | null;
  sort_order: number;
  is_featured: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserLibraryFavorite {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

export interface UserLibraryProgress {
  id: string;
  user_id: string;
  video_id: string;
  progress_percent: number;
  completed: boolean;
  last_watched_at: string;
  completed_at: string | null;
}

// Extended type with user state merged in
export interface LibraryVideoWithUserState extends LibraryVideo {
  isFavorited: boolean;
  isViewed: boolean;
  progressPercent: number;
}

// Props for the LibraryVideoCard component (locale-resolved)
export interface LibraryVideoCardProps {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  category: LibraryVideoCategory;
  difficulty: LibraryDifficulty;
  language: LibraryVideoLanguage;
  accessTier: LibraryAccessTier;
  isFeatured: boolean;
  // User state (defaults for unauthenticated)
  isFavorited: boolean;
  isViewed: boolean;
  progressPercent: number;
  // Context
  locale: string;
  isAuthenticated: boolean;
}

// Input type for creating a new library video (admin)
export interface LibraryVideoCreateInput {
  slug: string;
  title_en: string;
  title_jp?: string | null;
  description_en?: string | null;
  description_jp?: string | null;
  video_url: string;
  thumbnail_url?: string | null;
  duration_seconds: number;
  category: LibraryVideoCategory;
  language?: LibraryVideoLanguage;
  access_tier?: LibraryAccessTier;
  difficulty?: LibraryDifficulty;
  related_course_id?: string | null;
  related_resource_slug?: string | null;
  related_glossary_slugs?: string[] | null;
  tags?: string[] | null;
  sort_order?: number;
  is_featured?: boolean;
}

// Input type for updating an existing library video (admin)
export interface LibraryVideoUpdateInput extends Partial<LibraryVideoCreateInput> {
  is_published?: boolean;
  published_at?: string | null;
}

// Helper to resolve a LibraryVideo to locale-aware card props
export function resolveVideoCardProps(
  video: LibraryVideoWithUserState,
  locale: string,
  isAuthenticated: boolean,
): LibraryVideoCardProps {
  return {
    id: video.id,
    slug: video.slug,
    title: locale === 'ja' && video.title_jp ? video.title_jp : video.title_en,
    description:
      locale === 'ja' && video.description_jp
        ? video.description_jp
        : (video.description_en ?? ''),
    thumbnailUrl: resolveThumbnail(video.thumbnail_url, video.video_url),
    durationSeconds: video.duration_seconds,
    category: video.category,
    difficulty: video.difficulty,
    language: video.language,
    accessTier: video.access_tier,
    isFeatured: video.is_featured,
    isFavorited: video.isFavorited,
    isViewed: video.isViewed,
    progressPercent: video.progressPercent,
    locale,
    isAuthenticated,
  };
}
