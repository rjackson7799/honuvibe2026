import { VaultContentCard } from './VaultContentCard';
import type { VaultContentItem } from '@/lib/vault/types';

type VaultRecentlyViewedProps = {
  items: VaultContentItem[];
};

export function VaultRecentlyViewed({ items }: VaultRecentlyViewedProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-serif text-fg-primary mb-4">Continue where you left off</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mb-2 snap-x">
        {items.map((item) => (
          <div key={item.id} className="min-w-[280px] max-w-[320px] snap-start shrink-0">
            <VaultContentCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
