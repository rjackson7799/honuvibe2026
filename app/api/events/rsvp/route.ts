import { NextResponse, after, type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { tryConsume } from '@/lib/community/rate-limit';
import { createAdminClient } from '@/lib/supabase/server';
import {
  publicEventBySlug,
  publicEventTitle,
  publicEventFormat,
  eventRegistrationState,
} from '@/lib/events/public-events';
import { formatEventDateTime } from '@/lib/events/format';
import { sendEventConfirmRequest } from '@/lib/email/send';

// Keep in sync with the referral_source CHECK in migration 048 and the form chips.
const REFERRAL_SOURCES = [
  'newsletter',
  'linkedin',
  'friend',
  'twitter_x',
  'search',
  'website',
] as const;

const schema = z.object({
  event_slug: z.string().min(1).max(100),
  full_name: z.string().min(1).max(200),
  email: z.string().email(),
  referral_source: z
    .union([z.enum(REFERRAL_SOURCES), z.literal('')])
    .nullish()
    .transform((v) => v || null),
  newsletter_opt_in: z.boolean().optional().default(false),
  source_locale: z.enum(['en', 'ja']).default('en'),
  // Honeypot — must stay empty.
  company_url: z.string().optional(),
});

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 8;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // per-email confirm-email throttle

/** Best-effort Beehiiv subscribe for the optional newsletter opt-in. */
async function subscribeNewsletter(email: string): Promise<void> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;
  if (!apiKey || !publicationId) return;
  try {
    await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
        utm_source: 'event-rsvp',
        utm_medium: 'website',
      }),
    });
  } catch (err) {
    console.error('[Event RSVP] newsletter subscribe failed:', err);
  }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  // Layer 1: per-IP rate limit (instance-local, best-effort).
  if (!tryConsume(`event-rsvp:${ip}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Honeypot tripped → pretend success, do nothing.
  if (d.company_url && d.company_url.trim() !== '') {
    return NextResponse.json({ success: true, pending: true });
  }

  // Event is code-defined; reject unknown slugs and closed/ended registration.
  const event = publicEventBySlug(d.event_slug);
  if (!event) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 404 });
  }
  if (eventRegistrationState(event) !== 'open') {
    return NextResponse.json({ error: 'closed' }, { status: 403 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Event RSVP] Supabase env missing — cannot record RSVP.');
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  const supabase = createAdminClient();

  const email = d.email.toLowerCase().trim();
  const fullName = d.full_name.trim();
  const lang = d.source_locale;
  const confirmDeadline = event.startsAt; // confirmation cutoff = event start
  const eventEndsAt = event.endsAt ?? event.startsAt;
  const nowIso = new Date().toISOString();

  const { data: existing, error: selErr } = await supabase
    .from('event_rsvps')
    .select('id, status, confirm_token, last_confirm_email_at, newsletter_opt_in')
    .eq('event_slug', d.event_slug)
    .eq('email', email)
    .maybeSingle();
  if (selErr) {
    console.error('[Event RSVP] Lookup failed:', selErr.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  let token: string;
  let sendConfirm = true;
  let alreadyConfirmed = false;

  if (!existing) {
    token = randomUUID();
    const { error } = await supabase.from('event_rsvps').insert({
      event_slug: d.event_slug,
      full_name: fullName,
      email,
      referral_source: d.referral_source,
      locale: lang,
      status: 'pending',
      confirm_token: token,
      confirm_deadline: confirmDeadline,
      event_ends_at: eventEndsAt,
      newsletter_opt_in: d.newsletter_opt_in,
      last_confirm_email_at: nowIso,
    });
    if (error) {
      // Concurrent insert of the same email won the unique race — their email is
      // already on the way; treat as success.
      if (error.code === '23505') {
        return NextResponse.json({ success: true, pending: true });
      }
      console.error('[Event RSVP] Insert failed:', error.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  } else if (
    existing.status === 'confirmed' ||
    existing.status === 'attended' ||
    existing.status === 'no_show'
  ) {
    // Already holds a seat — never downgrade. Idempotent; only upgrade consent.
    alreadyConfirmed = true;
    sendConfirm = false;
    token = existing.confirm_token;
    if (d.newsletter_opt_in && !existing.newsletter_opt_in) {
      await supabase.from('event_rsvps').update({ newsletter_opt_in: true }).eq('id', existing.id);
    }
  } else {
    // pending or cancelled → (re)activate to pending, rotate token, refresh deadline.
    // Per-email durable throttle (survives across instances).
    if (
      existing.last_confirm_email_at &&
      Date.now() - new Date(existing.last_confirm_email_at).getTime() < RESEND_COOLDOWN_MS
    ) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
    token = randomUUID();
    const { error } = await supabase
      .from('event_rsvps')
      .update({
        status: 'pending',
        confirm_token: token,
        confirm_deadline: confirmDeadline,
        event_ends_at: eventEndsAt,
        newsletter_opt_in: existing.newsletter_opt_in || d.newsletter_opt_in,
        full_name: fullName,
        referral_source: d.referral_source,
        locale: lang,
        confirmed_at: null,
        last_confirm_email_at: nowIso,
      })
      .eq('id', existing.id);
    if (error) {
      console.error('[Event RSVP] Update failed:', error.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
  const confirmUrl = `${siteUrl}/${lang === 'ja' ? 'ja/' : ''}events/${event.slug}/confirm?token=${token}`;
  const eventTitle = publicEventTitle(event, lang);
  const eventWhen = formatEventDateTime(event.startsAt, event.timezone, lang);
  const eventFormat = publicEventFormat(event, lang);

  // Post-response work (reliable on Fluid Compute, unlike fire-and-forget).
  after(async () => {
    if (sendConfirm) {
      await sendEventConfirmRequest({
        locale: lang,
        email,
        fullName,
        eventTitle,
        eventWhen,
        eventFormat,
        confirmUrl,
      });
    }
    if (d.newsletter_opt_in) {
      await subscribeNewsletter(email);
    }
  });

  return NextResponse.json({ success: true, pending: !alreadyConfirmed, alreadyConfirmed });
}
