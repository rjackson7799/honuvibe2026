import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getVaultSeriesBySlug } from '@/lib/vault/queries';
import { checkVaultAccess } from '@/lib/vault/access';
import { VaultSeriesDetail } from '@/components/vault/VaultSeriesDetail';
import { VaultAnalyticsTracker } from '@/components/vault/VaultAnalyticsTracker';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const series = await getVaultSeriesBySlug(slug);
  if (!series) return { title: 'Not Found — The Vault' };

  const title = locale === 'ja' && series.title_jp ? series.title_jp : series.title_en;
  const description = locale === 'ja' && series.description_jp
    ? series.description_jp?.slice(0, 160)
    : series.description_en?.slice(0, 160);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';

  return {
    title: `${title} — The Vault`,
    description: description ?? undefined,
    alternates: {
      canonical: `${baseUrl}/learn/vault/series/${slug}`,
      languages: {
        en: `${baseUrl}/learn/vault/series/${slug}`,
        ja: `${baseUrl}/ja/learn/vault/series/${slug}`,
      },
    },
  };
}

export default async function VaultSeriesDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const series = await getVaultSeriesBySlug(slug);
  if (!series) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasAccess = false;
  if (user) {
    const access = await checkVaultAccess(user.id);
    hasAccess = access.hasAccess;
  }

  return (
    <>
      <VaultAnalyticsTracker event="vault_series_view" props={{ series: slug }} />
      <VaultSeriesDetail series={series} locale={locale} hasAccess={hasAccess} />
    </>
  );
}
