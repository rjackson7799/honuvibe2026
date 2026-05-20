import { useTranslations } from 'next-intl';
import { BrowserFrame, Button, Container, Section } from '@/components/marketing/primitives';
import { TOTAL_LEARNERS } from '@/lib/constants/social';
import { LearnIntentPicker } from './learn-intent-picker';

export function LearnHero({ locale }: { locale: string }) {
  const t = useTranslations('learn.hero');
  const heroUrl = locale === 'ja'
    ? 'learn.honuvibe.ai/ja/ai-essentials/lesson-04'
    : 'learn.honuvibe.ai/learn/foundations/lesson-04';

  return (
    <Section variant="canvas" spacing="hero" className="pb-16 md:pb-20">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <div className="mb-7 flex items-center gap-3">
              <span
                className="h-2 w-2 rounded-full bg-[var(--m-accent-coral)]"
                aria-hidden
              />
              <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--m-ink-secondary)]">
                {t('eyebrow_label')}
              </span>
              <span className="text-[var(--m-ink-secondary)]/40" aria-hidden>·</span>
              <span className="text-[11.5px] font-bold tracking-[0.08em] text-[var(--m-ink-secondary)]">
                {t('eyebrow_lang')}
              </span>
            </div>

            <h1
              className="mb-7 font-serif italic leading-[1.05] tracking-[-0.015em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(40px, 5.5vw, 64px)' }}
            >
              {t('headline')}
            </h1>

            <LearnIntentPicker />

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="#vault" variant="primary-teal" size="lg" withArrow>
                {t('cta_primary')}
              </Button>
              <Button href="#courses" variant="outline-teal" size="lg">
                {t('cta_secondary')}
              </Button>
            </div>

            <div className="mt-7 flex items-center gap-3.5">
              <FaceCircles />
              <p className="text-[14px] text-[var(--m-ink-secondary)]">
                {t('social_proof', { count: TOTAL_LEARNERS.toLocaleString() })}
              </p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <BrowserFrame url={heroUrl} height="auto">
              <HeroLessonPlaceholder
                label={t('screenshot_coming_soon')}
                alt={t('screenshot_alt')}
              />
            </BrowserFrame>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function FaceCircles() {
  const colors = [
    'linear-gradient(135deg, #4FA89C, #0FA9A0)',
    'linear-gradient(135deg, #E8765A, #CC5A3E)',
    'linear-gradient(135deg, #1A2B33, #2C7A6B)',
  ];
  return (
    <div className="flex -space-x-2.5" aria-hidden>
      {colors.map((bg, i) => (
        <span
          key={i}
          className="inline-block h-8 w-8 rounded-full ring-2 ring-[var(--m-canvas)]"
          style={{ background: bg }}
        />
      ))}
    </div>
  );
}

function HeroLessonPlaceholder({ label, alt }: { label: string; alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="relative flex h-[380px] w-full items-center justify-center overflow-hidden"
      style={{
        background:
          'linear-gradient(160deg, #0A2929 0%, #0F3D3D 55%, #143434 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, rgba(79,168,156,0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(15,169,160,0.25), transparent 55%)',
        }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M6 4v12l10-6z" />
          </svg>
        </span>
        <p className="text-[12px] font-mono uppercase tracking-[0.14em] text-white/70">
          {label}
        </p>
      </div>
    </div>
  );
}
