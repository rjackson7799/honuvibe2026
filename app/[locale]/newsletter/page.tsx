import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { generatePageMetadata } from '@/lib/metadata';
import { sanityPublicClient } from '@/lib/sanity/client';
import { newsletterIndexQuery } from '@/lib/sanity/queries';
import type { NewsletterIssueSummary } from '@/lib/sanity/types';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui/section-heading';
import { NewsletterIssueCard } from '@/components/newsletter/NewsletterIssueCard';
import { NewsletterSubscribeBlock } from '@/components/newsletter/NewsletterSubscribeBlock';
import { CtaStrip } from '@/components/sections/cta-strip';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'newsletter' });
  return generatePageMetadata({
    title: t('meta_title'),
    description: t('meta_description'),
    path: '/newsletter',
    locale,
  });
}

export default async function NewsletterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'newsletter' });

  let issues: NewsletterIssueSummary[] = [];

  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    try {
      issues = await sanityPublicClient.fetch(newsletterIndexQuery);
    } catch {
      // Sanity not configured or unreachable — render with empty data
    }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('title'),
    description: t('subtitle'),
    url: `https://honuvibe.ai${locale === 'en' ? '/newsletter' : '/ja/newsletter'}`,
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
          item: `https://honuvibe.ai${locale === 'en' ? '/newsletter' : '/ja/newsletter'}`,
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
            overline={locale === 'ja' ? 'ニュースレター' : 'NEWSLETTER'}
            heading={t('title')}
            sub={t('subtitle')}
          />
        </Container>
      </Section>

      {/* Subscribe Block */}
      <Section className="!pt-0">
        <Container>
          <NewsletterSubscribeBlock locale={locale} sourcePage="newsletter_index" />
        </Container>
      </Section>

      {/* Issue List */}
      <Section className="!pt-0">
        <Container>
          {issues.length === 0 ? (
            <p className="text-center text-fg-tertiary py-12">{t('empty_state')}</p>
          ) : (
            <div>
              {issues.map((issue) => {
                const title = locale === 'ja' && issue.title_jp ? issue.title_jp : issue.title_en;
                const excerpt = locale === 'ja' && issue.excerpt_jp ? issue.excerpt_jp : issue.excerpt_en;
                const readingTime = locale === 'ja' ? issue.readingTime_jp : issue.readingTime_en;

                return (
                  <NewsletterIssueCard
                    key={issue.issueNumber}
                    title={title}
                    excerpt={excerpt}
                    slug={issue.slug}
                    issueNumber={issue.issueNumber}
                    publishedAt={issue.publishedAt}
                    readingTime={readingTime}
                    locale={locale}
                    issueLabel={t('issue_label', { number: issue.issueNumber })}
                    readIssueLabel={t('read_issue')}
                    readingTimeLabel={readingTime != null ? t('reading_time', { minutes: readingTime }) : undefined}
                  />
                );
              })}
            </div>
          )}
        </Container>
      </Section>

      {/* CTA */}
      <CtaStrip
        heading={t('cta_heading')}
        sub={t('cta_sub')}
        ctaText={t('cta_button')}
        ctaHref="/learn"
      />
    </>
  );
}
