import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LangToggle } from '@/components/layout/lang-toggle';
import { EventRegistrationForm } from '@/components/events/EventRegistrationForm';
import { createAdminClient } from '@/lib/supabase/server';
import {
  publicEventBySlug,
  publicEventTitle,
  publicEventBlurb,
  publicEventDescription,
  publicEventFormat,
  publicEventPresenterTitle,
  publicEventPresenterBio,
  publicEventLearnPoints,
  eventRegistrationState,
} from '@/lib/events/public-events';

// Seat count must be fresh per request — never statically cached.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const event = publicEventBySlug(slug);
  if (!event) return { title: 'Event — HonuVibe.AI' };
  const lang = locale === 'ja' ? 'ja' : 'en';
  return {
    title: `${publicEventTitle(event, lang)} — HonuVibe.AI`,
    description: publicEventBlurb(event, lang),
  };
}

export default async function PublicEventPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const lang = locale === 'ja' ? 'ja' : 'en';

  const event = publicEventBySlug(slug);
  if (!event) notFound();

  const t = await getTranslations('public_events');
  const tAuth = await getTranslations('auth');

  // Live seat count (service-role). Only confirmed/attended/no_show consume a seat.
  // Fail CLOSED if the service role is absent — never render "open" without a count.
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  let taken = 0;
  if (configured) {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from('event_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_slug', event.slug)
      .in('status', ['confirmed', 'attended', 'no_show']);
    taken = count ?? 0;
  }
  const seatsLeft = Math.max(0, event.capacity - taken);
  const regState = eventRegistrationState(event);

  // What to show in the form slot: a closed/unavailable notice, or the form.
  const notice = !configured
    ? { title: t('unavailable_title'), body: t('unavailable_body') }
    : regState === 'ended'
      ? { title: t('event_ended_title'), body: t('event_ended_body') }
      : regState === 'closed'
        ? { title: t('registration_closed_title'), body: t('registration_closed_body') }
        : null;

  const title = publicEventTitle(event, lang);
  const description = publicEventDescription(event, lang);
  const presenterTitle = publicEventPresenterTitle(event, lang);
  const presenterBio = publicEventPresenterBio(event, lang);
  const learnPoints = publicEventLearnPoints(event, lang);

  // Date + time formatted in the event's own timezone, localized to the reader.
  const localeTag = lang === 'ja' ? 'ja-JP' : 'en-US';
  const start = new Date(event.startsAt);
  const dateStr = new Intl.DateTimeFormat(localeTag, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: event.timezone,
  }).format(start);
  const timeOnly = new Intl.DateTimeFormat(localeTag, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone,
  });
  const timeTz = new Intl.DateTimeFormat(localeTag, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: event.timezone,
  });
  const timeStr = event.endsAt
    ? `${timeOnly.format(start)}–${timeTz.format(new Date(event.endsAt))}`
    : timeTz.format(start);

  const metaItems = [
    { label: t('meta_date'), value: dateStr },
    { label: t('meta_time'), value: timeStr },
    { label: t('meta_format'), value: publicEventFormat(event, lang) },
    { label: t('meta_seats'), value: t('seats_max', { capacity: event.capacity }) },
  ];

  return (
    <div data-shell="marketing" className="learn-zone min-h-screen grid lg:grid-cols-2">
      {/* LEFT — dark detail panel (matches /learn/auth). Visible on mobile too,
          stacked above the form, since event details are not skippable. */}
      <aside
        className="relative flex flex-col gap-8 overflow-hidden px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16 xl:px-16"
        style={{ backgroundColor: 'var(--m-ink-primary)' }}
      >
        {/* Top row: back link + overline */}
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} aria-hidden /> {t('back_to_site')}
          </Link>
          <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--m-accent-teal)' }}
            />
            <span>{tAuth('overline')}</span>
            <span className="text-white/30">·</span>
            <span>{tAuth('overline_alt')}</span>
          </div>
        </div>

        {/* Title */}
        <div className="max-w-[560px]">
          <span className="mb-4 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white/80">
            {t('free_event_label')}
          </span>
          <h1
            className="font-serif leading-[1.02] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(34px, 4.4vw, 56px)' }}
          >
            {title}
          </h1>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/12 pt-6 sm:grid-cols-4">
          {metaItems.map((m) => (
            <div key={m.label}>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
                {m.label}
              </p>
              <p className="text-[14px] font-medium leading-snug text-white/90">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        {description ? (
          <p className="max-w-[560px] whitespace-pre-line text-[15px] leading-[1.7] text-white/75">
            {description}
          </p>
        ) : null}

        {/* Presenter */}
        {event.presenterName ? (
          <div className="border-t border-white/12 pt-6">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
              {t('presenter_overline')}
            </p>
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold text-white"
                style={{ backgroundColor: 'var(--m-accent-teal)' }}
                aria-hidden
              >
                {event.presenterName.charAt(0)}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white">{event.presenterName}</p>
                {presenterTitle ? (
                  <p className="text-[13px] text-[var(--m-accent-teal)]">{presenterTitle}</p>
                ) : null}
                {presenterBio ? (
                  <p className="mt-2 max-w-[460px] text-[14px] leading-[1.6] text-white/70">
                    {presenterBio}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* What you'll learn */}
        {learnPoints.length > 0 ? (
          <div className="border-t border-white/12 pt-6">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
              {t('learn_heading')}
            </p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {learnPoints.map((point) => (
                <li key={point} className="flex gap-2.5 text-[14px] leading-[1.55] text-white/85">
                  <span className="mt-0.5 text-[var(--m-accent-teal)]" aria-hidden>
                    →
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>

      {/* RIGHT — light form panel */}
      <main
        className="relative flex flex-col px-6 py-10 sm:px-10 lg:px-12 lg:[justify-content:safe_center] xl:px-16"
        style={{ backgroundColor: 'var(--m-canvas)' }}
      >
        {/* Top row: wordmark + locale toggle */}
        <div className="mb-8 flex items-center justify-between">
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ color: 'var(--m-ink-primary)' }}
          >
            HonuVibe<span style={{ color: 'var(--m-accent-teal)' }}>.AI</span>
          </span>
          <LangToggle />
        </div>

        <div className="mx-auto w-full max-w-[460px]">
          {notice ? (
            <div className="rounded-[16px] border border-[var(--m-border-soft)] bg-[var(--m-sand)] p-6 text-center md:p-8">
              <h2 className="mb-2 text-[20px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
                {notice.title}
              </h2>
              <p className="text-[15px] leading-[1.6] text-[var(--m-ink-secondary)]">
                {notice.body}
              </p>
            </div>
          ) : (
            <EventRegistrationForm
              eventSlug={event.slug}
              locale={lang}
              capacity={event.capacity}
              seatsLeft={seatsLeft}
            />
          )}

          <p
            className="mt-5 text-center text-[11.5px] leading-snug"
            style={{ color: 'var(--m-ink-tertiary)' }}
          >
            {tAuth.rich('legal_acknowledgment', {
              terms: (chunks) => (
                <Link
                  href="/terms"
                  className="underline-offset-2 hover:underline"
                  style={{ color: 'var(--m-accent-teal)' }}
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href="/privacy"
                  className="underline-offset-2 hover:underline"
                  style={{ color: 'var(--m-accent-teal)' }}
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </main>
    </div>
  );
}
