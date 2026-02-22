'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline, Button } from '@/components/ui';
import { Send } from 'lucide-react';

export function NewsletterSignup() {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <Section id="newsletter">
      <Container size="narrow">
        <div className="relative overflow-hidden rounded-2xl bg-bg-secondary border border-border-default p-8 md:p-12 text-center">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/5 via-transparent to-accent-gold/5 pointer-events-none" />

          <div className="relative z-10">
            <Overline className="mb-4 block">{t('overline')}</Overline>
            <h2 className="font-serif text-h2 text-fg-primary mb-3">{t('heading')}</h2>
            <p className="text-base text-fg-secondary leading-relaxed mb-8 max-w-[460px] mx-auto">
              {t('description')}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:gap-0 max-w-[440px] mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('placeholder')}
                required
                className="h-12 flex-1 rounded sm:rounded-r-none bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)]"
              />
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={status === 'loading'}
                className="sm:rounded-l-none sm:border-l-0"
                icon={Send}
                iconPosition="right"
              >
                {t('cta')}
              </Button>
            </form>

            {status === 'success' && (
              <p className="mt-4 text-sm text-accent-teal">{t('success')}</p>
            )}
            {status === 'error' && (
              <p className="mt-4 text-sm text-red-400">{t('error')}</p>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
