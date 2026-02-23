'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data found.',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-fg-tertiary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border-default rounded-lg">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-default bg-bg-tertiary">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-medium text-fg-tertiary uppercase tracking-wider',
                  col.sortable && 'cursor-pointer select-none hover:text-fg-secondary',
                )}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc'
                      ? <ChevronUp size={14} />
                      : <ChevronDown size={14} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className={cn(
                'transition-colors duration-[var(--duration-fast)]',
                onRowClick && 'cursor-pointer hover:bg-bg-tertiary',
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-fg-secondary">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
