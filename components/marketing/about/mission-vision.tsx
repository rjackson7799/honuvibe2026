import { useTranslations } from 'next-intl';
import { Container, Overline, Section } from '@/components/marketing/primitives';

const ITEMS = ['mission', 'vision'] as const;

export function AboutMissionVision() {
  const t = useTranslations('about.mission_vision');

  return (
    <Section variant="sand">
      <Container>
        <div className="grid grid-cols-1 gap-px md:grid-cols-2">
          {ITEMS.map((key, i) => (
            <div
              key={key}
              className={
                'p-10 md:p-14 ' +
                (i === 0
                  ? 'rounded-[16px] border border-[var(--m-border-soft)] bg-[var(--m-white)] md:rounded-r-none'
                  : 'rounded-[16px] border border-[var(--m-border-soft)] bg-transparent md:rounded-l-none md:border-l-0')
              }
            >
              <Overline tone="teal" className="mb-5">
                {t(`${key}_label`)}
              </Overline>
              <p className="text-[16.5px] leading-[1.78] text-[var(--m-ink-secondary)]">
                {t(`${key}_body`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
