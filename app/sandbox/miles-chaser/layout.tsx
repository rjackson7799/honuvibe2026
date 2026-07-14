import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { inter } from '@/app/fonts';
import { DemoChrome } from '@/components/sandbox/demo-chrome';
import { MilesChaserShell } from '@/components/sandbox/miles-chaser/shell';
import '@/styles/globals.css';
import '@/components/sandbox/miles-chaser/miles-chaser.css';

const STATE_NOTE = 'Your changes live in this browser tab and reset when you close it.';

export const metadata: Metadata = {
  title: 'MilesChaser — HonuVibe Sandbox',
  description:
    'Interactive demo of MilesChaser, a travel-rewards dashboard. 100% simulated data.',
  robots: { index: false, follow: true },
};

/**
 * Standalone root layout (precedent: app/studio-site/). Separate <html> from
 * app/[locale]/ — landing→demo is a full document load, so this layout must
 * carry its own analytics (Plausible pageview IS the launch event) and fonts.
 * The demo scope class lives on <body> so any future portals inherit it.
 * Plausible has no SRI hash deliberately — mirrors app/[locale]/layout.tsx
 * (Plausible rotates script contents; a hash would silently kill tracking).
 */
export default function MilesChaserLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className="demo-miles-chaser antialiased">
        <DemoChrome demoName="MilesChaser" stateNote={STATE_NOTE} />
        <MilesChaserShell>{children}</MilesChaserShell>
        <Analytics />
      </body>
    </html>
  );
}
