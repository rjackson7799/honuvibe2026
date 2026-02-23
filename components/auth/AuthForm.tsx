'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

type AuthMode = 'sign-in' | 'sign-up';

export function AuthForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/learn/dashboard';

  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'sign-up') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // For email confirmation flow, show a message
      // For now, auto-confirm is likely enabled in dev
      router.push(redirectTo);
      router.refresh();
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    }
  }

  async function handleGoogleAuth() {
    setLoading(true);
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card container */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-8">
        {/* Tab toggle */}
        <div className="flex mb-8 border border-border-default rounded overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode('sign-in'); setError(null); }}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors duration-[var(--duration-fast)]',
              mode === 'sign-in'
                ? 'bg-accent-teal text-white'
                : 'bg-bg-tertiary text-fg-secondary hover:text-fg-primary',
            )}
          >
            {t('sign_in')}
          </button>
          <button
            type="button"
            onClick={() => { setMode('sign-up'); setError(null); }}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors duration-[var(--duration-fast)]',
              mode === 'sign-up'
                ? 'bg-accent-teal text-white'
                : 'bg-bg-tertiary text-fg-secondary hover:text-fg-primary',
            )}
          >
            {t('sign_up')}
          </button>
        </div>

        {/* Google OAuth */}
        <Button
          variant="ghost"
          fullWidth
          onClick={handleGoogleAuth}
          disabled={loading}
          className="mb-6"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {t('continue_google')}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-border-default" />
          <span className="text-sm text-fg-tertiary">{t('or')}</span>
          <div className="flex-1 h-px bg-border-default" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          {mode === 'sign-up' && (
            <Input
              label={t('name')}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              locale={locale}
              autoComplete="name"
            />
          )}
          <Input
            label={t('email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            locale={locale}
            autoComplete="email"
          />
          <Input
            label={t('password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            locale={locale}
            minLength={6}
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
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
            {loading
              ? '...'
              : mode === 'sign-in'
                ? t('sign_in')
                : t('sign_up')}
          </Button>
        </form>

        {/* Toggle prompt */}
        <p className="mt-6 text-sm text-fg-tertiary text-center">
          {mode === 'sign-in' ? t('no_account') : t('has_account')}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(null); }}
            className="text-accent-teal hover:underline"
          >
            {mode === 'sign-in' ? t('sign_up') : t('sign_in')}
          </button>
        </p>
      </div>
    </div>
  );
}
