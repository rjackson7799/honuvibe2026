import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const ITEMS = ['mission', 'vision'] as const;
const CADENCE_KEYS = ['1', '2', '3'] as const;

export function AboutMissionVision() {
  const t = useTranslations('about.mission_vision');

  return (
    <Section id="mission" variant="canvas" spacing="default">
      <Container>
        {/* Chapter header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--m-border-soft)] pb-5">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('chapter_overline')}
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('chapter_meta_right')}
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:gap-16 md:items-end">
          <div className="flex items-start gap-6">
            <span
              className="font-serif italic leading-none text-[var(--m-accent-teal)]"
              style={{ fontSize: 'clamp(56px, 7vw, 88px)' }}
            >
              03
            </span>
            <h2
              className="font-serif italic leading-[0.96] tracking-[-0.02em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(36px, 4.5vw, 56px)' }}
            >
              {t('headline_1')}
              <br />
              {t('headline_2')}
              <span className="text-[var(--m-accent-teal)]">.</span>
            </h2>
          </div>

          <div />
        </div>

        {/* Mission / Vision cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-2 md:gap-8">
          {ITEMS.map((key) => (
            <article
              key={key}
              className="border-t-2 border-[var(--m-accent-teal)] bg-[var(--m-white)] px-7 py-8 shadow-[0_2px_12px_rgba(26,43,51,0.04)] md:px-10 md:py-10"
            >
              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
                {t(`${key}_label`)}
              </p>
              <p className="mt-5 font-serif text-[17.5px] leading-[1.7] text-[var(--m-ink-primary)] md:text-[18.5px]">
                {t(`${key}_body`)}
              </p>
            </article>
          ))}
        </div>

        {/* Cadence row */}
        <div className="mt-12 grid grid-cols-1 gap-5 border-t border-[var(--m-border-soft)] pt-7 sm:grid-cols-3">
          {CADENCE_KEYS.map((k) => (
            <div key={k}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                {t(`cadence_stat_${k}_label`)}
              </p>
              <p className="mt-1.5 text-[15px] font-bold leading-snug text-[var(--m-ink-primary)]">
                {t(`cadence_stat_${k}_value`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
