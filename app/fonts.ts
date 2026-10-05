import {
  DM_Sans,
  DM_Serif_Display,
  Fraunces,
  Inter,
  JetBrains_Mono,
  Noto_Sans_JP,
  Public_Sans,
  Space_Grotesk,
} from 'next/font/google';

export const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const dmSerif = DM_Serif_Display({
  subsets: ['latin', 'latin-ext'],
  weight: ['400'],
  variable: '--font-dm-serif',
  display: 'swap',
});

// Serif display for the Studio discovery tool (app.honuvibe.ai/discover),
// matching the Calm Batch design reference.
export const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

// 2026 green marketing design system (docs/design_2026_green/README.md).
// Both are variable fonts, so one file per style covers every weight the
// design uses (Space Grotesk 500/600/700, Public Sans 400/500/600 + 400 italic).
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
  variable: '--font-public-sans',
  display: 'swap',
});
