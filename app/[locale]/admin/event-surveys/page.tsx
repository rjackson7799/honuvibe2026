import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getEventSurveyStatuses } from '@/lib/survey/event-surveys';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Event Surveys — Admin',
};

export const dynamic = 'force-dynamic';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' });
}

export default async function AdminEventSurveysPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const statuses = await getEventSurveyStatuses();

  return (
    <div className="max-w-[1100px] space-y-6">
      <div className="space-y-1">
        <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold tracking-[-0.02em] text-fg-primary">
          Event Surveys
        </h1>
        <p className="text-sm text-fg-tertiary">
          Build a pre-event survey for each public event. Registrants get the link after they
          confirm their seat; an AI summary of responses is emailed to the presenter.
        </p>
      </div>

      {statuses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-default py-8 text-center text-sm text-fg-tertiary">
          No public events defined.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-default bg-bg-secondary">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-[0.04em] text-fg-tertiary">
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Questions</th>
                <th className="px-4 py-3 font-semibold">Responses</th>
                <th className="px-4 py-3 font-semibold">Presenter</th>
                <th className="px-4 py-3 font-semibold sr-only">Open</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => {
                const statusLabel = !s.surveyId ? 'None' : s.isActive ? 'Active' : 'Inactive';
                const statusStyle = !s.surveyId
                  ? 'bg-bg-tertiary text-fg-tertiary'
                  : s.isActive
                    ? 'bg-accent-teal/10 text-accent-teal'
                    : 'bg-amber-500/10 text-amber-600';
                return (
                  <tr key={s.eventSlug} className="border-t border-border-default">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/event-surveys/${s.eventSlug}`}
                        className="font-medium text-fg-primary hover:text-accent-teal"
                      >
                        {s.eventTitle}
                      </Link>
                      <div className="text-[12px] text-fg-tertiary">{fmtDate(s.startsAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${statusStyle}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-fg-secondary">{s.questionCount}</td>
                    <td className="px-4 py-3 tabular-nums text-fg-secondary">{s.responseCount}</td>
                    <td className="px-4 py-3 text-fg-secondary">{s.presenterEmail ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/event-surveys/${s.eventSlug}`}
                        className="inline-flex items-center text-fg-tertiary hover:text-accent-teal"
                        aria-label="Open builder"
                      >
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
