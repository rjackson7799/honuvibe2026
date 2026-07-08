'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Mark all of the current user's unread notifications as read. RLS scopes the
 * UPDATE to the caller's own rows, so no user_id spoofing is possible. Revalidates
 * the dashboard so the header bell badge clears on the next render.
 */
export async function markAllRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  if (error) console.error('[notifications] markAllRead failed:', error.message);

  revalidatePath('/learn/dashboard');
  revalidatePath('/learn/dashboard/notifications');
}
