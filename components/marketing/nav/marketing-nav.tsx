import { getTranslations } from 'next-intl/server';
import { getCachedBannerSetting } from '@/lib/marketing/banner';
import { publicEventBySlug } from '@/lib/events/public-events';
import { MarketingNavClient } from './marketing-nav-client';
import { NAV_CTA_HREF, PRIMARY_NAV_LINKS, type NavCta } from './nav-cta';

type MarketingNavProps = {
  /**
   * Page-specific amber CTA (README "Header"). Defaults to "Get started free"
   * → /signup. Pass null to hide it (e.g. checkout flows).
   */
  cta?: NavCta | null;
};

/**
 * 2026 green header (docs/design_2026_green README "Header"): dark green
 * sticky bar, Learn · Build · Partner, EN/日本語 pill, Sign in, page CTA.
 * It carries its own data-shell="hv" scope so it renders green on pages whose
 * body is still on the legacy --m-* look (the accepted cutover state).
 */
export async function MarketingNav({ cta = 'get_started_free' }: MarketingNavProps = {}) {
  const t = await getTranslations('nav');
  const links = PRIMARY_NAV_LINKS.map((l) => ({ href: l.href, label: t(l.key) }));

  // Resolve the featured banner event server-side: content is hand-authored in
  // lib/events/public-events.ts; visibility + selection come from site_settings.
  const banner = await getCachedBannerSetting();
  const bannerEvent =
    banner.enabled && banner.slug ? publicEventBySlug(banner.slug) : null;

  const userMenuLabels = {
    signIn: t('signin'),
    account: t('account'),
    dashboard: t('dashboard'),
    admin: t('admin'),
    signOut: t('sign_out'),
  };

  return (
    <div data-shell="hv" className="contents">
      <MarketingNavClient
        links={links}
        cta={cta ? { label: t(`cta_${cta}`), href: NAV_CTA_HREF[cta] } : null}
        userMenuLabels={userMenuLabels}
        labels={{
          primary: t('primary_label'),
          language: t('language_label'),
          openMenu: t('open_menu'),
          closeMenu: t('close_menu'),
          menu: t('menu_label'),
        }}
        bannerEvent={bannerEvent}
      />
    </div>
  );
}
