import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthForm } from '@/components/auth/AuthForm';
import { LangToggle } from '@/components/layout/lang-toggle';
import { Link } from '@/i18n/navigation';
import { sanitizeRedirect } from '@/lib/auth/safe-redirect';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('sign_in'),
  };
}

export default async function AuthPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(sanitizeRedirect(sp.redirect, `${prefix}/learn/dashboard`));
  }

  const t = await getTranslations({ locale, namespace: 'auth' });
  const tTestimonial = await getTranslations({ locale, namespace: 'social_proof.testimonials.two' });

  return (
    <div
      data-shell="marketing"
      className="learn-zone min-h-screen grid lg:grid-cols-2"
    >
      {/* LEFT — editorial panel (dark, matches /about + /explore hero) */}
      <aside
        className="relative hidden lg:flex flex-col justify-between overflow-hidden px-10 py-12 xl:px-16 xl:py-14"
        style={{ backgroundColor: 'var(--m-ink-primary)' }}
      >
        {/* Overline */}
        <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--m-accent-teal)' }} />
          <span>{t('overline')}</span>
          <span className="text-white/30">·</span>
          <span>{t('overline_alt')}</span>
        </div>

        {/* Headline cluster */}
        <div className="relative z-10 max-w-[520px]">
          <h2
            className="font-serif leading-[0.95] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(48px, 6vw, 84px)' }}
          >
            <span className="block">{t('hero_line_1')}</span>
            <span className="block">{t('hero_line_2')}</span>
            <span className="block" style={{ color: 'var(--m-accent-teal)' }}>{t('hero_line_3')}</span>
          </h2>
          <p className="mt-7 max-w-[460px] text-[15px] leading-[1.7] text-white/85">
            {t('hero_sub')}
          </p>
        </div>

        {/* Testimonial card */}
        <div className="relative z-10 max-w-[460px] rounded-[10px] border border-white/15 bg-white/[0.05] px-5 py-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--m-accent-teal)' }}
            >
              {tTestimonial('name').charAt(0)}
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="font-serif italic text-[14px] leading-[1.55] text-white/90">
                &ldquo;{tTestimonial('quote')}&rdquo;
              </p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/55">
                {tTestimonial('name')} · {tTestimonial('role')}
              </p>
            </div>
          </div>
        </div>

      </aside>

      {/* RIGHT — form panel */}
      <main className="relative flex flex-col px-5 py-4 sm:px-8 sm:py-5 lg:px-12 lg:[justify-content:safe_center] xl:px-20">
        {/* Top row: wordmark + locale toggle */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--m-ink-primary)' }}>
            HonuVibe<span style={{ color: 'var(--m-accent-teal)' }}>.AI</span>
          </span>
          <LangToggle />
        </div>

        {/* Form */}
        <div className="w-full max-w-[440px]">
          <AuthForm />
        </div>

        {/* Legal acknowledgment */}
        <p
          className="mt-3 max-w-[440px] text-center text-[11.5px] leading-snug"
          style={{ color: 'var(--m-ink-tertiary)' }}
        >
          {t.rich('legal_acknowledgment', {
            terms: (chunks) => (
              <Link
                href="/terms"
                className="underline-offset-2 hover:underline"
                style={{ color: 'var(--m-accent-teal)' }}
              >
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link
                href="/privacy"
                className="underline-offset-2 hover:underline"
                style={{ color: 'var(--m-accent-teal)' }}
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </main>
    </div>
  );
}
