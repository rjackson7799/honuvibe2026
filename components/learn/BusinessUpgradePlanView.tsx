'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Check, ExternalLink } from 'lucide-react';
import { setBusinessUpgradePlanLifecycle, setBusinessUpgradeStepStatus } from '@/lib/business-upgrades/actions';
import type { BusinessUpgradePlanDetail, BusinessUpgradePlanStep } from '@/lib/business-upgrades/types';
import { trackEvent } from '@/lib/analytics';

export function BusinessUpgradePlanView({ plan }: { plan: BusinessUpgradePlanDetail }) {
  const locale = useLocale() === 'ja' ? 'ja' : 'en';
  const t = useTranslations('business_upgrades');
  const prefix = locale === 'ja' ? '/ja' : '';
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [, transition] = useTransition();
  const required = plan.steps.filter((step) => step.required);
  const done = required.filter((step) => step.status === 'completed').length;
  const dateFormatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  function updateStep(step: BusinessUpgradePlanStep, completed: boolean) {
    setBusy(step.id); setError('');
    transition(async () => {
      try {
        const raw = values[step.id];
        await setBusinessUpgradeStepStatus({ planId: plan.id, stepId: step.id, completed, measurementValue: step.stepType === 'measurement' && completed ? Number(raw) : null });
      } catch (err) { setError(err instanceof Error ? err.message : t('error')); }
      finally { setBusy(null); }
    });
  }

  function lifecycle(action: 'archive' | 'reactivate') {
    setBusy(action); setError('');
    transition(async () => {
      try { await setBusinessUpgradePlanLifecycle({ planId: plan.id, action }); }
      catch (err) { setError(err instanceof Error ? err.message : t('error')); }
      finally { setBusy(null); }
    });
  }

  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-border-default bg-bg-secondary p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-semibold uppercase tracking-wide text-accent-teal">{t(plan.status)}</span><h1 className="mt-2 text-2xl font-bold text-fg-primary">{plan.title[locale]}</h1><p className="mt-1 text-xs text-fg-tertiary">{t('started_on', { date: dateFormatter.format(new Date(plan.startedAt)) })}{plan.completedAt ? ` · ${t('completed_on', { date: dateFormatter.format(new Date(plan.completedAt)) })}` : ''}</p></div><span className="text-sm text-fg-tertiary">{t('progress', { completed: done, total: required.length })}</span></div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-bg-tertiary"><div className="h-full rounded-full bg-accent-teal" style={{ width: `${required.length ? Math.round(done / required.length * 100) : 0}%` }} /></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">{t('outcome')}</p><p className="mt-1 text-sm leading-6 text-fg-primary">{plan.outcome[locale]}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">{t('deliverable')}</p><p className="mt-1 text-sm leading-6 text-fg-primary">{plan.deliverable[locale]}</p></div></div>
      </div>

      {error && <p role="alert" className="text-sm text-accent-coral">{error}</p>}
      <section><h2 className="mb-4 text-lg font-bold text-fg-primary">{t('steps')}</h2><div className="space-y-3">
        {plan.steps.map((step) => {
          const isDone = step.status === 'completed';
          const resourceHref = step.stepType === 'vault' && step.contentSlug ? `${prefix}/learn/vault/${step.contentSlug}` : step.stepType === 'workbench' && step.workbenchSlug ? `${prefix}/learn/vault/workbench/${step.workbenchSlug}?plan=${plan.id}&step=${step.id}` : null;
          return <article key={step.id} className={`rounded-xl border p-5 ${isDone ? 'border-accent-teal/30 bg-accent-teal/5' : 'border-border-default bg-bg-secondary'}`}>
            <div className="flex gap-3"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isDone ? 'bg-accent-teal text-white' : 'bg-bg-tertiary text-fg-secondary'}`}>{isDone ? <Check size={15} /> : step.sortOrder}</span><div className="min-w-0 flex-1"><h3 className="font-semibold text-fg-primary">{step.title[locale]}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-fg-secondary">{step.instructions[locale]}</p>
              {resourceHref && <Link href={resourceHref} className="mt-3 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-semibold text-accent-teal">{step.stepType === 'vault' ? t('open_resource') : t('open_workbench')}<ExternalLink size={14} /></Link>}
              {step.stepType === 'measurement' && !isDone && <label className="mt-3 block max-w-xs text-sm text-fg-secondary"><span>{t('measurement_value', { label: plan.metricLabel[locale], unit: plan.metricUnit })}</span><input type="number" value={values[step.id] ?? ''} onChange={(e) => setValues((old) => ({ ...old, [step.id]: e.target.value }))} className="mt-2 min-h-11 w-full rounded-lg border border-border-default bg-bg-primary px-3" /></label>}
              <button onClick={() => updateStep(step, !isDone)} disabled={busy !== null || (step.stepType === 'measurement' && !isDone && !values[step.id])} className="mt-3 min-h-10 rounded-lg border border-border-default px-3 py-2 text-sm font-semibold text-fg-primary disabled:opacity-50">{busy === step.id ? t('working') : isDone ? t('reopen_step') : step.stepType === 'measurement' ? t('save_measurement') : t('complete_step')}</button>
            </div></div>
          </article>;
        })}
      </div></section>

      <section className="rounded-2xl bg-bg-tertiary p-6"><h2 className="font-bold text-fg-primary">{t('studio_title')}</h2>{locale === 'ja' && <p className="mt-1 text-xs text-fg-tertiary">{t('studio_ja_note')}</p>}<a onClick={() => trackEvent('business_upgrade_studio_cta_clicked', { project_slug: plan.projectSlug, locale })} href={`https://studio.honuvibe.ai/contact?source=business_upgrade&project=${encodeURIComponent(plan.projectSlug)}`} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-fg-primary px-4 py-2 text-sm font-semibold text-bg-primary">{t('studio_cta')}</a></section>
      <button onClick={() => lifecycle(plan.status === 'archived' ? 'reactivate' : 'archive')} disabled={busy !== null} className="min-h-11 text-sm font-medium text-fg-tertiary hover:text-fg-primary">{plan.status === 'archived' ? t('reactivate') : t('archive')}</button>
    </div>
  );
}
