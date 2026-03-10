'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitFeedback } from '@/lib/vault/actions';
import { trackEvent } from '@/lib/analytics';
import type { VaultFeedbackType } from '@/lib/vault/types';

type VaultFeedbackWidgetProps = {
  itemId: string;
  helpfulCount: number;
  notHelpfulCount: number;
  currentFeedback: VaultFeedbackType | null;
};

export function VaultFeedbackWidget({
  itemId,
  helpfulCount,
  notHelpfulCount,
  currentFeedback,
}: VaultFeedbackWidgetProps) {
  const [feedback, setFeedback] = useState(currentFeedback);
  const [counts, setCounts] = useState({ helpful: helpfulCount, notHelpful: notHelpfulCount });
  const [loading, setLoading] = useState(false);

  async function handleFeedback(type: VaultFeedbackType) {
    setLoading(true);
    const prevFeedback = feedback;
    const prevCounts = { ...counts };

    // Optimistic update
    if (feedback === type) {
      // Un-vote
      setFeedback(null);
      setCounts((c) => ({
        helpful: type === 'helpful' ? c.helpful - 1 : c.helpful,
        notHelpful: type === 'not_helpful' ? c.notHelpful - 1 : c.notHelpful,
      }));
    } else {
      // New vote or switch
      setFeedback(type);
      setCounts((c) => ({
        helpful:
          type === 'helpful'
            ? c.helpful + 1
            : prevFeedback === 'helpful'
              ? c.helpful - 1
              : c.helpful,
        notHelpful:
          type === 'not_helpful'
            ? c.notHelpful + 1
            : prevFeedback === 'not_helpful'
              ? c.notHelpful - 1
              : c.notHelpful,
      }));
    }

    try {
      await submitFeedback(itemId, type);
      trackEvent('vault_feedback', { type });
    } catch {
      setFeedback(prevFeedback);
      setCounts(prevCounts);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4 py-4 border-t border-border-default">
      <span className="text-sm text-fg-tertiary">Was this helpful?</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleFeedback('helpful')}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
            feedback === 'helpful'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary',
          )}
        >
          <ThumbsUp size={14} className={feedback === 'helpful' ? 'fill-current' : ''} />
          {counts.helpful}
        </button>
        <button
          type="button"
          onClick={() => handleFeedback('not_helpful')}
          disabled={loading}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
            feedback === 'not_helpful'
              ? 'bg-red-500/10 text-red-400'
              : 'text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary',
          )}
        >
          <ThumbsDown size={14} className={feedback === 'not_helpful' ? 'fill-current' : ''} />
          {counts.notHelpful}
        </button>
      </div>
    </div>
  );
}
