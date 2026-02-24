import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { generatePageMetadata } from '@/lib/metadata';
import { sanityPublicClient } from '@/lib/sanity/client';
import {
  newsletterIssueQuery,
  newsletterAdjacentQuery,
  newsletterSlugQuery,
} from '@/lib/sanity/queries';
import type { NewsletterIssue, NewsletterAdjacent } from '@/lib/sanity/types';
import { BlogPortableText } from '@/lib/sanity/portable-text';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Link } from '@/i18n/navigation';
import { IssueNavigation } from '@/components/newsletter/IssueNavigation';
import { IssueShareButtons } from '@/components/newsletter/IssueShareButtons';
import { NewsletterSubscribeBlock } from '@/components/newsletter/NewsletterSubscribeBlock';
import { CtaStrip } from '@/components/sections/cta-strip';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return [];
  try {
    const slugs = await sanityPublicClient.fetch(newsletterSlugQuery);
    return slugs.map((s: { slug: string }) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;

  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return generatePageMetadata({
      title: 'Newsletter',
      description: '',
      path: `/newsletter/${slug}`,
      locale,
    });
  }

  const issue: NewsletterIssue | null = await sanityPublicClient.fetch(
    newsletterIssueQuery,
    { slug },
  );
  if (!issue) return {};

  const title =
    locale === 'ja'
      ? `${issue.title_jp || issue.title_en} — ニュースレター第${issue.issueNumber}号 | HonuVibe`
      : `${issue.title_en} — Newsletter #${issue.issueNumber} | HonuVibe`;

  const description =
    locale === 'ja'
      ? issue.excerpt_jp || issue.excerpt_en
      : issue.excerpt_en;

  return generatePageMetadata({
    title,
    description,
    path: `/newsletter/${slug}`,
    locale,
    ogImage: issue.featuredImageUrl,
  });
}

export default async function NewsletterIssuePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'newsletter' });

  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    notFound();
  }

  let issue: NewsletterIssue | null = null;

  try {
    issue = await sanityPublicClient.fetch(newsletterIssueQuery, { slug });
  } catch {
    notFound();
  }

  if (!issue) notFound();

  // Fetch adjacent issues (needs issueNumber from the issue)
  let adjacent: NewsletterAdjacent = {};
  try {
    adjacent = await sanityPublicClient.fetch(newsletterAdjacentQuery, {
      issueNumber: issue.issueNumber,
    });
  } catch {
    // Adjacent navigation is optional — silent fail
  }

  const title = locale === 'ja' && issue.title_jp ? issue.title_jp : issue.title_en;
  const body =
    locale === 'ja' && issue.body_jp && issue.body_jp.length > 0
      ? issue.body_jp
      : issue.body_en;
  const excerpt = locale === 'ja' && issue.excerpt_jp ? issue.excerpt_jp : issue.excerpt_en;
  const readingTime = locale === 'ja' ? issue.readingTime_jp : issue.readingTime_en;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://honuvibe.ai';
  const issueUrl = `${baseUrl}${locale === 'ja' ? '/ja' : ''}/newsletter/${slug}`;

  const formattedDate = new Intl.DateTimeFormat(
    locale === 'ja' ? 'ja-JP' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  ).format(new Date(issue.publishedAt));

  // Resolve adjacent titles for locale
  const prevTitle = adjacent.prev
    ? (locale === 'ja' && adjacent.prev.title_jp ? adjacent.prev.title_jp : adjacent.prev.title_en)
    : undefined;
  const nextTitle = adjacent.next
    ? (locale === 'ja' && adjacent.next.title_jp ? adjacent.next.title_jp : adjacent.next.title_en)
    : undefined;

  // JSON-LD Article schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt,
    datePublished: issue.publishedAt,
    author: {
      '@type': 'Person',
      name: 'Ryan Jackson',
      url: 'https://honuvibe.ai/about',
    },
    publisher: {
      '@type': 'Organization',
      name: 'HonuVibe.AI',
      url: 'https://honuvibe.ai',
    },
    url: issueUrl,
    isPartOf: {
      '@type': 'CreativeWorkSeries',
      name: locale === 'ja' ? 'HonuVibeニュースレター' : 'The HonuVibe Newsletter',
      url: `https://honuvibe.ai${locale === 'en' ? '/newsletter' : '/ja/newsletter'}`,
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://honuvibe.ai' },
        {
          '@type': 'ListItem',
          position: 2,
          name: locale === 'ja' ? 'ニュースレター' : 'Newsletter',
          item: `https://honuvibe.ai${locale === 'en' ? '/newsletter' : '/ja/newsletter'}`,
        },
        { '@type': 'ListItem', position: 3, name: `#${issue.issueNumber}` },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        {/* Back link + Header */}
        <Section>
          <Container>
            <Link
              href="/newsletter"
              className="inline-flex items-center text-sm text-fg-tertiary hover:text-fg-secondary transition-colors duration-[var(--duration-fast)] mb-8"
            >
              {t('back_to_archive')}
            </Link>

            {/* Issue label */}
            <div className="text-accent-teal text-xs font-sans font-semibold uppercase tracking-[0.18em] mb-3">
              {t('issue_label', { number: issue.issueNumber })}
            </div>

            {/* Title */}
            <h1 className="font-serif text-h1 font-normal text-fg-primary mb-4">
              {title}
            </h1>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-sm text-fg-tertiary">
              <time dateTime={issue.publishedAt}>
                {t('published_label', { date: formattedDate })}
              </time>
              {readingTime != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{t('reading_time', { minutes: readingTime })}</span>
                </>
              )}
            </div>
          </Container>
        </Section>

        {/* Body */}
        <Section className="!pt-0">
          <Container>
            {body && body.length > 0 ? (
              <div className={`max-w-content ${locale === 'ja' ? 'leading-loose' : 'leading-relaxed'}`}>
                <BlogPortableText value={body} />
              </div>
            ) : (
              <p className="text-fg-secondary">{t('empty_state')}</p>
            )}

            {/* Beehiiv link */}
            {issue.beehiivUrl && (
              <p className="mt-8 text-sm text-fg-tertiary">
                <a
                  href={issue.beehiivUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-fg-secondary transition-colors duration-[var(--duration-fast)] underline underline-offset-2"
                >
                  {t('view_on_beehiiv')}
                </a>
              </p>
            )}

            {/* Share */}
            <div className="mt-8">
              <IssueShareButtons
                url={issueUrl}
                title={title}
                locale={locale}
                slug={slug}
              />
            </div>

            {/* Related content */}
            {issue.relatedBlogSlugs && issue.relatedBlogSlugs.length > 0 && (
              <div className="mt-10">
                <h3 className="text-sm font-semibold text-fg-primary uppercase tracking-wider mb-3">
                  {t('related_posts')}
                </h3>
                <ul className="space-y-2">
                  {issue.relatedBlogSlugs.map((blogSlug) => (
                    <li key={blogSlug}>
                      <Link
                        href={`/blog/${blogSlug}`}
                        className="text-sm text-fg-secondary hover:text-accent-teal transition-colors duration-[var(--duration-fast)]"
                      >
                        {blogSlug} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {issue.relatedCourseSlugs && issue.relatedCourseSlugs.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-fg-primary uppercase tracking-wider mb-3">
                  {t('related_courses')}
                </h3>
                <ul className="space-y-2">
                  {issue.relatedCourseSlugs.map((courseSlug) => (
                    <li key={courseSlug}>
                      <Link
                        href={`/learn/${courseSlug}`}
                        className="text-sm text-fg-secondary hover:text-accent-teal transition-colors duration-[var(--duration-fast)]"
                      >
                        {courseSlug} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prev/Next navigation */}
            <IssueNavigation
              prev={adjacent.prev ? { title: prevTitle!, slug: adjacent.prev.slug, issueNumber: adjacent.prev.issueNumber } : undefined}
              next={adjacent.next ? { title: nextTitle!, slug: adjacent.next.slug, issueNumber: adjacent.next.issueNumber } : undefined}
              prevLabel={t('prev_issue')}
              nextLabel={t('next_issue')}
            />
          </Container>
        </Section>

        {/* Subscribe */}
        <Section>
          <Container>
            <NewsletterSubscribeBlock locale={locale} sourcePage="newsletter_issue" />
          </Container>
        </Section>

        {/* CTA */}
        <CtaStrip
          heading={t('cta_heading')}
          sub={t('cta_sub')}
          ctaText={t('cta_button')}
          ctaHref="/learn"
        />
      </article>
    </>
  );
}
