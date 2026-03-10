'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateFreshnessStatus } from '@/lib/vault/actions';
import type { VaultContentItem, VaultFreshnessStatus } from '@/lib/vault/types';

type VaultFreshnessQueueProps = {
  items: VaultContentItem[];
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function VaultFreshnessQueue({ items }: VaultFreshnessQueueProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleStatusUpdate(itemId: string, status: VaultFreshnessStatus) {
    setLoadingId(itemId);
    try {
      await updateFreshnessStatus(itemId, status);
      router.refresh();
    } catch (err) {
      console.error('Failed to update freshness:', err);
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle size={32} className="mx-auto mb-3 text-emerald-400" />
        <p className="text-sm text-fg-secondary">All content is current. Nothing to review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isOutdated = item.freshness_status === 'outdated';
        const reviewDate = item.freshness_reviewed_at ?? item.created_at;
        const days = daysSince(reviewDate);
        const isLoading = loadingId === item.id;

        return (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 rounded-lg bg-bg-secondary border border-border-default"
          >
            <div className="flex items-center gap-3 min-w-0">
              {isOutdated ? (
                <XCircle size={18} className="shrink-0 text-red-400" />
              ) : (
                <AlertTriangle size={18} className="shrink-0 text-amber-400" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg-primary truncate">
                  {item.title_en}
                </p>
                <p className="text-xs text-fg-tertiary">
                  Last reviewed: {formatDate(item.freshness_reviewed_at)} ({days} days ago)
                  {' · '}
                  <span className="capitalize">{item.content_type.replace(/_/g, ' ')}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusUpdate(item.id, 'current')}
                disabled={isLoading}
                className="text-emerald-400 hover:text-emerald-300"
              >
                <CheckCircle size={14} className="mr-1" />
                Mark Current
              </Button>
              <button
                type="button"
                onClick={() => router.push(`/admin/vault/${item.id}`)}
                className="px-3 py-1.5 text-xs font-medium text-accent-teal hover:underline"
              >
                Edit
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
