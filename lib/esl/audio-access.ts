import type { SupabaseClient } from '@supabase/supabase-js';
import type { ESLAudio } from './types';

/** Use the caller's storage permissions; never reuse historical public URLs. */
export async function signLessonAudio(supabase: SupabaseClient, rows: ESLAudio[]): Promise<ESLAudio[]> {
  if (rows.length === 0) return [];
  const { data: signed, error } = await supabase.storage.from('esl-audio')
    .createSignedUrls(rows.map((row) => row.storage_path), 3600);
  if (error || signed?.some((entry) => entry.error)) throw new Error('Could not authorize lesson audio');
  const urls = new Map((signed ?? []).map((entry) => [entry.path, entry.signedUrl]));
  if (rows.some((row) => !urls.get(row.storage_path))) throw new Error('Could not authorize lesson audio');
  return rows.map((row) => ({ ...row, public_url: urls.get(row.storage_path)! }));
}
