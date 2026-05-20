import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const COLUMNS = ['cohort', 'project', 'consulting'] as const;
const ROWS = ['discover', 'design', 'ship', 'iterate', 'outcome'] as const;

export function PartnershipsMethodTable() {
  const t = useTranslations('partnerships.method');

  return (
    <Section variant="navy" spacing="default">
      <Container>
        {/* Chapter header */}
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-6 md:mb-14">
          <h2
            className="font-serif italic leading-[0.95] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(52px, 7vw, 96px)' }}
          >
            {t('headline')}
            <span className="text-[var(--m-accent-teal)]">.</span>
          </h2>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-white/55">
            {t('chapter_label')}
          </p>
        </div>

        {/* Column headers */}
        <div className="hidden grid-cols-[140px_repeat(3,1fr)] gap-6 border-b border-white/10 pb-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/55 md:grid">
          <span>{t('col_phase')}</span>
          {COLUMNS.map((c) => (
            <span key={c} className="text-[var(--m-accent-teal)]">
              {t(`col_${c}`)}
            </span>
          ))}
        </div>

        {/* Rows */}
        <ul className="divide-y divide-white/10">
          {ROWS.map((row) => (
            <li
              key={row}
              className="grid grid-cols-1 gap-y-2 py-6 md:grid-cols-[140px_repeat(3,1fr)] md:gap-x-6 md:gap-y-0 md:py-7"
            >
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-accent-teal)] md:hidden">
                  {t('col_phase')}
                </p>
                <p className="text-[16px] font-bold tracking-[-0.01em] text-white">
                  {t(`row_${row}_phase`)}
                </p>
              </div>
              {COLUMNS.map((c) => (
                <div key={c}>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--m-accent-teal)] md:hidden">
                    {t(`col_${c}`)}
                  </p>
                  <p className="text-[14.5px] leading-[1.55] text-white/80">
                    {t(`row_${row}_${c}`)}
                  </p>
                </div>
              ))}
            </li>
          ))}
        </ul>

        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-white/45">
          {t('footnote')}
        </p>
      </Container>
    </Section>
  );
}
