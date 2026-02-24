'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';

type NewsletterSubscribeBlockProps = {
  locale: string;
  sourcePage: string;
};

export function NewsletterSubscribeBlock({ locale, sourcePage }: NewsletterSubscribeBlockProps) {
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
        trackEvent('newsletter_subscribe', { source_page: sourcePage, locale });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-6 md:p-8 max-w-[600px] mx-auto text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-teal/5 via-transparent to-accent-gold/5 pointer-events-none rounded-lg" />
        <div className="relative z-10">
          <h3 className="font-serif text-lg font-normal text-fg-primary">
            {t('subscribe_heading')}
          </h3>
          <p className="text-sm text-fg-secondary mt-2">
            {t('subscribe_sub')}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:gap-0 mt-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('subscribe_placeholder')}
              required
              className="h-11 flex-1 rounded sm:rounded-r-none bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)]"
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
              {t('subscribe_button')}
            </Button>
          </form>

          {status === 'success' && (
            <p className="mt-3 text-sm text-accent-teal">{t('success')}</p>
          )}
          {status === 'error' && (
            <p className="mt-3 text-sm text-red-400">{t('error')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
