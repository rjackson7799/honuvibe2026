'use client';

import { useState, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleAssignmentComplete } from '@/lib/progress/actions';

type AssignmentCompletionToggleProps = {
  assignmentId: string;
  isCompleted?: boolean;
};

/**
 * Leading checkbox control for an action-item row. Rendered inside the row's
 * course-link, so the click must be stopped from bubbling to the Link — checking
 * the box marks the assignment done, it does not navigate to the course.
 */
export function AssignmentCompletionToggle({
  assignmentId,
  isCompleted = false,
}: AssignmentCompletionToggleProps) {
  const t = useTranslations('dashboard');
  const [completed, setCompleted] = useState(isCompleted);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: MouseEvent<HTMLButtonElement>) {
    // Nested inside a Link: don't let the click navigate.
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    setCompleted((v) => !v);
    try {
      await toggleAssignmentComplete(assignmentId);
    } catch {
      // Revert optimistic update on failure.
      setCompleted((v) => !v);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-pressed={completed}
      aria-label={completed ? t('completed_label') : t('mark_complete')}
      className={cn(
        'shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg transition-colors disabled:opacity-60',
        completed
          ? 'text-accent-teal'
          : 'text-fg-tertiary hover:text-accent-teal hover:bg-bg-tertiary',
      )}
    >
      {completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
    </button>
  );
}
