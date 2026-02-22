import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Container } from './container';

export function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');

  return (
    <footer className="border-t border-border-secondary py-12 md:py-16">
      <Container>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <span className="text-lg font-semibold text-fg-primary tracking-tight">
              HonuVibe<span className="text-accent-teal">.AI</span>
            </span>
            <p className="text-sm text-fg-tertiary max-w-[280px]">{t('tagline')}</p>
          </div>

          {/* Navigate */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-fg-primary">{t('nav_title')}</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/honuhub" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">{nav('honuhub')}</Link>
              <Link href="/exploration" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">{nav('exploration')}</Link>
              <Link href="/learn" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">{nav('learn')}</Link>
              <Link href="/blog" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">{nav('blog')}</Link>
              <Link href="/community" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">{nav('community')}</Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-fg-primary">{t('resources_title')}</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/about" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">{nav('about')}</Link>
              <Link href="/apply" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">{nav('apply')}</Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-fg-primary">{t('legal_title')}</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/privacy" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">{t('privacy')}</Link>
              <Link href="/terms" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">{t('terms')}</Link>
              <Link href="/cookies" className="text-sm text-fg-secondary hover:text-fg-primary transition-colors">{t('cookies')}</Link>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border-secondary flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-fg-tertiary">&copy; {new Date().getFullYear()} HonuVibe.AI. All rights reserved.</p>
          <p className="text-xs text-fg-tertiary italic">Made in Hawaii with Aloha</p>
        </div>
      </Container>
    </footer>
  );
}
