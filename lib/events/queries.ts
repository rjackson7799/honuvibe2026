import { createClient, createAdminClient } from '@/lib/supabase/server';
import type {
  AdminEventDetail,
  EventRecapAssets,
  LiveEvent,
} from './types';

export interface AdminEventListItem extends LiveEvent {
  invite_count: number;
  going_count: number;
}

/** Admin list with invite + RSVP counts. Uses the service-role client. */
export async function getAdminEvents(): Promise<AdminEventListItem[]> {
  const admin = createAdminClient();
  const { data: events, error } = await admin
    .from('live_events')
    .select('*')
    .order('starts_at', { ascending: false });
  if (error) throw error;

  const { data: invites } = await admin
    .from('event_invitations')
    .select('event_id, status');

  const counts = new Map<string, { invite: number; going: number }>();
  for (const i of invites ?? []) {
    const c = counts.get(i.event_id) ?? { invite: 0, going: 0 };
    c.invite += 1;
    if (i.status === 'going') c.going += 1;
    counts.set(i.event_id, c);
  }

  return (events ?? []).map((e) => ({
    ...(e as LiveEvent),
    invite_count: counts.get(e.id)?.invite ?? 0,
    going_count: counts.get(e.id)?.going ?? 0,
  }));
}

/** Admin detail: event + recap assets + invitations. */
export async function getAdminEventById(id: string): Promise<AdminEventDetail | null> {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from('live_events')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!event) return null;

  const { data: recap } = await admin
    .from('live_event_recap_assets')
    .select('*')
    .eq('event_id', id)
    .maybeSingle();

  const { data: invitations } = await admin
    .from('event_invitations')
    .select('*')
    .eq('event_id', id)
    .order('invited_at', { ascending: true });

  return {
    event: event as LiveEvent,
    recap: (recap as EventRecapAssets | null) ?? null,
    invitations: invitations ?? [],
  };
}

/**
 * Invitee event page. Uses the SESSION client so RLS applies — a non-invitee or
 * an unpublished event yields null (the page then calls notFound()). Recap is
 * only fetched (and RLS-readable) once recap_published.
 */
export async function getEventForInvitee(
  slug: string,
): Promise<{ event: LiveEvent; recap: EventRecapAssets | null } | null> {
  const supabase = await createClient();
  const { data: event } = await supabase
    .from('live_events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (!event) return null;

  let recap: EventRecapAssets | null = null;
  if (event.recap_published) {
    const { data } = await supabase
      .from('live_event_recap_assets')
      .select('*')
      .eq('event_id', event.id)
      .maybeSingle();
    recap = (data as EventRecapAssets | null) ?? null;
  }

  return { event: event as LiveEvent, recap };
}

/** The signed-in user's invitation for an event (for the RSVP control). */
export async function getMyInvitation(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('event_invitations')
    .select('id, status, attendance_status')
    .eq('event_id', eventId)
    .maybeSingle();
  return data;
}

/** Published events the signed-in user is invited to (RLS-filtered). */
export async function getMyInvitedEvents(): Promise<LiveEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('live_events')
    .select('*')
    .eq('is_published', true)
    .order('starts_at', { ascending: true });
  return (data as LiveEvent[] | null) ?? [];
}
