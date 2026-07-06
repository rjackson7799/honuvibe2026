'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleSessionComplete } from '@/lib/progress/actions';

type SessionCompletionToggleProps = {
  sessionId: string;
  isCompleted: boolean;
};

export function SessionCompletionToggle({
  sessionId,
  isCompleted,
}: SessionCompletionToggleProps) {
  const t = useTranslations('dashboard');
  const [completed, setCompleted] = useState(isCompleted);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    setCompleted((v) => !v);
    try {
      await toggleSessionComplete(sessionId);
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
      className={cn(
        'inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors border disabled:opacity-60',
        completed
          ? 'bg-accent-teal/10 text-accent-teal border-accent-teal/30'
          : 'text-fg-secondary border-border-default hover:text-fg-primary hover:bg-bg-tertiary',
      )}
    >
      {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      {completed ? t('completed_label') : t('mark_complete')}
    </button>
  );
}
