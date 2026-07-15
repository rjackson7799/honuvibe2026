import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const ITEMS = ['1', '2', '3', '4'] as const;

export function AboutPrinciples() {
  const t = useTranslations('about.principles');

  return (
    <Section id="principles" variant="canvas" spacing="default">
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
          className="max-w-[16ch] font-serif leading-[0.98] tracking-[-0.02em] text-[var(--m-ink-primary)]"
          style={{ fontSize: 'clamp(36px, 4.5vw, 60px)' }}
        >
          {t('headline_1')}
          <br />
          {t('headline_2')}
          <span className="text-[var(--m-accent-teal)]">.</span>
        </h2>

        {/* Principle grid */}
        <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
          {ITEMS.map((n) => (
            <div key={n} className="border-t border-[var(--m-border-default)] pt-6">
              <p className="font-mono text-[12px] font-bold tracking-[0.1em] text-[var(--m-accent-teal)]">
                {t(`item_${n}_num`)}
              </p>
              <h3 className="mt-4 text-[18px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                {t(`item_${n}_title`)}
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {t(`item_${n}_body`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
