import { useTranslations } from 'next-intl';
import { Container, Section } from '@/components/marketing/primitives';
import { TOTAL_LEARNERS } from '@/lib/constants/social';
import { cn } from '@/lib/utils';

export function ProofBand({
  vaultTotalCount = 0,
}: {
  vaultTotalCount?: number;
}) {
  const t = useTranslations('proof_band');

  const stats = [
    {
      value: t('stat_learners_value', { count: TOTAL_LEARNERS.toLocaleString() }),
      label: t('stat_learners_label'),
    },
    ...(vaultTotalCount > 0
      ? [
          {
            value: t('stat_lessons_value', { count: vaultTotalCount }),
            label: t('stat_lessons_label'),
          },
        ]
      : []),
    {
      value: t('stat_languages_value'),
      label: t('stat_languages_label'),
    },
  ];

  const entries = [
    { name: t('vertice_name'), href: '/partners/vertice-society', placeholder: false },
    { name: t('placeholder_1'), placeholder: true },
    { name: t('placeholder_2'), placeholder: true },
    { name: t('placeholder_3'), placeholder: true },
  ];

  return (
    <Section variant="sand" spacing="tight">
      <Container>
        <div className="mb-12 flex flex-wrap items-start justify-center gap-x-14 gap-y-8 sm:gap-x-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-[34px] font-bold leading-none tracking-[-0.02em] text-[var(--m-ink-primary)] md:text-[42px]">
                {stat.value}
              </p>
              <p className="mt-2 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[var(--m-ink-secondary)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mb-8 text-center text-[11.5px] font-bold uppercase tracking-[0.18em] text-[var(--m-ink-secondary)]">
          {t('label')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
          {entries.map((entry) =>
            entry.placeholder || !entry.href ? (
              <Monogram key={entry.name} name={entry.name} muted={entry.placeholder} comingSoon={t('coming_soon')} />
            ) : (
              <a
                key={entry.name}
                href={entry.href}
                className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-sand)] rounded-md"
              >
                <Monogram name={entry.name} muted={false} />
              </a>
            ),
          )}
        </div>
      </Container>
    </Section>
  );
}

function Monogram({
  name,
  muted,
  comingSoon,
}: {
  name: string;
  muted: boolean;
  comingSoon?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-full border text-[12px] font-bold tracking-[0.04em]',
          muted
            ? 'border-dashed border-[var(--m-border-strong)] text-[var(--m-ink-secondary)]'
            : 'border-[var(--m-border-default)] bg-[var(--m-white)] text-[var(--m-ink-primary)]',
        )}
        aria-hidden
      >
        {initials}
      </span>
      <div className="flex flex-col">
        <span
          className={cn(
            'text-[15px] font-semibold tracking-[-0.01em]',
            muted ? 'text-[var(--m-ink-secondary)]' : 'text-[var(--m-ink-primary)]',
          )}
        >
          {name}
        </span>
        {muted && comingSoon && (
          <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--m-ink-secondary)]">
            {comingSoon}
          </span>
        )}
      </div>
    </div>
  );
}
