import { useTranslations } from 'next-intl';
import { Container, Overline, Section } from '@/components/marketing/primitives';

const FACTS = ['founded', 'languages', 'year'] as const;

export function AboutHero() {
  const t = useTranslations('about.hero');

  return (
    <Section variant="canvas" spacing="hero" className="pb-0">
      <Container>
        <div className="grid items-stretch border-b border-[var(--m-border-soft)] md:min-h-[420px] md:grid-cols-2">
          {/* Left — editorial label */}
          <div className="flex flex-col justify-end border-b border-[var(--m-border-soft)] py-12 pr-0 md:border-b-0 md:border-r md:pr-14 md:pb-14 md:pt-18">
            <Overline tone="caption" className="mb-5">
              {t('overline')}
            </Overline>
            <h1
              className="font-bold leading-[1.0] tracking-[-0.035em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(52px, 6vw, 80px)' }}
            >
              {t('headline_line_1')}
              <br />
              {t('headline_line_2')}
              <br />
              <span className="text-[var(--m-accent-teal)]">
                {t('headline_line_3')}
              </span>
            </h1>
          </div>

          {/* Right — sub copy + decorative ring + facts */}
          <div className="relative flex flex-col justify-end overflow-hidden py-12 pl-0 md:pb-14 md:pl-14 md:pt-18">
            <div
              className="pointer-events-none absolute right-[-40px] top-10 h-[280px] w-[280px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(15,169,160,0.07) 0%, transparent 70%)',
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute right-5 top-[60px] flex h-[180px] w-[180px] items-center justify-center rounded-full border border-[rgba(15,169,160,0.1)]"
              aria-hidden
            >
              <div className="h-[120px] w-[120px] rounded-full border border-[rgba(232,118,90,0.12)]" />
            </div>
            <p className="relative z-[1] max-w-[460px] text-[19px] leading-[1.72] text-[var(--m-ink-secondary)]">
              {t('subhead')}
            </p>
            <div className="relative z-[1] mt-9 flex flex-wrap gap-8">
              {FACTS.map((key) => (
                <div key={key}>
                  <p className="mb-1 text-[17px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                    {t(`fact_${key}_value`)}
                  </p>
                  <p className="text-[12px] font-medium text-[var(--m-ink-tertiary)]">
                    {t(`fact_${key}_label`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
