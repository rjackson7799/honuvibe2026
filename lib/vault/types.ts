// Vault content library TypeScript types
// Mirrors Supabase schema from supabase/migrations/011 (content_items + related tables)

// ---------------------------------------------------------------------------
// Union types
// ---------------------------------------------------------------------------

export type VaultContentType =
  | 'video_custom'
  | 'video_youtube'
  | 'article'
  | 'tool'
  | 'template'
  | 'guide'
  | 'course_recording';

export type VaultDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type VaultAccessTier = 'free' | 'premium';
export type VaultFreshnessStatus = 'current' | 'review_needed' | 'outdated';
export type VaultContentSource = 'honuvibe' | 'youtube' | 'external';
export type VaultLanguage = 'en' | 'ja' | 'both';
export type VaultBookmarkType = 'bookmark' | 'watch_later' | 'completed';
export type VaultFeedbackType = 'helpful' | 'not_helpful';
export type VaultSortOption = 'newest' | 'oldest' | 'popular' | 'helpful';

// ---------------------------------------------------------------------------
// Core DB row — content_items
// ---------------------------------------------------------------------------

export interface VaultContentItem {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  content_type: VaultContentType;
  url: string;
  source: VaultContentSource;
  thumbnail_url: string | null;
  embed_url: string | null;
  duration_minutes: number | null;
  author_name: string | null;
  publish_date: string | null;
  difficulty_level: VaultDifficulty | null;
  language: VaultLanguage;
  tags: string[] | null;
  access_tier: VaultAccessTier;
  source_course_id: string | null;
  source_session_id: string | null;
  admin_notes: string | null;
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  usage_in_paths: number;
  freshness_status: VaultFreshnessStatus;
  freshness_reviewed_at: string | null;
  helpful_count: number;
  not_helpful_count: number;
  series_id: string | null;
  series_order: number | null;
  related_item_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

export interface VaultSeries {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  thumbnail_url: string | null;
  difficulty_level: VaultDifficulty | null;
  tags: string[] | null;
  item_count: number;
  total_duration_minutes: number;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface VaultSeriesWithItems extends VaultSeries {
  items: VaultContentItem[];
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export interface VaultDownload {
  id: string;
  content_item_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  file_type: string;
  description_en: string | null;
  description_jp: string | null;
  access_tier: VaultAccessTier;
  download_count: number;
  display_order: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// User interactions
// ---------------------------------------------------------------------------

export interface VaultBookmark {
  id: string;
  user_id: string;
  content_item_id: string;
  bookmark_type: VaultBookmarkType;
  created_at: string;
}

export interface VaultNote {
  id: string;
  user_id: string;
  content_item_id: string;
  note_text: string;
  timestamp_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface VaultFeedback {
  id: string;
  user_id: string;
  content_item_id: string;
  feedback_type: VaultFeedbackType;
  created_at: string;
}

export interface VaultView {
  id: string;
  content_item_id: string;
  viewer_hash: string;
  viewed_at: string;
}

// ---------------------------------------------------------------------------
// Content requests
// ---------------------------------------------------------------------------

export type VaultContentRequestStatus = 'pending' | 'reviewed' | 'planned' | 'completed';

export interface VaultContentRequest {
  id: string;
  user_id: string;
  topic_text: string;
  tags: string[];
  status: VaultContentRequestStatus;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Tags (canonical)
// ---------------------------------------------------------------------------

export type VaultTagCategory = 'topic' | 'tool' | 'skill' | 'industry' | 'format';

export interface VaultTag {
  id: string;
  slug: string;
  name_en: string;
  name_jp: string | null;
  category: VaultTagCategory;
  usage_count: number;
}

// ---------------------------------------------------------------------------
// Browse / filter types
// ---------------------------------------------------------------------------

export interface VaultBrowseFilters {
  contentType?: VaultContentType;
  difficulty?: VaultDifficulty;
  tags?: string[];
  search?: string;
  sort?: VaultSortOption;
  accessTier?: VaultAccessTier;
  page?: number;
  pageSize?: number;
}

export interface VaultBrowseResult {
  items: VaultContentItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// User state (aggregated for detail page)
// ---------------------------------------------------------------------------

export interface VaultUserState {
  isBookmarked: boolean;
  isWatchLater: boolean;
  isCompleted: boolean;
  feedback: VaultFeedbackType | null;
  note: VaultNote | null;
}

// ---------------------------------------------------------------------------
// Full detail (content + related data + user state)
// ---------------------------------------------------------------------------

export interface VaultContentDetail {
  item: VaultContentItem;
  downloads: VaultDownload[];
  relatedItems: VaultContentItem[];
  series: VaultSeries | null;
  seriesItems: VaultContentItem[];
  userState: VaultUserState | null;
}

// ---------------------------------------------------------------------------
// Admin create / update inputs
// ---------------------------------------------------------------------------

export interface VaultItemCreateInput {
  title_en: string;
  title_jp?: string;
  slug?: string;
  description_en?: string;
  description_jp?: string;
  content_type: VaultContentType;
  url: string;
  source?: VaultContentSource;
  embed_url?: string;
  thumbnail_url?: string;
  duration_minutes?: number;
  author_name?: string;
  publish_date?: string;
  difficulty_level?: VaultDifficulty;
  language?: VaultLanguage;
  tags?: string[];
  access_tier?: VaultAccessTier;
  source_course_id?: string;
  admin_notes?: string;
  series_id?: string;
  series_order?: number;
  related_item_ids?: string[];
}

export interface VaultItemUpdateInput extends Partial<VaultItemCreateInput> {
  freshness_status?: VaultFreshnessStatus;
  is_published?: boolean;
  is_featured?: boolean;
}

export interface VaultSeriesCreateInput {
  title_en: string;
  title_jp?: string;
  slug?: string;
  description_en?: string;
  description_jp?: string;
  thumbnail_url?: string;
  difficulty_level?: VaultDifficulty;
  tags?: string[];
  is_published?: boolean;
  is_featured?: boolean;
}

export interface VaultSeriesUpdateInput extends Partial<VaultSeriesCreateInput> {}

// ---------------------------------------------------------------------------
// Admin list filter
// ---------------------------------------------------------------------------

export interface VaultAdminFilters {
  search?: string;
  contentType?: VaultContentType;
  accessTier?: VaultAccessTier;
  freshnessStatus?: VaultFreshnessStatus;
  isPublished?: boolean;
}
