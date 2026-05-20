import { useTranslations } from 'next-intl';
import { Check, Handshake } from 'lucide-react';
import { Button, Container, Section } from '@/components/marketing/primitives';
import { HonuIcon } from '@/components/marketing/icons/honu';
import { LearnPartnershipBrief } from './learn-partnership-brief';

export function LearnChapterCohorts() {
  const t = useTranslations('learn.chapter_cohorts');

  const bullets = [t('bullet_1'), t('bullet_2'), t('bullet_3'), t('bullet_4')];

  return (
    <Section variant="canvas" id="cohorts" className="learn-chapter scroll-mt-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <ChapterHeader number={t('number')} title={t('title')} titleJp={t('title_jp')} />
            <p
              className="mt-6 max-w-[520px] font-serif italic leading-[1.3] tracking-[-0.01em] text-[var(--m-ink-primary)]"
              style={{ fontSize: 'clamp(20px, 2.2vw, 28px)' }}
            >
              {t('intro')}
            </p>
            <ul className="mt-7 list-none space-y-3 p-0">
              {bullets.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 text-[15.5px] leading-[1.6] text-[var(--m-ink-secondary)]"
                >
                  <Check
                    size={16}
                    strokeWidth={2}
                    className="mt-1 shrink-0 text-[var(--m-accent-coral)]"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-[var(--m-border-default)] pt-6">
              <p className="text-[32px] font-bold leading-none tracking-[-0.02em] text-[var(--m-ink-primary)]">
                {t('price')}
              </p>
              <p className="mt-1.5 text-[13px] font-semibold text-[var(--m-accent-coral)]">
                {t('price_note')}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button href="/partnerships" variant="primary-coral" withArrow>
                  {t('cta_primary')}
                </Button>
                <a
                  href="/partnerships#stories"
                  className="inline-flex items-center text-[14.5px] font-semibold text-[var(--m-accent-coral)] transition-opacity hover:opacity-80"
                >
                  {t('cta_secondary')} →
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col gap-6">
            <LearnPartnershipBrief />
            <VerticeCard
              name={t('vertice_name')}
              program={t('vertice_program')}
              builtFor={t('vertice_built_for')}
              format={t('vertice_format')}
              status={t('vertice_status')}
              quote={t('vertice_quote')}
              quoteCredit={t('vertice_quote_credit')}
              builtForLabel={t('built_for_label')}
              formatLabel={t('format_label')}
            />
            <ApplyToBeNextCard
              label={t('apply_next_label')}
              heading={t('apply_next_heading')}
              body={t('apply_next_body')}
              cta={t('apply_next_cta')}
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}

function ChapterHeader({ number, title, titleJp }: { number: string; title: string; titleJp: string }) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      <span
        className="font-serif leading-none text-[var(--m-accent-coral)]/30"
        style={{
          fontSize: 'clamp(96px, 12vw, 160px)',
          letterSpacing: '-0.04em',
        }}
        aria-hidden
      >
        {number}
      </span>
      <div className="flex-1 min-w-0">
        <h2
          className="font-bold leading-[1.05] tracking-[-0.02em] text-[var(--m-ink-primary)]"
          style={{ fontSize: 'clamp(36px, 4.5vw, 56px)' }}
        >
          {title}
        </h2>
        <p className="mt-1 text-[15px] text-[var(--m-ink-secondary)]">{titleJp}</p>
      </div>
    </div>
  );
}

function VerticeCard({
  name,
  program,
  builtFor,
  format,
  status,
  quote,
  quoteCredit,
  builtForLabel,
  formatLabel,
}: {
  name: string;
  program: string;
  builtFor: string;
  format: string;
  status: string;
  quote: string;
  quoteCredit: string;
  builtForLabel: string;
  formatLabel: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--m-border-soft)] bg-[var(--m-white)] shadow-[var(--m-shadow-sm)]">
      <div
        className="flex items-center justify-between gap-3 px-6 py-4"
        style={{ background: '#1e3b4a' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="rounded-md bg-white/12 px-3 py-1 text-[13px] font-bold tracking-[-0.01em] text-white">
            {name}
          </span>
          <span className="text-[16px] text-white/40">×</span>
          <span className="text-[var(--m-accent-teal)]">
            <HonuIcon size={22} />
          </span>
          <span className="text-[12px] font-bold text-white/70">HonuVibe</span>
        </div>
        <span className="whitespace-nowrap rounded-full bg-[var(--m-accent-teal)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
          {status}
        </span>
      </div>
      <div className="px-6 py-6">
        <h3 className="mb-3 text-[17px] font-bold tracking-[-0.01em] text-[var(--m-ink-primary)]">
          {program}
        </h3>
        <p className="mb-1.5 text-[13px] text-[var(--m-ink-secondary)]">
          <strong className="font-semibold text-[var(--m-ink-secondary)]">
            {builtForLabel}{' '}
          </strong>
          {builtFor}
        </p>
        <p className="mb-4 text-[13px] text-[var(--m-ink-secondary)]">
          <strong className="font-semibold text-[var(--m-ink-secondary)]">
            {formatLabel}{' '}
          </strong>
          {format}
        </p>
        <blockquote className="rounded-[10px] border-l-[3px] border-[var(--m-accent-teal)] bg-[var(--m-sand)] px-4 py-3.5">
          <p className="mb-2 text-[13px] italic leading-[1.65] text-[var(--m-ink-secondary)]">
            &ldquo;{quote}&rdquo;
          </p>
          <footer className="text-[11.5px] font-medium text-[var(--m-ink-secondary)]">
            {quoteCredit}
          </footer>
        </blockquote>
      </div>
    </article>
  );
}

function ApplyToBeNextCard({
  label,
  heading,
  body,
  cta,
}: {
  label: string;
  heading: string;
  body: string;
  cta: string;
}) {
  return (
    <article className="rounded-2xl border border-dashed border-[var(--m-accent-teal)] bg-[var(--m-accent-teal-soft)] p-6 shadow-[var(--m-shadow-xs)]">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--m-white)] text-[var(--m-accent-teal)]">
          <Handshake size={18} strokeWidth={2} />
        </span>
        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--m-accent-teal)]">
          {label}
        </span>
      </div>
      <h3 className="mb-2.5 text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--m-ink-primary)]">
        {heading}
      </h3>
      <p className="mb-5 text-[14px] leading-[1.65] text-[var(--m-ink-secondary)]">
        {body}
      </p>
      <Button href="/partnerships" variant="primary-teal" withArrow size="sm">
        {cta}
      </Button>
    </article>
  );
}
