import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { generatePageMetadata } from '@/lib/metadata';
import { sanityPublicClient } from '@/lib/sanity/client';
import { resourcesQuery, influencersQuery } from '@/lib/sanity/queries';
import type { Resource, Influencer } from '@/lib/sanity/types';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { ResourcesContent } from '@/components/resources/ResourcesContent';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'resources_page' });
  return generatePageMetadata({
    title: t('meta_title'),
    description: t('meta_description'),
    path: '/resources',
    locale,
  });
}

export default async function ResourcesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'resources_page' });

  let resources: Resource[] = [];
  let influencers: Influencer[] = [];

  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    try {
      [resources, influencers] = await Promise.all([
        sanityPublicClient.fetch(resourcesQuery),
        sanityPublicClient.fetch(influencersQuery),
      ]);
    } catch {
      // Sanity not configured or unreachable — render with empty data
    }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('title'),
    description: t('subtitle'),
    url: `https://honuvibe.ai${locale === 'en' ? '/resources' : '/ja/resources'}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'HonuVibe.AI',
      url: 'https://honuvibe.ai',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://honuvibe.ai' },
        {
          '@type': 'ListItem',
          position: 2,
          name: t('title'),
          item: `https://honuvibe.ai${locale === 'en' ? '/resources' : '/ja/resources'}`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Page Header */}
      <Section>
        <Container>
          <SectionHeading
            overline="RESOURCES"
            heading={t('title')}
            sub={t('subtitle')}
          />
        </Container>
      </Section>

      {/* Content */}
      <Section className="!pt-0">
        <Container size="wide">
          <ResourcesContent
            resources={resources}
            influencers={influencers}
            locale={locale}
          />
        </Container>
      </Section>
    </>
  );
}
