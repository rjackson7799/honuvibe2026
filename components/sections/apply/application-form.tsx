'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui';
import { Send, CheckCircle } from 'lucide-react';

type FormData = {
  name: string;
  email: string;
  company: string;
  website: string;
  engagement: string;
  project: string;
  outcome: string;
  source: string;
  timeline: string;
  budget: string;
};

const initialFormData: FormData = {
  name: '',
  email: '',
  company: '',
  website: '',
  engagement: 'consulting',
  project: '',
  outcome: '',
  source: 'search',
  timeline: 'exploratory',
  budget: 'unsure',
};

export function ApplicationForm() {
  const t = useTranslations('apply_page.form');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/apply/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const inputClasses =
    'h-12 w-full rounded bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)]';

  const selectClasses =
    'h-12 w-full rounded bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)] appearance-none';

  const textareaClasses =
    'w-full rounded bg-bg-tertiary px-4 py-3 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)] resize-none';

  if (status === 'success') {
    return (
      <Section>
        <Container size="narrow">
          <div className="rounded-2xl border border-accent-teal/30 bg-accent-teal-subtle p-12 text-center">
            <CheckCircle size={40} className="mx-auto text-accent-teal mb-4" />
            <h2 className="font-serif text-h3 text-fg-primary mb-3">{t('success_heading')}</h2>
            <p className="text-base text-fg-secondary leading-relaxed max-w-[440px] mx-auto">
              {t('success_message')}
            </p>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container size="narrow">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Row: Name + Email */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-fg-secondary">{t('name_label')}</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={t('name_placeholder')}
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-fg-secondary">{t('email_label')}</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder={t('email_placeholder')}
                className={inputClasses}
              />
            </div>
          </div>

          {/* Row: Company + Website */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-fg-secondary">{t('company_label')}</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder={t('company_placeholder')}
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-fg-secondary">{t('website_label')}</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder={t('website_placeholder')}
                className={inputClasses}
              />
            </div>
          </div>

          {/* Engagement type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-fg-secondary">{t('engagement_label')}</label>
            <select
              value={formData.engagement}
              onChange={(e) => handleChange('engagement', e.target.value)}
              className={selectClasses}
            >
              <option value="consulting">{t('engagement_options.consulting')}</option>
              <option value="advisory">{t('engagement_options.advisory')}</option>
              <option value="board">{t('engagement_options.board')}</option>
              <option value="passion">{t('engagement_options.passion')}</option>
              <option value="other">{t('engagement_options.other')}</option>
            </select>
          </div>

          {/* Project description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-fg-secondary">{t('project_label')}</label>
            <textarea
              required
              rows={4}
              maxLength={500}
              value={formData.project}
              onChange={(e) => handleChange('project', e.target.value)}
              placeholder={t('project_placeholder')}
              className={textareaClasses}
            />
          </div>

          {/* Expected outcome */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-fg-secondary">{t('outcome_label')}</label>
            <textarea
              rows={3}
              value={formData.outcome}
              onChange={(e) => handleChange('outcome', e.target.value)}
              placeholder={t('outcome_placeholder')}
              className={textareaClasses}
            />
          </div>

          {/* Row: Source + Timeline + Budget */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-fg-secondary">{t('source_label')}</label>
              <select
                value={formData.source}
                onChange={(e) => handleChange('source', e.target.value)}
                className={selectClasses}
              >
                <option value="search">{t('source_options.search')}</option>
                <option value="social">{t('source_options.social')}</option>
                <option value="referral">{t('source_options.referral')}</option>
                <option value="event">{t('source_options.event')}</option>
                <option value="other">{t('source_options.other')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-fg-secondary">{t('timeline_label')}</label>
              <select
                value={formData.timeline}
                onChange={(e) => handleChange('timeline', e.target.value)}
                className={selectClasses}
              >
                <option value="exploratory">{t('timeline_options.exploratory')}</option>
                <option value="three_months">{t('timeline_options.three_months')}</option>
                <option value="asap">{t('timeline_options.asap')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-fg-secondary">{t('budget_label')}</label>
              <select
                value={formData.budget}
                onChange={(e) => handleChange('budget', e.target.value)}
                className={selectClasses}
              >
                <option value="under_10k">{t('budget_options.under_10k')}</option>
                <option value="10k_50k">{t('budget_options.10k_50k')}</option>
                <option value="over_50k">{t('budget_options.over_50k')}</option>
                <option value="unsure">{t('budget_options.unsure')}</option>
              </select>
            </div>
          </div>

          <Button
            variant="gold"
            size="lg"
            type="submit"
            disabled={status === 'loading'}
            icon={Send}
            iconPosition="right"
            className="mt-2"
          >
            {t('submit')}
          </Button>

          {status === 'error' && (
            <p className="text-sm text-red-400 text-center">{t('error')}</p>
          )}
        </form>
      </Container>
    </Section>
  );
}
