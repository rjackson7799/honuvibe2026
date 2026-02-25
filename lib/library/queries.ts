import { createClient } from '@/lib/supabase/server';
import type {
  LibraryVideo,
  LibraryVideoWithUserState,
  LibraryVideoCategory,
} from './types';

// ── Admin queries (no published filter) ──────────────────────────────

// Fetch all library videos for admin list
export async function getAdminLibraryVideos(): Promise<LibraryVideo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('library_videos')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Fetch a single library video by ID for admin detail
export async function getAdminLibraryVideoById(
  id: string,
): Promise<LibraryVideo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('library_videos')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data;
}

// ── Public queries ───────────────────────────────────────────────────

// Fetch all published library videos, ordered by sort_order
export async function getPublishedLibraryVideos(): Promise<LibraryVideo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('library_videos')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Fetch a single library video by slug
export async function getLibraryVideoBySlug(
  slug: string,
): Promise<LibraryVideo | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('library_videos')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error) return null;
  return data;
}

// Fetch all published videos with optional user state (favorites + progress)
export async function getLibraryVideosWithUserState(
  userId?: string,
): Promise<LibraryVideoWithUserState[]> {
  const supabase = await createClient();

  // Always fetch published videos
  const { data: videos, error } = await supabase
    .from('library_videos')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  if (!videos) return [];

  // If no user, return videos with default user state
  if (!userId) {
    return videos.map((v) => ({
      ...v,
      isFavorited: false,
      isViewed: false,
      progressPercent: 0,
    }));
  }

  // Fetch user favorites and progress in parallel
  const [favoritesRes, progressRes] = await Promise.all([
    supabase
      .from('user_library_favorites')
      .select('video_id')
      .eq('user_id', userId),
    supabase
      .from('user_library_progress')
      .select('video_id, progress_percent, completed')
      .eq('user_id', userId),
  ]);

  const favoriteSet = new Set(
    (favoritesRes.data ?? []).map((f) => f.video_id),
  );
  const progressMap = new Map(
    (progressRes.data ?? []).map((p) => [p.video_id, p]),
  );

  return videos.map((v) => {
    const progress = progressMap.get(v.id);
    return {
      ...v,
      isFavorited: favoriteSet.has(v.id),
      isViewed: progress?.completed ?? false,
      progressPercent: progress?.progress_percent ?? 0,
    };
  });
}

// Fetch user's library data for the "My Library" dashboard tab
export async function getUserLibraryData(userId: string): Promise<{
  continueWatching: LibraryVideoWithUserState[];
  favorites: LibraryVideoWithUserState[];
  recentlyWatched: LibraryVideoWithUserState[];
}> {
  const supabase = await createClient();

  // Fetch all user favorites and progress in parallel
  const [favoritesRes, progressRes] = await Promise.all([
    supabase
      .from('user_library_favorites')
      .select('video_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_library_progress')
      .select('video_id, progress_percent, completed, last_watched_at')
      .eq('user_id', userId)
      .order('last_watched_at', { ascending: false }),
  ]);

  const favorites = favoritesRes.data ?? [];
  const progressEntries = progressRes.data ?? [];

  // Collect all video IDs we need to fetch
  const videoIds = new Set<string>();
  favorites.forEach((f) => videoIds.add(f.video_id));
  progressEntries.forEach((p) => videoIds.add(p.video_id));

  if (videoIds.size === 0) {
    return { continueWatching: [], favorites: [], recentlyWatched: [] };
  }

  // Fetch all referenced videos in one query
  const { data: videos } = await supabase
    .from('library_videos')
    .select('*')
    .in('id', Array.from(videoIds))
    .eq('is_published', true);

  if (!videos || videos.length === 0) {
    return { continueWatching: [], favorites: [], recentlyWatched: [] };
  }

  const videoMap = new Map(videos.map((v) => [v.id, v]));
  const favoriteSet = new Set(favorites.map((f) => f.video_id));
  const progressMap = new Map(
    progressEntries.map((p) => [p.video_id, p]),
  );

  // Helper to enrich a video with user state
  const enrichVideo = (
    video: LibraryVideo,
  ): LibraryVideoWithUserState => {
    const progress = progressMap.get(video.id);
    return {
      ...video,
      isFavorited: favoriteSet.has(video.id),
      isViewed: progress?.completed ?? false,
      progressPercent: progress?.progress_percent ?? 0,
    };
  };

  // Continue Watching: started but not completed, ordered by last_watched_at
  const continueWatching = progressEntries
    .filter((p) => p.progress_percent > 0 && !p.completed)
    .map((p) => videoMap.get(p.video_id))
    .filter((v): v is LibraryVideo => v !== undefined)
    .map(enrichVideo);

  // Favorites: all favorited videos, ordered by created_at desc
  const favoritesData = favorites
    .map((f) => videoMap.get(f.video_id))
    .filter((v): v is LibraryVideo => v !== undefined)
    .map(enrichVideo);

  // Recently Watched: all viewed videos, ordered by last_watched_at desc, limit 10
  const recentlyWatched = progressEntries
    .filter((p) => p.progress_percent > 0)
    .slice(0, 10)
    .map((p) => videoMap.get(p.video_id))
    .filter((v): v is LibraryVideo => v !== undefined)
    .map(enrichVideo);

  return {
    continueWatching,
    favorites: favoritesData,
    recentlyWatched,
  };
}

// Fetch related videos from same category, excluding current video
export async function getRelatedVideos(
  category: LibraryVideoCategory,
  excludeId: string,
  limit: number = 3,
): Promise<LibraryVideo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('library_videos')
    .select('*')
    .eq('is_published', true)
    .eq('category', category)
    .neq('id', excludeId)
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// Fetch all published video slugs for sitemap generation
export async function getLibraryVideoSlugs(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('library_videos')
    .select('slug')
    .eq('is_published', true);

  if (error) throw error;
  return (data ?? []).map((v) => v.slug);
}
