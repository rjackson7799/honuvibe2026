'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import type { VaultContentItem } from '@/lib/vault/types';

type AdminVaultListProps = {
  items: VaultContentItem[];
};

const statusFilters = ['all', 'published', 'draft', 'featured', 'premium', 'needs_review'];

const filterLabels: Record<string, string> = {
  all: 'All',
  published: 'Published',
  draft: 'Draft',
  featured: 'Featured',
  premium: 'Premium',
  needs_review: 'Needs Review',
};

export function AdminVaultList({ items }: AdminVaultListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const searchLower = search.toLowerCase();

  const filtered = items
    .filter((i) => {
      if (filter === 'published') return i.is_published && !i.is_featured;
      if (filter === 'draft') return !i.is_published;
      if (filter === 'featured') return i.is_featured;
      if (filter === 'premium') return i.access_tier === 'premium';
      if (filter === 'needs_review') return i.freshness_status === 'review_needed';
      return true;
    })
    .filter((i) => {
      if (!searchLower) return true;
      return (
        i.title_en.toLowerCase().includes(searchLower) ||
        (i.title_jp?.toLowerCase().includes(searchLower) ?? false) ||
        (i.tags?.some((t) => t.toLowerCase().includes(searchLower)) ?? false)
      );
    });

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (item: VaultContentItem) => (
        <span className="text-fg-primary font-medium">{item.title_en}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: VaultContentItem) => (
        <span className="capitalize">{item.content_type.replace(/-/g, ' ').replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: VaultContentItem) => (
        <StatusBadge status={item.is_published ? 'published' : 'draft'} />
      ),
    },
    {
      key: 'access',
      header: 'Access',
      render: (item: VaultContentItem) => (
        <StatusBadge status={item.access_tier} />
      ),
    },
    {
      key: 'level',
      header: 'Level',
      render: (item: VaultContentItem) => (
        <span className="capitalize">{item.difficulty_level ?? '-'}</span>
      ),
    },
    {
      key: 'freshness',
      header: 'Freshness',
      render: (item: VaultContentItem) => {
        const config: Record<string, { color: string; label: string }> = {
          current: { color: 'bg-green-500', label: 'Current' },
          review_needed: { color: 'bg-amber-500', label: 'Needs Review' },
          outdated: { color: 'bg-red-500', label: 'Outdated' },
        };
        const { color, label } = config[item.freshness_status] ?? {
          color: 'bg-fg-tertiary',
          label: item.freshness_status,
        };
        return (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
            {label}
          </span>
        );
      },
    },
    {
      key: 'views',
      header: 'Views',
      render: (item: VaultContentItem) => (
        <span>{item.view_count.toLocaleString()}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search by title or tags..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
      />

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {statusFilters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === s
                ? 'bg-accent-teal/10 text-accent-teal'
                : 'text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            {s === 'all' ? `All (${items.length})` : filterLabels[s] ?? s}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(item) => item.id}
        onRowClick={(item) => router.push(`/admin/vault/${item.id}`)}
        emptyMessage="No vault content items found."
      />
    </div>
  );
}
