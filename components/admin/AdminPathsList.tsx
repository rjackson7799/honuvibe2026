'use client';

import { useState } from 'react';
import { DataTable } from './DataTable';
import { StatusBadge } from './StatusBadge';
import type { AdminStudyPath } from '@/lib/paths/types';

type AdminPathsListProps = {
  paths: AdminStudyPath[];
};

const statusFilters = ['all', 'active', 'completed', 'archived'];

const filterLabels: Record<string, string> = {
  all: 'All',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export function AdminPathsList({ paths }: AdminPathsListProps) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const searchLower = search.toLowerCase();

  const filtered = paths
    .filter((p) => {
      if (filter === 'all') return true;
      return p.status === filter;
    })
    .filter((p) => {
      if (!searchLower) return true;
      return (
        (p.title_en?.toLowerCase().includes(searchLower) ?? false) ||
        (p.title_jp?.toLowerCase().includes(searchLower) ?? false) ||
        (p.user_email?.toLowerCase().includes(searchLower) ?? false) ||
        (p.user_name?.toLowerCase().includes(searchLower) ?? false) ||
        (p.goal_description.toLowerCase().includes(searchLower))
      );
    });

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (path: AdminStudyPath) => (
        <span className="text-fg-primary font-medium truncate block max-w-[200px]">
          {path.title_en ?? 'Untitled'}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (path: AdminStudyPath) => (
        <div className="text-sm">
          <span className="text-fg-primary block truncate max-w-[150px]">
            {path.user_name ?? path.user_email ?? path.user_id.slice(0, 8)}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (path: AdminStudyPath) => (
        <StatusBadge status={path.status} />
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (path: AdminStudyPath) => (
        <span>{path.total_items ?? 0}</span>
      ),
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      render: (path: AdminStudyPath) => (
        <span className="capitalize">{path.difficulty_preference}</span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (path: AdminStudyPath) => (
        <span className="text-fg-muted">
          {new Date(path.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search by title, user, or goal..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
      />

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
            {s === 'all' ? `All (${paths.length})` : filterLabels[s] ?? s}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(path) => path.id}
        emptyMessage="No study paths found."
      />
    </div>
  );
}
