'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';

type ESLPurchaseCardProps = {
  courseId: string;
  priceUsd: number | null;
  priceJpy: number | null;
};

export function ESLPurchaseCard({ courseId, priceUsd, priceJpy }: ESLPurchaseCardProps) {
  const t = useTranslations('esl');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);

  const price = locale === 'ja'
    ? (priceJpy ? `¥${priceJpy.toLocaleString()}` : '')
    : (priceUsd ? `$${(priceUsd / 100).toFixed(0)}` : '');

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/esl/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, locale }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-[var(--border-primary)] p-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--accent-teal)]/10 mb-4">
        <Lock size={20} className="text-[var(--accent-teal)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--fg-primary)] mb-2">
        {t('purchase_title')}
      </h3>
      <p className="text-sm text-[var(--fg-secondary)] max-w-sm mx-auto mb-6">
        {t('purchase_description')}
      </p>
      {price && (
        <Button
          onClick={handlePurchase}
          variant="primary"
          disabled={loading}
        >
          {loading
            ? (locale === 'ja' ? '処理中...' : 'Processing...')
            : t('purchase_cta', { price })}
        </Button>
      )}
    </div>
  );
}
