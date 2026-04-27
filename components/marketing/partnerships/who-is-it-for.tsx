import { useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import {
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

const FIT_KEYS = [0, 1, 2, 3, 4] as const;

export function PartnershipsWhoIsItFor() {
  const t = useTranslations('partnerships.who_is_it_for');
  const fits = (t.raw('fits') as string[]) ?? [];

  return (
    <Section variant="canvas">
      <Container>
        <div className="mb-14 max-w-[500px]">
          <Overline tone="teal" className="mb-3.5 inline-block">
            {t('overline')}
          </Overline>
          <SectionHeading>{t('headline')}</SectionHeading>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          <div className="rounded-2xl border border-[rgba(15,169,160,0.15)] bg-[rgba(15,169,160,0.05)] px-7 py-8">
            <h3 className="mb-5 text-[16px] font-bold tracking-[-0.01em] text-[var(--m-accent-teal)]">
              {t('fits_title')}
            </h3>
            <ul className="flex flex-col gap-3.5">
              {FIT_KEYS.map((i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2
                    size={18}
                    strokeWidth={1.6}
                    className="mt-0.5 shrink-0 text-[var(--m-accent-teal)]"
                  />
                  <span className="text-[14.5px] leading-[1.5] text-[var(--m-ink-primary)]">
                    {fits[i]}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[rgba(26,43,51,0.08)] bg-[rgba(139,148,153,0.05)] px-7 py-8">
            <h3 className="mb-5 text-[16px] font-bold tracking-[-0.01em] text-[var(--m-ink-secondary)]">
              {t('not_fits_title')}
            </h3>
            <ul className="flex flex-col gap-3.5">
              <li className="flex items-start gap-3">
                <XCircle
                  size={18}
                  strokeWidth={1.6}
                  className="mt-0.5 shrink-0 text-[var(--m-ink-tertiary)]"
                />
                <span className="text-[14.5px] leading-[1.5] text-[var(--m-ink-secondary)]">
                  {t('not_fit_individual')} —{' '}
                  <a
                    href="/learn"
                    className="font-medium text-[var(--m-accent-teal)] hover:underline"
                  >
                    {t('not_fit_individual_link')}
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle
                  size={18}
                  strokeWidth={1.6}
                  className="mt-0.5 shrink-0 text-[var(--m-ink-tertiary)]"
                />
                <span className="text-[14.5px] leading-[1.5] text-[var(--m-ink-secondary)]">
                  {t('not_fit_workshop')}{' '}
                  <span className="text-[var(--m-ink-tertiary)]">
                    {t('not_fit_workshop_note')}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle
                  size={18}
                  strokeWidth={1.6}
                  className="mt-0.5 shrink-0 text-[var(--m-ink-tertiary)]"
                />
                <span className="text-[14.5px] leading-[1.5] text-[var(--m-ink-secondary)]">
                  {t('not_fit_cheapest')}
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[rgba(232,118,90,0.2)] bg-[var(--m-accent-coral-soft)] px-7 py-8">
            <div>
              <h3 className="mb-3.5 text-[16px] font-bold tracking-[-0.01em] text-[var(--m-accent-coral)]">
                {t('unsure_title')}
              </h3>
              <p className="text-[14.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {t('unsure_body')}
              </p>
            </div>
            <a
              href="#apply"
              className="mt-7 inline-flex items-center gap-1.5 self-start text-[14.5px] font-bold text-[var(--m-accent-teal)] hover:text-[var(--m-accent-teal-dark)]"
            >
              {t('unsure_cta')}
              <ArrowRight size={16} strokeWidth={2} />
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}
