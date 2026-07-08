import { createAdminClient } from '@/lib/supabase/server';

export type NotificationType = 'session_soon' | 'assignment_due' | 'community_reply';

export type EmitNotificationInput = {
  userId: string;
  type: NotificationType;
  /** session / assignment / comment id — dedup key + linking. */
  entityId: string;
  /** Render params (titles, when, actor name, excerpt). Rendered bilingually at display time. */
  data?: Record<string, unknown>;
  href?: string;
};

/**
 * Insert an in-app notification. Uses the SERVICE-ROLE client (bypasses RLS):
 * the community-reply path writes a row for a *different* user (the post
 * author), and there is deliberately no owner INSERT policy. Idempotent via the
 * `(user_id, type, entity_id)` unique constraint, so a repeat cron pass no-ops.
 * Best-effort — never throws into the caller (mirrors `sendEmail`).
 */
export async function emitNotification(input: EmitNotificationInput): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('notifications').upsert(
      [
        {
          user_id: input.userId,
          type: input.type,
          entity_id: input.entityId,
          data: input.data ?? {},
          href: input.href ?? null,
        },
      ],
      { onConflict: 'user_id,type,entity_id', ignoreDuplicates: true },
    );
    if (error) console.error('[notifications] emit failed:', error.message);
  } catch (err) {
    console.error('[notifications] emit threw:', err);
  }
}
