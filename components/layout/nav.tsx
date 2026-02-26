import { getTranslations } from 'next-intl/server';
import { NavClient } from './nav-client';

const navLinks = [
  { href: '/honuhub', key: 'honuhub' },
  { href: '/exploration', key: 'exploration' },
  { href: '/learn', key: 'learn' },
  { href: '/about', key: 'about' },
  { href: '/contact', key: 'contact' },
] as const;

export async function Nav() {
  const t = await getTranslations('nav');
  const links = navLinks.map((l) => ({ href: l.href, label: t(l.key) }));

  const userMenuLabels = {
    signIn: t('sign_in'),
    dashboard: t('dashboard'),
    admin: t('admin'),
    signOut: t('sign_out'),
  };

  return <NavClient links={links} userMenuLabels={userMenuLabels} />;
}
