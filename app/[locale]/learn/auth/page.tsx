import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthForm } from '@/components/auth/AuthForm';
import { LangToggle } from '@/components/layout/lang-toggle';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('sign_in'),
  };
}

export default async function AuthPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/dashboard`);
  }

  const t = await getTranslations({ locale, namespace: 'auth' });
  const tTestimonial = await getTranslations({ locale, namespace: 'social_proof.testimonials.two' });

  return (
    <div
      data-shell="marketing"
      className="learn-zone min-h-screen grid lg:grid-cols-2"
    >
      {/* LEFT — editorial panel */}
      <aside
        className="relative hidden lg:flex flex-col justify-between overflow-hidden px-10 py-12 xl:px-16 xl:py-14"
        style={{ backgroundColor: 'var(--m-canvas)' }}
      >
        {/* Overline */}
        <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em]" style={{ color: 'var(--m-ink-tertiary)' }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--m-accent-teal)' }} />
          <span>{t('overline')}</span>
          <span style={{ color: 'var(--m-ink-tertiary)', opacity: 0.5 }}>·</span>
          <span>{t('overline_alt')}</span>
        </div>

        {/* Headline cluster */}
        <div className="relative z-10 max-w-[520px]">
          <h2
            className="font-serif leading-[0.95] tracking-[-0.02em]"
            style={{
              fontSize: 'clamp(48px, 6vw, 84px)',
              color: 'var(--m-ink-primary)',
            }}
          >
            <span className="block">{t('hero_line_1')}</span>
            <span className="block">{t('hero_line_2')}</span>
            <span className="block" style={{ color: 'var(--m-accent-teal)' }}>{t('hero_line_3')}</span>
          </h2>
          <p
            className="mt-7 max-w-[460px] text-[15px] leading-[1.7]"
            style={{ color: 'var(--m-ink-secondary)' }}
          >
            {t('hero_sub')}
          </p>
        </div>

        {/* Testimonial card */}
        <div
          className="relative z-10 max-w-[460px] rounded-[10px] border bg-white/80 backdrop-blur px-5 py-4"
          style={{ borderColor: 'rgba(26, 43, 51, 0.08)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--m-accent-teal)' }}
            >
              {tTestimonial('name').charAt(0)}
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="font-serif italic text-[14px] leading-[1.55]" style={{ color: 'var(--m-ink-primary)' }}>
                &ldquo;{tTestimonial('quote')}&rdquo;
              </p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: 'var(--m-ink-tertiary)' }}>
                {tTestimonial('name')} · {tTestimonial('role')}
              </p>
            </div>
          </div>
        </div>

        {/* Decorative diamond watermark */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute bottom-6 right-6 opacity-[0.08]"
          width="220"
          height="220"
          viewBox="0 0 220 220"
          fill="none"
        >
          <path d="M110 10 L210 110 L110 210 L10 110 Z" stroke="var(--m-ink-primary)" strokeWidth="1.5" />
          <path d="M110 50 L170 110 L110 170 L50 110 Z" stroke="var(--m-accent-teal)" strokeWidth="1.5" />
          <circle cx="110" cy="110" r="14" stroke="var(--m-accent-teal)" strokeWidth="1.5" />
        </svg>
      </aside>

      {/* RIGHT — form panel */}
      <main className="relative flex flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:[justify-content:safe_center] xl:px-20">
        {/* Top row: wordmark + locale toggle */}
        <div className="mb-5 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--m-ink-primary)' }}>
            HonuVibe<span style={{ color: 'var(--m-accent-teal)' }}>.AI</span>
          </span>
          <LangToggle />
        </div>

        {/* Form */}
        <div className="w-full max-w-[440px]">
          <AuthForm />
        </div>
      </main>
    </div>
  );
}
