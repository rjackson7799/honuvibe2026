'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations, useLocale } from 'next-intl';

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('passwords_no_match'));
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    const prefix = locale === 'ja' ? '/ja' : '';
    router.push(`${prefix}/learn/dashboard`);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-bg-secondary border border-border-default rounded-lg p-8">
        <h2 className="text-lg font-medium text-fg-primary text-center mb-6">
          {t('reset_password')}
        </h2>

        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <Input
            label={t('new_password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            locale={locale}
            minLength={6}
            autoComplete="new-password"
          />
          <Input
            label={t('confirm_password')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            locale={locale}
            minLength={6}
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading}
            className="mt-2"
          >
            {loading ? '...' : t('reset_password')}
          </Button>
        </form>
      </div>
    </div>
  );
}
