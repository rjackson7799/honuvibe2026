import { useTranslations } from 'next-intl';
import { Button, Container, Section } from '@/components/marketing/primitives';
import { STUDIO_URL } from '@/lib/constants/urls';

/**
 * Explore closing band — "Chart your next voyage."
 * The primary conversion moment: a strong, centered Build-with-Us handoff to
 * HonuVibe Studio, sitting on the deepest part of the ocean gradient.
 * The `studio_cta` label ("Build with our Studio") is asserted in tests — keep it.
 */
export function ExploreNextIssue() {
  const t = useTranslations('explore.next_issue');

  return (
    <Section variant="canvas" spacing="default" className="relative overflow-hidden">
      {/* Destination guiding-star glow (decorative) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(15,169,160,0.18), transparent 62%)',
        }}
      />

      <Container className="relative">
        {/* Wayfinding meta strip */}
        <div className="mb-14 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
          <span>{t('meta_left')}</span>
          <span className="text-[var(--m-accent-teal)]">{t('meta_center')}</span>
          <span>{t('meta_right')}</span>
        </div>

        <div className="mx-auto max-w-[820px] text-center">
          <span
            aria-hidden
            className="wf-star mb-6 inline-block text-[22px] text-[var(--m-accent-teal)]"
          >
            ✦
          </span>

          <h2
            className="font-serif leading-[1] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(48px, 7vw, 92px)' }}
          >
            {t('headline_1')}{' '}
            <span className="italic text-[var(--m-accent-teal)]">{t('headline_2')}</span>
          </h2>

          <p className="mx-auto mt-6 max-w-[56ch] text-[17px] leading-[1.7] text-white/80">
            {t('subhead')}
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button
              href={STUDIO_URL}
              variant="primary-teal"
              size="lg"
              withArrow
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('studio_cta')}
            </Button>
            <Button
              href="/learn#vault"
              variant="outline-teal"
              size="lg"
              className="!border-white/30 !text-white hover:!bg-white/10"
            >
              {t('secondary_cta')}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
