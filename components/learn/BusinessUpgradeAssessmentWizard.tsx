'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createBusinessUpgradeAssessment } from '@/lib/business-upgrades/actions';
import {
  AI_CONFIDENCE_LEVELS,
  CONFIDENCE_LABELS,
  BUSINESS_GOALS,
  GOAL_LABELS,
  INDUSTRIES,
  INDUSTRY_LABELS,
  WORK_MODELS,
  WORK_MODEL_LABELS,
  labelFor,
  type AiConfidence,
  type BusinessGoal,
  type Industry,
  type WorkModel,
} from '@/lib/business-upgrades/codes';

const fieldClass = 'w-full min-h-11 rounded-xl border border-border-default bg-bg-secondary px-3 py-2.5 text-sm text-fg-primary focus:border-accent-teal focus:outline-none';

export function BusinessUpgradeAssessmentWizard() {
  const locale = useLocale() === 'ja' ? 'ja' : 'en';
  const t = useTranslations('business_upgrades');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [goal, setGoal] = useState<BusinessGoal>('save_time');
  const [workModel, setWorkModel] = useState<WorkModel>('small_business');
  const [industry, setIndustry] = useState<Industry | ''>('');
  const [confidence, setConfidence] = useState<AiConfidence>('beginner');
  const [weeklyTime, setWeeklyTime] = useState(60);
  const [businessName, setBusinessName] = useState('');
  const [offerSummary, setOfferSummary] = useState('');
  const [customerSummary, setCustomerSummary] = useState('');
  const [tools, setTools] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        const result = await createBusinessUpgradeAssessment({
          goal,
          workModel,
          industry: industry || null,
          aiConfidence: confidence,
          weeklyTimeMinutes: weeklyTime,
          currentTools: tools.split(',').map((v) => v.trim()).filter(Boolean),
          businessName,
          offerSummary,
          customerSummary,
          locale,
        });
        const prefix = locale === 'ja' ? '/ja' : '';
        router.push(`${prefix}/learn/plans/business/recommendations/${result.assessmentId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error'));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-border-default bg-bg-secondary p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-fg-primary">{t('assessment_title')}</h1>
        <p className="mt-2 text-sm leading-6 text-fg-secondary">{t('assessment_subtitle')}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-fg-secondary">
          <span>{t('goal')}</span>
          <select value={goal} onChange={(e) => setGoal(e.target.value as BusinessGoal)} className={fieldClass}>
            {BUSINESS_GOALS.map((code) => <option key={code} value={code}>{labelFor(GOAL_LABELS, code, locale)}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-fg-secondary">
          <span>{t('work_model')}</span>
          <select value={workModel} onChange={(e) => setWorkModel(e.target.value as WorkModel)} className={fieldClass}>
            {WORK_MODELS.map((code) => <option key={code} value={code}>{labelFor(WORK_MODEL_LABELS, code, locale)}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-fg-secondary">
          <span>{t('industry')}</span>
          <select value={industry} onChange={(e) => setIndustry(e.target.value as Industry | '')} className={fieldClass}>
            <option value="">—</option>
            {INDUSTRIES.map((code) => <option key={code} value={code}>{labelFor(INDUSTRY_LABELS, code, locale)}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-fg-secondary">
          <span>{t('confidence')}</span>
          <select value={confidence} onChange={(e) => setConfidence(e.target.value as AiConfidence)} className={fieldClass}>
            {AI_CONFIDENCE_LEVELS.map((code) => <option key={code} value={code}>{labelFor(CONFIDENCE_LABELS, code, locale)}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-fg-secondary">
          <span>{t('weekly_time')}</span>
          <select value={weeklyTime} onChange={(e) => setWeeklyTime(Number(e.target.value))} className={fieldClass}>
            {[30, 60, 120, 240].map((minutes) => <option key={minutes} value={minutes}>{t(`minutes_${minutes}`)}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-fg-secondary">
          <span>{t('business_name')}</span>
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={160} className={fieldClass} />
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-fg-secondary">
        <span>{t('offer_summary')}</span>
        <textarea value={offerSummary} onChange={(e) => setOfferSummary(e.target.value)} maxLength={600} rows={3} className={fieldClass} />
      </label>
      <label className="block space-y-2 text-sm font-medium text-fg-secondary">
        <span>{t('customer_summary')}</span>
        <textarea value={customerSummary} onChange={(e) => setCustomerSummary(e.target.value)} maxLength={600} rows={3} className={fieldClass} />
      </label>
      <label className="block space-y-2 text-sm font-medium text-fg-secondary">
        <span>{t('tools')}</span>
        <input value={tools} onChange={(e) => setTools(e.target.value)} className={fieldClass} placeholder="ChatGPT, Google Workspace" />
      </label>

      {error && <p role="alert" className="text-sm text-accent-coral">{error}</p>}
      <button disabled={pending} className="min-h-12 w-full rounded-xl bg-accent-teal px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? t('working') : t('get_recommendations')}
      </button>
    </form>
  );
}
