'use client';

import { useState, useEffect } from 'react';
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
  const [sessionReady, setSessionReady] = useState(false);
  const [waitingForSession, setWaitingForSession] = useState(true);

  const supabase = createClient();

  // Parse hash fragment and establish session manually
  // (@supabase/ssr's createBrowserClient does NOT auto-detect hash tokens)
  useEffect(() => {
    async function handleHashTokens() {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      // Check for error in hash (e.g., otp_expired)
      const hashError = params.get('error_description');
      if (hashError) {
        setError(t('reset_link_expired'));
        setWaitingForSession(false);
        return;
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        // Manually set the session from hash tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setError(t('reset_link_expired'));
          setWaitingForSession(false);
          return;
        }

        // Clear hash from URL to avoid re-processing on refresh
        window.history.replaceState(null, '', window.location.pathname);
        setSessionReady(true);
        setWaitingForSession(false);
        return;
      }

      // No hash tokens — check for existing session (arrived via server callback)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        setError(t('reset_link_expired'));
      }
      setWaitingForSession(false);
    }

    handleHashTokens();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    router.push(`${prefix}/learn/dashboard`);
    router.refresh();
  }

  const prefix = locale === 'ja' ? '/ja' : '';

  // Still waiting for session to establish from hash tokens
  if (waitingForSession && !sessionReady) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-6 h-6 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-fg-secondary">{t('loading')}...</p>
          </div>
        </div>
      </div>
    );
  }

  // Session failed to establish — link expired or invalid
  if (!sessionReady && error) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <a
              href={`${prefix}/learn/auth`}
              className="text-sm text-accent-teal hover:underline"
            >
              {t('back_to_sign_in')}
            </a>
          </div>
        </div>
      </div>
    );
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
