import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Container, Section } from '@/components/marketing/primitives';

export function LearnComparisonDark() {
  const t = useTranslations('learn.comparison');

  const columns = [
    {
      label: t('col_1_label'),
      sub: t('col_1_sub'),
      tone: 'teal' as const,
      cta: { label: t('cta_vault'), href: '/learn/auth?intent=vault' },
      badge: null as string | null,
    },
    {
      label: t('col_2_label'),
      sub: t('col_2_sub'),
      tone: 'teal' as const,
      cta: { label: t('cta_courses'), href: '#courses' },
      badge: t('col_2_badge'),
    },
    {
      label: t('col_3_label'),
      sub: t('col_3_sub'),
      tone: 'coral' as const,
      cta: { label: t('cta_private'), href: '/partnerships' },
      badge: null,
    },
  ];

  const rows = [
    {
      label: t('row_best_for_label'),
      cells: [t('row_best_for_vault'), t('row_best_for_courses'), t('row_best_for_private')],
    },
    {
      label: t('row_format_label'),
      cells: [t('row_format_vault'), t('row_format_courses'), t('row_format_private')],
    },
    {
      label: t('row_time_label'),
      cells: [t('row_time_vault'), t('row_time_courses'), t('row_time_private')],
    },
    {
      label: t('row_investment_label'),
      cells: [t('row_investment_vault'), t('row_investment_courses'), t('row_investment_private')],
    },
    {
      label: t('row_start_label'),
      cells: [t('row_start_vault'), t('row_start_courses'), t('row_start_private')],
    },
  ];

  return (
    <Section
      variant="canvas"
      className="bg-[#0A2929] text-white"
    >
      <Container>
        <div className="mx-auto mb-12 max-w-[720px] text-center">
          <p className="mb-3 text-[11.5px] font-bold uppercase tracking-[0.18em] text-[var(--m-accent-teal)]">
            {t('eyebrow')}
          </p>
          <h2
            className="font-bold leading-[1.1] tracking-[-0.02em] text-white"
            style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}
          >
            {t('heading')}
          </h2>
          <p className="mt-2 text-[16px] text-white/80">{t('heading_jp')}</p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/[0.04]">
                <th className="w-[20%] px-6 py-5 text-left" />
                {columns.map((col) => (
                  <th key={col.sub} className="w-[26.66%] px-5 py-5 text-left align-top">
                    <p
                      className={
                        col.tone === 'teal'
                          ? 'mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--m-accent-teal)]'
                          : 'mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--m-accent-coral)]'
                      }
                    >
                      {col.label}
                    </p>
                    <p className="text-[16px] font-bold text-white">{col.sub}</p>
                    {col.badge && (
                      <span className="mt-2 inline-flex items-center rounded-full bg-[var(--m-accent-teal)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                        ★ {col.badge}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-white/[0.06]">
                  <th
                    scope="row"
                    className="px-6 py-4 text-left text-[12.5px] font-bold uppercase tracking-[0.08em] text-white/75"
                  >
                    {row.label}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td
                      key={`${row.label}-${i}`}
                      className="px-5 py-4 text-[14px] leading-[1.55] text-white"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                <td className="px-6 py-6" />
                {columns.map((col) => (
                  <td key={`cta-${col.sub}`} className="px-5 py-6">
                    <a
                      href={col.cta.href}
                      className={
                        col.tone === 'teal'
                          ? 'inline-flex items-center gap-2 rounded-[10px] bg-[var(--m-accent-teal)] px-4 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-[var(--m-accent-teal-dark)]'
                          : 'inline-flex items-center gap-2 rounded-[10px] bg-[var(--m-accent-coral)] px-4 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-[var(--m-accent-coral-dark)]'
                      }
                    >
                      {col.cta.label}
                      <ArrowRight size={15} strokeWidth={2} />
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards */}
        <div className="grid gap-5 md:hidden">
          {columns.map((col, ci) => (
            <article
              key={col.sub}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <p
                className={
                  col.tone === 'teal'
                    ? 'mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--m-accent-teal)]'
                    : 'mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--m-accent-coral)]'
                }
              >
                {col.label}
              </p>
              <h3 className="text-[20px] font-bold text-white">{col.sub}</h3>
              {col.badge && (
                <span className="mt-2 inline-flex items-center rounded-full bg-[var(--m-accent-teal)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                  ★ {col.badge}
                </span>
              )}
              <dl className="mt-5 space-y-3.5">
                {rows.map((row) => (
                  <div key={`${col.sub}-${row.label}`}>
                    <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/75">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5 text-[14px] text-white">
                      {row.cells[ci]}
                    </dd>
                  </div>
                ))}
              </dl>
              <a
                href={col.cta.href}
                className={
                  col.tone === 'teal'
                    ? 'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--m-accent-teal)] px-4 py-3 text-[14px] font-bold text-white transition-all hover:bg-[var(--m-accent-teal-dark)]'
                    : 'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--m-accent-coral)] px-4 py-3 text-[14px] font-bold text-white transition-all hover:bg-[var(--m-accent-coral-dark)]'
                }
              >
                {col.cta.label}
                <ArrowRight size={15} strokeWidth={2} />
              </a>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
