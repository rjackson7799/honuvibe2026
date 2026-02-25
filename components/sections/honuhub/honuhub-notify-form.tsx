'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { Send } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

type Props = {
  onSuccess?: () => void;
};

export function HonuHubNotifyForm({ onSuccess }: Props) {
  const t = useTranslations('honuhub_page.hero.notify_modal');
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
        trackEvent('newsletter_signup', { source_page: 'honuhub_notify' });
        if (onSuccess) {
          setTimeout(onSuccess, 2000);
        }
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="py-4 text-center">
        <p className="text-base text-accent-teal">{t('success')}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-fg-secondary leading-relaxed mb-6">
        {t('description')}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('placeholder')}
          required
          className="h-12 w-full rounded bg-bg-tertiary px-4 text-[16px] text-fg-primary border border-border-default placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors duration-[var(--duration-fast)]"
        />
        <Button
          variant="primary"
          type="submit"
          disabled={status === 'loading'}
          icon={Send}
          iconPosition="right"
          fullWidth
        >
          {t('cta')}
        </Button>
      </form>
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-400">{t('error')}</p>
      )}
    </div>
  );
}
