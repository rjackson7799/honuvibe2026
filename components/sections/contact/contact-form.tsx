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
  subject: string;
  message: string;
};

const initialFormData: FormData = {
  name: '',
  email: '',
  subject: 'general',
  message: '',
};

export function ContactForm() {
  const t = useTranslations('contact_page.form');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/contact/submit', {
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

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-fg-secondary">{t('subject_label')}</label>
            <select
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              className={selectClasses}
            >
              <option value="general">{t('subject_options.general')}</option>
              <option value="consulting">{t('subject_options.consulting')}</option>
              <option value="partnership">{t('subject_options.partnership')}</option>
              <option value="feedback">{t('subject_options.feedback')}</option>
              <option value="other">{t('subject_options.other')}</option>
            </select>
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-fg-secondary">{t('message_label')}</label>
            <textarea
              required
              rows={6}
              maxLength={2000}
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              placeholder={t('message_placeholder')}
              className={textareaClasses}
            />
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
