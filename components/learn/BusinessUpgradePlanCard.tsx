import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { BusinessUpgradePlanListRow } from '@/lib/business-upgrades/types';

export function BusinessUpgradePlanCard({ plan, locale, labels }: { plan: BusinessUpgradePlanListRow; locale: string; labels: { active: string; completed: string; archived: string; progress: (completed: number, total: number) => string; continue: string; view: string } }) {
  const steps = plan.business_upgrade_plan_steps ?? [];
  const required = steps.filter((step) => step.required);
  const completed = required.filter((step) => step.status === 'completed').length;
  const progress = required.length ? Math.round((completed / required.length) * 100) : 0;
  const prefix = locale === 'ja' ? '/ja' : '';
  const title = locale === 'ja' ? plan.title_ja : plan.title_en;
  const outcome = locale === 'ja' ? plan.outcome_ja : plan.outcome_en;
  return (
    <Link href={`${prefix}/learn/plans/business/${plan.id}`} className="block rounded-2xl border border-border-default bg-bg-secondary p-5 transition hover:border-accent-teal/50 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><span className="text-xs font-semibold uppercase tracking-wide text-accent-teal">{labels[plan.status as 'active' | 'completed' | 'archived']}</span><h3 className="mt-1 text-lg font-bold text-fg-primary">{title}</h3></div><ArrowRight size={18} className="text-fg-tertiary" /></div>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-fg-secondary">{outcome}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-tertiary"><div className="h-full rounded-full bg-accent-teal" style={{ width: `${progress}%` }} /></div>
      <div className="mt-2 flex justify-between text-xs text-fg-tertiary"><span>{labels.progress(completed, required.length)}</span><span>{plan.status === 'active' ? labels.continue : labels.view}</span></div>
    </Link>
  );
}
