'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SurveyResponse } from '@/app/[locale]/admin/surveys/page';

const LEVEL_COLORS: Record<string, string> = {
  'Complete beginner': 'bg-blue-500/15 text-blue-400',
  'Curious': 'bg-teal-500/15 text-teal-400',
  'Occasional user': 'bg-amber-500/15 text-amber-400',
  'Regular user': 'bg-green-500/15 text-green-400',
};

function levelBadgeClass(level: string): string {
  const key = Object.keys(LEVEL_COLORS).find((k) => level.startsWith(k));
  return key ? LEVEL_COLORS[key] : 'bg-fg-muted/15 text-fg-tertiary';
}

function shortLevel(level: string): string {
  if (level.startsWith('Complete beginner')) return 'Beginner';
  if (level.startsWith('Curious')) return 'Curious';
  if (level.startsWith('Occasional')) return 'Occasional';
  if (level.startsWith('Regular')) return 'Regular';
  return level;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function DetailRow({ label, value }: { label: string; value: string | string[] | null }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="min-w-[160px] text-xs font-semibold text-fg-tertiary">{label}</span>
      <span className="text-sm text-fg-secondary">
        {Array.isArray(value) ? value.join(', ') : value}
      </span>
    </div>
  );
}

function ExpandedRow({ r }: { r: SurveyResponse }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border-primary bg-bg-secondary px-4 py-4 text-sm">
      <DetailRow label="Role" value={r.role_description} />
      <DetailRow label="Tools used" value={r.ai_tools_used} />
      <DetailRow label="Usage frequency" value={r.ai_usage_frequency} />
      <DetailRow label="Learning reasons" value={r.learning_reasons} />
      <DetailRow label="Wants AI to help with" value={r.ai_help_with} />
      <DetailRow label="Success looks like" value={r.success_definition} />
      <DetailRow label="Current feeling" value={r.current_feeling} />
      {r.specific_interests && (
        <DetailRow label="Free writing" value={r.specific_interests} />
      )}
      <DetailRow label="Used Zoom before" value={r.used_zoom_before} />
    </div>
  );
}

export function AdminSurveyList({ responses }: { responses: SurveyResponse[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (responses.length === 0) {
    return (
      <div className="rounded-xl border border-border-primary bg-bg-secondary px-6 py-12 text-center text-fg-tertiary">
        No responses yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-primary">
      {/* Table header */}
      <div className="hidden grid-cols-[1fr_1fr_120px_100px_40px] gap-4 border-b border-border-primary bg-bg-tertiary px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-fg-muted sm:grid">
        <span>Name</span>
        <span>Background</span>
        <span>AI Level</span>
        <span>Submitted</span>
        <span />
      </div>

      {/* Rows */}
      {responses.map((r) => {
        const isOpen = expanded.has(r.id);
        return (
          <div key={r.id} className="border-b border-border-primary last:border-0">
            <button
              type="button"
              onClick={() => toggle(r.id)}
              className={cn(
                'grid w-full grid-cols-[1fr_40px] gap-4 px-4 py-3 text-left transition-colors duration-[var(--duration-fast)]',
                'hover:bg-bg-secondary sm:grid-cols-[1fr_1fr_120px_100px_40px]',
                isOpen && 'bg-bg-secondary',
              )}
            >
              <span className="font-medium text-fg-primary">{r.name}</span>
              <span className="hidden text-sm text-fg-secondary sm:block">
                {r.professional_background}
              </span>
              <span className="hidden sm:block">
                <span
                  className={cn(
                    'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                    levelBadgeClass(r.ai_knowledge_level),
                  )}
                >
                  {shortLevel(r.ai_knowledge_level)}
                </span>
              </span>
              <span className="hidden text-sm text-fg-tertiary sm:block">
                {formatDate(r.submitted_at)}
              </span>
              <span className="flex items-center justify-center">
                <ChevronDown
                  size={16}
                  className={cn(
                    'text-fg-muted transition-transform duration-[var(--duration-fast)]',
                    isOpen && 'rotate-180',
                  )}
                />
              </span>
            </button>

            {isOpen && <ExpandedRow r={r} />}
          </div>
        );
      })}
    </div>
  );
}
