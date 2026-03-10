'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { VaultContentCard } from './VaultContentCard';
import type { VaultContentItem } from '@/lib/vault/types';

type VaultCourseRecommendationsProps = {
  items: VaultContentItem[];
};

export function VaultCourseRecommendations({ items }: VaultCourseRecommendationsProps) {
  const t = useTranslations('vault');

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-accent-gold" />
        <div>
          <h2 className="text-lg font-serif text-fg-primary">{t('recommended_heading')}</h2>
          <p className="text-sm text-fg-tertiary">{t('recommended_subtitle')}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <VaultContentCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
