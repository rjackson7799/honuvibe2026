// Content Library types (Phase 2B — defined now for schema alignment)

export type ContentType =
  | 'video_custom'
  | 'video_youtube'
  | 'article'
  | 'tool'
  | 'template'
  | 'guide'
  | 'course_recording';

export type ContentSource = 'honuvibe' | 'youtube' | 'external';
export type ContentDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ContentLanguage = 'en' | 'ja' | 'both';
export type AccessTier = 'free' | 'premium';
export type TagCategory = 'topic' | 'tool' | 'skill' | 'industry' | 'format';

export interface ContentItem {
  id: string;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  content_type: ContentType;
  url: string;
  source: ContentSource;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  author_name: string | null;
  publish_date: string | null;
  difficulty_level: ContentDifficulty;
  language: ContentLanguage;
  tags: string[];
  access_tier: AccessTier;
  source_course_id: string | null;
  source_session_id: string | null;
  admin_notes: string | null;
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  usage_in_paths: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  slug: string;
  name_en: string;
  name_jp: string | null;
  category: TagCategory | null;
  usage_count: number;
  created_at: string;
}

export interface ContentCollection {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

export interface ContentCollectionItem {
  id: string;
  collection_id: string;
  content_item_id: string;
  sort_order: number;
  note_en: string | null;
  note_jp: string | null;
}
