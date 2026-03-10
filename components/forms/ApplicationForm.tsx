'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { Send } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

type Props = {
  sourcePage?: 'apply' | 'build';
};

type FormData = {
  name: string;
  email: string;
  company: string;
  website: string;
  engagement: string;
  project: string;
  outcome: string;
  referral_source: string;
  timeline: string;
  budget: string;
};

const initialForm: FormData = {
  name: '',
  email: '',
  company: '',
  website: '',
  engagement: '',
  project: '',
  outcome: '',
  referral_source: '',
  timeline: '',
  budget: '',
};

export function ApplicationForm({ sourcePage = 'apply' }: Props) {
  const t = useTranslations('build_page.form');
  const locale = useLocale();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const update = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const engagementOptions = [
    { value: 'consulting', label: t('engagement_options.consulting') },
    { value: 'project_build', label: t('engagement_options.project_build') },
    { value: 'pro_bono', label: t('engagement_options.pro_bono') },
    { value: 'advisory', label: t('engagement_options.advisory') },
    { value: 'passion_project', label: t('engagement_options.passion_project') },
    { value: 'other', label: t('engagement_options.other') },
  ];

  const referralOptions = [
    { value: 'social_media', label: t('referral_options.social_media') },
    { value: 'google', label: t('referral_options.google') },
    { value: 'referral', label: t('referral_options.referral') },
    { value: 'vertice', label: t('referral_options.vertice') },
    { value: 'blog', label: t('referral_options.blog') },
    { value: 'other', label: t('referral_options.other') },
  ];

  const timelineOptions = [
    { value: 'exploratory', label: t('timeline_options.exploratory') },
    { value: 'three_months', label: t('timeline_options.three_months') },
    { value: 'asap', label: t('timeline_options.asap') },
  ];

  const budgetOptions = [
    { value: 'pro_bono', label: t('budget_options.pro_bono') },
    { value: 'under_10k', label: t('budget_options.under_10k') },
    { value: '10k_50k', label: t('budget_options.10k_50k') },
    { value: '50k_plus', label: t('budget_options.50k_plus') },
    { value: 'not_sure', label: t('budget_options.not_sure') },
  ];

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Required';
    if (!form.email.trim() || !form.email.includes('@')) newErrors.email = 'Valid email required';
    if (!form.company.trim()) newErrors.company = 'Required';
    if (!form.engagement) newErrors.engagement = 'Required';
    if (!form.project.trim()) newErrors.project = 'Required';
    if (!form.outcome.trim()) newErrors.outcome = 'Required';
    if (!form.referral_source) newErrors.referral_source = 'Required';
    if (!form.timeline) newErrors.timeline = 'Required';
    if (!form.budget) newErrors.budget = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('loading');

    try {
      const res = await fetch('/api/apply/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          locale,
          source_page: sourcePage,
        }),
      });

      if (res.ok) {
        setStatus('success');
        trackEvent('build_form_submit', {
          engagement_type: form.engagement,
          budget_range: form.budget,
          locale,
        });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded bg-bg-secondary border border-border-default p-8 text-center">
        <p className="text-lg text-accent-teal font-medium">{t('success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label={t('name')}
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          required
        />
        <Input
          label={t('email')}
          type="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label={t('company')}
          value={form.company}
          onChange={update('company')}
          error={errors.company}
          required
        />
        <Input
          label={t('website')}
          type="url"
          value={form.website}
          onChange={update('website')}
        />
      </div>

      <Select
        label={t('engagement')}
        options={engagementOptions}
        value={form.engagement}
        onChange={update('engagement')}
        placeholder="Select..."
        error={errors.engagement}
        required
      />

      <Textarea
        label={t('project')}
        value={form.project}
        onChange={update('project')}
        maxLength={500}
        showCount
        error={errors.project}
        required
      />

      <Textarea
        label={t('outcome')}
        value={form.outcome}
        onChange={update('outcome')}
        error={errors.outcome}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Select
          label={t('referral')}
          options={referralOptions}
          value={form.referral_source}
          onChange={update('referral_source')}
          placeholder="Select..."
          error={errors.referral_source}
          required
        />
        <Select
          label={t('timeline')}
          options={timelineOptions}
          value={form.timeline}
          onChange={update('timeline')}
          placeholder="Select..."
          error={errors.timeline}
          required
        />
        <Select
          label={t('budget')}
          options={budgetOptions}
          value={form.budget}
          onChange={update('budget')}
          placeholder="Select..."
          error={errors.budget}
          required
        />
      </div>

      <Button
        variant="primary"
        type="submit"
        disabled={status === 'loading'}
        icon={Send}
        iconPosition="right"
        fullWidth
        size="lg"
      >
        {t('submit')}
      </Button>

      {status === 'error' && (
        <p className="text-sm text-red-500 text-center">{t('error')}</p>
      )}
    </form>
  );
}
