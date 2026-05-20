'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot';

export function AuthForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitRedirect = searchParams.get('redirect');
  const redirectTo = explicitRedirect || '/learn/dashboard';

  async function resolvePostLoginRedirect(userId: string): Promise<string> {
    if (explicitRedirect) return explicitRedirect;
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (profile?.role === 'admin') return '/admin';
    if (profile?.role === 'partner') return '/partner';
    if (profile?.role === 'instructor') return '/instructor/courses';
    return '/learn/dashboard';
  }

  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [confirmationFailed, setConfirmationFailed] = useState(false);
  const [resending, setResending] = useState(false);
  const [magicLinkSending, setMagicLinkSending] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleSendMagicLink() {
    if (!email) {
      setError(t('email_required_for_magic_link'));
      return;
    }
    setMagicLinkSending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/send-login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setError(t('magic_link_rate_limited'));
        return;
      }
      // Always treat 200 as success — server swallows account-not-found.
      setMagicLinkSent(true);
    } catch {
      setError(t('magic_link_send_failed'));
    } finally {
      setMagicLinkSending(false);
    }
  }

  const supabase = createClient();

  // Supabase magic links (admin.generateLink with type='magiclink') use the
  // implicit flow — tokens land in the URL hash, NOT as a ?code= query param,
  // so /api/auth/callback can't read them server-side and falls through to
  // /learn/auth#access_token=... Handle both magic-link and recovery hashes
  // here:
  //   - recovery → forward hash to /learn/auth/reset (existing behavior)
  //   - magiclink (or any other non-recovery access_token) → setSession from
  //     the hash and route to dashboard with ?welcome=true so WelcomeScreen
  //     renders its set-password step for users with password_set=false.
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (!accessToken) return;

    const prefix = locale === 'ja' ? '/ja' : '';

    if (type === 'recovery') {
      router.push(`${prefix}/learn/auth/reset${window.location.hash}`);
      return;
    }

    if (refreshToken) {
      (async () => {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        // Use window.location.assign for a hard navigation: router.push +
        // router.refresh after an async setSession was firing intermittently
        // on Turbopack/Windows, leaving the user stuck on /learn/auth even
        // though the session was active. A full navigation also forces the
        // server to re-read auth cookies on the dashboard request, ensuring
        // the WelcomeScreen renders consistently for new users.
        window.location.assign(`${prefix}/learn/dashboard?welcome=true`);
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'sign-up') {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
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

      if (!signUpData.session) {
        setConfirmationPending(true);
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } else {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          setConfirmationPending(true);
          setConfirmationFailed(false);
          setLoading(false);
          return;
        }
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const dest = signInData.user
        ? await resolvePostLoginRedirect(signInData.user.id)
        : redirectTo;
      router.push(dest);
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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      await res.json();
      setResetSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
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

        {/* Email confirmation pending state */}
        {confirmationPending ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="text-4xl">📧</div>
            <p className="text-sm font-semibold text-fg-primary">Check your email</p>
            <p className="text-sm text-fg-secondary">
              We sent a confirmation link to <span className="text-fg-primary font-medium">{email}</span>. Click it to activate your account, then come back to sign in.
            </p>
            {confirmationFailed && (
              <p className="text-sm text-red-500">
                We had trouble sending the email. Please try resending below.
              </p>
            )}
            <button
              type="button"
              disabled={resending}
              onClick={async () => {
                setResending(true);
                setConfirmationFailed(false);
                const { error: resendError } = await supabase.auth.resend({
                  type: 'signup',
                  email,
                  options: {
                    emailRedirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
                  },
                });
                if (resendError) setConfirmationFailed(true);
                setResending(false);
              }}
              className="text-sm text-accent-teal hover:underline"
            >
              {resending ? 'Sending...' : 'Resend confirmation email'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirmationPending(false); setConfirmationFailed(false); setMode('sign-in'); setError(null); }}
              className="text-sm text-fg-tertiary hover:text-fg-secondary"
            >
              Back to sign in
            </button>
          </div>
        ) : (
        <>

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

        {/* Forgot password form */}
        {mode === 'forgot' ? (
          <div className="flex flex-col gap-4">
            {resetSent ? (
              <p className="text-sm text-green-400 text-center">{t('reset_success')}</p>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <Input
                  label={t('email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  locale={locale}
                  autoComplete="email"
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
                  {loading ? '...' : t('send_reset_link')}
                </Button>
              </form>
            )}

            <p className="text-sm text-fg-tertiary text-center">
              <button
                type="button"
                onClick={() => { setMode('sign-in'); setError(null); setResetSent(false); }}
                className="text-accent-teal hover:underline"
              >
                {t('back_to_sign_in')}
              </button>
            </p>
          </div>
        ) : (
          <>
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

              {mode === 'sign-in' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); }}
                  className="text-sm text-fg-tertiary hover:text-accent-teal text-right -mt-2"
                >
                  {t('forgot_password')}
                </button>
              )}

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

            {/* Magic-link alternative (sign-in only) */}
            {mode === 'sign-in' && (
              <div className="mt-4">
                {magicLinkSent ? (
                  <p className="text-sm text-accent-teal text-center">
                    ✓ {t('magic_link_check_email')}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendMagicLink}
                    disabled={magicLinkSending}
                    className="w-full text-sm text-fg-tertiary hover:text-accent-teal transition-colors py-2"
                  >
                    {magicLinkSending ? '...' : t('or_use_magic_link')}
                  </button>
                )}
              </div>
            )}

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
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
}
