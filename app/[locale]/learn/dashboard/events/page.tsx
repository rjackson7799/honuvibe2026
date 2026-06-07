import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { getMyInvitedEvents } from '@/lib/events/queries';
import { formatEventDateTime } from '@/lib/events/format';

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
  const events = await getMyInvitedEvents();

  return (
    <div className="max-w-[800px] mx-auto px-5 py-8 space-y-6">
      <header>
        <h1 className="text-[clamp(24px,3vw,32px)] font-bold text-fg-primary tracking-[-0.02em]">
          {t('my_events_title')}
        </h1>
        <p className="text-fg-secondary text-sm mt-1">{t('my_events_subtitle')}</p>
      </header>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default py-12 text-center text-fg-tertiary">
          <CalendarDays size={28} className="mx-auto mb-2 opacity-60" />
          <p className="text-sm">{t('my_events_empty')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            const title = lang === 'ja' ? e.title_jp ?? e.title_en : e.title_en;
            return (
              <li key={e.id}>
                <Link
                  href={`/learn/dashboard/events/${e.slug}`}
                  className="block rounded-xl border border-border-default bg-bg-secondary p-4 hover:border-border-hover transition-colors"
                >
                  <span className="block text-fg-primary font-semibold">{title}</span>
                  <span className="block text-[13px] text-fg-secondary mt-0.5">
                    {formatEventDateTime(e.starts_at, e.timezone, lang)}
                  </span>
                  {e.presenter_name ? (
                    <span className="block text-[12px] text-fg-tertiary mt-0.5">
                      {t('presenter_label')}: {e.presenter_name}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
