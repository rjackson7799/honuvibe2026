'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Check, ChevronDown, Loader2 } from 'lucide-react';
import {
  Container,
  Overline,
  Section,
} from '@/components/marketing/primitives';
import {
  AUDIENCE_SIZE_VALUES,
  LANGUAGE_VALUES,
  ORG_TYPE_VALUES,
  REFERRAL_SOURCE_VALUES,
  TIMELINE_VALUES,
} from '@/lib/partnerships/labels';

type FormState = {
  full_name: string;
  email: string;
  organization: string;
  website: string;
  org_type: string;
  community_description: string;
  program_description: string;
  audience_size: string;
  language: string;
  timeline: string;
  referral_source: string;
};

type Status = 'idle' | 'loading' | 'success' | 'error';

const initialForm: FormState = {
  full_name: '',
  email: '',
  organization: '',
  website: '',
  org_type: '',
  community_description: '',
  program_description: '',
  audience_size: '',
  language: '',
  timeline: '',
  referral_source: '',
};

export function PartnershipsApplicationForm() {
  const t = useTranslations('partnerships.application_form');
  const locale = useLocale();
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<Status>('idle');

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/partnerships/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          website: form.website || null,
          audience_size: form.audience_size || null,
          language: form.language || null,
          timeline: form.timeline || null,
          referral_source: form.referral_source || null,
          source_locale: locale === 'ja' ? 'ja' : 'en',
        }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const inputBase =
    'w-full rounded-[9px] border-[1.5px] border-[rgba(26,43,51,0.14)] bg-[var(--m-canvas)] px-4 py-[13px] text-[15px] text-[var(--m-ink-primary)] placeholder:text-[var(--m-ink-tertiary)] outline-none transition-colors focus:border-[var(--m-accent-teal)] focus:ring-2 focus:ring-[rgba(15,169,160,0.2)]';
  const labelBase =
    'mb-[7px] block text-[12.5px] font-semibold tracking-[0.03em] text-[var(--m-ink-secondary)]';

  if (status === 'success') {
    return (
      <Section id="apply" variant="sand">
        <Container>
          <div className="mx-auto max-w-[700px] rounded-[20px] bg-[var(--m-white)] px-12 py-16 text-center shadow-[0_8px_32px_rgba(26,43,51,0.07)]">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(15,169,160,0.1)]">
              <Check
                size={28}
                strokeWidth={2}
                className="text-[var(--m-accent-teal)]"
              />
            </div>
            <h2 className="mb-3 text-[26px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
              {t('success_heading')}
            </h2>
            <p className="mx-auto max-w-[420px] text-[16px] leading-[1.65] text-[var(--m-ink-secondary)]">
              {t('success_body')}
            </p>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section id="apply" variant="sand">
      <Container>
        <div className="mx-auto max-w-[760px]">
          <div className="mb-12 text-center md:mb-14">
            <Overline tone="coral" className="mb-3.5 inline-block">
              {t('overline')}
            </Overline>
            <h2 className="mb-3.5 font-bold leading-[1.15] tracking-[-0.022em] text-[var(--m-ink-primary)]" style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>
              {t('headline')}
            </h2>
            <p className="text-[17px] leading-[1.65] text-[var(--m-ink-secondary)]">
              {t('subhead')}
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 rounded-[20px] bg-[var(--m-white)] px-8 py-10 shadow-[0_8px_32px_rgba(26,43,51,0.07)] md:px-13 md:py-13"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={t('name_label')} htmlFor="p-name">
                <input
                  id="p-name"
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  placeholder={t('name_placeholder')}
                  className={inputBase}
                />
              </Field>
              <Field label={t('email_label')} htmlFor="p-email">
                <input
                  id="p-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder={t('email_placeholder')}
                  className={inputBase}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={t('organization_label')} htmlFor="p-org">
                <input
                  id="p-org"
                  type="text"
                  required
                  value={form.organization}
                  onChange={(e) => set('organization', e.target.value)}
                  placeholder={t('organization_placeholder')}
                  className={inputBase}
                />
              </Field>
              <Field
                label={
                  <>
                    {t('website_label')}{' '}
                    <span className="font-normal opacity-60">
                      {t('website_optional')}
                    </span>
                  </>
                }
                htmlFor="p-website"
              >
                <input
                  id="p-website"
                  type="url"
                  value={form.website}
                  onChange={(e) => set('website', e.target.value)}
                  placeholder={t('website_placeholder')}
                  className={inputBase}
                />
              </Field>
            </div>

            <Field label={t('org_type_label')} htmlFor="p-org-type">
              <SelectInput
                id="p-org-type"
                value={form.org_type}
                onChange={(v) => set('org_type', v)}
                placeholder={t('org_type_placeholder')}
                required
                className={inputBase}
                options={ORG_TYPE_VALUES.map((v) => ({
                  value: v,
                  label: t(`org_type_options.${v}`),
                }))}
              />
            </Field>

            <Field label={t('community_label')} htmlFor="p-community">
              <textarea
                id="p-community"
                required
                rows={4}
                maxLength={4000}
                value={form.community_description}
                onChange={(e) => set('community_description', e.target.value)}
                placeholder={t('community_placeholder')}
                className={`${inputBase} resize-y leading-[1.6]`}
              />
            </Field>

            <Field label={t('program_label')} htmlFor="p-program">
              <textarea
                id="p-program"
                required
                rows={4}
                maxLength={4000}
                value={form.program_description}
                onChange={(e) => set('program_description', e.target.value)}
                placeholder={t('program_placeholder')}
                className={`${inputBase} resize-y leading-[1.6]`}
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={t('audience_size_label')} htmlFor="p-audience">
                <SelectInput
                  id="p-audience"
                  value={form.audience_size}
                  onChange={(v) => set('audience_size', v)}
                  placeholder={t('audience_size_placeholder')}
                  className={inputBase}
                  options={AUDIENCE_SIZE_VALUES.map((v) => ({
                    value: v,
                    label: t(`audience_size_options.${v}`),
                  }))}
                />
              </Field>
              <Field label={t('language_label')} htmlFor="p-language">
                <SelectInput
                  id="p-language"
                  value={form.language}
                  onChange={(v) => set('language', v)}
                  placeholder={t('language_placeholder')}
                  className={inputBase}
                  options={LANGUAGE_VALUES.map((v) => ({
                    value: v,
                    label: t(`language_options.${v}`),
                  }))}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={t('timeline_label')} htmlFor="p-timeline">
                <SelectInput
                  id="p-timeline"
                  value={form.timeline}
                  onChange={(v) => set('timeline', v)}
                  placeholder={t('timeline_placeholder')}
                  className={inputBase}
                  options={TIMELINE_VALUES.map((v) => ({
                    value: v,
                    label: t(`timeline_options.${v}`),
                  }))}
                />
              </Field>
              <Field label={t('referral_label')} htmlFor="p-referral">
                <SelectInput
                  id="p-referral"
                  value={form.referral_source}
                  onChange={(v) => set('referral_source', v)}
                  placeholder={t('referral_placeholder')}
                  className={inputBase}
                  options={REFERRAL_SOURCE_VALUES.map((v) => ({
                    value: v,
                    label: t(`referral_options.${v}`),
                  }))}
                />
              </Field>
            </div>

            <div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--m-accent-coral)] px-7 py-[17px] text-[16px] font-bold tracking-[-0.01em] text-white shadow-[0_4px_18px_rgba(232,118,90,0.25)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--m-accent-coral-dark)] hover:shadow-[var(--m-shadow-coral-md)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  <>
                    {t('submit')}
                    <ArrowRight size={16} strokeWidth={2} />
                  </>
                )}
              </button>
              <p className="mt-4 text-center text-[13.5px] leading-[1.6] text-[var(--m-ink-tertiary)]">
                {t('helper_pre')}{' '}
                <a
                  href="/learn"
                  className="font-medium text-[var(--m-accent-teal)] hover:underline"
                >
                  {t('helper_link')}
                </a>
              </p>
              {status === 'error' && (
                <p
                  role="alert"
                  aria-live="assertive"
                  className="mt-4 text-center text-[14px] text-[var(--m-accent-coral)]"
                >
                  {t('error')}
                </p>
              )}
            </div>
          </form>
        </div>
      </Container>
    </Section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-[7px] block text-[12.5px] font-semibold tracking-[0.03em] text-[var(--m-ink-secondary)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectInput({
  id,
  value,
  onChange,
  placeholder,
  options,
  required,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  required?: boolean;
  className: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} cursor-pointer appearance-none pr-10`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={1.6}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--m-ink-secondary)]"
        aria-hidden
      />
    </div>
  );
}
