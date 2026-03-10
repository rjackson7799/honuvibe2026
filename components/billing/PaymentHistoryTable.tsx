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
      <p className="text-sm text-fg-tertiary py-4">{t('no_payments')}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default text-fg-tertiary text-left">
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Description</th>
            <th className="py-2 pr-4 font-medium text-right">Amount</th>
            <th className="py-2 font-medium text-right">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b border-border-default/50">
              <td className="py-3 pr-4 text-fg-secondary">{formatDate(payment.created_at)}</td>
              <td className="py-3 pr-4 text-fg-primary">
                {payment.description ?? t(payment.type)}
              </td>
              <td className="py-3 pr-4 text-fg-primary text-right font-medium">
                {formatAmount(payment.amount, payment.currency)}
              </td>
              <td className="py-3 text-right">
                {payment.receipt_url ? (
                  <a
                    href={payment.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-teal hover:underline"
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
