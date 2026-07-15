import { useLocale, useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

export function PartnershipsEditorialHero() {
  const t = useTranslations('partnerships.editorial_hero');
  const locale = useLocale();
  const isJa = locale === 'ja';

  return (
    <Section variant="navy" spacing="hero" className="fg-band">
      {/* Growth-rings motif — a faint cross-section, top-right. Decorative. */}
      <span
        className="fg-rings -right-24 -top-24 w-[420px] opacity-70 md:-right-16 md:w-[560px]"
        aria-hidden
      />

      <Container>
        <div className="relative z-10">
          {/* Field-guide meta strip */}
          <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/55 md:mb-14">
            <span>{t('meta_left')}</span>
            <span className="text-[var(--m-accent-teal)]">{t('meta_center')}</span>
            <span>{t('meta_right')}</span>
          </div>

          <div className="grid gap-12 md:grid-cols-[1.15fr_1fr] md:gap-16 md:items-end">
            {/* Headline */}
            <div>
              <h1
                className={
                  isJa
                    ? 'font-sans font-medium leading-[1.15] tracking-[0.02em] text-white'
                    : 'font-serif italic leading-[0.96] tracking-[-0.025em] text-white'
                }
                style={{ fontSize: 'clamp(44px, 7vw, 88px)' }}
              >
                {t('headline_1')}
                <br />
                {t('headline_2')}
                <span className="text-[var(--m-accent-teal)]">.</span>
              </h1>
            </div>

            {/* Lede + anchor chip */}
            <div className="flex flex-col gap-8">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
                {t('overline')}
              </p>
              <p className="text-[17px] leading-[1.7] text-white/85 md:text-[18px]">
                {t('lede')}
              </p>

              {/* Single-focus anchor chip → the growing cycle */}
              <a
                href="#grows"
                className="group mt-2 flex flex-col rounded-[10px] border border-white/15 bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-[var(--m-accent-teal)] hover:bg-white/[0.06]"
              >
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
                  01
                </span>
                <span className="mt-1 text-[14px] font-semibold leading-snug text-white">
                  {t('anchor_label')}
                </span>
              </a>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
