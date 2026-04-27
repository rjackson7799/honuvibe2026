'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, ChevronDown, Loader2 } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type Status = 'idle' | 'loading' | 'success' | 'error';

const SUBJECT_VALUES = [
  'general',
  'course',
  'partnership',
  'media',
  'other',
] as const;

const MAX_MESSAGE_LENGTH = 2000;
const COUNTER_WARN = 1800;

const initialForm: FormState = {
  name: '',
  email: '',
  subject: 'general',
  message: '',
};

export function ContactForm() {
  const t = useTranslations('contact.contact_form');
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<Status>('idle');

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const inputBase =
    'w-full rounded-[9px] border-[1.5px] border-[rgba(26,43,51,0.13)] bg-[var(--m-white)] px-4 py-[13px] text-[15px] text-[var(--m-ink-primary)] placeholder:text-[var(--m-ink-tertiary)] outline-none transition-colors focus:border-[var(--m-accent-teal)] focus:ring-2 focus:ring-[rgba(15,169,160,0.2)]';

  const labelBase =
    'mb-2 block text-[12.5px] font-semibold tracking-[0.02em] text-[var(--m-ink-primary)]';

  if (status === 'success') {
    return (
      <Section variant="canvas" spacing="flush" className="pb-20 md:pb-24">
        <Container>
          <div className="mx-auto max-w-[700px] rounded-[20px] border border-[var(--m-border-soft)] bg-[var(--m-white)] px-12 py-16 text-center shadow-[var(--m-shadow-md)]">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(15,169,160,0.1)]">
              <Check
                size={28}
                strokeWidth={2}
                className="text-[var(--m-accent-teal)]"
              />
            </div>
            <h2 className="mb-2.5 text-[26px] font-bold tracking-[-0.015em] text-[var(--m-ink-primary)]">
              {t('success_heading')}
            </h2>
            <p className="text-[16px] leading-[1.65] text-[var(--m-ink-secondary)]">
              {t('success_body')}
            </p>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section variant="canvas" spacing="flush" className="pb-20 md:pb-24">
      <Container>
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-[700px] flex-col gap-6 rounded-[20px] border border-[var(--m-border-soft)] bg-[var(--m-white)] px-8 py-10 shadow-[var(--m-shadow-md)] md:px-13 md:py-13"
        >
          {/* Row 1: Name + Email */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className={labelBase}>
                {t('name_label')}
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={t('name_placeholder')}
                className={inputBase}
              />
            </div>
            <div>
              <label htmlFor="contact-email" className={labelBase}>
                {t('email_label')}
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder={t('email_placeholder')}
                className={inputBase}
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="contact-subject" className={labelBase}>
              {t('subject_label')}
            </label>
            <div className="relative">
              <select
                id="contact-subject"
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
                className={`${inputBase} cursor-pointer appearance-none pr-10`}
              >
                {SUBJECT_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {t(`subject_options.${v}`)}
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
          </div>

          {/* Message */}
          <div>
            <label htmlFor="contact-message" className={labelBase}>
              {t('message_label')}
            </label>
            <div className="relative">
              <textarea
                id="contact-message"
                required
                rows={6}
                maxLength={MAX_MESSAGE_LENGTH}
                value={form.message}
                onChange={(e) => set('message', e.target.value)}
                placeholder={t('message_placeholder')}
                className={`${inputBase} resize-y pb-8 leading-[1.65]`}
              />
              <span
                className={
                  'pointer-events-none absolute bottom-2.5 right-3.5 text-[12px] tabular-nums ' +
                  (form.message.length > COUNTER_WARN
                    ? 'text-[var(--m-accent-coral)]'
                    : 'text-[var(--m-ink-tertiary)]')
                }
              >
                {form.message.length} / {MAX_MESSAGE_LENGTH}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--m-accent-teal)] px-7 py-4 text-[16px] font-bold text-white shadow-[var(--m-shadow-teal-sm)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--m-accent-teal-dark)] hover:shadow-[var(--m-shadow-teal-md)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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
                href="/partnerships"
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
      </Container>
    </Section>
  );
}
