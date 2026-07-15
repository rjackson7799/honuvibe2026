import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const ITEMS = ['1', '2', '3', '4'] as const;

export function AboutMilestones() {
  const t = useTranslations('about.milestones');

  return (
    <Section id="milestones" variant="sand" spacing="default">
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

        <h2
          className="font-serif leading-[0.98] tracking-[-0.02em] text-[var(--m-ink-primary)]"
          style={{ fontSize: 'clamp(36px, 4.6vw, 60px)' }}
        >
          {t('headline_1')}
          <br />
          {t('headline_2')}
          <span className="text-[var(--m-accent-teal)]">.</span>
        </h2>

        {/* Timeline */}
        <ol className="relative mx-auto mt-12 max-w-2xl md:mt-16">
          {/* Charted meridian running down the log */}
          <span
            aria-hidden
            className="about-meridian pointer-events-none absolute left-[5px] top-2 bottom-3 w-px"
          />
          {ITEMS.map((n) => (
            <li key={n} className="relative pb-9 pl-10 last:pb-0">
              <span
                aria-hidden
                className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-[var(--m-accent-teal)] ring-4 ring-[rgba(15,169,160,0.14)]"
              />
              <p className="font-mono text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--m-accent-teal)]">
                {t(`item_${n}_year`)}
              </p>
              <h3 className="mt-1.5 text-[18px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                {t(`item_${n}_title`)}
              </h3>
              <p className="mt-2 max-w-[56ch] text-[15px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {t(`item_${n}_body`)}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
