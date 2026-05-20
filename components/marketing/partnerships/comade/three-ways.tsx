import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

type Way = {
  key: 'programs' | 'products' | 'plans';
  accent: 'teal' | 'coral' | 'teal';
  href: string;
};

const WAYS: Way[] = [
  { key: 'programs', accent: 'teal', href: '/partnerships/apply?type=cohort' },
  { key: 'products', accent: 'coral', href: '/partnerships/apply?type=project' },
  { key: 'plans', accent: 'teal', href: '/partnerships/apply?type=consulting' },
];

const CADENCE_KEYS = ['a', 'b', 'c'] as const;

export function ComadeThreeWays() {
  const t = useTranslations('partnerships.comade.three_ways');

  return (
    <Section variant="sand" spacing="default">
      <Container>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--m-border-soft)] pb-6 md:mb-14">
          <h2
            className="font-serif italic leading-[0.95] tracking-[-0.02em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(48px, 7vw, 88px)' }}
          >
            {t('headline')}
            <span className="text-[var(--m-accent-teal)]">.</span>
          </h2>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('chapter_label')}
          </p>
        </div>

        <ul className="divide-y divide-[var(--m-border-soft)]">
          {WAYS.map(({ key, accent, href }) => {
            const accentVar =
              accent === 'coral' ? 'var(--m-accent-coral)' : 'var(--m-accent-teal)';
            return (
              <li
                key={key}
                className="grid gap-y-6 py-10 md:grid-cols-[1.1fr_1fr_0.9fr] md:gap-x-10 md:gap-y-0 md:py-12"
              >
                {/* Left: headline + lede */}
                <div>
                  <p
                    className="font-mono text-[10.5px] uppercase tracking-[0.16em]"
                    style={{ color: accentVar }}
                  >
                    {t(`${key}.overline`)}
                  </p>
                  <h3
                    className="mt-2 font-serif italic leading-[1] tracking-[-0.02em] text-[var(--m-ink-primary)]"
                    style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}
                  >
                    {t(`${key}.headline_1`)}
                    <br />
                    {t(`${key}.headline_2`)}
                    <span style={{ color: accentVar }}>.</span>
                  </h3>
                  <p className="mt-4 max-w-[42ch] text-[15.5px] leading-[1.65] text-[var(--m-ink-secondary)]">
                    {t(`${key}.lede`)}
                  </p>
                </div>

                {/* Middle: cadence triple */}
                <div className="grid grid-cols-3 gap-3 self-center border-y border-[var(--m-border-soft)] py-5 md:border-0 md:py-0">
                  {CADENCE_KEYS.map((c) => (
                    <div key={c}>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                        {t(`${key}.cadence_${c}_label`)}
                      </p>
                      <p className="mt-1.5 text-[14.5px] font-bold leading-snug text-[var(--m-ink-primary)]">
                        {t(`${key}.cadence_${c}_value`)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Right: tile + CTA */}
                <div className="flex flex-col items-start gap-4 self-center">
                  <div
                    className="w-full rounded-[12px] border border-[var(--m-border-soft)] bg-[var(--m-white)] px-4 py-3.5"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: accentVar }}>
                      {t(`${key}.tile_kicker`)}
                    </p>
                    <p className="mt-1 text-[13.5px] font-semibold leading-snug text-[var(--m-ink-primary)]">
                      {t(`${key}.tile_text`)}
                    </p>
                  </div>
                  <a
                    href={href}
                    className="inline-flex items-center gap-1.5 text-[14.5px] font-bold transition-opacity hover:opacity-80"
                    style={{ color: accentVar }}
                  >
                    {t(`${key}.cta`)}
                    <ArrowRight size={14} strokeWidth={2} />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
