'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { LibraryVideoCreateInput, LibraryVideoUpdateInput } from './types';

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

export async function createLibraryVideo(
  data: LibraryVideoCreateInput,
): Promise<{ id: string; slug: string }> {
  const supabase = await requireAdmin();

  const { data: video, error } = await supabase
    .from('library_videos')
    .insert({
      slug: data.slug,
      title_en: data.title_en,
      title_jp: data.title_jp ?? null,
      description_en: data.description_en ?? null,
      description_jp: data.description_jp ?? null,
      video_url: data.video_url,
      thumbnail_url: data.thumbnail_url ?? null,
      duration_seconds: data.duration_seconds,
      category: data.category,
      language: data.language ?? 'en',
      access_tier: data.access_tier ?? 'free_account',
      difficulty: data.difficulty ?? 'beginner',
      related_course_id: data.related_course_id ?? null,
      related_resource_slug: data.related_resource_slug ?? null,
      related_glossary_slugs: data.related_glossary_slugs ?? null,
      tags: data.tags ?? null,
      sort_order: data.sort_order ?? 0,
      is_featured: data.is_featured ?? false,
      is_published: false,
    })
    .select('id, slug')
    .single();

  if (error) throw new Error(`Failed to create video: ${error.message}`);

  revalidatePath('/learn/library');
  revalidatePath('/admin/library');

  return { id: video.id, slug: video.slug };
}

export async function updateLibraryVideo(
  videoId: string,
  data: LibraryVideoUpdateInput,
) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('library_videos')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', videoId);

  if (error) throw new Error(`Failed to update video: ${error.message}`);

  revalidatePath('/learn/library');
  revalidatePath('/admin/library');
  revalidatePath(`/admin/library/${videoId}`);
}

export async function publishLibraryVideo(videoId: string) {
  return updateLibraryVideo(videoId, {
    is_published: true,
    published_at: new Date().toISOString(),
  });
}

export async function unpublishLibraryVideo(videoId: string) {
  return updateLibraryVideo(videoId, {
    is_published: false,
  });
}

export async function deleteLibraryVideo(videoId: string) {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('library_videos')
    .delete()
    .eq('id', videoId);

  if (error) throw new Error(`Failed to delete video: ${error.message}`);

  revalidatePath('/learn/library');
  revalidatePath('/admin/library');
}
