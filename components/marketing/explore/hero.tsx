import { useTranslations } from 'next-intl';
import { Container, Overline, Section } from '@/components/marketing/primitives';

export function ExploreHero() {
  const t = useTranslations('explore.hero');

  return (
    <Section variant="canvas" spacing="hero" className="pb-12 md:pb-16">
      <Container>
        <div className="max-w-[640px]">
          <Overline tone="caption" className="mb-4">
            {t('overline')}
          </Overline>
          <h1
            className="mb-5 font-bold leading-[1.1] tracking-[-0.025em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(40px, 5vw, 62px)' }}
          >
            {t('headline_line_1')}
            <br />
            <span className="text-[var(--m-accent-teal)]">
              {t('headline_line_2')}
            </span>
          </h1>
          <p className="max-w-[520px] text-[18px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('subhead')}
          </p>
        </div>
      </Container>
    </Section>
  );
}
