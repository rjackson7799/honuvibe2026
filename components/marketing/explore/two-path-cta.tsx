import { useTranslations } from 'next-intl';
import { Button, Container, Section } from '@/components/marketing/primitives';

export function ExploreTwoPathCta() {
  const t = useTranslations('explore.two_path_cta');

  return (
    <Section variant="sand">
      <Container>
        <div className="mx-auto max-w-[600px] text-center">
          <h2
            className="mb-3.5 font-bold tracking-[-0.02em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
          >
            {t('headline')}
          </h2>
          <p className="mb-10 text-[17px] leading-[1.65] text-[var(--m-ink-secondary)]">
            {t('subhead')}
          </p>
          <div className="flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button href="/learn" variant="primary-teal" withArrow>
              {t('primary_cta')}
            </Button>
            <Button href="/partnerships" variant="outline-coral" withArrow>
              {t('secondary_cta')}
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
