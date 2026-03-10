'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  VaultAccessTier,
  VaultBookmarkType,
  VaultFeedbackType,
  VaultFreshnessStatus,
  VaultItemCreateInput,
  VaultItemUpdateInput,
  VaultSeriesCreateInput,
  VaultSeriesUpdateInput,
} from '@/lib/vault/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') throw new Error('Not authorized');

  return supabase;
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  return { supabase, userId: user.id };
}

function revalidateVault() {
  revalidatePath('/learn/vault');
  revalidatePath('/admin/vault');
}

// ---------------------------------------------------------------------------
// Admin Actions
// ---------------------------------------------------------------------------

export async function createVaultItem(
  data: VaultItemCreateInput,
): Promise<{ id: string; slug: string }> {
  const supabase = await requireAdmin();
  const slug = data.slug || slugify(data.title_en);

  const { data: row, error } = await supabase
    .from('content_items')
    .insert({
      slug,
      title_en: data.title_en,
      title_jp: data.title_jp ?? null,
      description_en: data.description_en ?? null,
      description_jp: data.description_jp ?? null,
      content_type: data.content_type,
      url: data.url,
      source: data.source ?? 'honuvibe',
      embed_url: data.embed_url ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
      duration_minutes: data.duration_minutes ?? null,
      author_name: data.author_name ?? null,
      publish_date: data.publish_date ?? null,
      difficulty_level: data.difficulty_level ?? null,
      language: data.language ?? 'en',
      tags: data.tags ?? null,
      access_tier: data.access_tier ?? 'free',
      source_course_id: data.source_course_id ?? null,
      admin_notes: data.admin_notes ?? null,
      series_id: data.series_id ?? null,
      series_order: data.series_order ?? null,
      related_item_ids: data.related_item_ids ?? null,
      is_published: false,
    })
    .select('id, slug')
    .single();

  if (error) throw new Error(error.message);
  if (!row) throw new Error('Failed to create vault item');

  revalidateVault();
  return { id: row.id, slug: row.slug };
}

export async function updateVaultItem(
  id: string,
  data: VaultItemUpdateInput,
): Promise<void> {
  const supabase = await requireAdmin();

  const updates: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  if (data.freshness_status === 'current') {
    updates.freshness_reviewed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('content_items')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidateVault();
}

export async function publishVaultItem(id: string): Promise<void> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('content_items')
    .update({ is_published: true })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidateVault();
}

export async function unpublishVaultItem(id: string): Promise<void> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('content_items')
    .update({ is_published: false })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidateVault();
}

export async function deleteVaultItem(id: string): Promise<void> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('content_items')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidateVault();
}

export async function createVaultSeries(
  data: VaultSeriesCreateInput,
): Promise<{ id: string; slug: string }> {
  const supabase = await requireAdmin();
  const slug = data.slug || slugify(data.title_en);

  const { data: row, error } = await supabase
    .from('vault_series')
    .insert({
      slug,
      title_en: data.title_en,
      title_jp: data.title_jp ?? null,
      description_en: data.description_en ?? null,
      description_jp: data.description_jp ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
      difficulty_level: data.difficulty_level ?? null,
      tags: data.tags ?? null,
      is_published: data.is_published ?? false,
      is_featured: data.is_featured ?? false,
    })
    .select('id, slug')
    .single();

  if (error) throw new Error(error.message);
  if (!row) throw new Error('Failed to create vault series');

  revalidateVault();
  return { id: row.id, slug: row.slug };
}

export async function updateVaultSeries(
  id: string,
  data: VaultSeriesUpdateInput,
): Promise<void> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('vault_series')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidateVault();
}

export async function deleteVaultSeries(id: string): Promise<void> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('vault_series')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidateVault();
}

export async function reorderSeriesItems(
  seriesId: string,
  itemIds: string[],
): Promise<void> {
  const supabase = await requireAdmin();

  // Update each item's series_id and series_order
  for (let i = 0; i < itemIds.length; i++) {
    const { error } = await supabase
      .from('content_items')
      .update({ series_id: seriesId, series_order: i })
      .eq('id', itemIds[i]);

    if (error) throw new Error(error.message);
  }

  // Compute total duration from the series items
  const { data: items, error: fetchError } = await supabase
    .from('content_items')
    .select('duration_minutes')
    .in('id', itemIds);

  if (fetchError) throw new Error(fetchError.message);

  const totalDuration = (items ?? []).reduce(
    (sum, item) => sum + (item.duration_minutes ?? 0),
    0,
  );

  const { error: seriesError } = await supabase
    .from('vault_series')
    .update({
      item_count: itemIds.length,
      total_duration_minutes: totalDuration,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seriesId);

  if (seriesError) throw new Error(seriesError.message);
  revalidateVault();
}

export async function updateFreshnessStatus(
  itemId: string,
  status: VaultFreshnessStatus,
): Promise<void> {
  const supabase = await requireAdmin();

  const updates: Record<string, unknown> = {
    freshness_status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'current') {
    updates.freshness_reviewed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('content_items')
    .update(updates)
    .eq('id', itemId);

  if (error) throw new Error(error.message);
  revalidateVault();
}

export async function createVaultDownload(data: {
  content_item_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes?: number;
  file_type: string;
  description_en?: string;
  description_jp?: string;
  access_tier?: VaultAccessTier;
  display_order?: number;
}): Promise<{ id: string }> {
  const supabase = await requireAdmin();

  const { data: row, error } = await supabase
    .from('vault_downloads')
    .insert({
      content_item_id: data.content_item_id,
      file_name: data.file_name,
      file_url: data.file_url,
      file_size_bytes: data.file_size_bytes ?? null,
      file_type: data.file_type,
      description_en: data.description_en ?? null,
      description_jp: data.description_jp ?? null,
      access_tier: data.access_tier ?? 'free',
      display_order: data.display_order ?? 0,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  if (!row) throw new Error('Failed to create vault download');

  revalidateVault();
  return { id: row.id };
}

export async function deleteVaultDownload(id: string): Promise<void> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('vault_downloads')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidateVault();
}

// ---------------------------------------------------------------------------
// User Actions
// ---------------------------------------------------------------------------

export async function toggleBookmark(
  contentItemId: string,
  bookmarkType: VaultBookmarkType,
): Promise<{ bookmarked: boolean }> {
  const { supabase, userId } = await requireAuth();

  const { data: existing } = await supabase
    .from('vault_bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('content_item_id', contentItemId)
    .eq('bookmark_type', bookmarkType)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('vault_bookmarks')
      .delete()
      .eq('id', existing.id);

    if (error) throw new Error(error.message);
    revalidatePath('/learn/vault');
    return { bookmarked: false };
  }

  const { error } = await supabase.from('vault_bookmarks').insert({
    user_id: userId,
    content_item_id: contentItemId,
    bookmark_type: bookmarkType,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/learn/vault');
  return { bookmarked: true };
}

export async function saveNote(
  contentItemId: string,
  noteText: string,
  timestampSeconds?: number,
): Promise<{ id: string }> {
  const { supabase, userId } = await requireAuth();

  const { data: existing } = await supabase
    .from('vault_notes')
    .select('id')
    .eq('user_id', userId)
    .eq('content_item_id', contentItemId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('vault_notes')
      .update({
        note_text: noteText,
        timestamp_seconds: timestampSeconds ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw new Error(error.message);
    revalidatePath('/learn/vault');
    return { id: existing.id };
  }

  const { data: row, error } = await supabase
    .from('vault_notes')
    .insert({
      user_id: userId,
      content_item_id: contentItemId,
      note_text: noteText,
      timestamp_seconds: timestampSeconds ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  if (!row) throw new Error('Failed to save note');

  revalidatePath('/learn/vault');
  return { id: row.id };
}

export async function deleteNote(noteId: string): Promise<void> {
  const { supabase, userId } = await requireAuth();

  const { error } = await supabase
    .from('vault_notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  revalidatePath('/learn/vault');
}

export async function submitFeedback(
  contentItemId: string,
  feedbackType: VaultFeedbackType,
): Promise<{ feedback: VaultFeedbackType | null }> {
  const { supabase, userId } = await requireAuth();

  const { data: existing } = await supabase
    .from('vault_feedback')
    .select('id, feedback_type')
    .eq('user_id', userId)
    .eq('content_item_id', contentItemId)
    .maybeSingle();

  if (existing) {
    if (existing.feedback_type === feedbackType) {
      // Un-vote: same type clicked again
      const { error } = await supabase
        .from('vault_feedback')
        .delete()
        .eq('id', existing.id);

      if (error) throw new Error(error.message);
      revalidatePath('/learn/vault');
      return { feedback: null };
    }

    // Switch vote
    const { error } = await supabase
      .from('vault_feedback')
      .update({ feedback_type: feedbackType })
      .eq('id', existing.id);

    if (error) throw new Error(error.message);
    revalidatePath('/learn/vault');
    return { feedback: feedbackType };
  }

  const { error } = await supabase.from('vault_feedback').insert({
    user_id: userId,
    content_item_id: contentItemId,
    feedback_type: feedbackType,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/learn/vault');
  return { feedback: feedbackType };
}

export async function recordView(contentItemId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerHash = user?.id ?? 'anon';

  // Insert view record — ignore duplicate conflicts
  await supabase
    .from('vault_views')
    .upsert(
      {
        content_item_id: contentItemId,
        viewer_hash: viewerHash,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: 'content_item_id,viewer_hash' },
    )
    .select('id')
    .single();

  // Increment view_count on the content item
  await supabase.rpc('increment_view_count', {
    item_id: contentItemId,
  }).then(({ error }) => {
    // If the RPC doesn't exist, fall back to manual increment
    if (error) {
      return supabase
        .from('content_items')
        .update({
          view_count: supabase.rpc('coalesce_increment', {
            row_id: contentItemId,
          }) as unknown as number,
        })
        .eq('id', contentItemId);
    }
  });

  // No revalidatePath — views are background
}

export async function markComplete(
  contentItemId: string,
): Promise<{ completed: boolean }> {
  const result = await toggleBookmark(contentItemId, 'completed');
  return { completed: result.bookmarked };
}

export async function submitContentRequest(
  topicText: string,
  tags?: string[],
): Promise<{ id: string }> {
  const { supabase, userId } = await requireAuth();

  const { data: row, error } = await supabase
    .from('vault_content_requests')
    .insert({
      user_id: userId,
      topic_text: topicText,
      tags: tags ?? [],
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  if (!row) throw new Error('Failed to submit content request');

  revalidatePath('/learn/vault');
  return { id: row.id };
}
