import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const stats = [
  { num: '20+', labelKey: 'stat_1_label' },
  { num: '3', labelKey: 'stat_2_label' },
  { num: '60%', labelKey: 'stat_3_label' },
  { num: '2', labelKey: 'stat_4_label' },
] as const;

export function ExploreStatsStrip() {
  const t = useTranslations('explore.stats_strip');

  return (
    <Section variant="canvas" spacing="flush" className="pb-16 md:pb-20">
      <Container>
        <div className="grid grid-cols-2 overflow-hidden rounded-[16px] border border-[var(--m-border-soft)] bg-[var(--m-white)] shadow-[var(--m-shadow-sm)] md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.labelKey}
              className={
                'px-6 py-8 text-center md:px-8 md:py-10 ' +
                (i < stats.length - 1
                  ? 'border-b border-[var(--m-border-soft)] md:border-b-0 md:border-r '
                  : '') +
                ((i + 1) % 2 === 0 ? 'md:border-r-0 ' : '')
              }
            >
              <p
                className="mb-2 font-bold leading-none tracking-[-0.03em] text-[var(--m-accent-teal)]"
                style={{ fontSize: 'clamp(36px, 4vw, 52px)' }}
              >
                {s.num}
              </p>
              <p className="text-[13.5px] font-medium text-[var(--m-ink-secondary)]">
                {t(s.labelKey)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
