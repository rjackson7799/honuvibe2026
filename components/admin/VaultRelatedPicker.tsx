'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { VaultContentItem } from '@/lib/vault/types';

type VaultRelatedPickerProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allItems: { id: string; title_en: string; title_jp: string | null; content_type: string }[];
  currentItemId?: string;
};

export function VaultRelatedPicker({
  selectedIds,
  onChange,
  allItems,
  currentItemId,
}: VaultRelatedPickerProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableItems = allItems.filter(
    (item) =>
      item.id !== currentItemId &&
      !selectedIds.includes(item.id) &&
      (search === '' ||
        item.title_en.toLowerCase().includes(search.toLowerCase()) ||
        (item.title_jp && item.title_jp.toLowerCase().includes(search.toLowerCase()))),
  );

  const selectedItems = allItems.filter((item) => selectedIds.includes(item.id));

  function handleAdd(id: string) {
    onChange([...selectedIds, id]);
    setSearch('');
    setShowDropdown(false);
  }

  function handleRemove(id: string) {
    onChange(selectedIds.filter((sid) => sid !== id));
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-xs text-fg-tertiary mb-1">Related Items</label>

      {/* Selected chips */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-accent-teal/10 text-accent-teal border border-accent-teal/20"
            >
              <span className="text-fg-tertiary capitalize text-[10px]">
                {item.content_type.replace(/_/g, ' ')}
              </span>
              {item.title_en}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="ml-0.5 hover:text-red-400 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search items to add..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-bg-tertiary border border-border-default text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-teal"
            />
          </div>
        </div>

        {/* Dropdown */}
        {showDropdown && availableItems.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-w-md max-h-48 overflow-y-auto rounded-lg border border-border-default bg-bg-secondary shadow-lg">
            {availableItems.slice(0, 20).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAdd(item.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors flex items-center gap-2"
              >
                <span className="text-fg-tertiary capitalize text-[10px] shrink-0">
                  {item.content_type.replace(/_/g, ' ')}
                </span>
                <span className="text-fg-primary truncate">{item.title_en}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedIds.length === 0 && (
        <p className="text-xs text-fg-tertiary">No related items selected. Search to add.</p>
      )}
    </div>
  );
}
