import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

const ROWS = ['discover', 'design', 'deliver', 'iterate', 'outcome'] as const;

export function PartnershipsMethodTable() {
  const t = useTranslations('partnerships.method');

  return (
    <Section variant="navy" spacing="default" className="fg-band">
      {/* Growth-rings motif — low, bottom-left. Decorative. */}
      <span
        className="fg-rings -bottom-32 -left-28 w-[440px] opacity-60 md:w-[560px]"
        aria-hidden
      />

      <Container>
        <div className="relative z-10">
          {/* Chapter header */}
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-6 md:mb-14">
            <h2
              className="font-serif italic leading-[0.98] tracking-[-0.02em] text-white"
              style={{ fontSize: 'clamp(38px, 5vw, 64px)' }}
            >
              {t('headline')}
              <span className="text-[var(--m-accent-teal)]">.</span>
            </h2>
            <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-white/55">
              {t('chapter_label')}
            </p>
          </div>

          {/* Lifecycle rows */}
          <ul className="divide-y divide-white/10">
            {ROWS.map((row, i) => (
              <li
                key={row}
                className="grid grid-cols-1 gap-y-2 py-6 md:grid-cols-[64px_220px_1fr] md:gap-x-6 md:gap-y-0 md:py-7"
              >
                <span className="font-mono text-[10.5px] uppercase leading-[2.2] tracking-[0.18em] text-[var(--m-accent-teal)] md:leading-[1.9]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-[16px] font-bold tracking-[-0.01em] text-white">
                  {t(`row_${row}_phase`)}
                </p>
                <p className="text-[14.5px] leading-[1.55] text-white/80">
                  {t(`row_${row}_body`)}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-white/45">
            {t('footnote')}
          </p>
        </div>
      </Container>
    </Section>
  );
}
