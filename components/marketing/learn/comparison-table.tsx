import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';

export function LearnComparisonTable() {
  const t = useTranslations('learn.comparison_table');

  const rows = [
    {
      label: t('row_best_for_label'),
      vault: t('row_best_for_vault'),
      courses: t('row_best_for_courses'),
      priv: t('row_best_for_private'),
    },
    {
      label: t('row_format_label'),
      vault: t('row_format_vault'),
      courses: t('row_format_courses'),
      priv: t('row_format_private'),
    },
    {
      label: t('row_time_label'),
      vault: t('row_time_vault'),
      courses: t('row_time_courses'),
      priv: t('row_time_private'),
    },
    {
      label: t('row_investment_label'),
      vault: t('row_investment_vault'),
      courses: t('row_investment_courses'),
      priv: t('row_investment_private'),
    },
    {
      label: t('row_start_label'),
      vault: t('row_start_vault'),
      courses: t('row_start_courses'),
      priv: t('row_start_private'),
    },
  ];

  const columns = [
    { label: t('col_1_label'), sub: t('col_1_sub'), tone: 'teal' as const },
    { label: t('col_2_label'), sub: t('col_2_sub'), tone: 'teal' as const },
    { label: t('col_3_label'), sub: t('col_3_sub'), tone: 'coral' as const },
  ];

  return (
    <Section variant="canvas">
      <Container>
        <h2
          className="mb-10 text-center font-bold tracking-[-0.02em] text-[var(--m-ink-primary)]"
          style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}
        >
          {t('heading')}
        </h2>

        <div className="overflow-hidden rounded-2xl border border-[var(--m-border-default)] shadow-[var(--m-shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--m-ink-primary)]">
                  <th className="w-[22%] px-6 py-4 text-left" />
                  {columns.map((col) => (
                    <th
                      key={col.sub}
                      className="w-[26%] px-5 py-4 text-left"
                    >
                      <p
                        className={
                          col.tone === 'teal'
                            ? 'mb-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--m-accent-teal)]'
                            : 'mb-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--m-accent-coral)]'
                        }
                      >
                        {col.label}
                      </p>
                      <p className="text-[14px] font-bold text-white">
                        {col.sub}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={
                      i % 2 === 0
                        ? 'border-b border-[var(--m-border-soft)] bg-[var(--m-white)]'
                        : 'border-b border-[var(--m-border-soft)] bg-[var(--m-sand)]'
                    }
                  >
                    <th
                      scope="row"
                      className="px-6 py-4 text-left text-[13.5px] font-semibold text-[var(--m-ink-secondary)]"
                    >
                      {row.label}
                    </th>
                    <td className="px-5 py-4 text-[14px] text-[var(--m-ink-primary)]">
                      {row.vault}
                    </td>
                    <td className="px-5 py-4 text-[14px] text-[var(--m-ink-primary)]">
                      {row.courses}
                    </td>
                    <td className="px-5 py-4 text-[14px] italic text-[var(--m-ink-secondary)]">
                      {row.priv}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </Section>
  );
}
