import { setRequestLocale } from 'next-intl/server';
import { getRevenueStats, getTransactions } from '@/lib/admin/queries';
import { Card } from '@/components/ui/card';
import { BadgePill } from '@/components/ui/badge-pill';
import { SectionHeading } from '@/components/learn/SectionHeading';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Revenue — Admin',
};

export default async function AdminRevenuePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const stats = await getRevenueStats();
  const transactions = await getTransactions();

  function formatUsd(cents: number): string {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  function formatJpy(yen: number): string {
    return `¥${yen.toLocaleString('ja-JP')}`;
  }

  return (
    <div className="space-y-6 max-w-[1100px]">
      <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
        Revenue
      </h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="learn" padding="md">
          <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.06em] mb-1.5">Total USD</p>
          <p className="text-[24px] font-bold text-fg-primary tracking-[-0.02em]">{formatUsd(stats.total_usd)}</p>
          <p className="text-[11.5px] text-fg-tertiary mt-1.5">This month: {formatUsd(stats.month_usd)}</p>
        </Card>
        <Card variant="learn" padding="md">
          <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.06em] mb-1.5">Total JPY</p>
          <p className="text-[24px] font-bold text-fg-primary tracking-[-0.02em]">{formatJpy(stats.total_jpy)}</p>
          <p className="text-[11.5px] text-fg-tertiary mt-1.5">This month: {formatJpy(stats.month_jpy)}</p>
        </Card>
        <Card variant="learn" padding="md">
          <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.06em] mb-1.5">Active Subscribers</p>
          <p className="text-[24px] font-bold text-[color:var(--accent-coral)] tracking-[-0.02em]">{stats.active_subscribers}</p>
        </Card>
        <Card variant="learn" padding="md">
          <p className="text-[11px] font-bold text-fg-tertiary uppercase tracking-[0.06em] mb-1.5">Active Enrollments</p>
          <p className="text-[24px] font-bold text-[color:var(--accent-teal)] tracking-[-0.02em]">{stats.active_enrollments}</p>
        </Card>
      </div>

      {/* Transactions table */}
      <Card variant="learn" padding="lg">
        <SectionHeading title="Transactions" bordered />
        {transactions.length === 0 ? (
          <div className="py-8 px-4 rounded-[10px] border border-dashed border-border-default bg-bg-tertiary text-center">
            <p className="text-sm text-fg-tertiary">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-fg-tertiary text-left">
                  <th className="py-2.5 pr-4 text-[11.5px] font-bold uppercase tracking-[0.04em]">Date</th>
                  <th className="py-2.5 pr-4 text-[11.5px] font-bold uppercase tracking-[0.04em]">User</th>
                  <th className="py-2.5 pr-4 text-[11.5px] font-bold uppercase tracking-[0.04em]">Type</th>
                  <th className="py-2.5 pr-4 text-[11.5px] font-bold uppercase tracking-[0.04em]">Description</th>
                  <th className="py-2.5 pr-4 text-[11.5px] font-bold uppercase tracking-[0.04em] text-right">Amount</th>
                  <th className="py-2.5 text-[11.5px] font-bold uppercase tracking-[0.04em]">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border-secondary last:border-b-0">
                    <td className="py-3 pr-4 text-fg-secondary">
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-fg-primary font-semibold">{tx.user_name ?? '—'}</div>
                      <div className="text-[11.5px] text-fg-tertiary">{tx.user_email}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <BadgePill variant={tx.type === 'course_purchase' ? 'teal' : 'coral'} size="xs">
                        {tx.type === 'course_purchase' ? 'Course' : 'Vault'}
                      </BadgePill>
                    </td>
                    <td className="py-3 pr-4 text-fg-secondary">{tx.description ?? '—'}</td>
                    <td className="py-3 pr-4 text-fg-primary text-right font-semibold">
                      {tx.currency === 'jpy' ? formatJpy(tx.amount) : formatUsd(tx.amount)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[12px] font-semibold ${
                          tx.status === 'succeeded' ? 'text-[color:var(--accent-teal)]' : 'text-red-500'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
