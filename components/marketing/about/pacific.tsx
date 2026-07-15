import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const HUBS = ['1', '2', '3'] as const;

export function AboutPacific() {
  const t = useTranslations('about.pacific');

  return (
    <Section id="pacific" variant="sand" spacing="default">
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

        <div className="grid gap-8 md:grid-cols-[1fr_1fr] md:gap-16 md:items-end">
          <h2
            className="font-serif leading-[0.98] tracking-[-0.02em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(36px, 4.6vw, 60px)' }}
          >
            {t('headline_1')}
            <br />
            {t('headline_2')}
            <span className="text-[var(--m-accent-teal)]">.</span>
          </h2>

          <p className="max-w-[52ch] text-[16px] leading-[1.72] text-[var(--m-ink-secondary)] md:text-[17px]">
            {t('lede')}
          </p>
        </div>

        {/* Hub grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 md:mt-16 md:gap-8">
          {HUBS.map((n) => (
            <div key={n} className="border-t-2 border-[var(--m-accent-teal)] pt-6">
              <h3 className="font-serif text-[clamp(26px,3vw,34px)] leading-[1.05] text-[var(--m-ink-primary)]">
                {t(`hub_${n}_city`)}
              </h3>
              <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-accent-teal)]">
                {t(`hub_${n}_region`)}
              </p>
              <p className="mt-4 text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {t(`hub_${n}_note`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
