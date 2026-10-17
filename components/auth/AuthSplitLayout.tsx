'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { HvLangToggle } from '@/components/marketing/hv/lang-toggle';
import { HvTestimonialCarousel, type Testimonial } from '@/components/marketing/hv/testimonial-carousel';
import { HvEyebrow } from '@/components/marketing/hv/eyebrow';
import { HvHeading } from '@/components/marketing/hv/heading';
import { AuthForm, type AuthTabMode } from './AuthForm';

type AuthSplitLayoutProps = {
  /** Left-panel carousel quotes (README: three per page). */
  quotes: readonly Testimonial[];
  /** Design flag `defaultMode`: the mode when the path is neither /signin nor /signup. */
  defaultMode?: AuthTabMode;
  /** Design flag `showMagicLink`. */
  showMagicLink?: boolean;
  /** The route's page segment (renders nothing visible; kept so Next can stream it). */
  children?: ReactNode;
};

export function modeFromPath(pathname: string, fallback: AuthTabMode): AuthTabMode {
  if (/^\/signup\/?$/.test(pathname)) return 'sign-up';
  if (/^\/signin\/?$/.test(pathname)) return 'sign-in';
  return fallback;
}

/**
 * docs/design_2026_green "06 Sign In" — one layout, two modes. Left: dark
 * panel with the logo, mode copy and the testimonial carousel. Right: cream
 * panel with the language pill, Sign in / Sign up tabs and the form.
 *
 * Mounted from app/[locale]/(auth)/layout.tsx, so it persists while the tabs
 * router.replace between /signin and /signup (?redirect preserved): what the
 * visitor already typed survives the switch.
 */
export function AuthSplitLayout({ quotes, defaultMode = 'sign-in', showMagicLink = true, children }: AuthSplitLayoutProps) {
  const t = useTranslations('auth');
  const nav = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();
  const routeMode = modeFromPath(pathname, defaultMode);
  // Local state flips the copy on click; the route catches up a moment later.
  const [mode, setMode] = useState<AuthTabMode>(routeMode);
  useEffect(() => setMode(routeMode), [routeMode]);

  function handleModeChange(next: AuthTabMode) {
    setMode(next);
    router.replace(`${next === 'sign-up' ? '/signup' : '/signin'}${window.location.search}`, { scroll: false });
  }

  const key = mode === 'sign-up' ? 'signup' : 'signin';

  return (
    <div
      data-shell="hv"
      className="grid min-h-screen [grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))]"
    >
      {/* Short viewports (≤820px tall — e.g. a 1080p laptop at 125% scaling): tighten
          padding, gaps and type so both panels' key content stays above the fold. */}
      <section className="flex flex-col gap-6 bg-hv-green-900 md:gap-10 p-[clamp(28px,4vw,56px)] text-hv-sand-100 [@media(max-height:820px)]:gap-6 [@media(max-height:820px)]:py-7 [@media(max-height:700px)]:gap-5! [@media(max-height:700px)]:py-5!">
        {/* The language pill shares the logo row so the form column doesn't spend a row on it. */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label={t('home_label')}
            className="inline-flex min-h-[44px] items-center font-hv-display text-[20px] font-bold tracking-[-0.02em] text-hv-sand-100"
          >
            HonuVibe
          </Link>
          <HvLangToggle tone="dark" size="sm" label={nav('language_label')} />
        </div>
        {/* When the form column outgrows the viewport the row stretches with it, so on short
            screens the copy sits at the top instead of being centred in that taller row. */}
        <div className="mt-auto max-w-[560px] [@media(max-height:820px)]:mt-0">
          <HvEyebrow tone="amber">{t(`${key}_eyebrow`)}</HvEyebrow>
          <HvHeading level="h1-lg" as="h1" className="mt-3.5 [@media(max-height:820px)]:text-hv-h1">
            {t(`${key}_headline`)}
          </HvHeading>
          <p className="hv-display mt-4 font-hv-display text-[clamp(20px,2.2vw,26px)] font-semibold leading-[1.2] tracking-[-0.02em] text-hv-green-200 [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:text-[clamp(18px,1.8vw,22px)]">
            {t(`${key}_subhead`)}
          </p>
          <p className="mt-3 hidden max-w-[48ch] text-[17px] leading-[1.6] text-hv-green-200 md:block [@media(max-height:700px)]:hidden!">
            {t(`${key}_body`)}
          </p>
        </div>
        {/* Phones: the form matters more than the quote, so the carousel and body copy start at md. */}
        <HvTestimonialCarousel quotes={quotes} tone="dark" compact className="mb-auto hidden max-w-[520px] border border-hv-green-700 md:flex" />
      </section>

      <section className="flex flex-col p-[clamp(28px,4vw,56px)] [@media(max-height:820px)]:py-6 [@media(max-height:700px)]:py-4!">
        <div className="my-auto w-full max-w-[440px] self-center py-10 [@media(max-height:820px)]:py-2">
          <Suspense fallback={null}>
            <AuthForm initialMode={mode} onModeChange={handleModeChange} showMagicLink={showMagicLink} />
          </Suspense>
        </div>

        <p className="text-center text-[13px] leading-[1.55] text-hv-ink-500">
          {t.rich('legal_acknowledgment', {
            terms: (chunks) => (
              <Link href="/terms" className="font-semibold text-hv-green-900 hover:text-hv-terracotta">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="font-semibold text-hv-green-900 hover:text-hv-terracotta">
                {chunks}
              </Link>
            ),
          })}
        </p>
        {children}
      </section>
    </div>
  );
}
