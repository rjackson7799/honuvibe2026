'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import type { VaultContentItem } from '@/lib/vault/types';
import { VaultContentCard } from '@/components/vault/VaultContentCard';

export function LearnVaultPreviewCards({ items }: { items: VaultContentItem[] }) {
  const router = useRouter();
  const locale = useLocale();

  const handleLockedClick = (slug: string) => {
    const prefix = locale === 'ja' ? '/ja' : '';
    const redirect = `${prefix}/learn/vault/${slug}`;
    router.push(`/learn/auth?intent=vault&redirect=${encodeURIComponent(redirect)}`);
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <VaultContentCard
          key={item.id}
          item={item}
          locked
          onLockedClick={() => handleLockedClick(item.slug)}
        />
      ))}
    </div>
  );
}
