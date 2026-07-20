import { getTranslations } from 'next-intl/server';
import { getCachedBannerSetting } from '@/lib/marketing/banner';
import { publicEventBySlug } from '@/lib/events/public-events';
import { MarketingNavClient } from './marketing-nav-client';

const navLinks = [
  { href: '/learn', key: 'learn' },
  { href: '/explore', key: 'exploration' },
  { href: '/sandbox', key: 'sandbox' },
  { href: '/partnerships', key: 'partnerships' },
  { href: '/about', key: 'about' },
  { href: '/contact', key: 'contact' },
] as const;

type MarketingNavProps = {
  /** Show the "Get Started" CTA. Defaults to true; pass false to opt out (e.g. checkout flows). */
  showGetStarted?: boolean;
};

export async function MarketingNav({ showGetStarted = true }: MarketingNavProps = {}) {
  const t = await getTranslations('nav');
  const links = navLinks.map((l) => ({ href: l.href, label: t(l.key) }));

  // Resolve the featured banner event server-side: content is hand-authored in
  // lib/events/public-events.ts; visibility + selection come from site_settings.
  const banner = await getCachedBannerSetting();
  const bannerEvent =
    banner.enabled && banner.slug ? publicEventBySlug(banner.slug) : null;

  const userMenuLabels = {
    signIn: t('sign_in'),
    account: t('account'),
    dashboard: t('dashboard'),
    admin: t('admin'),
    signOut: t('sign_out'),
  };

  return (
    <MarketingNavClient
      links={links}
      showGetStarted={showGetStarted}
      getStartedLabel={t('get_started')}
      userMenuLabels={userMenuLabels}
      bannerEvent={bannerEvent}
    />
  );
}
