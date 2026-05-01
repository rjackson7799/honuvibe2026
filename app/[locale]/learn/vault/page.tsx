import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getVaultBrowse, getVaultRecentlyViewed } from '@/lib/vault/queries';
import { checkVaultAccess } from '@/lib/vault/access';
import { VaultBrowseGrid } from '@/components/vault/VaultBrowseGrid';
import { VaultSubNav } from '@/components/vault/VaultSubNav';
import { VaultRecentlyViewed } from '@/components/vault/VaultRecentlyViewed';
import { VaultContentRequest } from '@/components/vault/VaultContentRequest';
import { Lock } from 'lucide-react';
import { BadgePill } from '@/components/ui/badge-pill';

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

  function VaultHeader({ count }: { count: number }) {
    return (
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-[10px] bg-[color:var(--accent-teal-subtle)] text-[color:var(--accent-teal)] flex items-center justify-center shrink-0">
            <Lock size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-[clamp(20px,2.4vw,24px)] font-bold text-fg-primary tracking-[-0.02em]">
                {t('page_title')}
              </h1>
              {count > 0 && (
                <BadgePill variant="teal" size="sm">
                  {t('items_found', { count })}
                </BadgePill>
              )}
            </div>
            <p className="text-[14px] text-fg-tertiary">{t('page_subtitle')}</p>
          </div>
        </div>
      </div>
    );
  }

  // If no access, show all items with premium ones locked
  if (!hasAccess) {
    const result = await getVaultBrowse({ pageSize: 20 });
    return (
      <div className="space-y-6 max-w-[1100px] mx-auto">
        <VaultHeader count={result.totalCount} />
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
      <VaultHeader count={result.totalCount} />
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
