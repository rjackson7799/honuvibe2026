'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Clock, Sparkles } from 'lucide-react';
import { startBusinessUpgradePlan } from '@/lib/business-upgrades/actions';
import { REASON_LABELS, labelFor, type RecommendationReason } from '@/lib/business-upgrades/codes';

type Recommendation = {
  projectId: string;
  rank: number;
  score: number;
  reasons: RecommendationReason[];
  title: string;
  description: string;
  outcome: string;
  deliverable: string;
  estimatedDays: number;
  totalMinutes: number;
};

export function BusinessUpgradeRecommendationCards({ assessmentId, recommendations }: { assessmentId: string; recommendations: Recommendation[] }) {
  const locale = useLocale() === 'ja' ? 'ja' : 'en';
  const t = useTranslations('business_upgrades');
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  function start(projectId: string) {
    setBusyId(projectId);
    setError('');
    startTransition(async () => {
      try {
        const result = await startBusinessUpgradePlan({ assessmentId, projectId });
        const prefix = locale === 'ja' ? '/ja' : '';
        router.push(`${prefix}/learn/plans/business/${result.planId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error'));
        setBusyId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-accent-coral">{error}</p>}
      {recommendations.map((rec) => (
        <article key={rec.projectId} className="rounded-2xl border border-border-default bg-bg-secondary p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {rec.rank === 1 && <span className="inline-flex items-center gap-1 rounded-full bg-accent-teal/10 px-2.5 py-1 text-xs font-semibold text-accent-teal"><Sparkles size={13} />{t('recommended')}</span>}
              <h2 className="mt-3 text-xl font-bold text-fg-primary">{rec.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-secondary">{rec.description}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-fg-tertiary"><Clock size={14} />{t('estimated', { days: rec.estimatedDays, minutes: rec.totalMinutes })}</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-bg-tertiary p-4"><p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">{t('outcome')}</p><p className="mt-1 text-sm text-fg-primary">{rec.outcome}</p></div>
            <div className="rounded-xl bg-bg-tertiary p-4"><p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">{t('deliverable')}</p><p className="mt-1 text-sm text-fg-primary">{rec.deliverable}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{rec.reasons.map((reason) => <span key={reason} className="rounded-full border border-border-default px-2.5 py-1 text-xs text-fg-secondary">{labelFor(REASON_LABELS, reason, locale)}</span>)}</div>
          <button onClick={() => start(rec.projectId)} disabled={busyId !== null} className="mt-5 min-h-11 rounded-xl bg-accent-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busyId === rec.projectId ? t('working') : t('start_plan')}</button>
        </article>
      ))}
    </div>
  );
}
