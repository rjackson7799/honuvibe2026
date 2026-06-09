import type { Metadata } from 'next';
import { inter, dmSerif } from '@/app/fonts';
import { StudioNav } from '@/components/marketing/studio/studio-nav';
import { StudioFooter } from '@/components/marketing/studio/studio-footer';
import { StudioReveal } from '@/components/marketing/studio/studio-reveal';
import '@/styles/globals.css';
import '@/components/marketing/studio/studio.css';

const studioUrl = process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.honuvibe.ai';

export const metadata: Metadata = {
  metadataBase: new URL(studioUrl),
  title: {
    default: 'HonuVibe Studio — AI-native websites for small businesses',
    template: '%s — HonuVibe Studio',
  },
  description:
    'HonuVibe Studio builds AI-native websites and systems for small businesses that want to grow without growing a team. The production lab run by the people teaching AI.',
  openGraph: {
    type: 'website',
    siteName: 'HonuVibe Studio',
    url: studioUrl,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

/**
 * Studio storefront root layout (studio.honuvibe.ai), served via the
 * host-based rewrite in middleware.ts. It is an isolated root layout —
 * separate <html>/<body> from app/[locale]/ — so it fully owns its chrome
 * (StudioNav/StudioFooter) with no interaction with the main-site shell.
 * `data-shell="marketing"` activates the shared --m-* tokens; `.studio`
 * scopes the ported mockup CSS. EN-only for v1.0 (JP ships v1.1).
 */
export default function StudioRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body className="studio antialiased" data-shell="marketing">
        <StudioNav />
        <main>{children}</main>
        <StudioFooter />
        <StudioReveal />
      </body>
    </html>
  );
}
