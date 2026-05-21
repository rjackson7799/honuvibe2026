import { useTranslations } from 'next-intl';
import { Button, Container, Section } from '@/components/marketing/primitives';

export function AboutClosingCta() {
  const t = useTranslations('about.closing');

  return (
    <Section variant="navy" spacing="default">
      <Container>
        <div className="mb-12 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55">
          <span>{t('meta_left')}</span>
          <span className="text-[var(--m-accent-teal)]">{t('meta_center')}</span>
          <span>{t('meta_right')}</span>
        </div>

        <div className="grid gap-12 md:grid-cols-[1.2fr_1fr] md:items-end md:gap-16">
          <h2
            className="font-serif leading-[1] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(48px, 6.5vw, 88px)' }}
          >
            {t('headline_1')}{' '}
            <span className="italic text-[var(--m-accent-teal)]">
              {t('headline_2')}
            </span>
            <span className="text-[var(--m-accent-teal)]">.</span>
          </h2>

          <div>
            <p className="text-[16px] leading-[1.7] text-white/85">{t('lede')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                href="/learn"
                variant="primary-teal"
                size="md"
                withArrow
              >
                {t('cta_primary')}
              </Button>
              <Button
                href="/partnerships"
                variant="outline-teal"
                size="md"
                className="!border-white/30 !text-white hover:!bg-white/10"
              >
                {t('cta_secondary')}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
