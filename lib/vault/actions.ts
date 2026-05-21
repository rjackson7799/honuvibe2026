'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
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

/**
 * Rough reading-time estimate in minutes. Uses character count so it works
 * for both English (avg ~5 chars/word, ~200wpm = ~1000 chars/min) and
 * Japanese (~500 chars/min). Picks the longer locale and divides accordingly.
 * Minimum 1 minute.
 */
function computeReadingTime(bodyEn?: string | null, bodyJp?: string | null): number | null {
  const en = (bodyEn ?? '').trim();
  const jp = (bodyJp ?? '').trim();
  if (!en && !jp) return null;
  const enMinutes = en ? Math.ceil(en.length / 1000) : 0;
  const jpMinutes = jp ? Math.ceil(jp.length / 500) : 0;
  return Math.max(1, enMinutes, jpMinutes);
}

/**
 * Upsert the protected article body for a content item. Service role bypasses
 * the vault_article_bodies RLS, but we still gate this behind requireAdmin()
 * at the call site.
 */
async function upsertArticleBody(
  // Caller already passed an admin-authenticated Supabase client.
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  contentItemId: string,
  bodyEn: string | null,
  bodyJp: string | null,
): Promise<void> {
  const readingTime = computeReadingTime(bodyEn, bodyJp);

  // If both bodies are empty, delete the row so the parent is treated as
  // "no body yet" rather than a row with two empty strings.
  if (!bodyEn && !bodyJp) {
    const { error } = await supabase
      .from('vault_article_bodies')
      .delete()
      .eq('content_item_id', contentItemId);
    if (error) throw new Error(`Failed to clear article body: ${error.message}`);
    return;
  }

  const { error } = await supabase
    .from('vault_article_bodies')
    .upsert({
      content_item_id: contentItemId,
      body_en: bodyEn,
      body_jp: bodyJp,
      reading_time_minutes: readingTime,
    });
  if (error) throw new Error(`Failed to save article body: ${error.message}`);
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
      url: data.url ?? null,
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
      partner_id: data.partner_id ?? null,
      admin_notes: data.admin_notes ?? null,
      series_id: data.series_id ?? null,
      series_order: data.series_order ?? null,
      related_item_ids: data.related_item_ids ?? null,
      event_date: data.event_date ?? null,
      event_signup_url: data.event_signup_url ?? null,
      presenter_name: data.presenter_name ?? null,
      tool_widget_key: data.tool_widget_key ?? null,
      tool_widget_config: data.tool_widget_config ?? null,
      is_published: false,
    })
    .select('id, slug')
    .single();

  if (error) throw new Error(error.message);
  if (!row) throw new Error('Failed to create vault item');

  // Article body lives in the protected child table.
  if (data.content_type === 'article' &&
      (data.article_body_en !== undefined || data.article_body_jp !== undefined)) {
    await upsertArticleBody(
      supabase,
      row.id,
      data.article_body_en ?? null,
      data.article_body_jp ?? null,
    );
  }

  revalidateVault();
  return { id: row.id, slug: row.slug };
}

export async function updateVaultItem(
  id: string,
  data: VaultItemUpdateInput,
): Promise<void> {
  const supabase = await requireAdmin();

  // Strip article-body fields — they belong to vault_article_bodies, not
  // content_items. Persisted separately below.
  const { article_body_en, article_body_jp, ...itemFields } = data;

  const updates: Record<string, unknown> = {
    ...itemFields,
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

  // Article body lives in the protected child table. Only touch it if the
  // caller explicitly provided either field — leaves existing rows alone for
  // partial form saves.
  if (article_body_en !== undefined || article_body_jp !== undefined) {
    await upsertArticleBody(
      supabase,
      id,
      article_body_en ?? null,
      article_body_jp ?? null,
    );
  }

  revalidateVault();
}

export async function publishVaultItem(id: string): Promise<void> {
  const supabase = await requireAdmin();

  // Per-type publish gate. Catches missing required fields before the row
  // goes live — matches the Publish Validation section of the design.
  const { data: item, error: fetchError } = await supabase
    .from('content_items')
    .select('content_type, url, title_en, slug, event_date, presenter_name, tool_widget_key')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!item) throw new Error('Item not found');

  if (!item.title_en?.trim()) throw new Error('Cannot publish: title required');
  if (!item.slug?.trim()) throw new Error('Cannot publish: slug required');

  switch (item.content_type) {
    case 'article': {
      const { data: body } = await supabase
        .from('vault_article_bodies')
        .select('body_en, body_jp')
        .eq('content_item_id', id)
        .maybeSingle();
      const hasBody = !!(body?.body_en?.trim() || body?.body_jp?.trim());
      if (!hasBody) throw new Error('Cannot publish: article body required (EN or JP)');
      break;
    }
    case 'video':
      if (!item.url?.trim()) throw new Error('Cannot publish: video URL required');
      break;
    case 'workshop':
      if (!item.url?.trim()) throw new Error('Cannot publish: workshop URL required');
      if (!item.event_date) throw new Error('Cannot publish: workshop event date required');
      if (!item.presenter_name?.trim()) throw new Error('Cannot publish: workshop presenter required');
      break;
    case 'template': {
      const { count } = await supabase
        .from('vault_downloads')
        .select('id', { count: 'exact', head: true })
        .eq('content_item_id', id);
      if (!count || count === 0) throw new Error('Cannot publish: template needs at least one download');
      break;
    }
    case 'prompt_pack': {
      const { count } = await supabase
        .from('vault_prompts')
        .select('id', { count: 'exact', head: true })
        .eq('content_item_id', id);
      if (!count || count === 0) throw new Error('Cannot publish: prompt pack needs at least one prompt');
      break;
    }
    case 'tool':
      if (!item.tool_widget_key?.trim()) {
        throw new Error('Cannot publish: tool needs a registered widget key');
      }
      break;
  }

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

  // Best-effort: try to remove the underlying storage object too. We look up
  // the row first to read file_url. If the object lives in vault-private (the
  // expected location for new uploads), remove it. For legacy rows pointing at
  // an external URL we just delete the metadata row.
  const { data: row } = await supabase
    .from('vault_downloads')
    .select('file_url')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase
    .from('vault_downloads')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  if (row?.file_url) {
    const path = extractPrivateStoragePath(row.file_url);
    if (path) {
      // Use service role for storage delete; admin RLS would also work but the
      // upload path already uses service role so stay consistent.
      const admin = createAdminClient();
      await admin.storage.from(VAULT_PRIVATE_BUCKET).remove([path]);
    }
  }

  revalidateVault();
}

// ---------------------------------------------------------------------------
// File upload for downloads
// ---------------------------------------------------------------------------

const VAULT_PRIVATE_BUCKET = 'vault-private';
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

// Aligns with the vault_downloads.file_type CHECK constraint.
const ALLOWED_FILE_TYPES = new Set([
  'pdf', 'zip', 'xlsx', 'docx', 'csv', 'json', 'md', 'other',
]);

function fileTypeFromExtension(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  return ALLOWED_FILE_TYPES.has(ext) ? ext : 'other';
}

function sanitizeStorageFileName(fileName: string): string {
  // Replace anything not [a-z0-9._-] with -. Keep the extension intact.
  return fileName
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 200) || 'file';
}

function extractPrivateStoragePath(fileUrl: string): string | null {
  if (!fileUrl) return null;
  if (!fileUrl.includes('://')) return fileUrl; // already bucket-relative
  const marker = `/${VAULT_PRIVATE_BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.slice(idx + marker.length).split('?')[0];
}

/**
 * Upload a download file into vault-private and create the vault_downloads
 * row. Server action receives a FormData payload from the admin UI.
 *
 * Required fields: content_item_id, file. Optional: description_en,
 * description_jp, access_tier, display_order.
 *
 * file_url is stored as the bucket-relative path; the signed URL is minted
 * by POST /api/vault/downloads/[id] after access check.
 */
export async function uploadVaultDownload(formData: FormData): Promise<{ id: string }> {
  await requireAdmin();

  const contentItemId = String(formData.get('content_item_id') ?? '').trim();
  const file = formData.get('file');

  if (!contentItemId) throw new Error('content_item_id is required');
  if (!(file instanceof File)) throw new Error('A file is required');
  if (file.size === 0) throw new Error('File is empty');
  if (file.size > MAX_DOWNLOAD_BYTES) {
    throw new Error(`File too large (max ${MAX_DOWNLOAD_BYTES / 1024 / 1024} MB)`);
  }

  const descriptionEn = String(formData.get('description_en') ?? '').trim() || null;
  const descriptionJp = String(formData.get('description_jp') ?? '').trim() || null;
  const accessTierRaw = String(formData.get('access_tier') ?? 'free').trim();
  const accessTier: VaultAccessTier = accessTierRaw === 'premium' ? 'premium' : 'free';
  const displayOrder = Number(formData.get('display_order') ?? 0) || 0;

  const safeName = sanitizeStorageFileName(file.name);
  const fileType = fileTypeFromExtension(safeName);
  const path = `downloads/${contentItemId}/${Date.now()}-${safeName}`;

  // Service role bypasses storage RLS — needed because vault-private has no
  // public write policy. requireAdmin() above already gated this call.
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(VAULT_PRIVATE_BUCKET)
    .upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: row, error: insertError } = await admin
    .from('vault_downloads')
    .insert({
      content_item_id: contentItemId,
      file_name: file.name,           // preserve original name for display
      file_url: path,                  // bucket-relative path
      file_size_bytes: file.size,
      file_type: fileType,
      description_en: descriptionEn,
      description_jp: descriptionJp,
      access_tier: accessTier,
      display_order: displayOrder,
    })
    .select('id')
    .single();

  if (insertError || !row) {
    // Roll back the upload if the row insert failed.
    await admin.storage.from(VAULT_PRIVATE_BUCKET).remove([path]);
    throw new Error(insertError?.message ?? 'Failed to create download row');
  }

  revalidateVault();
  return { id: row.id };
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
