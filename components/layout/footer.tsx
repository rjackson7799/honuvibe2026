import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Container } from './container';

export function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');

  const linkClass = "text-[13px] text-fg-secondary hover:text-accent-teal transition-colors duration-200";

  return (
    <footer className="border-t border-border-secondary py-8 md:py-10">
      <Container size="wide">
        {/* Main footer row: brand left, link groups right */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="text-base font-semibold text-fg-primary tracking-tight">
              HonuVibe<span className="text-accent-teal">.AI</span>
            </span>
            <p className="text-[13px] text-fg-tertiary">{t('tagline')}</p>
          </div>

          {/* Link groups — 3 columns side by side */}
          <div className="grid grid-cols-3 gap-x-10 lg:gap-x-14">
            {/* Navigate */}
            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs font-semibold text-fg-primary uppercase tracking-wider mb-1">{t('nav_title')}</h4>
              <Link href="/honuhub" className={linkClass}>{nav('honuhub')}</Link>
              <Link href="/exploration" className={linkClass}>{nav('exploration')}</Link>
              <Link href="/learn" className={linkClass}>{nav('learn')}</Link>
              <Link href="/blog" className={linkClass}>{nav('blog')}</Link>
              <Link href="/community" className={linkClass}>{nav('community')}</Link>
            </div>

            {/* Resources */}
            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs font-semibold text-fg-primary uppercase tracking-wider mb-1">{t('resources_title')}</h4>
              <Link href="/resources" className={linkClass}>{nav('resources')}</Link>
              <Link href="/about" className={linkClass}>{nav('about')}</Link>
              <Link href="/contact" className={linkClass}>{nav('contact')}</Link>
            </div>

            {/* Legal */}
            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs font-semibold text-fg-primary uppercase tracking-wider mb-1">{t('legal_title')}</h4>
              <Link href="/privacy" className={linkClass}>{t('privacy')}</Link>
              <Link href="/terms" className={linkClass}>{t('terms')}</Link>
              <Link href="/cookies" className={linkClass}>{t('cookies')}</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-4 border-t border-border-secondary flex items-center justify-between">
          <p className="text-xs text-fg-tertiary">&copy; {new Date().getFullYear()} HonuVibe.AI. All rights reserved.</p>
          <p className="text-xs text-fg-tertiary italic">Made in Hawaii with Aloha</p>
        </div>
      </Container>
    </footer>
  );
}
