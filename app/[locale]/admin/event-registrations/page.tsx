import { setRequestLocale } from 'next-intl/server';
import { getPublicEventRsvps } from '@/lib/events/public-rsvps';
import { getPresenterDeliveryStatuses } from '@/lib/survey/event-surveys';
import { PUBLIC_EVENTS } from '@/lib/events/public-events';
import {
  AdminEventRsvpList,
  type EventRsvpGroup,
} from '@/components/admin/AdminEventRsvpList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Event Registrations — Admin',
};

export const dynamic = 'force-dynamic';

export default async function AdminEventRegistrationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [rsvps, delivery] = await Promise.all([
    getPublicEventRsvps(),
    getPresenterDeliveryStatuses(),
  ]);

  // Group by event, preserving most-recent-first order.
  const order: string[] = [];
  const bySlug = new Map<string, typeof rsvps>();
  for (const r of rsvps) {
    if (!bySlug.has(r.event_slug)) {
      bySlug.set(r.event_slug, []);
      order.push(r.event_slug);
    }
    bySlug.get(r.event_slug)!.push(r);
  }

  const groups: EventRsvpGroup[] = order.map((slug) => {
    const ev = PUBLIC_EVENTS.find((e) => e.slug === slug);
    const d = delivery[slug];
    return {
      slug,
      title: ev?.titleEn ?? slug,
      capacity: ev?.capacity ?? null,
      rows: bySlug.get(slug) ?? [],
      presenter: d
        ? {
            presenterEmail: d.presenterEmail,
            responseCount: d.responseCount,
            status: d.status,
            sentAt: d.sentAt,
          }
        : null,
    };
  });

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="space-y-1">
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
          Event Registrations
        </h1>
        <p className="text-fg-tertiary text-sm">
          RSVPs to public (free) events. Read-only.
        </p>
      </div>
      <AdminEventRsvpList groups={groups} />
    </div>
  );
}
