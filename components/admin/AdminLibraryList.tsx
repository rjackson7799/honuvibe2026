'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import type { LibraryVideo } from '@/lib/library/types';

type AdminLibraryListProps = {
  videos: LibraryVideo[];
};

const statusFilters = ['all', 'published', 'draft', 'featured'];

export function AdminLibraryList({ videos }: AdminLibraryListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const searchLower = search.toLowerCase();

  const filtered = videos
    .filter((v) => {
      if (filter === 'published') return v.is_published && !v.is_featured;
      if (filter === 'draft') return !v.is_published;
      if (filter === 'featured') return v.is_featured;
      return true;
    })
    .filter((v) => {
      if (!searchLower) return true;
      return (
        v.title_en.toLowerCase().includes(searchLower) ||
        (v.title_jp?.toLowerCase().includes(searchLower) ?? false) ||
        (v.tags?.some((t) => t.toLowerCase().includes(searchLower)) ?? false)
      );
    });

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (video: LibraryVideo) => (
        <span className="text-fg-primary font-medium">{video.title_en}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (video: LibraryVideo) => (
        <span className="capitalize">{video.category.replace(/-/g, ' ')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (video: LibraryVideo) => (
        <StatusBadge status={video.is_published ? 'published' : 'draft'} />
      ),
    },
    {
      key: 'access',
      header: 'Access',
      render: (video: LibraryVideo) => (
        <StatusBadge status={video.access_tier} />
      ),
    },
    {
      key: 'difficulty',
      header: 'Level',
      render: (video: LibraryVideo) => (
        <span className="capitalize">{video.difficulty}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (video: LibraryVideo) => (
        <span>{Math.ceil(video.duration_seconds / 60)} min</span>
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
            {s === 'all' ? `All (${videos.length})` : s}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(video) => video.id}
        onRowClick={(video) => router.push(`/admin/library/${video.id}`)}
        emptyMessage="No library videos found."
      />
    </div>
  );
}
