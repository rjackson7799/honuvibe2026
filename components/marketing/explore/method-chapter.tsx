import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const STEPS = ['discovery', 'design_build', 'launch_support'] as const;

export function ExploreMethod() {
  const t = useTranslations('explore.method');

  return (
    <Section variant="sand" spacing="default">
      <Container>
        {/* Chapter header */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--m-border-soft)] pb-6 md:mb-14">
          <h2
            className="font-serif italic leading-[0.95] tracking-[-0.02em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(52px, 7.5vw, 96px)' }}
          >
            {t('headline')}
            <span className="text-[var(--m-accent-teal)]">.</span>
          </h2>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('chapter_label')}
          </p>
        </div>

        {/* Steps */}
        <ul className="divide-y divide-[var(--m-border-soft)]">
          {STEPS.map((key, i) => (
            <li
              key={key}
              className="grid gap-y-4 py-8 md:grid-cols-[80px_1fr_1.4fr_180px] md:gap-x-8 md:gap-y-0 md:py-10"
            >
              <span
                className="font-serif italic leading-none text-[var(--m-accent-teal)]"
                style={{ fontSize: 'clamp(40px, 4.5vw, 56px)' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              <div>
                <h3 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
                  {t(`${key}_title`)}
                </h3>
              </div>

              <p className="text-[15px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {t(`${key}_body`)}
              </p>

              <div className="md:text-right">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                  {t('artifact_label')}
                </p>
                <p className="mt-1.5 text-[13.5px] font-semibold leading-snug text-[var(--m-ink-primary)]">
                  {t(`${key}_artifact`)}
                </p>
                <p className="mt-1 font-mono text-[11.5px] text-[var(--m-accent-teal)]">
                  {t(`${key}_duration`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
