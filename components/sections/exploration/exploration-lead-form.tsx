'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Textarea } from '@/components/ui';
import { Send } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

type Props = {
  onSuccess?: () => void;
};

export function ExplorationLeadForm({ onSuccess }: Props) {
  const t = useTranslations('exploration_page.lead_form');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });

  const update = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;

    setStatus('loading');

    try {
      const res = await fetch('/api/exploration/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStatus('success');
        trackEvent('exploration_inquiry', { source_page: 'exploration_hero' });
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
      <p className="text-sm text-fg-secondary leading-relaxed mb-6">{t('sub')}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t('name')}
          value={form.name}
          onChange={update('name')}
          required
        />
        <Input
          label={t('email')}
          type="email"
          value={form.email}
          onChange={update('email')}
          required
        />
        <Input
          label={t('company')}
          value={form.company}
          onChange={update('company')}
        />
        <Textarea
          label={t('message')}
          value={form.message}
          onChange={update('message')}
          maxLength={500}
          showCount
          required
        />
        <Button
          variant="primary"
          type="submit"
          disabled={status === 'loading'}
          icon={Send}
          iconPosition="right"
          fullWidth
        >
          {t('submit')}
        </Button>
      </form>
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-400">{t('error')}</p>
      )}
    </div>
  );
}
