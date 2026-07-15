import { useTranslations } from 'next-intl';
import { Sprout, Leaf, Wheat } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Container, Overline, Section } from '@/components/marketing/primitives';

type Stage = {
  key: 'seed' | 'tend' | 'harvest';
  icon: LucideIcon;
  /** Accent color token for the icon + ring. */
  accent: string;
  /** Soft background token for the icon well. */
  well: string;
};

const STAGES: Stage[] = [
  { key: 'seed', icon: Sprout, accent: 'var(--m-accent-verdigris)', well: 'var(--m-accent-verdigris-soft)' },
  { key: 'tend', icon: Leaf, accent: 'var(--m-accent-teal)', well: 'var(--m-accent-teal-soft)' },
  { key: 'harvest', icon: Wheat, accent: 'var(--m-accent-gold)', well: 'var(--m-accent-gold-soft)' },
];

export function PartnershipsGrowingCycle() {
  const t = useTranslations('partnerships.growing_cycle');

  return (
    <Section id="grows" variant="canvas" spacing="default">
      <Container>
        {/* Header */}
        <div className="mb-12 max-w-[62ch] md:mb-14">
          <Overline tone="teal">{t('overline')}</Overline>
          <h2
            className="mt-4 font-serif font-normal leading-[1.08] tracking-[-0.01em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(30px, 4vw, 46px)' }}
          >
            {t('heading')}
          </h2>
          <p className="mt-5 text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('lede')}
          </p>
        </div>

        {/* Seed → Tend → Harvest */}
        <ol className="grid gap-6 md:grid-cols-3 md:gap-7">
          {STAGES.map(({ key, icon: Icon, accent, well }, i) => (
            <li
              key={key}
              className="relative flex flex-col rounded-[16px] border border-[var(--m-border-soft)] bg-[var(--m-white)] p-7 shadow-[var(--m-shadow-xs)]"
            >
              {/* Season index + connector arrow to the next stage (desktop) */}
              <div className="mb-6 flex items-center justify-between">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: well, color: accent }}
                >
                  <Icon size={22} strokeWidth={1.75} aria-hidden />
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-ink-tertiary)]">
                  {String(i + 1).padStart(2, '0')} / 03
                </span>
              </div>

              <h3
                className="text-[19px] font-bold leading-snug tracking-[-0.01em]"
                style={{ color: accent }}
              >
                {t(`${key}_title`)}
              </h3>
              <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--m-ink-secondary)]">
                {t(`${key}_body`)}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
