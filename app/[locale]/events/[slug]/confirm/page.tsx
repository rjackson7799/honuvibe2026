import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { CheckCircle2, XCircle, Clock, CalendarPlus, Video } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import {
  publicEventBySlug,
  publicEventTitle,
  publicEventFormat,
} from '@/lib/events/public-events';
import { formatEventDateTime } from '@/lib/events/format';
import { getOpenEventSurvey } from '@/lib/survey/event-surveys';
import {
  sendEventRsvpConfirmation,
  sendEventRsvpAdminNotification,
} from '@/lib/email/send';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ token?: string }>;
};

// 'confirmed' = newly confirmed (email sent); 'already' = idempotent repeat.
type ClaimResult = 'confirmed' | 'already' | 'full' | 'expired' | 'cancelled' | 'not_found';

export const metadata = { title: 'Confirm your seat — HonuVibe.AI' };

export default async function ConfirmPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const lang = locale === 'ja' ? 'ja' : 'en';

  const event = publicEventBySlug(slug);
  if (!event) notFound();

  const t = await getTranslations('public_events');

  let result: ClaimResult = 'not_found';
  let surveyUrl: string | null = null;

  if (token && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('claim_event_seat', {
      p_slug: slug,
      p_token: token,
      p_capacity: event.capacity,
    });
    if (error) {
      console.error('[Event Confirm] claim_event_seat failed:', error.message);
    } else {
      result = (data as ClaimResult) ?? 'not_found';
    }

    // Surface the pre-event survey (if one is open) to confirmed registrants.
    if (result === 'confirmed' || result === 'already') {
      const openSurvey = await getOpenEventSurvey(slug);
      if (openSurvey) {
        const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
        surveyUrl = `${base}/${lang === 'ja' ? 'ja/' : ''}events/${slug}/survey?token=${token}`;
      }
    }

    // Only email on the FIRST confirmation, never on an 'already' refresh.
    if (result === 'confirmed') {
      const { data: row } = await supabase
        .from('event_rsvps')
        .select('email, full_name, locale, referral_source')
        .eq('confirm_token', token)
        .maybeSingle();
      const { count } = await supabase
        .from('event_rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_slug', slug)
        .in('status', ['confirmed', 'attended', 'no_show']);
      const seatsRemaining = Math.max(0, event.capacity - (count ?? 0));

      if (row) {
        const rlang = row.locale === 'ja' ? 'ja' : 'en';
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
        after(async () => {
          await Promise.all([
            sendEventRsvpConfirmation({
              locale: rlang,
              email: row.email,
              fullName: row.full_name,
              eventSlug: event.slug,
              eventTitle: publicEventTitle(event, rlang),
              eventWhen: formatEventDateTime(event.startsAt, event.timezone, rlang),
              eventFormat: publicEventFormat(event, rlang),
              eventPageUrl: `${siteUrl}/${rlang === 'ja' ? 'ja/' : ''}events/${event.slug}`,
              meetingUrl: event.meetingUrl ?? null,
              startsAt: event.startsAt,
              endsAt: event.endsAt ?? null,
              surveyUrl: surveyUrl ?? undefined,
            }),
            sendEventRsvpAdminNotification({
              locale: rlang,
              email: row.email,
              fullName: row.full_name,
              eventSlug: event.slug,
              eventTitle: publicEventTitle(event, rlang),
              referralSource: row.referral_source ?? null,
              seatsRemaining,
            }),
          ]);
        });
      }
    }
  }

  const success = result === 'confirmed' || result === 'already';

  const STATES: Record<
    Exclude<ClaimResult, 'already'>,
    { title: string; body: string; tone: 'ok' | 'warn' | 'err' }
  > = {
    confirmed: { title: t('confirm_ok_title'), body: t('confirm_ok_body'), tone: 'ok' },
    full: { title: t('full_title'), body: t('full_body'), tone: 'warn' },
    expired: { title: t('confirm_expired_title'), body: t('confirm_expired_body'), tone: 'warn' },
    cancelled: {
      title: t('confirm_cancelled_title'),
      body: t('confirm_cancelled_body'),
      tone: 'warn',
    },
    not_found: { title: t('confirm_invalid_title'), body: t('confirm_invalid_body'), tone: 'err' },
  };
  const state = STATES[result === 'already' ? 'confirmed' : result];

  const Icon = state.tone === 'ok' ? CheckCircle2 : state.tone === 'warn' ? Clock : XCircle;
  const iconColor =
    state.tone === 'ok' ? 'var(--m-accent-teal)' : 'var(--m-accent-coral)';

  const calendarHref = `/api/events/${event.slug}/calendar?lang=${lang}`;

  return (
    <div
      data-shell="marketing"
      className="learn-zone flex min-h-screen flex-col items-center justify-center px-6 py-16"
      style={{ backgroundColor: 'var(--m-canvas)' }}
    >
      <div className="w-full max-w-[480px] text-center">
        <span className="mb-8 inline-block text-lg font-semibold tracking-tight" style={{ color: 'var(--m-ink-primary)' }}>
          HonuVibe<span style={{ color: 'var(--m-accent-teal)' }}>.AI</span>
        </span>

        <div
          className="rounded-[18px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-8 shadow-[var(--m-shadow-md)]"
        >
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(15,169,160,0.1)' }}
          >
            <Icon size={28} strokeWidth={2} style={{ color: iconColor }} aria-hidden />
          </div>
          <h1 className="mb-2 text-[22px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
            {state.title}
          </h1>
          <p className="text-[15px] leading-[1.6] text-[var(--m-ink-secondary)]">{state.body}</p>

          {success ? (
            <div className="mt-6 flex flex-col gap-2.5">
              {event.meetingUrl ? (
                <a
                  href={event.meetingUrl}
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--m-accent-teal)] px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[var(--m-accent-teal-dark)]"
                >
                  <Video size={16} strokeWidth={2} /> {t('join_cta')}
                </a>
              ) : null}
              <a
                href={calendarHref}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-[var(--m-border-strong)] px-6 py-3.5 text-[15px] font-semibold text-[var(--m-ink-primary)] transition-colors hover:border-[var(--m-accent-teal)]"
              >
                <CalendarPlus size={16} strokeWidth={2} /> {t('add_to_calendar')}
              </a>
              {surveyUrl ? (
                <a
                  href={surveyUrl}
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] px-6 py-3 text-[14px] font-medium text-[var(--m-accent-teal)] transition-colors hover:underline"
                >
                  {lang === 'ja' ? '事前アンケートに答える →' : 'Take the pre-event survey →'}
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6">
            <Link
              href={`/events/${event.slug}`}
              className="text-[13px] font-medium text-[var(--m-accent-teal)] hover:underline"
            >
              {t('back_to_event')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
