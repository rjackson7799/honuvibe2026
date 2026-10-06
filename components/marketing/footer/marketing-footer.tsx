import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SOCIAL_LINKS } from '@/lib/constants/social';
import { HvContainer } from '../hv/container';

const primaryLinks = [
  { href: '/learn', key: 'learn', ns: 'nav' },
  { href: '/build', key: 'build', ns: 'nav' },
  { href: '/partner', key: 'partner', ns: 'nav' },
  { href: '/about', key: 'about_us', ns: 'footer' },
  { href: '/contact', key: 'contact', ns: 'nav' },
] as const;

const secondaryLinks = [
  { href: '/blog', key: 'blog', ns: 'nav' },
  { href: '/glossary', key: 'glossary_link', ns: 'footer' },
  { href: '/privacy', key: 'privacy', ns: 'footer' },
  { href: '/terms', key: 'terms', ns: 'footer' },
  { href: '/cookies', key: 'cookies', ns: 'footer' },
] as const;

const social = [
  { label: 'TikTok', href: SOCIAL_LINKS.tiktok },
  { label: 'Instagram', href: SOCIAL_LINKS.instagram },
  { label: 'YouTube', href: SOCIAL_LINKS.youtube },
  { label: 'LinkedIn', href: SOCIAL_LINKS.linkedin },
] as const;

const linkClass = 'inline-flex min-h-[44px] items-center transition-colors hover:text-hv-terracotta';

/**
 * 2026 green footer (README "Footer"): © line plus Learn · Build · Partner ·
 * About us · Contact, with a quieter row for Blog · Glossary · legal and the
 * social links. Carries its own data-shell="hv" scope so it renders on the
 * sand palette under pages whose body is still the legacy look.
 */
export function MarketingFooter() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  const label = (l: { key: string; ns: 'nav' | 'footer' }) => (l.ns === 'nav' ? nav(l.key) : t(l.key));

  return (
    <footer data-shell="hv" className="border-t border-hv-sand-300">
      <HvContainer className="flex flex-col gap-5 pb-11 pt-12 md:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center font-hv-display text-[20px] font-bold tracking-[-0.02em] text-hv-green-900"
          >
            HonuVibe
          </Link>
          <nav aria-label={t('nav_title')}>
            <ul className="flex flex-wrap gap-x-5 text-[15px] font-medium text-hv-green-900">
              {primaryLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>
                    {label(l)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-hv-sand-300 pt-4 text-[14px] text-hv-ink-500">
          <nav aria-label={t('secondary_label')}>
            <ul className="flex flex-wrap gap-x-5">
              {secondaryLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>
                    {label(l)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ul aria-label={t('social_label')} className="flex flex-wrap gap-x-5">
            {social.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[14px] text-hv-ink-500">{t('copyright', { year: new Date().getFullYear() })}</p>
      </HvContainer>
    </footer>
  );
}
