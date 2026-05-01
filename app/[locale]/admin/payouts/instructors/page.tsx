import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { AdminPayoutsTable } from '@/components/admin/AdminPayoutsTable';
import { getActiveInstructorOptions } from '@/lib/instructors/queries';
import {
  getInstructorPayouts,
  normalizeInstructorPayoutFilters,
} from '@/lib/revenue-split/queries';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    instructor_id?: string;
    from?: string;
    to?: string;
  }>;
};

function formatMoney(amount: number, currency: string) {
  if (currency === 'jpy') {
    return `¥${amount.toLocaleString('ja-JP')}`;
  }
  return `$${(amount / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStatusLabel(status: string) {
  if (status === 'all') return 'All';
  if (status === 'clawed_back') return 'Clawed back';
  return `${status[0].toUpperCase()}${status.slice(1)}`;
}

export const metadata = {
  title: 'Instructor Payouts - Admin',
};

export default async function AdminInstructorPayoutsPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const filters = normalizeInstructorPayoutFilters(await searchParams);
  const [payouts, instructors] = await Promise.all([
    getInstructorPayouts(filters),
    getActiveInstructorOptions(),
  ]);

  const filterQuery = new URLSearchParams();
  if (filters.status) filterQuery.set('status', filters.status);
  if (filters.instructorId) filterQuery.set('instructor_id', filters.instructorId);
  if (filters.from) filterQuery.set('from', filters.from);
  if (filters.to) filterQuery.set('to', filters.to);
  const exportHref = filterQuery.toString()
    ? `/api/admin/payouts/instructors/csv?${filterQuery.toString()}`
    : '/api/admin/payouts/instructors/csv';

  const inputClass =
    'w-full rounded-[10px] border border-border-default bg-bg-tertiary px-3 py-2 text-sm text-fg-primary focus:outline-none focus:border-[color:var(--accent-teal)] transition-colors';
  const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-fg-tertiary';

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
            Instructor Payouts
          </h1>
          <p className="mt-1.5 text-sm text-fg-tertiary">
            Manual payout ledger for instructor revenue shares captured at enrollment time.
          </p>
        </div>
        <Link
          href={exportHref}
          className="inline-flex items-center h-10 px-4 rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary text-[13px] font-semibold hover:border-border-hover hover:text-fg-primary transition-colors"
        >
          Export CSV
        </Link>
      </div>

      <div className="rounded-[14px] border border-border-default bg-bg-secondary p-4 shadow-[var(--shadow-md)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-fg-tertiary">
          {getStatusLabel(filters.status)} totals
        </p>
        <p className="mt-1.5 text-[20px] font-bold text-fg-primary tracking-[-0.02em]">
          {Object.entries(payouts.totalsByCurrency).length > 0
            ? Object.entries(payouts.totalsByCurrency)
                .map(([currency, amount]) => `${formatMoney(amount, currency)} ${currency.toUpperCase()}`)
                .join(' · ')
            : '0'}
        </p>
      </div>

      <form className="grid gap-3 rounded-[14px] border border-border-default bg-bg-secondary p-4 shadow-[var(--shadow-md)] md:grid-cols-5">
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue={filters.status} className={inputClass}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="clawed_back">Clawed back</option>
            <option value="all">All</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Instructor</label>
          <select name="instructor_id" defaultValue={filters.instructorId ?? ''} className={inputClass}>
            <option value="">All instructors</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.display_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>From</label>
          <input type="date" name="from" defaultValue={filters.from ?? ''} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>To</label>
          <input type="date" name="to" defaultValue={filters.to ?? ''} className={inputClass} />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="inline-flex h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold shadow-sm hover:shadow-md transition-all"
          >
            Apply
          </button>
          <Link
            href="/admin/payouts/instructors"
            className="inline-flex items-center h-10 px-4 rounded-[10px] bg-bg-secondary border border-border-default text-fg-tertiary text-[13px] font-semibold hover:text-fg-secondary hover:border-border-hover transition-colors"
          >
            Reset
          </Link>
        </div>
      </form>

      <AdminPayoutsTable rows={payouts.rows} />
    </div>
  );
}
