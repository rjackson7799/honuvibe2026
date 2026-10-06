import { getTranslations } from 'next-intl/server';
import { NavClient } from './nav-client';

// Same doors as the green marketing header (Learn · Build · Partner) plus
// About and Contact, for the routes still on this dark Nav (/honuhub, legal
// pages, /learn/library, /portal …).
const navLinks = [
  { href: '/learn', key: 'learn' },
  { href: '/build', key: 'build' },
  { href: '/partner', key: 'partner' },
  { href: '/about', key: 'about' },
  { href: '/contact', key: 'contact' },
] as const;

export async function Nav() {
  const t = await getTranslations('nav');
  const links = navLinks.map((l) => ({ href: l.href, label: t(l.key) }));

  const userMenuLabels = {
    signIn: t('sign_in'),
    studentLogin: t('student_login'),
    account: t('account'),
    dashboard: t('dashboard'),
    admin: t('admin'),
    signOut: t('sign_out'),
  };

  return <NavClient links={links} userMenuLabels={userMenuLabels} />;
}
