import { setRequestLocale } from 'next-intl/server';
import { DollarSign, Clock, TrendingUp } from 'lucide-react';
import { InstructorPortalLayout } from '@/components/instructor-portal/InstructorPortalLayout';
import { StatCard } from '@/components/admin/StatCard';
import { resolveInstructorScope } from '@/lib/instructor-portal/queries';
import {
  getOwnInstructorPayouts,
  normalizeInstructorPayoutFilters,
} from '@/lib/revenue-split/queries';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
};

export const metadata = {
  title: 'Payouts — Instructor',
};

function formatCurrency(amount: number, currency: string): string {
  const c = currency.toLowerCase();
  if (c === 'jpy') {
    return `¥${Math.round(amount).toLocaleString('ja-JP')}`;
  }
  // Default: treat as cents → dollars for USD, or raw amount for unknown
  if (c === 'usd') {
    return `$${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString()} ${currency.toUpperCase()}`;
}

function formatTotals(totals: Record<string, number>): string {
  const entries = Object.entries(totals);
  if (entries.length === 0) return '—';
  return entries.map(([cur, amt]) => formatCurrency(amt, cur)).join(' / ');
}

export default async function InstructorPayoutsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const scope = await resolveInstructorScope(locale);

  const normalized = normalizeInstructorPayoutFilters({
    status: sp.status,
    from: sp.from,
    to: sp.to,
    // instructor_id intentionally omitted — RLS scopes to current user
  });

  const filters = {
    status: normalized.status,
    from: normalized.from,
    to: normalized.to,
  };

  const summary = await getOwnInstructorPayouts(filters);
  const { rows, totalsByCurrency } = summary;

  // Lifetime earnings: paid + pending
  const lifetimeTotals = rows.reduce<Record<string, number>>((acc, row) => {
    if (row.status === 'paid' || row.status === 'pending') {
      acc[row.currency] = (acc[row.currency] ?? 0) + row.amount;
    }
    return acc;
  }, {});

  // Pending payout
  const pendingTotals = rows.reduce<Record<string, number>>((acc, row) => {
    if (row.status === 'pending') {
      acc[row.currency] = (acc[row.currency] ?? 0) + row.amount;
    }
    return acc;
  }, {});

  // Last 30 days (any status)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last30Totals = rows.reduce<Record<string, number>>((acc, row) => {
    if (new Date(row.created_at) >= thirtyDaysAgo) {
      acc[row.currency] = (acc[row.currency] ?? 0) + row.amount;
    }
    return acc;
  }, {});

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'clawed_back', label: 'Clawed back' },
    { value: 'all', label: 'All statuses' },
  ];

  return (
    <InstructorPortalLayout displayName={scope.displayName}>
      <div className="max-w-[1100px] space-y-8">
        <header>
          <h1 className="font-serif text-3xl text-fg-primary">Payouts</h1>
          <p className="mt-1 text-sm text-fg-tertiary">
            Your earnings from courses you teach.
          </p>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Lifetime earnings"
            value={formatTotals(lifetimeTotals)}
            icon={DollarSign}
            variant="learn"
          />
          <StatCard
            label="Pending payout"
            value={formatTotals(pendingTotals)}
            icon={Clock}
            variant="learn"
            accent="coral"
          />
          <StatCard
            label="Last 30 days"
            value={formatTotals(last30Totals)}
            icon={TrendingUp}
            variant="learn"
          />
        </div>

        {/* Filter row */}
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status}
              className="h-10 rounded-lg border border-border-default bg-bg-secondary px-3 text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="from" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary">
              From
            </label>
            <input
              id="from"
              type="date"
              name="from"
              defaultValue={filters.from ?? ''}
              className="h-10 rounded-lg border border-border-default bg-bg-secondary px-3 text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="to" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-tertiary">
              To
            </label>
            <input
              id="to"
              type="date"
              name="to"
              defaultValue={filters.to ?? ''}
              className="h-10 rounded-lg border border-border-default bg-bg-secondary px-3 text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
            />
          </div>

          <button
            type="submit"
            className="h-10 rounded-lg bg-accent-teal px-4 text-sm font-medium text-white transition-colors hover:bg-accent-teal/90"
          >
            Filter
          </button>

          <a
            href="?"
            className="flex h-10 items-center rounded-lg border border-border-default px-4 text-sm text-fg-secondary transition-colors hover:text-fg-primary"
          >
            Reset
          </a>
        </form>

        {/* Content */}
        {rows.length === 0 ? (
          <section className="rounded-lg border border-dashed border-border-default bg-bg-secondary p-10 text-center">
            <h2 className="font-serif text-xl text-fg-primary">No payouts yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-fg-secondary">
              When students enroll in courses you teach, your earnings will appear here.
            </p>
          </section>
        ) : (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-xl text-fg-primary">Payout history</h2>
              <span className="text-xs text-fg-tertiary">
                {rows.length} row{rows.length !== 1 ? 's' : ''} &mdash; total: {formatTotals(totalsByCurrency)}
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border-default bg-bg-secondary">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default text-fg-tertiary">
                      <th className="px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-[0.04em]">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-[0.04em]">
                        Course
                      </th>
                      <th className="px-4 py-3 text-right text-[11.5px] font-bold uppercase tracking-[0.04em]">
                        Gross
                      </th>
                      <th className="px-4 py-3 text-right text-[11.5px] font-bold uppercase tracking-[0.04em]">
                        Your share
                      </th>
                      <th className="px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-[0.04em]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-[0.04em]">
                        Paid date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-border-default last:border-0">
                        <td className="px-4 py-3 text-fg-secondary">
                          {new Date(row.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-fg-primary">
                          {row.course_title_en ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-fg-primary">
                          {formatCurrency(row.gross, row.currency)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-accent-teal">
                          {formatCurrency(row.amount, row.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[12px] font-semibold ${
                              row.status === 'paid'
                                ? 'text-[color:var(--accent-teal)]'
                                : row.status === 'clawed_back'
                                  ? 'text-red-500'
                                  : 'text-[color:var(--accent-gold)]'
                            }`}
                          >
                            {row.status === 'clawed_back'
                              ? 'Clawed back'
                              : row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-fg-secondary">
                          {row.status === 'paid' && row.paid_at
                            ? new Date(row.paid_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </InstructorPortalLayout>
  );
}
