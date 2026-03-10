import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getVaultItemBySlug,
  getVaultDownloads,
  getVaultUserState,
  getVaultRelatedItems,
  getVaultDifficultyPath,
} from '@/lib/vault/queries';
import { checkVaultAccess } from '@/lib/vault/access';
import { recordView } from '@/lib/vault/actions';
import { VaultContentDetail } from '@/components/vault/VaultContentDetail';
import { VaultPremiumGate } from '@/components/vault/VaultPremiumGate';
import { VaultDifficultyPath } from '@/components/vault/VaultDifficultyPath';
import type { VaultContentDetail as VaultContentDetailType } from '@/lib/vault/types';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const item = await getVaultItemBySlug(slug);
  if (!item) return { title: 'Not Found — The Vault' };

  const title = locale === 'ja' && item.title_jp ? item.title_jp : item.title_en;
  const description = locale === 'ja' && item.description_jp
    ? item.description_jp?.slice(0, 160)
    : item.description_en?.slice(0, 160);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';

  return {
    title: `${title} — The Vault`,
    description: description ?? undefined,
    openGraph: {
      title: `${title} — The Vault`,
      description: description ?? undefined,
      ...(item.thumbnail_url ? { images: [{ url: item.thumbnail_url }] } : {}),
    },
    alternates: {
      canonical: `${baseUrl}/learn/vault/${slug}`,
      languages: {
        en: `${baseUrl}/learn/vault/${slug}`,
        ja: `${baseUrl}/ja/learn/vault/${slug}`,
      },
    },
  };
}

export default async function VaultDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const item = await getVaultItemBySlug(slug);
  if (!item) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Premium gating
  if (item.access_tier === 'premium') {
    let hasAccess = false;
    if (user) {
      const access = await checkVaultAccess(user.id);
      hasAccess = access.hasAccess;
    }
    if (!hasAccess) {
      return (
        <div className="max-w-[1100px] mx-auto">
          <VaultPremiumGate />
        </div>
      );
    }
  }

  // Record view (fire-and-forget)
  recordView(item.id).catch(() => {});

  // Fetch related data in parallel
  const primaryTag = item.tags && item.tags.length > 0 ? item.tags[0] : null;
  const [downloads, userState, relatedItems, difficultyPath] = await Promise.all([
    getVaultDownloads(item.id),
    user ? getVaultUserState(user.id, item.id) : Promise.resolve(null),
    getVaultRelatedItems(item.id, item.related_item_ids, item.tags, 4, item.series_id, item.difficulty_level),
    primaryTag ? getVaultDifficultyPath(primaryTag) : Promise.resolve(null),
  ]);

  // Fetch series data if item is in a series
  let series = null;
  let seriesItems: VaultContentDetailType['seriesItems'] = [];
  if (item.series_id) {
    const seriesClient = await createClient();
    const { data: seriesData } = await seriesClient
      .from('vault_series')
      .select('*')
      .eq('id', item.series_id)
      .maybeSingle();

    if (seriesData) {
      series = seriesData;
      const { data: sItems } = await seriesClient
        .from('content_items')
        .select('*')
        .eq('series_id', item.series_id)
        .eq('is_published', true)
        .order('series_order', { ascending: true });
      seriesItems = (sItems ?? []) as VaultContentDetailType['seriesItems'];
    }
  }

  const detail: VaultContentDetailType = {
    item,
    downloads,
    relatedItems,
    series,
    seriesItems,
    userState,
  };

  // Check if difficulty path has meaningful content (>1 level with items)
  const showDifficultyPath = difficultyPath && primaryTag &&
    [difficultyPath.beginner, difficultyPath.intermediate, difficultyPath.advanced]
      .filter((arr) => arr.length > 0).length > 1;

  return (
    <>
      <VaultContentDetail detail={detail} locale={locale} />
      {showDifficultyPath && difficultyPath && primaryTag && (
        <div className="max-w-[1100px] mx-auto mt-12">
          <VaultDifficultyPath
            tag={primaryTag}
            tagLabel={primaryTag}
            levels={difficultyPath}
          />
        </div>
      )}
    </>
  );
}
