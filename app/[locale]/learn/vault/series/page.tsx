import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import {
  getVaultSeriesListWithPartners,
  getActivePublicPartners,
} from '@/lib/vault/queries';
import { checkVaultAccess } from '@/lib/vault/access';
import { VaultSeriesCard } from '@/components/vault/VaultSeriesCard';
import { VaultPremiumGate } from '@/components/vault/VaultPremiumGate';
import { VaultSubNav } from '@/components/vault/VaultSubNav';
import {
  PartnerBadge,
  type PartnerBadgePartner,
} from '@/components/partners/PartnerBadge';
import { PartnerFilterChips } from '@/components/partners/PartnerFilterChips';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';
  return {
    title: locale === 'ja' ? 'シリーズ — ザ・ヴォールト — HonuVibe' : 'Series — The Vault — HonuVibe',
    description: locale === 'ja'
      ? 'ヴォールトの厳選された学習シリーズを閲覧。'
      : 'Browse curated learning series in The Vault.',
    alternates: {
      canonical: `${baseUrl}/learn/vault/series`,
      languages: {
        en: `${baseUrl}/learn/vault/series`,
        ja: `${baseUrl}/ja/learn/vault/series`,
      },
    },
  };
}

export default async function VaultSeriesBrowsePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const ownerParam = sp.owner;
  const ownerSlug = typeof ownerParam === 'string' ? ownerParam : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasAccess = false;
  if (user) {
    const access = await checkVaultAccess(user.id);
    hasAccess = access.hasAccess;
  }

  const [seriesList, partners] = await Promise.all([
    getVaultSeriesListWithPartners(ownerSlug),
    getActivePublicPartners(),
  ]);

  // Build badge slots (Server Component)
  const badgeSlots: Record<string, ReactNode> = {};
  for (const s of seriesList) {
    if (s.partners) {
      badgeSlots[s.id] = (
        <PartnerBadge
          key={s.id}
          partner={s.partners as PartnerBadgePartner}
          locale={locale}
          variant="compact"
          className="mt-2"
        />
      );
    }
  }

  const filterChips = partners.length > 0 ? (
    <PartnerFilterChips
      partners={partners}
      selectedSlug={ownerSlug}
      basePath="/learn/vault/series"
      locale={locale}
    />
  ) : null;

  if (!hasAccess && seriesList.length === 0) {
    return (
      <div className="space-y-8 max-w-[1100px] mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-fg-primary mb-2">Series</h1>
          <p className="text-fg-secondary">Curated learning paths to level up your skills.</p>
        </div>
        <VaultSubNav isAuthenticated={!!user} />
        {filterChips}
        <VaultPremiumGate />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif text-fg-primary mb-2">Series</h1>
        <p className="text-fg-secondary">Curated learning paths to level up your skills.</p>
      </div>
      <VaultSubNav isAuthenticated={!!user} />
      {filterChips}

      {seriesList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-fg-tertiary">No series available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {seriesList.map((s) => (
            <VaultSeriesCard key={s.id} series={s} badgeSlot={badgeSlots[s.id]} />
          ))}
        </div>
      )}

      {!hasAccess && <VaultPremiumGate />}
    </div>
  );
}
