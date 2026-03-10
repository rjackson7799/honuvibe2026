import { createClient } from '@/lib/supabase/server';
import type {
  VaultContentItem,
  VaultBrowseFilters,
  VaultBrowseResult,
  VaultDownload,
  VaultUserState,
  VaultFeedbackType,
  VaultSeries,
  VaultSeriesWithItems,
  VaultNote,
  VaultBookmarkType,
  VaultTag,
  VaultAdminFilters,
} from '@/lib/vault/types';

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export async function getVaultBrowse(
  filters: VaultBrowseFilters,
  userId?: string,
): Promise<VaultBrowseResult> {
  try {
    const supabase = await createClient();

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = page * pageSize - 1;

    // Build base query
    let query = supabase
      .from('content_items')
      .select('*')
      .eq('is_published', true);

    // Apply filters
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      query = query.or(
        `title_en.ilike.${pattern},title_jp.ilike.${pattern},description_en.ilike.${pattern}`,
      );
    }

    if (filters.contentType) {
      query = query.eq('content_type', filters.contentType);
    }

    if (filters.difficulty) {
      query = query.eq('difficulty_level', filters.difficulty);
    }

    if (filters.tags) {
      for (const tag of filters.tags) {
        query = query.contains('tags', JSON.stringify([tag]));
      }
    }

    if (filters.accessTier) {
      query = query.eq('access_tier', filters.accessTier);
    }

    // Apply sort
    switch (filters.sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'popular':
        query = query.order('view_count', { ascending: false });
        break;
      case 'helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Count query (separate for totalCount)
    let countQuery = supabase
      .from('content_items')
      .select('*', { head: true, count: 'exact' })
      .eq('is_published', true);

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      countQuery = countQuery.or(
        `title_en.ilike.${pattern},title_jp.ilike.${pattern},description_en.ilike.${pattern}`,
      );
    }
    if (filters.contentType) {
      countQuery = countQuery.eq('content_type', filters.contentType);
    }
    if (filters.difficulty) {
      countQuery = countQuery.eq('difficulty_level', filters.difficulty);
    }
    if (filters.tags) {
      for (const tag of filters.tags) {
        countQuery = countQuery.contains('tags', JSON.stringify([tag]));
      }
    }
    if (filters.accessTier) {
      countQuery = countQuery.eq('access_tier', filters.accessTier);
    }

    // Execute both queries in parallel
    const [dataRes, countRes] = await Promise.all([
      query.range(from, to),
      countQuery,
    ]);

    const items: VaultContentItem[] = (dataRes.data as VaultContentItem[]) ?? [];
    const totalCount = countRes.count ?? 0;

    return {
      items,
      totalCount,
      page,
      pageSize,
      hasMore: page * pageSize < totalCount,
    };
  } catch (error) {
    console.error('getVaultBrowse error:', error);
    return { items: [], totalCount: 0, page: 1, pageSize: 20, hasMore: false };
  }
}

export async function getVaultTrending(
  limit = 8,
): Promise<VaultContentItem[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getVaultTrending error:', error);
      return [];
    }

    return (data as VaultContentItem[]) ?? [];
  } catch (error) {
    console.error('getVaultTrending error:', error);
    return [];
  }
}

export async function getVaultItemBySlug(
  slug: string,
): Promise<VaultContentItem | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (error) {
      console.error('getVaultItemBySlug error:', error);
      return null;
    }

    return data as VaultContentItem | null;
  } catch (error) {
    console.error('getVaultItemBySlug error:', error);
    return null;
  }
}

export async function getVaultItemById(
  id: string,
): Promise<VaultContentItem | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('getVaultItemById error:', error);
      return null;
    }

    return data as VaultContentItem | null;
  } catch (error) {
    console.error('getVaultItemById error:', error);
    return null;
  }
}

export async function getVaultDownloads(
  contentItemId: string,
): Promise<VaultDownload[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vault_downloads')
      .select('*')
      .eq('content_item_id', contentItemId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('getVaultDownloads error:', error);
      return [];
    }

    return (data as VaultDownload[]) ?? [];
  } catch (error) {
    console.error('getVaultDownloads error:', error);
    return [];
  }
}

export async function getVaultUserState(
  userId: string,
  contentItemId: string,
): Promise<VaultUserState> {
  try {
    const supabase = await createClient();

    const [bookmarksRes, feedbackRes, notesRes] = await Promise.all([
      supabase
        .from('vault_bookmarks')
        .select('bookmark_type')
        .eq('user_id', userId)
        .eq('content_item_id', contentItemId),
      supabase
        .from('vault_feedback')
        .select('feedback_type')
        .eq('user_id', userId)
        .eq('content_item_id', contentItemId)
        .maybeSingle(),
      supabase
        .from('vault_notes')
        .select('*')
        .eq('user_id', userId)
        .eq('content_item_id', contentItemId)
        .maybeSingle(),
    ]);

    const bookmarks = bookmarksRes.data ?? [];
    const bookmarkTypes = new Set(bookmarks.map((b) => b.bookmark_type));

    return {
      isBookmarked: bookmarkTypes.has('bookmark'),
      isWatchLater: bookmarkTypes.has('watch_later'),
      isCompleted: bookmarkTypes.has('completed'),
      feedback: (feedbackRes.data?.feedback_type as VaultFeedbackType) ?? null,
      note: (notesRes.data as VaultNote) ?? null,
    };
  } catch (error) {
    console.error('getVaultUserState error:', error);
    return {
      isBookmarked: false,
      isWatchLater: false,
      isCompleted: false,
      feedback: null,
      note: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Series queries
// ---------------------------------------------------------------------------

export async function getVaultSeriesList(): Promise<VaultSeries[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vault_series')
      .select('*')
      .eq('is_published', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('getVaultSeriesList error:', error);
      return [];
    }

    return (data as VaultSeries[]) ?? [];
  } catch (error) {
    console.error('getVaultSeriesList error:', error);
    return [];
  }
}

export async function getVaultSeriesBySlug(
  slug: string,
): Promise<VaultSeriesWithItems | null> {
  try {
    const supabase = await createClient();

    const { data: series, error: seriesError } = await supabase
      .from('vault_series')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (seriesError || !series) {
      if (seriesError) console.error('getVaultSeriesBySlug error:', seriesError);
      return null;
    }

    const { data: items, error: itemsError } = await supabase
      .from('content_items')
      .select('*')
      .eq('series_id', series.id)
      .eq('is_published', true)
      .order('series_order', { ascending: true });

    if (itemsError) {
      console.error('getVaultSeriesBySlug items error:', itemsError);
    }

    return {
      ...(series as VaultSeries),
      items: (items as VaultContentItem[]) ?? [],
    };
  } catch (error) {
    console.error('getVaultSeriesBySlug error:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// User-specific queries
// ---------------------------------------------------------------------------

export async function getVaultUserBookmarks(
  userId: string,
  type: VaultBookmarkType,
): Promise<VaultContentItem[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vault_bookmarks')
      .select('content_item:content_items(*)')
      .eq('user_id', userId)
      .eq('bookmark_type', type)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getVaultUserBookmarks error:', error);
      return [];
    }

    return (data ?? [])
      .map((row) => row.content_item as unknown as VaultContentItem | null)
      .filter((item): item is VaultContentItem => item !== null);
  } catch (error) {
    console.error('getVaultUserBookmarks error:', error);
    return [];
  }
}

export async function getVaultUserNotes(
  userId: string,
): Promise<
  (VaultNote & {
    content_item: Pick<
      VaultContentItem,
      'id' | 'slug' | 'title_en' | 'title_jp' | 'content_type' | 'thumbnail_url'
    >;
  })[]
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vault_notes')
      .select(
        '*, content_item:content_items(id, slug, title_en, title_jp, content_type, thumbnail_url)',
      )
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('getVaultUserNotes error:', error);
      return [];
    }

    return (data ?? []).map((row) => {
      const { content_item, ...note } = row;
      return {
        ...(note as unknown as VaultNote),
        content_item: content_item as unknown as Pick<
          VaultContentItem,
          'id' | 'slug' | 'title_en' | 'title_jp' | 'content_type' | 'thumbnail_url'
        >,
      };
    });
  } catch (error) {
    console.error('getVaultUserNotes error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Recently viewed
// ---------------------------------------------------------------------------

export async function getVaultRecentlyViewed(
  userId: string,
  limit = 6,
): Promise<VaultContentItem[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vault_views')
      .select('content_item:content_items(*)')
      .eq('viewer_hash', userId)
      .order('viewed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getVaultRecentlyViewed error:', error);
      return [];
    }

    return (data ?? [])
      .map((row) => row.content_item as unknown as VaultContentItem | null)
      .filter(
        (item): item is VaultContentItem =>
          item !== null && item.is_published === true,
      );
  } catch (error) {
    console.error('getVaultRecentlyViewed error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Related items
// ---------------------------------------------------------------------------

export async function getVaultRelatedItems(
  contentItemId: string,
  relatedItemIds: string[] | null,
  tags: string[] | null,
  limit = 4,
  seriesId?: string | null,
  difficultyLevel?: string | null,
): Promise<VaultContentItem[]> {
  try {
    const supabase = await createClient();
    const results: VaultContentItem[] = [];
    const getExcludeIds = () => [contentItemId, ...results.map((r) => r.id)];

    // Priority 1: fetch explicitly related items (admin-curated)
    if (relatedItemIds && relatedItemIds.length > 0) {
      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .in('id', relatedItemIds)
        .eq('is_published', true);

      if (!error && data) {
        results.push(...(data as VaultContentItem[]));
      }
    }

    // Priority 2: same series (other items in order)
    if (results.length < limit && seriesId) {
      const excludeIds = getExcludeIds();
      const remainder = limit - results.length;

      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('series_id', seriesId)
        .eq('is_published', true)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('series_order', { ascending: true })
        .limit(remainder);

      if (!error && data) {
        results.push(...(data as VaultContentItem[]));
      }
    }

    // Priority 3: tag overlap (≥2 shared tags) — use OR matching instead of AND
    if (results.length < limit && tags && tags.length >= 2) {
      const excludeIds = getExcludeIds();
      const remainder = limit - results.length;

      // Build OR filter for tag overlap
      const tagFilters = tags.map((tag) => `tags.cs.${JSON.stringify([tag])}`).join(',');

      const { data, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('is_published', true)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .or(tagFilters)
        .order('view_count', { ascending: false })
        .limit(remainder * 3); // fetch extra to filter for ≥2 overlap

      if (!error && data) {
        // Filter to items sharing ≥2 tags
        const filtered = (data as VaultContentItem[]).filter((item) => {
          const itemTags = item.tags ?? [];
          const overlap = tags.filter((t) => itemTags.includes(t)).length;
          return overlap >= 2;
        });
        results.push(...filtered.slice(0, remainder));
      }
    }

    // Priority 4: same topic (first tag), next difficulty level
    if (results.length < limit && tags && tags.length > 0 && difficultyLevel) {
      const excludeIds = getExcludeIds();
      const remainder = limit - results.length;
      const nextDifficulty =
        difficultyLevel === 'beginner'
          ? 'intermediate'
          : difficultyLevel === 'intermediate'
            ? 'advanced'
            : null;

      if (nextDifficulty) {
        const { data, error } = await supabase
          .from('content_items')
          .select('*')
          .eq('is_published', true)
          .eq('difficulty_level', nextDifficulty)
          .contains('tags', JSON.stringify([tags[0]]))
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .order('view_count', { ascending: false })
          .limit(remainder);

        if (!error && data) {
          results.push(...(data as VaultContentItem[]));
        }
      }
    }

    return results.slice(0, limit);
  } catch (error) {
    console.error('getVaultRelatedItems error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function getVaultTags(): Promise<VaultTag[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('category', { ascending: true })
      .order('name_en', { ascending: true });

    if (error) {
      console.error('getVaultTags error:', error);
      return [];
    }

    return (data as VaultTag[]) ?? [];
  } catch (error) {
    console.error('getVaultTags error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function getVaultAdminItems(
  filters: VaultAdminFilters,
): Promise<VaultContentItem[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('content_items')
      .select('*');

    if (filters.isPublished !== undefined) {
      query = query.eq('is_published', filters.isPublished);
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      query = query.or(
        `title_en.ilike.${pattern},title_jp.ilike.${pattern},description_en.ilike.${pattern}`,
      );
    }

    if (filters.contentType) {
      query = query.eq('content_type', filters.contentType);
    }

    if (filters.accessTier) {
      query = query.eq('access_tier', filters.accessTier);
    }

    if (filters.freshnessStatus) {
      query = query.eq('freshness_status', filters.freshnessStatus);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('getVaultAdminItems error:', error);
      return [];
    }

    return (data as VaultContentItem[]) ?? [];
  } catch (error) {
    console.error('getVaultAdminItems error:', error);
    return [];
  }
}

export async function getVaultFreshnessQueue(): Promise<VaultContentItem[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .neq('freshness_status', 'current')
      .eq('is_published', true)
      .order('freshness_reviewed_at', { ascending: true, nullsFirst: true });

    if (error) {
      console.error('getVaultFreshnessQueue error:', error);
      return [];
    }

    return (data as VaultContentItem[]) ?? [];
  } catch (error) {
    console.error('getVaultFreshnessQueue error:', error);
    return [];
  }
}

export async function getVaultSeriesById(
  id: string,
): Promise<VaultSeries | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vault_series')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('getVaultSeriesById error:', error);
      return null;
    }

    return data as VaultSeries | null;
  } catch (error) {
    console.error('getVaultSeriesById error:', error);
    return null;
  }
}

export async function getVaultSeriesItemsAdmin(
  seriesId: string,
): Promise<VaultContentItem[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .eq('series_id', seriesId)
      .order('series_order', { ascending: true });

    if (error) {
      console.error('getVaultSeriesItemsAdmin error:', error);
      return [];
    }

    return (data as VaultContentItem[]) ?? [];
  } catch (error) {
    console.error('getVaultSeriesItemsAdmin error:', error);
    return [];
  }
}

export async function getVaultAdminSeriesList(): Promise<VaultSeries[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vault_series')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('getVaultAdminSeriesList error:', error);
      return [];
    }

    return (data as VaultSeries[]) ?? [];
  } catch (error) {
    console.error('getVaultAdminSeriesList error:', error);
    return [];
  }
}

export async function getVaultStats(): Promise<{
  totalItems: number;
  publishedItems: number;
  freeItems: number;
  premiumItems: number;
  totalViews: number;
  itemsNeedingReview: number;
}> {
  const defaultStats = {
    totalItems: 0,
    publishedItems: 0,
    freeItems: 0,
    premiumItems: 0,
    totalViews: 0,
    itemsNeedingReview: 0,
  };

  try {
    const supabase = await createClient();

    const [totalRes, publishedRes, freeRes, premiumRes, viewsRes, reviewRes] =
      await Promise.all([
        supabase
          .from('content_items')
          .select('*', { head: true, count: 'exact' }),
        supabase
          .from('content_items')
          .select('*', { head: true, count: 'exact' })
          .eq('is_published', true),
        supabase
          .from('content_items')
          .select('*', { head: true, count: 'exact' })
          .eq('access_tier', 'free'),
        supabase
          .from('content_items')
          .select('*', { head: true, count: 'exact' })
          .eq('access_tier', 'premium'),
        supabase
          .from('content_items')
          .select('view_count'),
        supabase
          .from('content_items')
          .select('*', { head: true, count: 'exact' })
          .neq('freshness_status', 'current')
          .eq('is_published', true),
      ]);

    const totalViews = (viewsRes.data ?? []).reduce(
      (sum, row) => sum + (row.view_count ?? 0),
      0,
    );

    return {
      totalItems: totalRes.count ?? 0,
      publishedItems: publishedRes.count ?? 0,
      freeItems: freeRes.count ?? 0,
      premiumItems: premiumRes.count ?? 0,
      totalViews,
      itemsNeedingReview: reviewRes.count ?? 0,
    };
  } catch (error) {
    console.error('getVaultStats error:', error);
    return defaultStats;
  }
}

// ---------------------------------------------------------------------------
// Lightweight item list (for admin pickers)
// ---------------------------------------------------------------------------

export async function getVaultItemPickerList(): Promise<
  { id: string; title_en: string; title_jp: string | null; content_type: string }[]
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('content_items')
      .select('id, title_en, title_jp, content_type')
      .order('title_en', { ascending: true });

    if (error) {
      console.error('getVaultItemPickerList error:', error);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error('getVaultItemPickerList error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Difficulty path (items grouped by difficulty for a tag)
// ---------------------------------------------------------------------------

export async function getVaultDifficultyPath(
  tag: string,
): Promise<{ beginner: VaultContentItem[]; intermediate: VaultContentItem[]; advanced: VaultContentItem[] }> {
  const result = { beginner: [] as VaultContentItem[], intermediate: [] as VaultContentItem[], advanced: [] as VaultContentItem[] };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .eq('is_published', true)
      .contains('tags', JSON.stringify([tag]))
      .order('view_count', { ascending: false });

    if (error || !data) return result;

    for (const item of data as VaultContentItem[]) {
      const level = item.difficulty_level;
      if (level === 'beginner' || level === 'intermediate' || level === 'advanced') {
        result[level].push(item);
      }
    }
    return result;
  } catch (error) {
    console.error('getVaultDifficultyPath error:', error);
    return result;
  }
}

// ---------------------------------------------------------------------------
// Course-aware recommendations
// ---------------------------------------------------------------------------

export async function getVaultCourseRecommendations(
  userId: string,
  limit = 6,
): Promise<VaultContentItem[]> {
  try {
    const supabase = await createClient();

    // Get enrolled course IDs
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!enrollments || enrollments.length === 0) return [];

    const courseIds = enrollments.map((e) => e.course_id);

    // Get tags from enrolled courses
    const { data: courses } = await supabase
      .from('courses')
      .select('tags')
      .in('id', courseIds);

    if (!courses) return [];

    const allTags = new Set<string>();
    for (const course of courses) {
      if (course.tags && Array.isArray(course.tags)) {
        for (const tag of course.tags) {
          allTags.add(tag as string);
        }
      }
    }

    if (allTags.size === 0) return [];

    // Get completed item IDs to exclude
    const { data: completedBookmarks } = await supabase
      .from('vault_bookmarks')
      .select('content_item_id')
      .eq('user_id', userId)
      .eq('bookmark_type', 'completed');

    const excludeIds = (completedBookmarks ?? []).map((b) => b.content_item_id);

    // Build OR filter for matching any course tag
    const tagFilters = Array.from(allTags)
      .map((tag) => `tags.cs.${JSON.stringify([tag])}`)
      .join(',');

    let query = supabase
      .from('content_items')
      .select('*')
      .eq('is_published', true)
      .or(tagFilters)
      .order('view_count', { ascending: false })
      .limit(limit);

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getVaultCourseRecommendations error:', error);
      return [];
    }

    return (data ?? []) as VaultContentItem[];
  } catch (error) {
    console.error('getVaultCourseRecommendations error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Sitemap helpers
// ---------------------------------------------------------------------------

export async function getVaultPublishedSlugs(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('content_items')
      .select('slug')
      .eq('is_published', true)
      .not('slug', 'is', null);

    if (error) return [];
    return (data ?? []).map((d) => d.slug).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function getVaultSeriesSlugs(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('vault_series')
      .select('slug')
      .eq('is_published', true);

    if (error) return [];
    return (data ?? []).map((d) => d.slug).filter(Boolean) as string[];
  } catch {
    return [];
  }
}
