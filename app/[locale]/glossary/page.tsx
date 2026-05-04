import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata';
import { generateGlossaryCollectionSchema } from '@/lib/json-ld';
import { sanityPublicClient } from '@/lib/sanity/client';
import { glossaryIndexQuery } from '@/lib/sanity/queries';
import type { GlossaryTermSummary } from '@/lib/sanity/types';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { GlossaryIndexContent } from '@/components/glossary/GlossaryIndexContent';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'glossary' });
  return generatePageMetadata({
    title: t('meta_title'),
    description: t('meta_description'),
    path: '/glossary',
    locale,
  });
}

export default async function GlossaryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'glossary' });

  let terms: GlossaryTermSummary[] = [];
  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    try {
      terms = await sanityPublicClient.fetch(glossaryIndexQuery);
    } catch {
      // Sanity not configured or unreachable — render with empty data
    }
  }

  const plainTitle = t.raw('title').replace(/<\/?em>/g, '');
  const jsonLd = generateGlossaryCollectionSchema({
    title: plainTitle,
    description: t('subtitle'),
    locale,
  });

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <GlossaryIndexContent terms={terms} />
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
