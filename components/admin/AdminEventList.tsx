import Link from 'next/link';
import type { AdminEventListItem } from '@/lib/events/queries';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-bg-tertiary text-fg-tertiary',
  scheduled: 'bg-accent-teal/10 text-accent-teal',
  live: 'bg-red-500/10 text-red-600',
  completed: 'bg-bg-tertiary text-fg-secondary',
  cancelled: 'bg-bg-tertiary text-fg-tertiary line-through',
};

export function AdminEventList({ events }: { events: AdminEventListItem[] }) {
  if (events.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm py-8 text-center border border-dashed border-border-default rounded-xl">
        No events yet. Create your first one.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border-default overflow-hidden bg-bg-secondary">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-fg-tertiary text-[12px] uppercase tracking-[0.04em]">
            <th className="px-4 py-3 font-semibold">Event</th>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Visibility</th>
            <th className="px-4 py-3 font-semibold">RSVP</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr
              key={e.id}
              className="border-t border-border-default hover:bg-bg-tertiary transition-colors"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/admin/events/${e.id}`}
                  className="text-fg-primary font-medium hover:text-accent-teal"
                >
                  {e.title_en}
                </Link>
                {e.presenter_name ? (
                  <span className="block text-[12px] text-fg-tertiary">{e.presenter_name}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-fg-secondary whitespace-nowrap">
                {fmtDate(e.starts_at)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[12px] font-medium ${
                    STATUS_STYLE[e.status] ?? 'bg-bg-tertiary text-fg-tertiary'
                  }`}
                >
                  {e.status}
                </span>
              </td>
              <td className="px-4 py-3 text-fg-secondary">
                {e.is_published ? 'Published' : 'Draft'}
                {e.recap_published ? ' · Recap' : ''}
              </td>
              <td className="px-4 py-3 text-fg-secondary whitespace-nowrap">
                {e.going_count} going / {e.invite_count} invited
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
