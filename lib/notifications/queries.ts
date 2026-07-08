import { createClient } from '@/lib/supabase/server';
import type { NotificationType } from './emit';

export type NotificationRow = {
  id: string;
  type: NotificationType;
  entity_id: string;
  data: Record<string, unknown>;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

/**
 * The current user's notifications, newest first. RLS restricts to own rows;
 * the explicit `user_id` filter is defense-in-depth. Best-effort — returns [] on error.
 */
export async function getNotifications(
  userId: string,
  { limit = 30 }: { limit?: number } = {},
): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, entity_id, data, href, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[notifications] getNotifications failed:', error.message);
    return [];
  }
  return (data ?? []) as NotificationRow[];
}

/** Count of the current user's unread notifications (0 on error — never blocks the header). */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) {
    console.error('[notifications] getUnreadCount failed:', error.message);
    return 0;
  }
  return count ?? 0;
}
