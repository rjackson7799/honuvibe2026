import { setRequestLocale } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { getRevenueStats, getTransactions } from '@/lib/admin/queries';

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
      <h1 className="text-2xl font-serif text-fg-primary">Revenue</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Total USD</p>
          <p className="text-xl font-semibold text-fg-primary">{formatUsd(stats.total_usd)}</p>
          <p className="text-xs text-fg-tertiary mt-1">This month: {formatUsd(stats.month_usd)}</p>
        </div>
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Total JPY</p>
          <p className="text-xl font-semibold text-fg-primary">{formatJpy(stats.total_jpy)}</p>
          <p className="text-xs text-fg-tertiary mt-1">This month: {formatJpy(stats.month_jpy)}</p>
        </div>
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Active Subscribers</p>
          <p className="text-xl font-semibold text-accent-gold">{stats.active_subscribers}</p>
        </div>
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <p className="text-xs text-fg-tertiary uppercase tracking-wider mb-1">Active Enrollments</p>
          <p className="text-xl font-semibold text-accent-teal">{stats.active_enrollments}</p>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <h2 className="text-lg font-serif text-fg-primary mb-4">Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-fg-tertiary">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-fg-tertiary text-left">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">User</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium text-right">Amount</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border-default/50">
                    <td className="py-3 pr-4 text-fg-secondary">
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-fg-primary">{tx.user_name ?? '—'}</div>
                      <div className="text-xs text-fg-tertiary">{tx.user_email}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        'inline-block px-2 py-0.5 text-xs font-medium rounded-full',
                        tx.type === 'course_purchase'
                          ? 'bg-accent-teal/15 text-accent-teal'
                          : 'bg-accent-gold/15 text-accent-gold',
                      )}>
                        {tx.type === 'course_purchase' ? 'Course' : 'Vault'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-fg-secondary">{tx.description ?? '—'}</td>
                    <td className="py-3 pr-4 text-fg-primary text-right font-medium">
                      {tx.currency === 'jpy'
                        ? formatJpy(tx.amount)
                        : formatUsd(tx.amount)}
                    </td>
                    <td className="py-3">
                      <span className={cn(
                        'text-xs',
                        tx.status === 'succeeded' ? 'text-green-400' : 'text-red-400',
                      )}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
