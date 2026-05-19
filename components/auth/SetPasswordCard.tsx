'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { markPasswordSet } from '@/lib/students/actions';

type Mode = 'set' | 'change';

type SetPasswordCardProps = {
  mode: Mode;
  /** Called after the password is successfully set/changed. */
  onSuccess?: () => void;
  /** Called when the user clicks "Skip for now" (set mode only). */
  onSkip?: () => void;
  /** Show inside a self-contained card frame. Default true. */
  framed?: boolean;
};

export function SetPasswordCard({
  mode,
  onSuccess,
  onSkip,
  framed = true,
}: SetPasswordCardProps) {
  const t = useTranslations('auth');
  const tWelcome = useTranslations('welcome');
  const locale = useLocale();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('passwords_no_match'));
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    try {
      await markPasswordSet();
    } catch (markError) {
      console.error('[SetPasswordCard] markPasswordSet failed:', markError);
    }

    setDone(true);
    setLoading(false);
    onSuccess?.();
  }

  const title = mode === 'set' ? tWelcome('set_password_title') : t('change_password');
  const body =
    mode === 'set' ? tWelcome('set_password_body') : t('change_password_body');
  const cta =
    mode === 'set' ? tWelcome('set_password_cta') : t('change_password_cta');

  const inner = (
    <>
      <h3 className="text-xl font-serif text-fg-primary mb-2">{title}</h3>
      <p className="text-sm text-fg-secondary mb-5">{body}</p>

      {done ? (
        <p className="text-sm text-accent-teal">
          ✓ {mode === 'set' ? t('password_set_success') : t('password_changed_success')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex flex-col gap-2 mt-2">
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? '...' : cta}
            </Button>

            {mode === 'set' && onSkip && (
              <button
                type="button"
                onClick={onSkip}
                disabled={loading}
                className="text-sm text-fg-tertiary hover:text-fg-secondary text-center mt-1"
              >
                {tWelcome('skip_for_now')}
              </button>
            )}
          </div>
        </form>
      )}
    </>
  );

  if (!framed) return <div>{inner}</div>;

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-lg p-6 max-w-md">
      {inner}
    </div>
  );
}
