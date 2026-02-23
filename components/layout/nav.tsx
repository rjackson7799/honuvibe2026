import { getTranslations } from 'next-intl/server';
import { NavClient } from './nav-client';

const navLinks = [
  { href: '/honuhub', key: 'honuhub' },
  { href: '/exploration', key: 'exploration' },
  { href: '/learn', key: 'learn' },
  { href: '/blog', key: 'blog' },
  { href: '/about', key: 'about' },
  { href: '/apply', key: 'apply' },
] as const;

export async function Nav() {
  const t = await getTranslations('nav');
  const links = navLinks.map((l) => ({ href: l.href, label: t(l.key) }));

  return <NavClient links={links} />;
}
