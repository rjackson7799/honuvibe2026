import { createClient, createAdminClient } from '@/lib/supabase/server';
import type {
  StudyPath,
  StudyPathItem,
  StudyPathWithItems,
  StudyPathWithProgress,
  AdminStudyPath,
  PathGenerationLog,
  PathStats,
  ClaudePathResponse,
  PathIntakeInput,
  PathGenerationResult,
} from './types';
import { GENERATION_PROMPT_VERSION } from './prompt';

// ---------------------------------------------------------------------------
// Student queries
// ---------------------------------------------------------------------------

export async function getUserPaths(userId: string): Promise<StudyPathWithProgress[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('study_paths')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch study paths: ${error.message}`);

  const paths = (data ?? []) as StudyPath[];
  if (paths.length === 0) return [];

  // Batch-fetch completed item counts for all paths
  const pathIds = paths.map((p) => p.id);
  const { data: items } = await supabase
    .from('study_path_items')
    .select('path_id, is_completed')
    .in('path_id', pathIds);

  const completedCounts = new Map<string, number>();
  for (const item of items ?? []) {
    if (item.is_completed) {
      completedCounts.set(item.path_id, (completedCounts.get(item.path_id) ?? 0) + 1);
    }
  }

  return paths.map((path) => ({
    ...path,
    completed_items: completedCounts.get(path.id) ?? 0,
  }));
}

export async function getPathWithItems(
  pathId: string,
): Promise<StudyPathWithItems | null> {
  const supabase = await createClient();

  const { data: path, error: pathError } = await supabase
    .from('study_paths')
    .select('*')
    .eq('id', pathId)
    .single();

  if (pathError || !path) return null;

  const { data: items, error: itemsError } = await supabase
    .from('study_path_items')
    .select('*')
    .eq('path_id', pathId)
    .order('sort_order', { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to fetch path items: ${itemsError.message}`);
  }

  return {
    ...(path as StudyPath),
    items: (items ?? []) as StudyPathItem[],
  };
}

export async function createPath(
  input: PathIntakeInput,
  userId: string,
  generationResult: PathGenerationResult,
): Promise<StudyPathWithItems> {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { response } = generationResult;

  // Count free vs premium items
  const freeItems = response.items.length;
  const premiumItems = 0;

  // Insert study path
  const { data: path, error: pathError } = await supabase
    .from('study_paths')
    .insert({
      user_id: userId,
      goal_description: input.goal_description,
      difficulty_preference: input.difficulty_preference,
      language_preference: input.language_preference,
      focus_areas: input.focus_areas,
      title_en: response.title_en,
      title_jp: response.title_jp,
      description_en: response.description_en,
      description_jp: response.description_jp,
      estimated_hours: response.estimated_hours,
      total_items: response.items.length,
      free_items: freeItems,
      premium_items: premiumItems,
      status: 'active',
      generation_model: 'claude-sonnet-4-20250514',
      generation_prompt_version: GENERATION_PROMPT_VERSION,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (pathError || !path) {
    throw new Error(`Failed to create study path: ${pathError?.message}`);
  }

  // Fetch denormalized content item data for each path item
  const contentIds = response.items.map((item) => item.content_item_id);
  const { data: contentItems } = await adminClient
    .from('content_items')
    .select('id, title_en, content_type, access_tier, duration_minutes, url, embed_url')
    .in('id', contentIds);

  const contentMap = new Map(
    (contentItems ?? []).map((ci) => [ci.id, ci]),
  );

  // Insert path items
  const itemRows = response.items.map((item) => {
    const content = contentMap.get(item.content_item_id);
    return {
      path_id: path.id,
      content_item_id: item.content_item_id,
      sort_order: item.sort_order,
      rationale_en: item.rationale_en,
      rationale_jp: item.rationale_jp,
      learning_focus_en: item.learning_focus_en,
      learning_focus_jp: item.learning_focus_jp,
      item_title_en: content?.title_en ?? null,
      item_content_type: content?.content_type ?? null,
      item_access_tier: content?.access_tier ?? null,
      item_duration_minutes: content?.duration_minutes ?? null,
      item_url: content?.url ?? null,
      item_embed_url: content?.embed_url ?? null,
    };
  });

  const { data: items, error: itemsError } = await supabase
    .from('study_path_items')
    .insert(itemRows)
    .select();

  if (itemsError) {
    throw new Error(`Failed to create path items: ${itemsError.message}`);
  }

  // Update free/premium counts based on actual content data
  const actualFree = itemRows.filter(
    (r) => r.item_access_tier === 'free',
  ).length;
  const actualPremium = itemRows.filter(
    (r) => r.item_access_tier === 'premium',
  ).length;

  if (actualFree !== freeItems || actualPremium !== premiumItems) {
    await supabase
      .from('study_paths')
      .update({ free_items: actualFree, premium_items: actualPremium })
      .eq('id', path.id);
  }

  return {
    ...(path as StudyPath),
    free_items: actualFree,
    premium_items: actualPremium,
    items: (items ?? []) as StudyPathItem[],
  };
}

export async function markItemComplete(
  itemId: string,
  pathId: string,
): Promise<{ item: StudyPathItem; pathCompleted: boolean }> {
  const supabase = await createClient();

  // Toggle completion
  const { data: existing } = await supabase
    .from('study_path_items')
    .select('is_completed')
    .eq('id', itemId)
    .eq('path_id', pathId)
    .single();

  if (!existing) throw new Error('Path item not found');

  const newCompleted = !existing.is_completed;

  const { data: item, error } = await supabase
    .from('study_path_items')
    .update({
      is_completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    })
    .eq('id', itemId)
    .eq('path_id', pathId)
    .select()
    .single();

  if (error || !item) {
    throw new Error(`Failed to update path item: ${error?.message}`);
  }

  // Check if all items in path are completed
  const { count } = await supabase
    .from('study_path_items')
    .select('*', { head: true, count: 'exact' })
    .eq('path_id', pathId)
    .eq('is_completed', false);

  const pathCompleted = (count ?? 0) === 0;

  if (pathCompleted) {
    await supabase
      .from('study_paths')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', pathId);
  } else {
    // If uncompleting an item on a completed path, reactivate it
    await supabase
      .from('study_paths')
      .update({ status: 'active', completed_at: null })
      .eq('id', pathId)
      .eq('status', 'completed');
  }

  return { item: item as StudyPathItem, pathCompleted };
}

export async function archivePath(pathId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('study_paths')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', pathId);

  if (error) throw new Error(`Failed to archive path: ${error.message}`);
}

export async function updatePathLastAccessed(pathId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('study_paths')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', pathId);
}

export async function saveGenerationLog(
  log: Omit<PathGenerationLog, 'id' | 'created_at'>,
): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('path_generation_logs')
    .insert(log);

  if (error) {
    console.error('Failed to save generation log:', error.message);
  }
}

export async function getPathGenerationCount(
  userId: string,
  date: Date,
): Promise<number> {
  const supabase = await createClient();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { count, error } = await supabase
    .from('study_paths')
    .select('*', { head: true, count: 'exact' })
    .eq('user_id', userId)
    .gte('generated_at', startOfDay.toISOString())
    .lte('generated_at', endOfDay.toISOString());

  if (error) {
    throw new Error(`Failed to check generation count: ${error.message}`);
  }

  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function getAllPaths(
  limit: number = 50,
  offset: number = 0,
): Promise<AdminStudyPath[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('study_paths')
    .select('*, users!inner(email, full_name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch all paths: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const users = row.users as { email: string; full_name: string | null } | null;
    return {
      ...(row as unknown as StudyPath),
      user_email: users?.email ?? null,
      user_name: users?.full_name ?? null,
    };
  }) as AdminStudyPath[];
}

export async function getAdminPathStats(): Promise<PathStats> {
  const adminClient = createAdminClient();

  // Get all paths
  const { data: paths } = await adminClient
    .from('study_paths')
    .select('id, status, total_items, focus_areas');

  const allPaths = paths ?? [];

  const totalPaths = allPaths.length;
  const activePaths = allPaths.filter((p) => p.status === 'active').length;
  const completedPaths = allPaths.filter((p) => p.status === 'completed').length;

  // Avg items per path
  const totalItems = allPaths.reduce(
    (sum, p) => sum + (p.total_items ?? 0),
    0,
  );
  const avgItemsPerPath =
    totalPaths > 0 ? Math.round((totalItems / totalPaths) * 10) / 10 : 0;

  // Avg completion rate
  const pathIds = allPaths.map((p) => p.id);
  let avgCompletionRate = 0;

  if (pathIds.length > 0) {
    const { data: items } = await adminClient
      .from('study_path_items')
      .select('path_id, is_completed')
      .in('path_id', pathIds);

    if (items && items.length > 0) {
      const pathCompletion = new Map<string, { total: number; completed: number }>();

      for (const item of items) {
        const entry = pathCompletion.get(item.path_id) ?? {
          total: 0,
          completed: 0,
        };
        entry.total++;
        if (item.is_completed) entry.completed++;
        pathCompletion.set(item.path_id, entry);
      }

      let totalRate = 0;
      for (const entry of pathCompletion.values()) {
        totalRate += entry.total > 0 ? entry.completed / entry.total : 0;
      }
      avgCompletionRate =
        Math.round((totalRate / pathCompletion.size) * 1000) / 10;
    }
  }

  // Top topics from focus_areas
  const topicCounts = new Map<string, number>();
  for (const path of allPaths) {
    const areas = (path.focus_areas as string[]) ?? [];
    for (const area of areas) {
      topicCounts.set(area, (topicCounts.get(area) ?? 0) + 1);
    }
  }
  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  // Top content items
  const { data: itemUsage } = await adminClient
    .from('study_path_items')
    .select('item_title_en, content_item_id');

  const itemCounts = new Map<string, { title: string; count: number }>();
  for (const item of itemUsage ?? []) {
    const key = item.content_item_id;
    const entry = itemCounts.get(key) ?? {
      title: item.item_title_en ?? 'Unknown',
      count: 0,
    };
    entry.count++;
    itemCounts.set(key, entry);
  }
  const topContentItems = [...itemCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalPaths,
    activePaths,
    completedPaths,
    avgItemsPerPath,
    avgCompletionRate,
    topTopics,
    topContentItems,
  };
}
