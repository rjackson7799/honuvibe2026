import { useTranslations } from 'next-intl';
import {
  Container,
  NumberedStep,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

const STEP_KEYS = ['discovery', 'design_build', 'launch_support'] as const;

export function ExploreHowWeBuild() {
  const t = useTranslations('explore.how_we_build');

  return (
    <Section variant="sand">
      <Container>
        <div className="mb-12 max-w-[560px] md:mb-14">
          <Overline tone="teal" className="mb-3.5">
            {t('overline')}
          </Overline>
          <SectionHeading className="mb-4">{t('headline')}</SectionHeading>
          <p className="text-[16px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('subhead')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8">
          {STEP_KEYS.map((key, i) => (
            <NumberedStep
              key={key}
              index={i + 1}
              layout="inline"
              title={t(`${key}_title`)}
              body={t(`${key}_body`)}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
