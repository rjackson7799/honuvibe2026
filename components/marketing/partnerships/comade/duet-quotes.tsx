import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const PAIRS = ['1', '2', '3'] as const;

export function ComadeDuetQuotes() {
  const t = useTranslations('partnerships.comade.duet_quotes');

  return (
    <Section variant="navy" spacing="default">
      <Container>
        <div className="mb-14 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <h2
            className="font-serif italic leading-[0.95] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}
          >
            {t('headline')}
            <span className="text-[var(--m-accent-teal)]">.</span>
          </h2>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-white/55">
            {t('section_label')}
          </p>
        </div>

        <ol className="flex flex-col gap-14 md:gap-20">
          {PAIRS.map((n, i) => {
            const partnerOnLeft = i % 2 === 0;
            const partnerBlock = (
              <blockquote className="rounded-[14px] border border-white/15 bg-white/[0.03] px-7 py-6 md:px-8 md:py-8">
                <p className="font-serif italic text-[20px] leading-[1.5] text-white">
                  &ldquo;{t(`pairs.${n}.partner`)}&rdquo;
                </p>
                <footer className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-accent-teal)]">
                  {t(`pairs.${n}.partner_attr`)}
                </footer>
              </blockquote>
            );
            const ryanBlock = (
              <blockquote className="rounded-[14px] border border-[var(--m-accent-teal)]/50 bg-[rgba(15,169,160,0.08)] px-7 py-6 md:px-8 md:py-8">
                <p className="font-serif italic text-[18px] leading-[1.5] text-white/90">
                  &ldquo;{t(`pairs.${n}.ryan`)}&rdquo;
                </p>
                <footer className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/55">
                  {t(`pairs.${n}.ryan_attr`)}
                </footer>
              </blockquote>
            );

            return (
              <li
                key={n}
                className="relative grid gap-6 md:grid-cols-[1fr_60px_1fr] md:items-start md:gap-2"
              >
                {partnerOnLeft ? (
                  <>
                    <div className="md:col-start-1">{partnerBlock}</div>
                    <Connector />
                    <div className="md:col-start-3 md:mt-16">{ryanBlock}</div>
                  </>
                ) : (
                  <>
                    <div className="md:col-start-1 md:mt-16">{ryanBlock}</div>
                    <Connector />
                    <div className="md:col-start-3">{partnerBlock}</div>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </Container>
    </Section>
  );
}

function Connector() {
  return (
    <div className="hidden self-stretch md:flex md:flex-col md:items-center md:justify-center md:col-start-2">
      <span className="h-12 w-px bg-white/20" aria-hidden />
      <span className="my-2 font-serif italic text-[24px] leading-none text-[var(--m-accent-teal)]" aria-hidden>
        ·
      </span>
      <span className="h-12 w-px bg-white/20" aria-hidden />
    </div>
  );
}
