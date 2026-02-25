import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { dmSans, dmSerif, jetbrainsMono, notoSansJP } from '@/app/fonts';
import { Nav } from '@/components/layout/nav';
import { ConditionalFooter } from '@/components/layout/conditional-footer';
import { HonuCompanion } from '@/components/ocean/honu-companion';

import { generateOrganizationSchema, generateWebsiteSchema } from '@/lib/json-ld';
import '@/styles/globals.css';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'HonuVibe.AI — A Whole New Vibe for AI Learning',
    template: '%s | HonuVibe.AI',
  },
  description: 'Hawaii-born AI education platform. Practical courses, bilingual EN/JP community, and real-world projects for entrepreneurs and builders.',
  openGraph: {
    type: 'website',
    siteName: 'HonuVibe.AI',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const orgSchema = generateOrganizationSchema();
  const siteSchema = generateWebsiteSchema();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmSerif.variable} ${jetbrainsMono.variable}${locale === 'ja' ? ` ${notoSansJP.variable}` : ''}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Nav />
            <HonuCompanion />
            <main className="min-h-screen pt-14 md:pt-16">
              {children}
            </main>
            <ConditionalFooter />
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
