'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button, Input, Textarea } from '@/components/ui';
import { Send } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

type FormData = {
  applicant_full_name: string;
  applicant_email: string;
  bio_short: string;
  expertise_areas: string; // comma-separated, parsed at submit
  proposed_topic: string;
  sample_material_url: string;
  linkedin_url: string;
  website_url: string;
  why_honuvibe: string;
};

const initialForm: FormData = {
  applicant_full_name: '',
  applicant_email: '',
  bio_short: '',
  expertise_areas: '',
  proposed_topic: '',
  sample_material_url: '',
  linkedin_url: '',
  website_url: '',
  why_honuvibe: '',
};

export function InstructorApplicationForm() {
  const t = useTranslations('instructor_apply.form');
  const tHero = useTranslations('instructor_apply');
  const locale = useLocale();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const update =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.applicant_full_name.trim()) newErrors.applicant_full_name = 'Required';
    if (!form.applicant_email.trim() || !form.applicant_email.includes('@')) {
      newErrors.applicant_email = 'Valid email required';
    }
    if (!form.bio_short.trim()) newErrors.bio_short = 'Required';
    if (!form.proposed_topic.trim()) newErrors.proposed_topic = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('loading');

    const expertise = form.expertise_areas
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    try {
      const res = await fetch('/api/instructor-applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_full_name: form.applicant_full_name,
          applicant_email: form.applicant_email,
          bio_short: form.bio_short,
          expertise_areas: expertise,
          proposed_topic: form.proposed_topic,
          sample_material_url: form.sample_material_url || null,
          linkedin_url: form.linkedin_url || null,
          website_url: form.website_url || null,
          why_honuvibe: form.why_honuvibe || null,
          locale,
        }),
      });

      if (res.ok) {
        setStatus('success');
        trackEvent('instructor_apply_submit', { locale });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-lg bg-bg-secondary border border-border-default p-8 text-center space-y-4">
        <h3 className="text-xl font-serif text-accent-teal">{t('success_heading')}</h3>
        <p className="text-fg-secondary text-sm max-w-lg mx-auto">{t('success_body')}</p>
        <a
          href={`/${locale === 'ja' ? 'ja/' : ''}learn`}
          className="inline-block text-sm font-medium text-accent-teal hover:underline"
        >
          {t('success_cta')} →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-accent-teal font-semibold">
          {tHero('form_overline')}
        </p>
        <h2 className="text-2xl md:text-3xl font-serif text-fg-primary">
          {tHero('form_heading')}
        </h2>
        <p className="text-sm text-fg-tertiary">{tHero('form_sub')}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label={t('full_name')}
            value={form.applicant_full_name}
            onChange={update('applicant_full_name')}
            error={errors.applicant_full_name}
            required
          />
          <Input
            label={t('email')}
            type="email"
            value={form.applicant_email}
            onChange={update('applicant_email')}
            error={errors.applicant_email}
            required
          />
        </div>

        <Textarea
          label={t('bio_short')}
          value={form.bio_short}
          onChange={update('bio_short')}
          placeholder={t('bio_short_placeholder')}
          maxLength={500}
          showCount
          error={errors.bio_short}
          required
        />

        <div>
          <Input
            label={t('expertise_areas')}
            value={form.expertise_areas}
            onChange={update('expertise_areas')}
            placeholder={t('expertise_placeholder')}
          />
          <p className="mt-1.5 text-xs text-fg-tertiary">{t('expertise_hint')}</p>
        </div>

        <Textarea
          label={t('proposed_topic')}
          value={form.proposed_topic}
          onChange={update('proposed_topic')}
          placeholder={t('proposed_topic_placeholder')}
          maxLength={300}
          showCount
          error={errors.proposed_topic}
          required
        />

        <Input
          label={t('sample_material_url')}
          type="url"
          value={form.sample_material_url}
          onChange={update('sample_material_url')}
          placeholder={t('sample_material_placeholder')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label={t('linkedin_url')}
            type="url"
            value={form.linkedin_url}
            onChange={update('linkedin_url')}
          />
          <Input
            label={t('website_url')}
            type="url"
            value={form.website_url}
            onChange={update('website_url')}
          />
        </div>

        <Textarea
          label={t('why_honuvibe')}
          value={form.why_honuvibe}
          onChange={update('why_honuvibe')}
          placeholder={t('why_honuvibe_placeholder')}
          maxLength={500}
          showCount
        />

        <Button
          variant="primary"
          type="submit"
          disabled={status === 'loading'}
          icon={Send}
          iconPosition="right"
          fullWidth
          size="lg"
        >
          {status === 'loading' ? t('submitting') : t('submit')}
        </Button>

        {status === 'error' && (
          <p className="text-sm text-red-500 text-center">{t('error')}</p>
        )}
      </form>
    </div>
  );
}
