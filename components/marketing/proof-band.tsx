import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Container, Section } from '@/components/marketing/primitives';
import { getPublishedLogos } from '@/lib/proof/queries';
import type { PublicProofArtifact } from '@/lib/proof/types';
import { TOTAL_LEARNERS } from '@/lib/constants/social';

/**
 * A renderable logo row: only rows that carry BOTH a permissioned logo_url and
 * a non-empty org name qualify (the org name is the image's alt text / label —
 * a nameless logo can't be described accessibly).
 */
type LogoRow = PublicProofArtifact & { org: string; logo_url: string };

const SUPABASE_PUBLIC_PATH = '/storage/v1/object/public/';

/**
 * True only for the configured Supabase Storage public-object host+path that
 * next.config.ts already allow-lists in images.remotePatterns. Any other host
 * would make next/image throw at runtime, so those fall back to a Monogram.
 * Server-side check — no client onError needed.
 */
function isSupabasePublicUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === 'https:' &&
      u.hostname.endsWith('.supabase.co') &&
      u.pathname.startsWith(SUPABASE_PUBLIC_PATH)
    );
  } catch {
    return false;
  }
}

export async function ProofBand({
  vaultTotalCount = 0,
}: {
  vaultTotalCount?: number;
}) {
  const [t, logos] = await Promise.all([
    getTranslations('proof_band'),
    getPublishedLogos(),
  ]);

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
    {
      value: t('stat_membership_value'),
      label: t('stat_membership_label'),
    },
    {
      value: t('stat_price_value'),
      label: t('stat_price_label'),
    },
  ];

  const renderable = logos.filter(
    (l): l is LogoRow =>
      l.org != null &&
      l.org.trim() !== '' &&
      l.logo_url != null &&
      l.logo_url.trim() !== '',
  );

  return (
    <Section variant="sand" spacing="tight">
      <Container>
        <div className="mb-12 flex flex-wrap items-start justify-center gap-x-14 gap-y-8 sm:gap-x-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="whitespace-nowrap text-[34px] font-bold leading-none tracking-[-0.02em] text-[var(--m-ink-primary)] md:text-[42px]">
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
          {renderable.length > 0 ? (
            renderable.map((logo) => <LogoEntry key={logo.id} logo={logo} />)
          ) : (
            <a
              href="/partners/vertice-society"
              className="rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-sand)]"
            >
              <Monogram name={t('vertice_name')} />
            </a>
          )}
        </div>
      </Container>
    </Section>
  );
}

function LogoEntry({ logo }: { logo: LogoRow }) {
  const inner = isSupabasePublicUrl(logo.logo_url) ? (
    <Image
      src={logo.logo_url}
      alt={logo.org}
      width={160}
      height={40}
      className="h-10 w-auto max-w-[160px] object-contain"
    />
  ) : (
    <Monogram name={logo.org} />
  );

  const linkable =
    logo.organization_url != null && logo.organization_url.startsWith('https:');

  if (linkable) {
    return (
      <a
        href={logo.organization_url as string}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent-teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--m-sand)]"
      >
        {inner}
      </a>
    );
  }

  return <div>{inner}</div>;
}

function Monogram({ name }: { name: string }) {
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
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--m-border-default)] bg-[var(--m-white)] text-[12px] font-bold tracking-[0.04em] text-[var(--m-ink-primary)]"
        aria-hidden
      >
        {initials}
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--m-ink-primary)]">
        {name}
      </span>
    </div>
  );
}
