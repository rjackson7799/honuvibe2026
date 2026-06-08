import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { formatEventDateTime } from '@/lib/events/format';
import type { EventLocale, LiveEvent, RsvpStatus } from '@/lib/events/types';
import { RsvpStatusPill } from './RsvpStatusPill';

export function DashboardUpcomingEvents({
  items,
  lang,
  labels,
}: {
  items: Array<{ event: LiveEvent; status: RsvpStatus }>;
  lang: EventLocale;
  labels: { heading: string; needed: string; going: string; notGoing: string };
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-[14px] border border-border-default bg-bg-secondary p-5">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays size={17} className="text-[color:var(--accent-teal)]" />
        <h2 className="text-[15px] font-semibold text-fg-primary">{labels.heading}</h2>
      </div>
      <ul className="divide-y divide-border-default">
        {items.map(({ event, status }) => {
          const title = lang === 'ja' ? event.title_jp ?? event.title_en : event.title_en;
          return (
            <li key={event.id}>
              <Link
                href={`/learn/dashboard/events/${event.slug}`}
                className="flex items-center justify-between gap-3 py-3 group"
              >
                <div className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-fg-primary truncate group-hover:text-[color:var(--accent-teal)] transition-colors">
                    {title}
                  </span>
                  <span className="block text-[12px] text-fg-tertiary truncate">
                    {formatEventDateTime(event.starts_at, event.timezone, lang)}
                    {event.presenter_name ? ` · ${event.presenter_name}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RsvpStatusPill
                    status={status}
                    labels={{ needed: labels.needed, going: labels.going, notGoing: labels.notGoing }}
                  />
                  <ChevronRight size={15} className="text-fg-tertiary" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
