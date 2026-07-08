import { createAdminClient } from '@/lib/supabase/server';

/** A row of public.event_rsvps (migration 048) — a public-event registration. */
export interface PublicEventRsvpRow {
  id: string;
  created_at: string;
  event_slug: string;
  full_name: string;
  email: string;
  referral_source: string | null;
  locale: string;
  status: string;
}

/**
 * Admin-only: every public-event registration, newest first. Uses the
 * service-role client (the table's RLS denies all non-admin access).
 */
export async function getPublicEventRsvps(): Promise<PublicEventRsvpRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('event_rsvps')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PublicEventRsvpRow[];
}
