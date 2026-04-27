import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Marketing footer — applies the new design treatment (navy dark band,
 * 5-col layout, social icons) to the *current* link inventory used by
 * components/layout/footer.tsx. No new footer-only pages are introduced;
 * only the visual style changes (per project directive).
 */
export function MarketingFooter() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');

  const linkClass =
    'block text-[14px] text-white/65 transition-colors hover:text-white';
  const colTitleClass =
    'mb-4 text-[11.5px] font-bold uppercase tracking-[0.08em] text-white/40';

  const social: Array<{ label: string; href: string }> = [
    { label: 'TikTok', href: '#' },
    { label: 'IG', href: '#' },
    { label: 'YT', href: '#' },
    { label: 'LINE', href: '#' },
  ];

  return (
    <footer className="bg-[var(--m-ink-primary)] px-5 pb-10 pt-16 text-white md:px-8 md:pb-10 md:pt-[72px]">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-12 md:grid-cols-2 md:gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] lg:gap-12 mb-14">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center">
              <span className="text-[18px] font-bold">
                HonuVibe<span className="text-[var(--m-accent-teal)]">.AI</span>
              </span>
            </div>
            <p className="mb-6 max-w-[220px] text-[14px] leading-[1.6] text-white/55">
              {t('tagline')}
            </p>
            <div className="flex gap-3">
              {social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.08] text-[11px] font-bold text-white/60 transition-colors hover:bg-white/[0.12] hover:text-white"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Navigate */}
          <div>
            <p className={colTitleClass}>{t('nav_title')}</p>
            <div className="flex flex-col gap-2.5">
              <Link href="/learn" className={linkClass}>{nav('learn')}</Link>
              <Link href="/explore" className={linkClass}>{nav('exploration')}</Link>
              <Link href="/partnerships" className={linkClass}>{nav('partnerships')}</Link>
              <Link href="/about" className={linkClass}>{nav('about')}</Link>
              <Link href="/contact" className={linkClass}>{nav('contact')}</Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <p className={colTitleClass}>{t('resources_title')}</p>
            <div className="flex flex-col gap-2.5">
              <Link href="/learn/library" className={linkClass}>{nav('library')}</Link>
              <Link href="/glossary" className={linkClass}>{t('glossary_link')}</Link>
              <Link href="/#newsletter" className={linkClass}>{t('newsletter_link')}</Link>
              <Link href="/blog" className={linkClass}>{nav('blog')}</Link>
            </div>
          </div>

          {/* Partners */}
          <div>
            <p className={colTitleClass}>{t('partners_title')}</p>
            <div className="flex flex-col gap-2.5">
              <Link href="/partners/vertice-society" locale="ja" className={linkClass}>
                Vertice Society
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <p className={colTitleClass}>{t('legal_title')}</p>
            <div className="flex flex-col gap-2.5">
              <Link href="/privacy" className={linkClass}>{t('privacy')}</Link>
              <Link href="/terms" className={linkClass}>{t('terms')}</Link>
              <Link href="/cookies" className={linkClass}>{t('cookies')}</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-3 border-t border-white/[0.08] pt-7 md:flex-row md:items-center">
          <p className="text-[13px] text-white/40">
            &copy; {new Date().getFullYear()} HonuVibe.AI &middot; All rights reserved
          </p>
          <p className="text-[13px] italic text-white/40">
            Made in Hawaii with Aloha
          </p>
        </div>
      </div>
    </footer>
  );
}
