import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

const STATS = ['capacity', 'partners', 'ratio'] as const;

export function ExploreAlohaStandard() {
  const t = useTranslations('explore.aloha');

  return (
    <Section variant="sand" spacing="default" className="bg-[var(--m-sand-warm,var(--m-sand))]">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--m-border-soft)] pb-6">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('chapter_label')}
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-16 lg:gap-20">
          {/* Left: big headline */}
          <h2
            className="font-serif italic leading-[0.95] tracking-[-0.02em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(52px, 7vw, 96px)' }}
          >
            {t('headline_1')}
            <br />
            <span className="text-[var(--m-accent-teal)]">{t('headline_2')}</span>
          </h2>

          {/* Right: copy + stats */}
          <div>
            <p className="text-[16.5px] leading-[1.75] text-[var(--m-ink-secondary)]">
              {t('body')}
            </p>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-[var(--m-border-soft)] pt-8">
              {STATS.map((s) => (
                <div key={s}>
                  <p
                    className="font-serif leading-none tracking-[-0.01em] text-[var(--m-accent-teal)]"
                    style={{ fontSize: 'clamp(34px, 4vw, 48px)' }}
                  >
                    {t(`stat_${s}_value`)}
                  </p>
                  <p className="mt-3 text-[13.5px] font-semibold leading-snug text-[var(--m-ink-primary)]">
                    {t(`stat_${s}_label`)}
                  </p>
                </div>
              ))}
            </div>

            <a
              href="/partnerships#community"
              className="mt-10 inline-flex items-center gap-1.5 text-[15px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
            >
              {t('link')}
              <ArrowRight size={15} strokeWidth={2} />
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
