import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

const CADENCE = ['from', 'duration', 'audience'] as const;

export function PartnershipsCohortChapter() {
  const t = useTranslations('partnerships.cohort');

  return (
    <Section id="cohort" variant="sand" spacing="default">
      <Container>
        {/* Specimen header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--m-border-soft)] pb-5">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('overline')}
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--m-ink-tertiary)]">
            {t('meta_right')}
          </p>
        </div>

        <div className="grid gap-12 md:grid-cols-[1fr_1.05fr] md:gap-16">
          {/* Left: headline + lede + vitals + quote */}
          <div>
            <h2
              className="font-serif italic leading-[0.98] tracking-[-0.02em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(40px, 5.2vw, 68px)' }}
            >
              {t('headline_1')}
              <br />
              {t('headline_2')}
              <span className="text-[var(--m-accent-teal)]">.</span>
            </h2>

            <p className="mt-8 max-w-[54ch] text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
              {t('lede')}
            </p>

            {/* Vitals row */}
            <div className="mt-10 grid grid-cols-3 gap-5 border-t border-[var(--m-border-soft)] pt-7">
              {CADENCE.map((k) => (
                <div key={k}>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                    {t(`cadence_${k}_label`)}
                  </p>
                  <p className="mt-1.5 text-[15px] font-bold leading-snug text-[var(--m-ink-primary)]">
                    {t(`cadence_${k}_value`)}
                  </p>
                </div>
              ))}
            </div>

            {/* Quote */}
            <blockquote className="mt-10 border-l-2 border-[var(--m-accent-teal)] pl-5">
              <p className="font-serif italic text-[18px] leading-[1.55] text-[var(--m-ink-primary)]">
                &ldquo;{t('quote')}&rdquo;
              </p>
              <footer className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                {t('quote_attr')}
              </footer>
            </blockquote>

            {/* CTA */}
            <a
              href="/partnerships/apply?type=cohort"
              className="mt-10 inline-flex items-center gap-2 text-[15.5px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
            >
              {t('cta')}
              <ArrowRight size={15} strokeWidth={2} />
            </a>
          </div>

          {/* Right: Vertice proof tile */}
          <aside className="self-start">
            <article className="overflow-hidden rounded-[16px] border border-[var(--m-border-soft)] bg-[var(--m-white)] shadow-[var(--m-shadow-lg)]">
              {/* Tile meta */}
              <div className="flex items-center justify-between border-b border-[var(--m-border-soft)] bg-[var(--m-sand)] px-5 py-3">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-ink-tertiary)]">
                  {t('proof_overline')}
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(15,169,160,0.14)] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--m-accent-teal)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                  {t('proof_status')}
                </span>
              </div>

              <div className="px-6 py-6">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-accent-teal)]">
                  {t('proof_partner_label')}
                </p>
                <h3 className="mt-1.5 font-serif italic leading-[1.05] tracking-[-0.015em] text-[var(--m-ink-primary)]" style={{ fontSize: 'clamp(28px, 3vw, 36px)' }}>
                  {t('proof_partner_name')}
                </h3>
                <p className="mt-4 text-[14.5px] leading-[1.6] text-[var(--m-ink-secondary)]">
                  {t('proof_program')}
                </p>

                {/* Mini stat row */}
                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--m-border-soft)] pt-5">
                  {(['size', 'duration', 'language'] as const).map((k) => (
                    <div key={k}>
                      <p className="font-serif text-[22px] leading-none tracking-[-0.01em] text-[var(--m-accent-teal)]">
                        {t(`proof_stat_${k}_value`)}
                      </p>
                      <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-[var(--m-ink-primary)]">
                        {t(`proof_stat_${k}_label`)}
                      </p>
                    </div>
                  ))}
                </div>

                <a
                  href="/partners/vertice-society"
                  className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
                >
                  {t('proof_link')}
                  <ArrowRight size={13} strokeWidth={2} />
                </a>
              </div>
            </article>

            {/* Quiet "who else" footnote */}
            <p className="mt-5 px-1 font-mono text-[11px] uppercase leading-[1.6] tracking-[0.14em] text-[var(--m-ink-tertiary)]">
              {t('also_label')}{' '}
              <span className="normal-case tracking-normal text-[var(--m-ink-secondary)]">
                {t('also_value')}
              </span>
            </p>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
