import type { Metadata } from 'next';
import Link from 'next/link';
import { inter, fraunces } from '@/app/fonts';
import '@/styles/globals.css';
import '@/components/discover/discover.css';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.honuvibe.ai';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Build something with HonuVibe Studio',
    template: '%s — HonuVibe Studio',
  },
  description:
    'Tell us about your project and get a clear plan with a tier recommendation — free, no signup. Built in Hawaii.',
  // Discovery funnel — not a public marketing page; keep it out of search.
  robots: { index: false, follow: false },
};

/**
 * Build It AI discovery root layout (app.honuvibe.ai), served via the
 * host-based rewrite in middleware.ts. Isolated root layout — its own
 * <html>/<body>, separate from app/[locale]/ and app/studio-site/ — so it
 * fully owns its chrome. `data-shell="marketing"` activates the shared --m-*
 * tokens; `.discover` scopes the ported Calm Batch CSS. EN-only this phase.
 */
export default function DiscoverRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="discover antialiased" data-shell="marketing">
        <header className="dsc-head">
          <Link href="/discover" className="dsc-logo">
            HonuVibe<span>.AI</span>
            <small>Studio</small>
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
