import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata';
import { generateGlossaryCollectionSchema } from '@/lib/json-ld';
import { sanityPublicClient } from '@/lib/sanity/client';
import { glossaryIndexQuery } from '@/lib/sanity/queries';
import type { GlossaryTermSummary, GlossaryCategory, GlossaryDifficulty } from '@/lib/sanity/types';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui/section-heading';
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

  const jsonLd = generateGlossaryCollectionSchema({
    title: t('title'),
    description: t('subtitle'),
    locale,
  });

  const categoryOptions: { value: 'all' | GlossaryCategory; label: string }[] = [
    { value: 'all', label: t('filter_all') },
    { value: 'core-concepts', label: t('filter_core') },
    { value: 'models-architecture', label: t('filter_models') },
    { value: 'tools-platforms', label: t('filter_tools') },
    { value: 'business-strategy', label: t('filter_business') },
  ];

  const difficultyLabels: Record<GlossaryDifficulty, string> = {
    beginner: t('difficulty_beginner'),
    intermediate: t('difficulty_intermediate'),
    advanced: t('difficulty_advanced'),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Section>
        <Container>
          <SectionHeading
            overline={t('overline')}
            heading={t('title')}
            sub={t('subtitle')}
          />
        </Container>
      </Section>

      <Section className="!pt-0">
        <Container size="wide">
          <GlossaryIndexContent
            terms={terms}
            locale={locale}
            categoryOptions={categoryOptions}
            difficultyLabels={difficultyLabels}
            uiStrings={{
              searchPlaceholder: t('search_placeholder'),
              emptyState: t('empty_state'),
              termCount: t('term_count', { count: terms.length }),
            }}
            ctaProps={{
              heading: t('cta_heading'),
              sub: t('cta_sub'),
              ctaText: t('cta_button'),
              ctaHref: '/learn',
            }}
          />
        </Container>
      </Section>
    </>
  );
}
