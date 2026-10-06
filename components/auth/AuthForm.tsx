'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { isSafeInternalRedirect, sanitizeRedirect } from '@/lib/auth/safe-redirect';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot';
export type AuthTabMode = 'sign-in' | 'sign-up';

type AuthFormProps = {
  /** Which tab opens first (/signin → sign-in, /signup → sign-up). Re-syncs when it changes. */
  initialMode?: AuthTabMode;
  /** Called when the visitor switches tabs, so the page can move between /signin and /signup. */
  onModeChange?: (mode: AuthTabMode) => void;
  /** Design flag `showMagicLink`: the "Email me a sign-in link instead" button (sign-in mode). */
  showMagicLink?: boolean;
};

/**
 * Sign in / sign up / forgot-password form for /signin and /signup
 * (docs/design_2026_green "06 Sign In"). Renders inside the [data-shell="hv"]
 * scope of AuthSplitLayout. The auth logic (password, Google OAuth, magic
 * link, forgot password, hash handling) predates the redesign; only the
 * presentation and the mode props are new.
 */
export function AuthForm({ initialMode = 'sign-in', onModeChange, showMagicLink = true }: AuthFormProps = {}) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only allowlisted internal paths survive; anything else (off-site URLs,
  // "/" from the header Sign in link) falls back to the role default.
  const rawRedirect = searchParams.get('redirect');
  const explicitRedirect = isSafeInternalRedirect(rawRedirect) ? rawRedirect : null;
  const redirectTo = sanitizeRedirect(explicitRedirect, '/learn/dashboard');

  async function resolvePostLoginRedirect(userId: string): Promise<string> {
    if (explicitRedirect) return explicitRedirect;
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (profile?.role === 'admin') return '/admin';
    if (profile?.role === 'partner') return '/portal';
    if (profile?.role === 'instructor') return '/instructor/courses';
    return '/learn/dashboard';
  }

  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Browser back/forward between /signin and /signup changes initialMode.
  useEffect(() => {
    setMode((current) => (current === 'forgot' ? current : initialMode));
  }, [initialMode]);

  function switchMode(next: AuthTabMode) {
    setMode(next);
    setError(null);
    if (next !== initialMode) onModeChange?.(next);
  }
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        body: JSON.stringify({ email, redirectTo }),
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
  // /signin#access_token=... (old /learn/auth links 307 to /signin and keep
  // the hash). Handle both magic-link and recovery hashes
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
        // on Turbopack/Windows, leaving the user stuck on /signin even
        // though the session was active. A full navigation also forces the
        // server to re-read auth cookies on the dashboard request, ensuring
        // the WelcomeScreen renders consistently for new users.
        const search = new URLSearchParams(window.location.search);
        const requested = search.get('redirect');
        const fallback = `${prefix}/learn/dashboard?welcome=true`;
        const target = sanitizeRedirect(requested, fallback);
        window.location.assign(target);
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'sign-up') {
      // Routed through /api/auth/signup so the confirmation email is sent via
      // Resend with the light brand template (lib/email/templates.ts) instead
      // of Supabase's hosted dark "Confirm signup" template.
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName, locale, redirectTo }),
        });

        if (res.status === 429) {
          setError('Too many signup attempts. Please try again in an hour.');
          setLoading(false);
          return;
        }

        const json = await res.json().catch(() => ({}));

        if (!res.ok || json.error) {
          setError(json.error ?? 'Could not create your account. Please try again.');
          setLoading(false);
          return;
        }

        // Always show the "check your email" screen — admin.createUser never
        // returns a live session, and we want the same UI for the
        // already-exists case (enumeration resistance).
        setConfirmationPending(true);
        setLoading(false);
        return;
      } catch {
        setError('Network error. Please try again.');
        setLoading(false);
        return;
      }
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

  const tabMode: AuthTabMode = mode === 'sign-up' ? 'sign-up' : 'sign-in';
  const copyKey = tabMode === 'sign-up' ? 'signup' : 'signin';

  const labelClass = 'text-[14px] font-semibold text-hv-green-900';
  const inputClass = cn(
    'w-full min-h-[50px] rounded-[10px] border-[1.5px] border-hv-sand-300 bg-hv-sand-50 px-3.5',
    'text-[16px] text-hv-ink outline-none transition-colors placeholder:text-hv-taupe',
    'focus:border-hv-green-900 disabled:opacity-60',
  );
  const primaryClass = cn(
    'flex w-full min-h-[54px] items-center justify-center gap-[9px] rounded-[10px] bg-hv-amber',
    'text-[17px] font-semibold text-hv-green-900',
    'transition-[transform,box-shadow] duration-[250ms] ease-hv hover:-translate-y-0.5 hover:shadow-hv-cta',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-green-900 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none',
  );
  const textButtonClass =
    'font-semibold text-hv-terracotta transition-colors hover:text-hv-terracotta-dark focus-visible:outline-none focus-visible:underline';

  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label={t('tabs_label')}
        className="grid grid-cols-2 gap-1 rounded-[12px] bg-hv-sand-200 p-1"
      >
        {(['sign-in', 'sign-up'] as const).map((tab) => {
          const active = tabMode === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchMode(tab)}
              className={cn(
                'min-h-[44px] rounded-[9px] text-[15px] font-semibold transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-green-900',
                active ? 'bg-hv-sand-50 text-hv-green-900 shadow-hv-tab' : 'text-hv-ink-500 hover:text-hv-green-900',
              )}
            >
              {tab === 'sign-in' ? t('tab_signin') : t('tab_signup')}
            </button>
          );
        })}
      </div>

        {/* Email confirmation pending state */}
        {confirmationPending ? (
          <div role="status" className="mt-8 flex flex-col items-center gap-4 py-4 text-center">
            <p className="font-hv-display text-[22px] font-bold tracking-[-0.02em] text-hv-green-900">Check your email</p>
            <p className="text-[15px] leading-[1.6] text-hv-ink-700">
              We sent a confirmation link to <span className="font-semibold text-hv-green-900">{email}</span>. Click it to activate your account, then come back to sign in.
            </p>
            {confirmationFailed && (
              <p className="text-[14px] text-hv-terracotta">
                We had trouble sending the email. Please try resending below.
              </p>
            )}
            <button
              type="button"
              disabled={resending}
              onClick={async () => {
                setResending(true);
                setConfirmationFailed(false);
                try {
                  const res = await fetch('/api/auth/resend-confirmation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, locale, redirectTo }),
                  });
                  if (!res.ok) setConfirmationFailed(true);
                } catch {
                  setConfirmationFailed(true);
                }
                setResending(false);
              }}
              className={cn('min-h-[44px] text-[15px]', textButtonClass)}
            >
              {resending ? 'Sending...' : 'Resend confirmation email'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirmationPending(false); setConfirmationFailed(false); switchMode('sign-in'); }}
              className="min-h-[44px] text-[15px] text-hv-ink-500 transition-colors hover:text-hv-green-900"
            >
              Back to sign in
            </button>
          </div>
        ) : (
        <>

        <h2 className="hv-display mt-7 font-hv-display text-[28px] font-bold leading-[1.1] tracking-[-0.03em] text-hv-green-900">
          {mode === 'forgot' ? t('reset_password') : t(`${copyKey}_form_title`)}
        </h2>
        {mode !== 'forgot' && (
          <p className="mt-1.5 text-[15px] text-hv-ink-500">{t(`${copyKey}_form_note`)}</p>
        )}

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className={cn(
            'mt-6 flex w-full min-h-[52px] items-center justify-center gap-3 rounded-[10px]',
            'border-[1.5px] border-hv-sand-300 bg-hv-sand-50 text-[16px] font-semibold text-hv-green-900',
            'transition-colors hover:border-hv-green-900 disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-green-900',
          )}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
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
        </button>

        {/* Divider */}
        <div className="my-[22px] grid grid-cols-[1fr_auto_1fr] items-center gap-3.5 text-[13.5px] text-hv-taupe">
          <span aria-hidden className="h-px bg-hv-sand-300" />
          <span>{t('or_with_email')}</span>
          <span aria-hidden className="h-px bg-hv-sand-300" />
        </div>

        {/* Forgot password form */}
        {mode === 'forgot' ? (
          <div className="flex flex-col gap-4">
            {resetSent ? (
              <p role="status" className="text-center text-[15px] text-hv-green-900">{t('reset_success')}</p>
            ) : (
              <form onSubmit={handleForgotPassword} className="grid gap-4">
                <div className="grid gap-[7px]">
                  <label htmlFor="auth-forgot-email" className={labelClass}>{t('email')}</label>
                  <input
                    id="auth-forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder={t('email_placeholder')}
                    className={inputClass}
                  />
                </div>

                {error && (
                  <p role="alert" className="text-center text-[14px] text-hv-terracotta">{error}</p>
                )}

                <button type="submit" disabled={loading} className={cn(primaryClass, 'mt-1.5')}>
                  {loading ? '...' : t('send_reset_link')}
                </button>
              </form>
            )}

            <p className="text-center text-[15px]">
              <button
                type="button"
                onClick={() => { setMode('sign-in'); setError(null); setResetSent(false); }}
                className={cn('min-h-[44px]', textButtonClass)}
              >
                {t('back_to_sign_in')}
              </button>
            </p>
          </div>
        ) : (
          <>
            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="grid gap-4">
              {mode === 'sign-up' && (
                <div className="grid gap-[7px]">
                  <label htmlFor="auth-name" className={labelClass}>{t('name')}</label>
                  <input
                    id="auth-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    className={inputClass}
                  />
                </div>
              )}
              <div className="grid gap-[7px]">
                <label htmlFor="auth-email" className={labelClass}>{t('email')}</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder={t('email_placeholder')}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-[7px]">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="auth-password" className={labelClass}>{t('password')}</label>
                  {mode === 'sign-in' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); }}
                      className={cn('inline-flex min-h-[44px] items-center text-[14px]', textButtonClass)}
                    >
                      {t('forgot_password')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                    className={cn(inputClass, 'pr-[72px]')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('hide_password') : t('show_password')}
                    aria-pressed={showPassword}
                    className={cn(
                      'absolute right-[3px] top-1/2 min-h-[44px] min-w-[56px] -translate-y-1/2 rounded-[8px]',
                      'text-[13.5px] font-semibold text-hv-ink-500 transition-colors hover:text-hv-green-900',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-green-900',
                    )}
                  >
                    {showPassword ? t('hide') : t('show')}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-center text-[14px] text-hv-terracotta">{error}</p>
              )}

              <button type="submit" disabled={loading} className={cn(primaryClass, 'mt-1.5')}>
                {loading ? '...' : (
                  <>
                    {t(`${copyKey}_cta`)} <span aria-hidden>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Magic-link alternative (sign-in only: the link signs in an existing account) */}
            {showMagicLink && mode === 'sign-in' && (
              <div className="mt-3">
                {magicLinkSent ? (
                  <p role="status" className="text-center text-[15px] text-hv-green-900">
                    ✓ {t('magic_link_check_email')}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendMagicLink}
                    disabled={magicLinkSending}
                    className={cn(
                      'w-full min-h-[50px] rounded-[10px] border-[1.5px] border-hv-green-900 bg-transparent',
                      'text-[15.5px] font-semibold text-hv-green-900 transition-colors hover:bg-hv-sand-200 disabled:opacity-60',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hv-green-900',
                    )}
                  >
                    {magicLinkSending ? '...' : t('magic_link_instead')}
                  </button>
                )}
              </div>
            )}

            {/* Switch mode */}
            <p className="mt-6 text-center text-[15px] text-hv-ink-700">
              {t(`${copyKey}_switch_q`)}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
                className={cn('min-h-[44px]', textButtonClass)}
              >
                {t(`${copyKey}_switch_a`)}
              </button>
            </p>
          </>
        )}
        </>
        )}
    </div>
  );
}
