import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

const CADENCE = ['sprint', 'scoped', 'build'] as const;
const OUTCOMES = ['production', 'handoff', 'retainer'] as const;
const TILES = ['tile_a', 'tile_b', 'tile_c'] as const;

export function PartnershipsProjectChapter() {
  const t = useTranslations('partnerships.project');

  return (
    <Section id="project" variant="sand" spacing="default">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--m-border-soft)] pb-5">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--m-accent-coral)]">
            {t('overline')}
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('meta_right')}
          </p>
        </div>

        {/* Headline row */}
        <div className="grid gap-12 md:grid-cols-[1fr_1.05fr] md:gap-16">
          <div className="flex items-start gap-6">
            <span
              className="font-serif italic leading-none text-[var(--m-accent-coral)]"
              style={{ fontSize: 'clamp(56px, 7vw, 88px)' }}
            >
              02
            </span>
            <h2
              className="font-serif italic leading-[0.96] tracking-[-0.02em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(40px, 5.2vw, 68px)' }}
            >
              {t('headline_1')}
              <br />
              {t('headline_2')}
              <span className="text-[var(--m-accent-coral)]">.</span>
            </h2>
          </div>
          <p className="self-end max-w-[58ch] text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('lede')}
          </p>
        </div>

        {/* Cadence row */}
        <div className="mt-12 grid grid-cols-1 gap-5 border-t border-[var(--m-border-soft)] pt-7 sm:grid-cols-3">
          {CADENCE.map((k) => (
            <div key={k}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                {t(`cadence_${k}_label`)}
              </p>
              <p className="mt-1.5 text-[15px] font-bold leading-snug text-[var(--m-ink-primary)]">
                {t(`cadence_${k}_value`)}
              </p>
              <p className="mt-1 text-[13.5px] leading-snug text-[var(--m-ink-secondary)]">
                {t(`cadence_${k}_detail`)}
              </p>
            </div>
          ))}
        </div>

        {/* Outcomes + quote */}
        <div className="mt-12 grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
          <ul className="flex flex-col gap-3.5">
            {OUTCOMES.map((k) => (
              <li
                key={k}
                className="flex items-start gap-3 text-[15.5px] leading-[1.55] text-[var(--m-ink-secondary)]"
              >
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--m-accent-coral)]"
                  aria-hidden
                />
                <span>
                  <span className="font-semibold text-[var(--m-ink-primary)]">
                    {t(`outcome_${k}_title`)}
                  </span>{' '}
                  — {t(`outcome_${k}_body`)}
                </span>
              </li>
            ))}
          </ul>

          <blockquote className="self-center border-l-2 border-[var(--m-accent-coral)] pl-5">
            <p className="font-serif italic text-[19px] leading-[1.5] text-[var(--m-ink-primary)]">
              &ldquo;{t('quote')}&rdquo;
            </p>
            <footer className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
              {t('quote_attr')}
            </footer>
          </blockquote>
        </div>

        {/* "Currently building with" tile row */}
        <div className="mt-12">
          <p className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-ink-tertiary)]">
            {t('tiles_overline')}
          </p>
          <ul className="grid gap-4 sm:grid-cols-3">
            {TILES.map((k) => (
              <li
                key={k}
                className="flex flex-col gap-2 rounded-[12px] border border-[var(--m-border-soft)] bg-[var(--m-white)] px-5 py-5"
              >
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-accent-coral)]">
                  {t(`${k}_kicker`)}
                </p>
                <p className="text-[15.5px] font-bold leading-snug text-[var(--m-ink-primary)]">
                  {t(`${k}_title`)}
                </p>
                <p className="text-[13px] leading-[1.55] text-[var(--m-ink-secondary)]">
                  {t(`${k}_body`)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <a
          href="/partnerships/apply?type=project"
          className="mt-10 inline-flex items-center gap-2 text-[15.5px] font-bold text-[var(--m-accent-coral)] transition-opacity hover:opacity-80"
        >
          {t('cta')}
          <ArrowRight size={15} strokeWidth={2} />
        </a>
      </Container>
    </Section>
  );
}
