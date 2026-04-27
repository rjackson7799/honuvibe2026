import { useTranslations } from 'next-intl';
import {
  Button,
  Card,
  Container,
  Overline,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';
import { HonuIcon } from '@/components/marketing/icons/honu';
import { cn } from '@/lib/utils';

type Partner = {
  name: string;
  program: string;
  builtFor: string;
  format: string;
  status: string;
  statusTone: 'teal' | 'coral';
  quote: string;
  quoteCredit: string;
  accent: string;
};

export function LearnPrivateCohorts() {
  const t = useTranslations('learn.private_cohorts');

  const partners: Partner[] = [
    {
      name: t('vertice_name'),
      program: t('vertice_program'),
      builtFor: t('vertice_built_for'),
      format: t('vertice_format'),
      status: t('vertice_status'),
      statusTone: 'teal',
      quote: t('vertice_quote'),
      quoteCredit: t('vertice_quote_credit'),
      accent: '#1e3b4a',
    },
    {
      name: t('smashhaus_name'),
      program: t('smashhaus_program'),
      builtFor: t('smashhaus_built_for'),
      format: t('smashhaus_format'),
      status: t('smashhaus_status'),
      statusTone: 'coral',
      quote: t('smashhaus_quote'),
      quoteCredit: t('smashhaus_quote_credit'),
      accent: '#2a1e30',
    },
  ];

  return (
    <Section variant="sand">
      <Container>
        <div className="mb-14 max-w-[600px]">
          <Overline tone="coral" className="mb-3.5">{t('overline')}</Overline>
          <SectionHeading className="mb-4">{t('heading')}</SectionHeading>
          <p className="text-[16.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('body')}
          </p>
        </div>

        <div className="mb-16 grid gap-7 md:grid-cols-2">
          {partners.map((p) => (
            <PartnerCard key={p.name} partner={p} builtForLabel={t('built_for_label')} formatLabel={t('format_label')} />
          ))}
        </div>

        <Card
          radius="2xl"
          className="mx-auto max-w-[680px] px-8 py-12 text-center md:px-16 md:py-14"
        >
          <Overline tone="coral" className="mb-4 inline-block">
            {t('cta_overline')}
          </Overline>
          <SectionHeading size="h3" className="mb-3.5">{t('cta_heading')}</SectionHeading>
          <p className="mb-8 text-[15.5px] leading-[1.7] text-[var(--m-ink-secondary)]">
            {t('cta_body')}
          </p>
          <Button href="/partnerships" variant="primary-coral" withArrow>
            {t('cta_button')}
          </Button>
        </Card>
      </Container>
    </Section>
  );
}

function PartnerCard({
  partner,
  builtForLabel,
  formatLabel,
}: {
  partner: Partner;
  builtForLabel: string;
  formatLabel: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--m-border-soft)] bg-[var(--m-white)] shadow-[var(--m-shadow-md)]">
      <div
        className="flex items-center justify-between gap-3 px-7 py-5"
        style={{ background: partner.accent }}
      >
        <div className="flex items-center gap-2.5">
          <span className="rounded-[8px] bg-white/[0.12] px-3.5 py-1.5 text-[14px] font-bold tracking-[-0.01em] text-white">
            {partner.name}
          </span>
          <span className="text-[18px] text-white/40">×</span>
          <span className="text-[var(--m-accent-teal)]">
            <HonuIcon size={26} />
          </span>
          <span className="text-[12px] font-bold text-white/70">HonuVibe</span>
        </div>
        <span
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-white',
            partner.statusTone === 'teal'
              ? 'bg-[var(--m-accent-teal)]'
              : 'bg-[var(--m-accent-coral)]',
          )}
        >
          {partner.status}
        </span>
      </div>

      <div className="px-7 py-7">
        <h3 className="mb-3 text-[18px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
          {partner.program}
        </h3>
        <p className="mb-1.5 text-[13px] text-[var(--m-ink-tertiary)]">
          <strong className="font-semibold text-[var(--m-ink-secondary)]">
            {builtForLabel}{' '}
          </strong>
          {partner.builtFor}
        </p>
        <p className="mb-5 text-[13px] text-[var(--m-ink-tertiary)]">
          <strong className="font-semibold text-[var(--m-ink-secondary)]">
            {formatLabel}{' '}
          </strong>
          {partner.format}
        </p>
        <blockquote className="rounded-[10px] border-l-[3px] border-[var(--m-accent-coral)] bg-[var(--m-sand)] px-5 py-4">
          <p className="mb-2 text-[13.5px] italic leading-[1.65] text-[var(--m-ink-secondary)]">
            “{partner.quote}”
          </p>
          <footer className="text-[12px] font-medium text-[var(--m-ink-tertiary)]">
            {partner.quoteCredit}
          </footer>
        </blockquote>
      </div>
    </article>
  );
}
