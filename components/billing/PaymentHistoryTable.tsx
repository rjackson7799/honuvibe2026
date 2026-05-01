'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { Payment } from '@/lib/payments/types';

type PaymentHistoryTableProps = {
  payments: Payment[];
};

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  const t = useTranslations('billing');
  const locale = useLocale();

  function formatAmount(amount: number, currency: string): string {
    if (currency === 'jpy') {
      return `¥${amount.toLocaleString()}`;
    }
    return `$${(amount / 100).toFixed(2)}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(
      locale === 'ja' ? 'ja-JP' : 'en-US',
      { month: 'short', day: 'numeric', year: 'numeric' },
    );
  }

  if (payments.length === 0) {
    return (
      <div className="py-6 px-4 rounded-[10px] border border-dashed border-border-default bg-bg-tertiary text-center">
        <p className="text-sm text-fg-tertiary">{t('no_payments')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default text-fg-tertiary text-left">
            <th className="py-2.5 pr-4 font-semibold text-[11.5px] uppercase tracking-[0.04em]">Date</th>
            <th className="py-2.5 pr-4 font-semibold text-[11.5px] uppercase tracking-[0.04em]">Description</th>
            <th className="py-2.5 pr-4 font-semibold text-[11.5px] uppercase tracking-[0.04em] text-right">Amount</th>
            <th className="py-2.5 font-semibold text-[11.5px] uppercase tracking-[0.04em] text-right">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b border-border-secondary last:border-b-0">
              <td className="py-3 pr-4 text-fg-secondary">{formatDate(payment.created_at)}</td>
              <td className="py-3 pr-4 text-fg-primary">
                {payment.description ?? t(payment.type)}
              </td>
              <td className="py-3 pr-4 text-fg-primary text-right font-semibold">
                {formatAmount(payment.amount, payment.currency)}
              </td>
              <td className="py-3 text-right">
                {payment.receipt_url ? (
                  <a
                    href={payment.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[color:var(--accent-teal)] hover:text-[color:var(--accent-teal-hover)] font-medium hover:underline"
                  >
                    {t('receipt')}
                  </a>
                ) : (
                  <span className="text-fg-tertiary">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
