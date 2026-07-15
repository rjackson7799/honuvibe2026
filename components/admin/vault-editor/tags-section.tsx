'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionCard } from '@/components/admin/editor-shell/section-card';
import type { VaultTag } from '@/lib/vault/types';

const TAG_CATEGORIES = ['topic', 'tool', 'skill', 'industry', 'format'] as const;

type TagsSectionProps = {
  tags: VaultTag[];
  selectedTags: string[];
  onToggle: (tagSlug: string) => void;
};

export function TagsSection({ tags, selectedTags, onToggle }: TagsSectionProps) {
  const tagsByCategory = TAG_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = tags.filter((t) => t.category === cat);
      return acc;
    },
    {} as Record<string, VaultTag[]>,
  );

  return (
    <SectionCard
      id="tags"
      number={4}
      title="Tags"
      meta={
        <span className="text-xs text-fg-tertiary">
          {selectedTags.length} selected
        </span>
      }
    >
      {TAG_CATEGORIES.map((category) => {
        const categoryTags = tagsByCategory[category];
        if (!categoryTags || categoryTags.length === 0) return null;
        return (
          <div key={category}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-tertiary">
              {category}
            </h4>
            <div className="flex flex-wrap gap-2">
              {categoryTags.map((tag) => {
                const selected = selectedTags.includes(tag.slug);
                return (
                  <button
                    key={tag.slug}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onToggle(tag.slug)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors',
                      selected
                        ? 'border-[color:var(--accent-teal)] bg-[color:var(--accent-teal-subtle)] font-medium text-[color:var(--accent-teal)]'
                        : 'border-border-default bg-bg-tertiary text-fg-secondary hover:border-border-hover hover:text-fg-primary',
                    )}
                  >
                    {selected && <Check size={13} />}
                    {tag.name_en}
                    {tag.name_jp ? ` (${tag.name_jp})` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {tags.length === 0 && (
        <p className="text-xs text-fg-tertiary">
          No tags available. Create tags first.
        </p>
      )}
    </SectionCard>
  );
}
