'use client';

import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/admin/editor-shell/section-card';
import type { CourseOption } from './types';

type Props = {
  slug: string;
  courseIds: string[];
  courseOptions: CourseOption[];
  onToggle: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
};

function UnpublishedTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="shrink-0 text-[10px] uppercase tracking-wider text-[color:var(--accent-gold)]">
      unpublished
    </span>
  );
}

export function FeaturedCoursesSection({
  slug,
  courseIds,
  courseOptions,
  onToggle,
  onMove,
}: Props) {
  const featuredCourses = courseIds
    .map((id) => courseOptions.find((c) => c.id === id))
    .filter((c): c is CourseOption => Boolean(c));

  const availableCourses = courseOptions.filter((c) => !courseIds.includes(c.id));

  return (
    <SectionCard
      id="featured-courses"
      number={4}
      title="Featured courses"
      meta={
        <span className="text-xs text-fg-tertiary">
          {featuredCourses.length} featured
        </span>
      }
    >
      <p className="text-xs text-fg-tertiary">
        These courses appear on <span className="font-mono">/partners/{slug}</span> in the
        order shown below.
      </p>

      {featuredCourses.length === 0 ? (
        <p className="text-sm text-fg-tertiary">
          No courses featured yet. Pick from the list below.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {featuredCourses.map((c, idx) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-tertiary px-3 py-2"
            >
              <GripVertical size={14} className="shrink-0 text-fg-tertiary" />
              <span className="flex-1 truncate text-sm text-fg-primary">{c.title_en}</span>
              <span className="shrink-0 font-mono text-[11px] text-fg-tertiary">{c.slug}</span>
              <UnpublishedTag show={!c.is_published} />
              <button
                type="button"
                onClick={() => onMove(c.id, -1)}
                disabled={idx === 0}
                aria-label={`Move ${c.title_en} up`}
                className="rounded p-1 text-fg-secondary transition-colors hover:bg-bg-secondary hover:text-fg-primary disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => onMove(c.id, 1)}
                disabled={idx === featuredCourses.length - 1}
                aria-label={`Move ${c.title_en} down`}
                className="rounded p-1 text-fg-secondary transition-colors hover:bg-bg-secondary hover:text-fg-primary disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => onToggle(c.id)}
                aria-label={`Remove ${c.title_en}`}
                className="rounded p-1 text-fg-tertiary transition-colors hover:bg-bg-secondary hover:text-[color:var(--accent-coral)]"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {availableCourses.length > 0 && (
        <details className="rounded-lg border border-border-default">
          <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm text-fg-secondary transition-colors hover:bg-bg-tertiary hover:text-fg-primary">
            Add courses ({availableCourses.length} available)
          </summary>
          <ul className="max-h-60 overflow-y-auto border-t border-border-default">
            {availableCourses.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 border-b border-border-default px-3 py-2 transition-colors last:border-0 hover:bg-bg-tertiary"
              >
                <span className="flex-1 truncate text-sm text-fg-primary">{c.title_en}</span>
                <span className="shrink-0 font-mono text-[11px] text-fg-tertiary">{c.slug}</span>
                <UnpublishedTag show={!c.is_published} />
                <Button size="sm" variant="ghost" onClick={() => onToggle(c.id)}>
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </SectionCard>
  );
}
