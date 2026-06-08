import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { getMyInvitedEventsWithRsvp } from '@/lib/events/queries';
import { formatEventDateTime } from '@/lib/events/format';
import { RsvpStatusPill } from '@/components/events/RsvpStatusPill';
import { DashboardPageHeader } from '@/components/learn/DashboardPageHeader';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'My Events — HonuVibe.AI',
};

export default async function MyEventsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = locale === 'ja' ? 'ja' : 'en';
  const t = await getTranslations('events');
  const events = await getMyInvitedEventsWithRsvp();

  return (
    <div className="max-w-[800px] mx-auto px-5 py-8 space-y-6">
      <DashboardPageHeader
        icon={CalendarDays}
        title={t('my_events_title')}
        subtitle={t('my_events_subtitle')}
        count={events.length > 0 ? t('events_count', { count: events.length }) : undefined}
      />

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default py-12 text-center text-fg-tertiary">
          <CalendarDays size={28} className="mx-auto mb-2 opacity-60" />
          <p className="text-sm">{t('my_events_empty')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map(({ event: e, status }) => {
            const title = lang === 'ja' ? e.title_jp ?? e.title_en : e.title_en;
            return (
              <li key={e.id}>
                <Link
                  href={`/learn/dashboard/events/${e.slug}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border-default bg-bg-secondary p-4 hover:border-border-hover transition-colors"
                >
                  <div className="min-w-0">
                    <span className="block text-fg-primary font-semibold">{title}</span>
                    <span className="block text-[13px] text-fg-secondary mt-0.5">
                      {formatEventDateTime(e.starts_at, e.timezone, lang)}
                    </span>
                    {e.presenter_name ? (
                      <span className="block text-[12px] text-fg-tertiary mt-0.5">
                        {t('presenter_label')}: {e.presenter_name}
                      </span>
                    ) : null}
                  </div>
                  <RsvpStatusPill
                    status={status}
                    labels={{
                      needed: t('status_needed'),
                      going: t('badge_going'),
                      notGoing: t('badge_not_going'),
                    }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
