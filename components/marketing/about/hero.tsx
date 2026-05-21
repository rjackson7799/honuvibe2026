import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const CHAPTERS = [
  { num: '01', key: 'chip_origin_label', href: '#origin' },
  { num: '02', key: 'chip_crew_label', href: '#crew' },
  { num: '03', key: 'chip_mission_label', href: '#mission' },
] as const;

const FACTS = ['founded', 'languages', 'based'] as const;

export function AboutHero() {
  const t = useTranslations('about.hero');

  return (
    <Section variant="navy" spacing="hero" className="relative overflow-hidden">
      <Container>
        {/* Issue meta strip */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55 md:mb-14">
          <span>{t('meta_left')}</span>
          <span className="text-[var(--m-accent-teal)]">{t('meta_center')}</span>
          <span>{t('meta_right')}</span>
        </div>

        <div className="grid gap-12 md:grid-cols-[1.15fr_1fr] md:gap-16 md:items-end">
          {/* Headline */}
          <div>
            <h1
              className="font-serif italic leading-[0.94] tracking-[-0.025em] text-white"
              style={{ fontSize: 'clamp(48px, 7vw, 96px)' }}
            >
              {t('headline_1')}
              <br />
              {t('headline_2')}
              <span className="text-[var(--m-accent-teal)]">.</span>
            </h1>
          </div>

          {/* Overline + lede + chip nav */}
          <div className="flex flex-col gap-8">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
              {t('overline')}
            </p>
            <p className="text-[17px] leading-[1.7] text-white/85 md:text-[18px]">
              {t('lede')}
            </p>

            {/* Chapter chips */}
            <ul className="mt-2 grid gap-2 sm:grid-cols-3">
              {CHAPTERS.map((c) => (
                <li key={c.num}>
                  <a
                    href={c.href}
                    className="group flex h-full flex-col rounded-[10px] border border-white/15 bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-[var(--m-accent-teal)] hover:bg-white/[0.06]"
                  >
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
                      {c.num}
                    </span>
                    <span className="mt-1 text-[14px] font-semibold leading-snug text-white">
                      {t(c.key)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Fact strip */}
        <div className="mt-14 grid grid-cols-1 gap-5 border-t border-white/10 pt-7 sm:grid-cols-3 md:mt-16">
          {FACTS.map((key) => (
            <div key={key}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/55">
                {t(`fact_${key}_label`)}
              </p>
              <p className="mt-1.5 font-mono text-[14px] font-bold uppercase tracking-[0.04em] leading-snug text-white">
                {t(`fact_${key}_value`)}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
