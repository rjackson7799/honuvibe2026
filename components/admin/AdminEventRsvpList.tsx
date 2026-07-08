import type { PublicEventRsvpRow } from '@/lib/events/public-rsvps';
import { DeleteRsvpButton } from './DeleteRsvpButton';
import { SendPresenterSummaryButton } from './SendPresenterSummaryButton';

export type EventRsvpGroup = {
  slug: string;
  title: string;
  capacity: number | null;
  rows: PublicEventRsvpRow[];
  presenter?: {
    presenterEmail: string | null;
    responseCount: number;
    status: 'pending' | 'sending' | 'sent' | 'failed' | null;
    sentAt: string | null;
  } | null;
};

const REFERRAL_LABEL: Record<string, string> = {
  newsletter: 'Newsletter',
  linkedin: 'LinkedIn',
  friend: 'Friend / colleague',
  twitter_x: 'Twitter / X',
  search: 'Search',
  website: 'Website',
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  confirmed: 'bg-accent-teal/10 text-accent-teal',
  attended: 'bg-accent-teal/10 text-accent-teal',
  no_show: 'bg-bg-tertiary text-fg-tertiary',
  cancelled: 'bg-bg-tertiary text-fg-tertiary line-through',
};

// Statuses that consume a seat.
const CONSUMING = new Set(['confirmed', 'attended', 'no_show']);

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function AdminEventRsvpList({ groups }: { groups: EventRsvpGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm py-8 text-center border border-dashed border-border-default rounded-xl">
        No registrations yet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((g) => {
        const confirmed = g.rows.filter((r) => CONSUMING.has(r.status)).length;
        return (
          <section key={g.slug} className="space-y-3">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <h2 className="text-[16px] font-semibold text-fg-primary">{g.title}</h2>
              <span className="text-[13px] text-fg-tertiary tabular-nums">
                {confirmed}
                {g.capacity != null ? ` / ${g.capacity}` : ''} confirmed · {g.rows.length} total
              </span>
            </div>

            {g.presenter ? (
              <div className="flex flex-wrap items-center gap-3">
                <SendPresenterSummaryButton
                  eventSlug={g.slug}
                  disabled={!g.presenter.presenterEmail || g.presenter.responseCount === 0}
                  disabledReason={
                    !g.presenter.presenterEmail
                      ? 'Add a presenter email in the event survey to enable sending.'
                      : 'No survey responses yet.'
                  }
                />
                <span className="text-[12px] text-fg-tertiary">
                  {g.presenter.responseCount} survey response
                  {g.presenter.responseCount === 1 ? '' : 's'}
                  {g.presenter.sentAt ? ` · last sent ${fmtDate(g.presenter.sentAt)}` : ''}
                  {g.presenter.status === 'failed' && !g.presenter.sentAt ? ' · last send failed' : ''}
                </span>
              </div>
            ) : null}

            <div className="rounded-xl border border-border-default overflow-hidden bg-bg-secondary">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-fg-tertiary text-[12px] uppercase tracking-[0.04em]">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Referral</th>
                    <th className="px-4 py-3 font-semibold">Lang</th>
                    <th className="px-4 py-3 font-semibold">Registered</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.id} className="border-t border-border-default">
                      <td className="px-4 py-3 text-fg-primary font-medium">{r.full_name}</td>
                      <td className="px-4 py-3 text-fg-secondary">{r.email}</td>
                      <td className="px-4 py-3 text-fg-secondary">
                        {r.referral_source
                          ? REFERRAL_LABEL[r.referral_source] ?? r.referral_source
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-fg-secondary uppercase">{r.locale}</td>
                      <td className="px-4 py-3 text-fg-secondary whitespace-nowrap">
                        {fmtDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[12px] font-medium ${
                            STATUS_STYLE[r.status] ?? 'bg-bg-tertiary text-fg-tertiary'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteRsvpButton id={r.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
