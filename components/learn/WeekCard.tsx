'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronDown, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionCard } from './SessionCard';
import { AssignmentCard } from './AssignmentCard';
import { VocabularyList } from './VocabularyList';
import type { CourseWeekWithContent } from '@/lib/courses/types';

type WeekState = 'current' | 'completed' | 'locked' | 'upcoming';

type WeekCardProps = {
  week: CourseWeekWithContent;
  state: WeekState;
  defaultOpen?: boolean;
};

export function WeekCard({ week, state, defaultOpen = false }: WeekCardProps) {
  const t = useTranslations('learn');
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const title = locale === 'ja' && week.title_jp ? week.title_jp : week.title_en;
  const subtitle = locale === 'ja' && week.subtitle_jp ? week.subtitle_jp : week.subtitle_en;
  const isUnlocked = state !== 'locked';

  const unlockDateFormatted = week.unlock_date
    ? new Date(week.unlock_date).toLocaleDateString(
        locale === 'ja' ? 'ja-JP' : 'en-US',
        { month: 'short', day: 'numeric' },
      )
    : null;

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-colors duration-[var(--duration-fast)]',
        state === 'current' && 'border-accent-teal bg-accent-teal/[0.03]',
        state === 'completed' && 'border-border-default',
        state === 'locked' && 'border-border-default opacity-60',
        state === 'upcoming' && 'border-border-default',
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => isUnlocked && setIsOpen(!isOpen)}
        disabled={!isUnlocked}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left',
          isUnlocked && 'hover:bg-bg-tertiary transition-colors duration-[var(--duration-fast)]',
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm mb-1">
            {state === 'current' && (
              <span className="text-xs font-medium text-accent-teal px-2 py-0.5 bg-accent-teal/10 rounded-full">
                {t('current_week')}
              </span>
            )}
            {state === 'completed' && (
              <CheckCircle2 size={16} className="text-accent-teal" />
            )}
            {state === 'locked' && (
              <Lock size={14} className="text-fg-tertiary" />
            )}
            <span className="text-fg-tertiary text-sm">
              {t('week', { number: week.week_number })}
            </span>
            {week.phase && (
              <>
                <span className="text-fg-tertiary">·</span>
                <span className="text-fg-tertiary text-sm">{week.phase}</span>
              </>
            )}
          </div>
          <span className="text-fg-primary font-medium">{title}</span>
          {state === 'locked' && unlockDateFormatted && (
            <p className="text-xs text-fg-tertiary mt-1">
              {t('unlocks', { date: unlockDateFormatted })}
            </p>
          )}
        </div>
        {isUnlocked && (
          <ChevronDown
            size={20}
            className={cn(
              'shrink-0 text-fg-tertiary transition-transform duration-[var(--duration-fast)]',
              isOpen && 'rotate-180',
            )}
          />
        )}
      </button>

      {/* Content */}
      {isOpen && isUnlocked && (
        <div className="px-4 pb-4 space-y-4 border-t border-border-default pt-4">
          {/* Subtitle */}
          {subtitle && (
            <p className="text-sm text-fg-secondary italic">{subtitle}</p>
          )}

          {/* Sessions */}
          {week.sessions.length > 0 && (
            <div className="space-y-3">
              {week.sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isUnlocked={isUnlocked}
                />
              ))}
            </div>
          )}

          {/* Assignments */}
          {week.assignments.length > 0 && (
            <div className="space-y-3">
              {week.assignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}

          {/* Vocabulary */}
          <VocabularyList vocabulary={week.vocabulary} />
        </div>
      )}
    </div>
  );
}
