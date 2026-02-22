import { DM_Sans, DM_Serif_Display, JetBrains_Mono, Noto_Sans_JP } from 'next/font/google';

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
