'use client';

import { useState, useCallback, useEffect } from 'react';
import { VaultContentCard } from './VaultContentCard';
import { VaultFilters } from './VaultFilters';
import { VaultKeyboardShortcuts } from './VaultKeyboardShortcuts';
import { VaultUpsellBanner } from './VaultUpsellBanner';
import { VaultUnlockModal } from './VaultUnlockModal';
import { trackEvent } from '@/lib/analytics';
import type { VaultContentItem, VaultContentType, VaultDifficulty, VaultSortOption } from '@/lib/vault/types';

type VaultBrowseGridProps = {
  initialItems: VaultContentItem[];
  initialTotalCount: number;
  hasAccess?: boolean;
};

export function VaultBrowseGrid({ initialItems, initialTotalCount, hasAccess = true }: VaultBrowseGridProps) {
  const [items, setItems] = useState(initialItems);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialItems.length < initialTotalCount);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [contentType, setContentType] = useState<VaultContentType | null>(null);
  const [difficulty, setDifficulty] = useState<VaultDifficulty | null>(null);
  const [sort, setSort] = useState<VaultSortOption>('newest');

  useEffect(() => {
    trackEvent('vault_browse');
  }, []);

  const fetchItems = useCallback(async (params: {
    search?: string;
    contentType?: VaultContentType | null;
    difficulty?: VaultDifficulty | null;
    sort?: VaultSortOption;
    page?: number;
    append?: boolean;
  }) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.contentType) searchParams.set('contentType', params.contentType);
      if (params.difficulty) searchParams.set('difficulty', params.difficulty);
      if (params.sort) searchParams.set('sort', params.sort);
      if (params.page) searchParams.set('page', String(params.page));

      const res = await fetch(`/api/vault/browse?${searchParams.toString()}`);
      const data = await res.json();

      if (params.append) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setTotalCount(data.totalCount);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Failed to fetch vault items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = useCallback((updates: {
    search?: string;
    contentType?: VaultContentType | null;
    difficulty?: VaultDifficulty | null;
    sort?: VaultSortOption;
  }) => {
    const newSearch = updates.search ?? search;
    const newContentType = updates.contentType !== undefined ? updates.contentType : contentType;
    const newDifficulty = updates.difficulty !== undefined ? updates.difficulty : difficulty;
    const newSort = updates.sort ?? sort;

    if (updates.search !== undefined) {
      setSearch(updates.search);
      if (updates.search.length > 2) {
        trackEvent('vault_search', { query: updates.search });
      }
    }
    if (updates.contentType !== undefined) setContentType(updates.contentType);
    if (updates.difficulty !== undefined) setDifficulty(updates.difficulty);
    if (updates.sort !== undefined) setSort(updates.sort);
    setPage(1);

    fetchItems({
      search: newSearch,
      contentType: newContentType,
      difficulty: newDifficulty,
      sort: newSort,
      page: 1,
    });
  }, [search, contentType, difficulty, sort, fetchItems]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchItems({
      search,
      contentType,
      difficulty,
      sort,
      page: nextPage,
      append: true,
    });
  }

  const focusSearch = useCallback(() => {
    const searchInput = document.querySelector<HTMLInputElement>('.vault-search-input');
    searchInput?.focus();
  }, []);

  return (
    <div className="space-y-6">
      <VaultKeyboardShortcuts onSearch={focusSearch} />

      {!hasAccess && <VaultUpsellBanner />}

      <VaultFilters
        search={search}
        onSearchChange={(v) => handleFilterChange({ search: v })}
        contentType={contentType}
        onContentTypeChange={(v) => handleFilterChange({ contentType: v })}
        difficulty={difficulty}
        onDifficultyChange={(v) => handleFilterChange({ difficulty: v })}
        sort={sort}
        onSortChange={(v) => handleFilterChange({ sort: v })}
      />

      {/* Results count */}
      <p className="text-xs text-fg-tertiary">
        {totalCount} {totalCount === 1 ? 'item' : 'items'} found
      </p>

      {/* Grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const locked = !hasAccess && item.access_tier === 'premium';
            return (
              <VaultContentCard
                key={item.id}
                item={item}
                locked={locked}
                onLockedClick={locked ? () => setModalOpen(true) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Empty state — only shown when not loading */}
      {items.length === 0 && !loading && (
        <div className="text-center py-16">
          <p className="text-fg-tertiary text-sm">No content found matching your filters.</p>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-accent-teal/30 border-t-accent-teal rounded-full animate-spin" />
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleLoadMore}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-bg-tertiary text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary border border-border-default transition-colors"
          >
            Load More
          </button>
        </div>
      )}

      <VaultUnlockModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
