import { useTranslations } from 'next-intl';
import {
  Container,
  NumberedStep,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

const STEPS = ['discovery', 'proposal', 'build', 'launch'] as const;

export function PartnershipsHowItWorks() {
  const t = useTranslations('partnerships.how_it_works');

  return (
    <Section variant="sand">
      <Container>
        <div className="mb-14 max-w-[500px] md:mb-16">
          <Overline tone="teal" className="mb-3.5 inline-block">
            {t('overline')}
          </Overline>
          <SectionHeading>
            {t('headline_line_1')}
            <br />
            {t('headline_line_2')}
          </SectionHeading>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute top-5 left-5 right-5 hidden h-[2px] md:block"
            style={{
              background:
                'linear-gradient(to right, var(--m-accent-teal), rgba(15,169,160,0.3))',
            }}
          />
          <div className="relative z-10 grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-8">
            {STEPS.map((key, i) => (
              <NumberedStep
                key={key}
                index={i + 1}
                title={t(`steps.${key}_title`)}
                body={t(`steps.${key}_body`)}
                layout="horizontal"
              />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
