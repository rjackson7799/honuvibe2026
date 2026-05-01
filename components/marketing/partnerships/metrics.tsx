import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const STATS = [
  { value: 'participants_value', label: 'participants_label' },
  { value: 'hours_value', label: 'hours_label' },
  { value: 'courses_value', label: 'courses_label' },
  { value: 'bilingual_value', label: 'bilingual_label' },
] as const;

export function PartnershipsMetrics() {
  const t = useTranslations('partnerships.metrics');

  return (
    <Section variant="canvas" spacing="tight">
      <Container>
        <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4 md:gap-y-0">
          {STATS.map((stat, i) => (
            <div
              key={stat.value}
              className={
                i > 0
                  ? 'md:border-l md:border-[rgba(26,43,51,0.08)] md:pl-8'
                  : 'md:pr-8'
              }
            >
              <p
                className="font-serif font-normal leading-none tracking-[-0.025em] text-[var(--m-accent-teal)]"
                style={{ fontSize: 'clamp(40px, 5.5vw, 64px)' }}
              >
                {t(stat.value)}
              </p>
              <p className="mt-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--m-ink-tertiary)]">
                {t(stat.label)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
