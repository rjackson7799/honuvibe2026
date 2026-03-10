'use client';

import { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { markComplete } from '@/lib/vault/actions';

type VaultCompletionToggleProps = {
  itemId: string;
  isCompleted: boolean;
};

export function VaultCompletionToggle({ itemId, isCompleted: initial }: VaultCompletionToggleProps) {
  const [completed, setCompleted] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    setCompleted((v) => !v);

    try {
      await markComplete(itemId);
    } catch {
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
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
        completed
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'text-fg-secondary border-border-default hover:text-fg-primary hover:bg-bg-tertiary',
      )}
    >
      {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      {completed ? 'Completed' : 'Mark as Done'}
    </button>
  );
}
