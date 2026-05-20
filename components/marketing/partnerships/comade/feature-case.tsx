import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  Container,
  LogoLockup,
  Section,
} from '@/components/marketing/primitives';

const STATS = ['size', 'duration', 'language'] as const;

export function ComadeFeatureCase() {
  const t = useTranslations('partnerships.comade.feature_case');
  const partnerColor = t('partner_color');

  return (
    <Section id="feature" variant="canvas" spacing="default">
      {/* Dual-color band */}
      <div
        aria-hidden
        className="relative -mt-16 mb-16 h-3 w-full md:-mt-24 md:mb-20"
      >
        <div className="absolute inset-y-0 left-0 w-1/2" style={{ background: partnerColor }} />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[var(--m-accent-teal)]" />
      </div>

      <Container>
        {/* Lockup sits on top of the seam visually */}
        <div className="-mt-32 mb-12 flex justify-center md:-mt-40 md:mb-16">
          <div className="rounded-[16px] bg-[var(--m-canvas)] px-8 py-6 shadow-[var(--m-shadow-lg)]">
            <LogoLockup
              left={t('partner_name')}
              right="HonuVibe.AI"
              size="lg"
              theme="canvas"
              partnerColor={partnerColor}
            />
          </div>
        </div>

        {/* Header strip */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--m-border-soft)] pb-5">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('overline')}
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('meta_right')}
          </p>
        </div>

        {/* THE BRIEF */}
        <div className="mx-auto mb-16 max-w-[760px] text-center">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('brief_label')}
          </p>
          <h2
            className="mt-3 font-serif italic leading-[0.98] tracking-[-0.02em] text-[var(--m-ink-primary)]"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}
          >
            {t('brief_headline')}
          </h2>
          <p className="mx-auto mt-6 max-w-[60ch] text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('brief_body')}
          </p>
        </div>

        {/* THE MAKE — full-bleed-ish screenshot row */}
        <div className="mb-16">
          <p className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('make_label')}
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {(['dashboard', 'slide', 'session'] as const).map((k) => (
              <figure
                key={k}
                className="overflow-hidden rounded-[14px] border border-[var(--m-border-soft)] bg-[var(--m-white)] shadow-[var(--m-shadow-lg)]"
              >
                <div className="flex items-center justify-between border-b border-[var(--m-border-soft)] bg-[var(--m-sand)] px-4 py-2.5">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                    {t(`make_${k}_label`)}
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em]"
                    style={{ background: `${partnerColor}1f`, color: partnerColor }}
                  >
                    {t('partner_short')}
                  </span>
                </div>
                <div className="aspect-[5/3] bg-[linear-gradient(135deg,rgba(15,169,160,0.08)_0%,rgba(232,118,90,0.08)_100%)]">
                  <div className="flex h-full items-center justify-center p-6 text-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                      {t(`make_${k}_caption`)}
                    </p>
                  </div>
                </div>
              </figure>
            ))}
          </div>
        </div>

        {/* THE OUTCOME — stats */}
        <div className="mb-16">
          <p className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('outcome_label')}
          </p>
          <div className="grid grid-cols-1 gap-6 border-y border-[var(--m-border-soft)] py-8 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s}>
                <p
                  className="font-serif leading-none tracking-[-0.01em] text-[var(--m-accent-teal)]"
                  style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}
                >
                  {t(`stat_${s}_value`)}
                </p>
                <p className="mt-3 text-[14px] font-semibold leading-snug text-[var(--m-ink-primary)]">
                  {t(`stat_${s}_label`)}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-[var(--m-ink-secondary)]">
                  {t(`stat_${s}_caption`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* THE DUET — pair of quotes */}
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <blockquote
            className="border-l-[3px] pl-6"
            style={{ borderColor: partnerColor }}
          >
            <p className="font-serif italic text-[19px] leading-[1.5] text-[var(--m-ink-primary)]">
              &ldquo;{t('quote_partner')}&rdquo;
            </p>
            <footer className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
              {t('quote_partner_attr')}
            </footer>
          </blockquote>
          <blockquote className="border-l-[3px] border-[var(--m-accent-teal)] pl-6 md:mt-12">
            <p className="font-serif italic text-[19px] leading-[1.5] text-[var(--m-ink-primary)]">
              &ldquo;{t('quote_ryan')}&rdquo;
            </p>
            <footer className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
              {t('quote_ryan_attr')}
            </footer>
          </blockquote>
        </div>

        <a
          href="/partners/vertice-society"
          className="mt-12 inline-flex items-center gap-2 text-[15.5px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
        >
          {t('cta')}
          <ArrowRight size={15} strokeWidth={2} />
        </a>
      </Container>
    </Section>
  );
}
