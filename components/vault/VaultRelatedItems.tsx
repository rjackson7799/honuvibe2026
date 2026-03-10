'use client';

import { useTranslations } from 'next-intl';
import { VaultContentCard } from './VaultContentCard';
import type { VaultContentItem } from '@/lib/vault/types';

type VaultRelatedItemsProps = {
  items: VaultContentItem[];
};

export function VaultRelatedItems({ items }: VaultRelatedItemsProps) {
  const t = useTranslations('vault');

  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-serif text-fg-primary mb-4">{t('related_heading')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <VaultContentCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
