import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getVaultBrowse, getVaultRecentlyViewed } from '@/lib/vault/queries';
import { checkVaultAccess } from '@/lib/vault/access';
import { VaultBrowseGrid } from '@/components/vault/VaultBrowseGrid';
import { VaultSubNav } from '@/components/vault/VaultSubNav';
import { VaultRecentlyViewed } from '@/components/vault/VaultRecentlyViewed';
import { VaultContentRequest } from '@/components/vault/VaultContentRequest';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';
  return {
    title: locale === 'ja' ? 'ザ・ヴォールト — HonuVibe' : 'The Vault — HonuVibe',
    description: locale === 'ja'
      ? 'AIマスターのための自習ライブラリ。チュートリアル、ガイド、テンプレートなど。'
      : 'Browse tutorials, guides, templates, and more in The Vault.',
    alternates: {
      canonical: `${baseUrl}/learn/vault`,
      languages: {
        en: `${baseUrl}/learn/vault`,
        ja: `${baseUrl}/ja/learn/vault`,
      },
    },
  };
}

export default async function VaultBrowsePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('vault');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check access for premium content
  let hasAccess = false;
  if (user) {
    const access = await checkVaultAccess(user.id);
    hasAccess = access.hasAccess;
  }

  // If no access, show all items with premium ones locked
  if (!hasAccess) {
    const result = await getVaultBrowse({ pageSize: 20 });
    return (
      <div className="space-y-8 max-w-[1100px] mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-fg-primary mb-2">{t('page_title')}</h1>
          <p className="text-fg-secondary">{t('page_subtitle')}</p>
        </div>
        <VaultSubNav isAuthenticated={!!user} />
        <VaultBrowseGrid
          initialItems={result.items}
          initialTotalCount={result.totalCount}
          hasAccess={false}
        />
      </div>
    );
  }

  // Full access — show all content + recently viewed
  const [result, recentItems] = await Promise.all([
    getVaultBrowse({ pageSize: 20 }),
    user ? getVaultRecentlyViewed(user.id, 6) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif text-fg-primary mb-2">The Vault</h1>
        <p className="text-fg-secondary">Tutorials, guides, templates, and tools — all in one place.</p>
      </div>
      <VaultSubNav isAuthenticated={!!user} />
      <VaultRecentlyViewed items={recentItems} />
      <VaultBrowseGrid
        initialItems={result.items}
        initialTotalCount={result.totalCount}
        hasAccess={true}
      />
      {user && <VaultContentRequest />}
    </div>
  );
}
