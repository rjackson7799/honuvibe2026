import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';

/** Caller must supply the authenticated user's id, never an id from input. */
export async function reservePathGeneration(userId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc('reserve_study_path_generation', { p_user_id: userId });
  if (error) throw new Error('Could not reserve path generation');
  return data === true;
}
