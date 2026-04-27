import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Calendar,
  Globe,
  PlayCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

const VERTICE_DETAILS: ReadonlyArray<{ key: string; Icon: LucideIcon }> = [
  { key: 'vertice_detail_duration', Icon: Calendar },
  { key: 'vertice_detail_language', Icon: Globe },
  { key: 'vertice_detail_format', Icon: PlayCircle },
  { key: 'vertice_detail_size', Icon: Users },
];

export function PartnershipsCurrentPartners() {
  const t = useTranslations('partnerships.current_partners');

  return (
    <Section variant="sand" spacing="flush" className="pb-20 md:pb-24">
      <Container>
        <div className="mb-16 h-px bg-[rgba(26,43,51,0.1)] md:mb-[72px]" />
        <div className="mb-12 max-w-[560px] md:mb-14">
          <Overline tone="teal" className="mb-3.5 inline-block">
            {t('overline')}
          </Overline>
          <SectionHeading className="mb-3">{t('headline')}</SectionHeading>
          <p className="text-[17px] leading-[1.65] text-[var(--m-ink-secondary)]">
            {t('subhead')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
          <article className="overflow-hidden rounded-[18px] bg-[var(--m-white)] shadow-[0_6px_32px_rgba(26,43,51,0.08)]">
            <div className="h-[5px] bg-[var(--m-accent-teal)]" />
            <div className="px-9 pb-8 pt-9">
              <div className="mb-2.5 flex items-start justify-between gap-3">
                <h3 className="text-[19px] font-bold leading-[1.2] tracking-[-0.015em] text-[var(--m-ink-primary)]">
                  {t('vertice_name')}
                </h3>
                <Badge tone="status" className="mt-0.5 shrink-0">
                  {t('vertice_status')}
                </Badge>
              </div>
              <p className="mb-1 text-[16px] font-semibold text-[var(--m-ink-primary)]">
                {t('vertice_program')}
              </p>
              <p className="mb-7 text-[13.5px] text-[var(--m-ink-tertiary)]">
                {t('vertice_audience')}
              </p>
              <div className="mb-6 flex flex-col gap-2.5 border-y border-[rgba(26,43,51,0.07)] py-5">
                {VERTICE_DETAILS.map(({ key, Icon }) => (
                  <div key={key} className="flex items-center gap-2.5">
                    <Icon
                      size={16}
                      strokeWidth={1.4}
                      className="shrink-0 text-[var(--m-ink-tertiary)] opacity-65"
                    />
                    <span className="text-[13.5px] text-[var(--m-ink-secondary)]">
                      {t(key)}
                    </span>
                  </div>
                ))}
              </div>
              <blockquote className="border-l-[3px] border-[var(--m-accent-coral)] pl-4">
                <p className="mb-2.5 text-[14.5px] italic leading-[1.68] text-[var(--m-ink-secondary)]">
                  &ldquo;{t('vertice_quote')}&rdquo;
                </p>
                <p className="text-[13px] font-medium text-[var(--m-ink-tertiary)]">
                  {t('vertice_attribution')}
                </p>
              </blockquote>
            </div>
          </article>

          <article className="flex flex-col justify-between rounded-[18px] border border-[rgba(232,118,90,0.2)] bg-[var(--m-accent-coral-soft)] px-9 py-9">
            <div>
              <Overline tone="coral" className="mb-3.5 inline-block">
                {t('more_overline')}
              </Overline>
              <h3 className="mb-3 text-[22px] font-bold leading-[1.25] tracking-[-0.015em] text-[var(--m-ink-primary)]">
                {t('more_headline')}
              </h3>
              <p className="text-[15px] leading-[1.7] text-[var(--m-ink-secondary)]">
                {t('more_body')}
              </p>
            </div>
            <a
              href="#apply"
              className="mt-7 inline-flex items-center gap-1.5 self-start text-[14.5px] font-bold text-[var(--m-accent-coral)] hover:text-[var(--m-accent-coral-dark)]"
            >
              {t('more_cta')}
              <ArrowRight size={16} strokeWidth={2} />
            </a>
          </article>
        </div>
        <p className="mt-11 text-center text-[15px] italic text-[var(--m-ink-secondary)]">
          {t('footnote')}
        </p>
      </Container>
    </Section>
  );
}
