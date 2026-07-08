'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendPresenterSummary } from '@/lib/survey/send-presenter-summary';

/** Re-check admin server-side — server actions can be called outside the page. */
async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Not authorized');
}

/** Delete a public-event registration (honors an APPI/GDPR erasure request). */
export async function deleteEventRsvp(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('event_rsvps').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/admin/event-registrations');
}

/** Manually (re)send the pre-event survey summary to the presenter. */
export async function sendPresenterSummaryAction(
  eventSlug: string,
): Promise<{ sent: boolean; reason?: string }> {
  await requireAdmin();
  const res = await sendPresenterSummary(eventSlug, 'manual', { force: true });
  revalidatePath('/admin/event-registrations');
  return res;
}
