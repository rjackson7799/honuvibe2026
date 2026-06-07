'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  sendEventInviteEmail,
  sendEventReminderEmail,
  sendEventRecapEmail,
  type EventEmailResult,
} from '@/lib/email/events';
import { buildEventIcs } from './ics';
import { buildEventInviteRedirect, buildEventUrl } from './links';
import { formatEventDateTime } from './format';
import {
  canSendInvites,
  canSendRecap,
  isReminderEligible,
  validateEventForPublish,
} from './validation';
import type {
  AddInvitationInput,
  AttendanceStatus,
  CreateEventInput,
  EmailKind,
  EventInvitation,
  EventLocale,
  LiveEvent,
  RecapAssetsInput,
  RsvpStatus,
  UpdateEventInput,
} from './types';

// ── helpers ─────────────────────────────────────────────────

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai').replace(/\/$/, '');
}

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

function revalidateEventPaths(opts: { id?: string; slug?: string }): void {
  revalidatePath('/admin/events');
  if (opts.id) revalidatePath(`/admin/events/${opts.id}`);
  revalidatePath('/learn/dashboard/events');
  if (opts.slug) {
    revalidatePath(`/learn/dashboard/events/${opts.slug}`);
    revalidatePath(`/ja/learn/dashboard/events/${opts.slug}`);
  }
}

function localizedTitle(event: LiveEvent, locale: EventLocale): string {
  return locale === 'ja' ? event.title_jp ?? event.title_en : event.title_en;
}

/** Ensure a free-tier auth user exists, then mint a magic link to the event. */
async function provisionMagicLink(
  admin: SupabaseClient,
  email: string,
  slug: string,
  locale: EventLocale,
  origin: string,
): Promise<string | null> {
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (createErr && !/already.*(registered|exists)/i.test(createErr.message)) {
    // Non-duplicate failure — still attempt the link in case the user exists.
    console.error('[events] createUser failed:', createErr.message);
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: buildEventInviteRedirect(origin, slug, locale) },
  });
  if (error || !data.properties?.action_link) {
    console.error('[events] generateLink failed:', error?.message);
    return null;
  }
  return data.properties.action_link;
}

async function sendOneEventEmail(
  admin: SupabaseClient,
  event: LiveEvent,
  invitation: Pick<EventInvitation, 'email' | 'locale'>,
  kind: EmailKind,
  origin: string,
): Promise<EventEmailResult> {
  const locale = invitation.locale;
  const title = localizedTitle(event, locale);
  const whenText = formatEventDateTime(event.starts_at, event.timezone, locale);

  const ctaUrl = await provisionMagicLink(admin, invitation.email, event.slug, locale, origin);
  if (!ctaUrl) return { ok: false, error: 'magic link generation failed' };

  const { data: profile } = await admin
    .from('users')
    .select('full_name')
    .eq('email', invitation.email)
    .maybeSingle();

  const base = {
    to: invitation.email,
    fullName: profile?.full_name ?? null,
    locale,
    eventTitle: title,
    presenterName: event.presenter_name,
    whenText,
    ctaUrl,
  };

  if (kind === 'invite') {
    const ics = buildEventIcs({
      uid: `${event.id}@honuvibe.ai`,
      title,
      description: locale === 'ja' ? event.description_jp ?? undefined : event.description_en ?? undefined,
      startsAt: new Date(event.starts_at),
      endsAt: event.ends_at ? new Date(event.ends_at) : null,
      eventPageUrl: buildEventUrl(origin, event.slug, locale),
    });
    return sendEventInviteEmail({ ...base, icsContent: ics });
  }
  if (kind === 'reminder') return sendEventReminderEmail(base);
  return sendEventRecapEmail(base);
}

async function getEventOrThrow(admin: SupabaseClient, eventId: string): Promise<LiveEvent> {
  const { data, error } = await admin
    .from('live_events')
    .select('*')
    .eq('id', eventId)
    .single();
  if (error || !data) throw new Error('Event not found');
  return data as LiveEvent;
}

// ── event CRUD ──────────────────────────────────────────────

export async function createEvent(input: CreateEventInput): Promise<{ id: string; slug: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('live_events')
    .insert({ ...input, timezone: input.timezone ?? 'Pacific/Honolulu' })
    .select('id, slug')
    .single();
  if (error) throw error;
  revalidateEventPaths({ id: data.id, slug: data.slug });
  return { id: data.id, slug: data.slug };
}

export async function updateEvent(id: string, updates: UpdateEventInput): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('live_events')
    .update(updates)
    .eq('id', id)
    .select('slug')
    .single();
  if (error) throw error;
  revalidateEventPaths({ id, slug: data?.slug });
}

export async function publishEvent(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const event = await getEventOrThrow(admin, id);
  const errors = validateEventForPublish(event);
  if (errors.length) throw new Error(`Cannot publish — ${errors.join(' ')}`);
  const { error } = await admin
    .from('live_events')
    .update({ is_published: true, status: event.status === 'draft' ? 'scheduled' : event.status })
    .eq('id', id);
  if (error) throw error;
  revalidateEventPaths({ id, slug: event.slug });
}

export async function unpublishEvent(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('live_events')
    .update({ is_published: false, status: 'draft' })
    .eq('id', id)
    .select('slug')
    .single();
  if (error) throw error;
  revalidateEventPaths({ id, slug: data?.slug });
}

export async function cancelEvent(id: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('live_events')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('slug')
    .single();
  if (error) throw error;
  revalidateEventPaths({ id, slug: data?.slug });
}

// ── recap ───────────────────────────────────────────────────

export async function upsertRecapAssets(eventId: string, input: RecapAssetsInput): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('live_event_recap_assets')
    .upsert(
      { event_id: eventId, ...input, updated_at: new Date().toISOString() },
      { onConflict: 'event_id' },
    );
  if (error) throw error;
  const event = await getEventOrThrow(admin, eventId);
  revalidateEventPaths({ id: eventId, slug: event.slug });
}

export async function setRecapPublished(eventId: string, value: boolean): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('live_events')
    .update({ recap_published: value })
    .eq('id', eventId)
    .select('slug')
    .single();
  if (error) throw error;
  revalidateEventPaths({ id: eventId, slug: data?.slug });
}

// ── invitations ─────────────────────────────────────────────

export async function addInvitations(
  eventId: string,
  invitees: AddInvitationInput[],
): Promise<{ added: number }> {
  await requireAdmin();
  const admin = createAdminClient();

  const seen = new Set<string>();
  const rows = invitees
    .map((i) => ({ email: i.email.trim().toLowerCase(), locale: i.locale ?? 'en' }))
    .filter((i) => i.email.length > 0 && /.+@.+\..+/.test(i.email))
    .filter((i) => (seen.has(i.email) ? false : (seen.add(i.email), true)));

  if (rows.length === 0) return { added: 0 };

  const { error } = await admin
    .from('event_invitations')
    .upsert(
      rows.map((r) => ({ event_id: eventId, email: r.email, locale: r.locale })),
      { onConflict: 'event_id,email', ignoreDuplicates: true },
    );
  if (error) throw error;

  // Best-effort backfill of user_id for emails that already have accounts.
  const { data: existingUsers } = await admin
    .from('users')
    .select('id, email')
    .in('email', rows.map((r) => r.email));
  for (const u of existingUsers ?? []) {
    await admin
      .from('event_invitations')
      .update({ user_id: u.id })
      .eq('event_id', eventId)
      .eq('email', (u.email as string).toLowerCase());
  }

  revalidateEventPaths({ id: eventId });
  return { added: rows.length };
}

export async function removeInvitation(invitationId: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('event_invitations').delete().eq('id', invitationId);
  if (error) throw error;
  revalidatePath('/admin/events');
}

export async function markAttendance(
  invitationId: string,
  status: AttendanceStatus,
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('event_invitations')
    .update({ attendance_status: status, attendance_marked_at: new Date().toISOString() })
    .eq('id', invitationId);
  if (error) throw error;
  revalidatePath('/admin/events');
}

/**
 * Invitee RSVP — the one invitee-writable path. RLS keeps event_invitations
 * admin-write, so this runs with the service-role client AFTER verifying the
 * caller owns the invitation, and writes only status + rsvp_at (+ backfill).
 */
export async function setRsvp(invitationId: string, status: RsvpStatus): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const callerEmail = user.email?.toLowerCase() ?? '';

  const admin = createAdminClient();
  const { data: inv } = await admin
    .from('event_invitations')
    .select('id, user_id, email, event_id')
    .eq('id', invitationId)
    .maybeSingle();
  if (!inv) throw new Error('Invitation not found');

  const owns =
    inv.user_id === user.id || (inv.email as string).toLowerCase() === callerEmail;
  if (!owns) throw new Error('Not authorized');

  const { error } = await admin
    .from('event_invitations')
    .update({ status, rsvp_at: new Date().toISOString(), user_id: inv.user_id ?? user.id })
    .eq('id', invitationId);
  if (error) throw error;

  const { data: event } = await admin
    .from('live_events')
    .select('slug')
    .eq('id', inv.event_id)
    .maybeSingle();
  revalidateEventPaths({ slug: event?.slug });
}

// ── sends ───────────────────────────────────────────────────

async function stampSend(
  admin: SupabaseClient,
  invitationId: string,
  kind: EmailKind,
  result: EventEmailResult,
): Promise<void> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    last_email_status: result.ok ? 'sent' : 'failed',
    last_email_error: result.ok ? null : result.error ?? 'unknown error',
  };
  if (kind === 'invite') patch.invite_sent_at = now;
  if (kind === 'reminder') patch.reminder_sent_at = now;
  if (kind === 'recap') patch.recap_sent_at = now;
  await admin.from('event_invitations').update(patch).eq('id', invitationId);
}

async function sendBatch(
  eventId: string,
  kind: EmailKind,
  eligible: (inv: EventInvitation) => boolean,
): Promise<{ sent: number; failed: number; skipped: number }> {
  await requireAdmin();
  const admin = createAdminClient();
  const event = await getEventOrThrow(admin, eventId);

  if (kind === 'invite' && !canSendInvites(event)) {
    throw new Error('Publish the event (and ensure it is not cancelled) before sending invites.');
  }
  if (kind === 'reminder' && !canSendInvites(event)) {
    throw new Error('Reminders can only be sent for a published, non-cancelled event.');
  }
  if (kind === 'recap' && !canSendRecap(event)) {
    throw new Error('Publish the recap before sending the recap email.');
  }

  const { data: invitations } = await admin
    .from('event_invitations')
    .select('*')
    .eq('event_id', eventId);

  const origin = siteOrigin();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const inv of (invitations ?? []) as EventInvitation[]) {
    if (!eligible(inv)) {
      skipped += 1;
      continue;
    }
    const result = await sendOneEventEmail(admin, event, inv, kind, origin);
    await stampSend(admin, inv.id, kind, result);
    if (result.ok) sent += 1;
    else failed += 1;
  }

  revalidateEventPaths({ id: eventId, slug: event.slug });
  return { sent, failed, skipped };
}

export async function sendInvites(eventId: string) {
  return sendBatch(eventId, 'invite', () => true);
}

export async function sendReminder(eventId: string) {
  return sendBatch(eventId, 'reminder', (inv) => isReminderEligible(inv));
}

export async function sendRecap(eventId: string) {
  return sendBatch(eventId, 'recap', () => true);
}

/** Sends a single sample of the chosen email kind to the signed-in admin. */
export async function sendTestEmail(eventId: string, kind: EmailKind): Promise<EventEmailResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Not authenticated');
  await requireAdmin();

  const admin = createAdminClient();
  const event = await getEventOrThrow(admin, eventId);
  return sendOneEventEmail(
    admin,
    event,
    { email: user.email.toLowerCase(), locale: 'en' },
    kind,
    siteOrigin(),
  );
}
