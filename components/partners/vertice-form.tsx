'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Lock, Loader2, ArrowRight, Check } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

type FormData = {
  fullName: string;
  email: string;
  aiLevel: '' | 'beginner' | 'intermediate' | 'advanced';
  interests: string[];
  whyStudy: string;
  accessCode: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

type SuccessData = {
  firstName: string;
  isReturning: boolean;
};

type VerticeFormProps = {
  onSuccess: (data: SuccessData) => void;
};

const INTEREST_OPTIONS = [
  'prompting',
  'image_gen',
  'automation',
  'data',
  'assistants',
  'landscape',
] as const;

const AI_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const MAX_WHY_LENGTH = 300;

export function VerticeForm({ onSuccess }: VerticeFormProps) {
  const t = useTranslations('vertice');
  const locale = useLocale();

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    aiLevel: '',
    interests: [],
    whyStudy: '',
    accessCode: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [serverError, setServerError] = useState<string>('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const formStartTracked = useRef(false);

  const handleFieldChange = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Track first field interaction
    if (!formStartTracked.current) {
      formStartTracked.current = true;
      trackEvent('vertice_form_start', { locale, first_field: field });
    }

    // Clear error on change if already attempted submit
    if (hasAttemptedSubmit) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests };
    });

    if (hasAttemptedSubmit) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.interests;
        return next;
      });
    }
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errs.fullName = t('errors.name_required');
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = t('errors.email_invalid');
    }
    if (!formData.aiLevel) {
      errs.aiLevel = t('errors.level_required');
    }
    if (formData.interests.length === 0) {
      errs.interests = t('errors.interests_required');
    }
    if (!formData.whyStudy.trim() || formData.whyStudy.trim().length < 10) {
      errs.whyStudy = t('errors.why_required');
    }
    if (!formData.accessCode.trim()) {
      errs.accessCode = t('errors.code_invalid');
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setServerError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus('loading');
    trackEvent('vertice_form_submit', { locale, ai_level: formData.aiLevel });

    try {
      const res = await fetch('/api/vertice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, locale }),
      });

      const result = await res.json();

      if (!res.ok) {
        setStatus('error');

        if (result.error === 'invalid_code') {
          setErrors({ accessCode: t('errors.code_invalid') });
          trackEvent('vertice_form_error', { locale, error_type: 'invalid_code' });
        } else if (result.error === 'rate_limit') {
          setServerError(t('errors.rate_limit'));
          trackEvent('vertice_form_error', { locale, error_type: 'rate_limit' });
        } else {
          setServerError(t('errors.server_error'));
          trackEvent('vertice_form_error', { locale, error_type: 'server_error' });
        }
        return;
      }

      trackEvent('vertice_form_success', {
        locale,
        ai_level: formData.aiLevel,
        interests_count: String(formData.interests.length),
      });

      onSuccess({
        firstName: result.firstName,
        isReturning: result.isReturning,
      });
    } catch {
      setStatus('error');
      setServerError(t('errors.server_error'));
    }
  };

  const inputClasses =
    'h-12 w-full rounded-lg bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-primary placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)]';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {/* Full Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vertice-name" className="text-sm font-medium text-fg-secondary">
          {t('form.full_name')}
        </label>
        <input
          id="vertice-name"
          type="text"
          value={formData.fullName}
          onChange={(e) => handleFieldChange('fullName', e.target.value)}
          placeholder={t('form.full_name_placeholder')}
          className={inputClasses}
          autoComplete="name"
        />
        {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vertice-email" className="text-sm font-medium text-fg-secondary">
          {t('form.email')}
        </label>
        <input
          id="vertice-email"
          type="email"
          value={formData.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          placeholder={t('form.email_placeholder')}
          className={inputClasses}
          autoComplete="email"
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
      </div>

      {/* AI Level — Button Group */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-fg-secondary mb-1.5">
          {t('form.ai_level')}
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {AI_LEVELS.map((level) => {
            const isSelected = formData.aiLevel === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => handleFieldChange('aiLevel', level)}
                className={`min-h-[48px] rounded-lg border text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
                  isSelected
                    ? 'bg-accent-teal-subtle border-accent-teal text-accent-teal'
                    : 'bg-transparent border-border-primary text-fg-secondary hover:border-border-hover'
                }`}
              >
                {t(`form.ai_${level}`)}
              </button>
            );
          })}
        </div>
        {errors.aiLevel && <p className="text-xs text-red-500">{errors.aiLevel}</p>}
      </fieldset>

      {/* Interests — Checkbox Cards */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-fg-secondary mb-1.5">
          {t('form.interests_label')}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INTEREST_OPTIONS.map((interest) => {
            const isSelected = formData.interests.includes(interest);
            return (
              <label
                key={interest}
                className={`flex items-center gap-3 min-h-[48px] px-3.5 py-2.5 rounded-lg border cursor-pointer transition-colors duration-[var(--duration-fast)] ${
                  isSelected
                    ? 'bg-accent-teal-subtle border-accent-teal'
                    : 'bg-white/50 border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors duration-[var(--duration-fast)] ${
                    isSelected
                      ? 'bg-accent-teal text-white'
                      : 'border-2 border-slate-300 bg-white shadow-sm'
                  }`}
                >
                  {isSelected && <Check size={14} strokeWidth={2.5} />}
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleInterest(interest)}
                  className="sr-only"
                />
                <span className={`text-sm ${isSelected ? 'text-accent-teal font-medium' : 'text-fg-secondary'}`}>
                  {t(`form.interest_${interest}`)}
                </span>
              </label>
            );
          })}
        </div>
        {errors.interests && <p className="text-xs text-red-500">{errors.interests}</p>}
      </fieldset>

      {/* Why Study */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vertice-why" className="text-sm font-medium text-fg-secondary">
          {t('form.why_study')}
        </label>
        <textarea
          id="vertice-why"
          rows={3}
          maxLength={MAX_WHY_LENGTH}
          value={formData.whyStudy}
          onChange={(e) => handleFieldChange('whyStudy', e.target.value)}
          placeholder={t('form.why_study_placeholder')}
          className={`${inputClasses} h-auto py-3 resize-none`}
        />
        <div className="flex justify-between">
          {errors.whyStudy ? (
            <p className="text-xs text-red-500">{errors.whyStudy}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-fg-tertiary tabular-nums">
            {t('form.chars_remaining', { count: formData.whyStudy.length })}
          </span>
        </div>
      </div>

      {/* Access Code */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vertice-code" className="text-sm font-medium text-fg-secondary">
          {t('form.access_code')}
        </label>
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-tertiary" />
          <input
            id="vertice-code"
            type="text"
            value={formData.accessCode}
            onChange={(e) => handleFieldChange('accessCode', e.target.value.toUpperCase())}
            placeholder={t('form.access_code_placeholder')}
            className={`${inputClasses} pl-10 font-mono uppercase text-lg tracking-wider`}
            autoComplete="off"
          />
        </div>
        {errors.accessCode && <p className="text-xs text-red-500">{errors.accessCode}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="mt-1 h-12 w-full sm:w-auto sm:min-w-[280px] rounded-lg bg-accent-teal text-white font-medium text-base flex items-center justify-center gap-2 hover:bg-accent-teal-hover disabled:opacity-50 disabled:pointer-events-none transition-colors duration-[var(--duration-fast)]"
      >
        {status === 'loading' ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t('form.submitting')}
          </>
        ) : (
          <>
            {t('form.submit')}
            <span className="text-accent-gold">&#10022;</span>
          </>
        )}
      </button>

      {/* Server error */}
      {serverError && (
        <p role="alert" aria-live="assertive" className="text-sm text-red-500 text-center">
          {serverError}
        </p>
      )}
    </form>
  );
}
