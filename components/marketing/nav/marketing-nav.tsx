import { getTranslations } from 'next-intl/server';
import { MarketingNavClient } from './marketing-nav-client';

const navLinks = [
  { href: '/learn', key: 'learn' },
  { href: '/explore', key: 'exploration' },
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
    />
  );
}
