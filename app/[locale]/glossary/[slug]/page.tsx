import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, FileText, Play, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { generateDefinedTermSchema } from '@/lib/json-ld';
import { sanityPublicClient } from '@/lib/sanity/client';
import { glossaryTermQuery, glossarySlugQuery } from '@/lib/sanity/queries';
import type { GlossaryTerm, GlossaryDifficulty } from '@/lib/sanity/types';
import { BlogPortableText } from '@/lib/sanity/portable-text';
import { Link } from '@/i18n/navigation';
import { MarketingShell } from '@/components/marketing/shell';
import { MarketingNav } from '@/components/marketing/nav/marketing-nav';
import { MarketingFooter } from '@/components/marketing/footer/marketing-footer';
import { MarketingNewsletter } from '@/components/marketing/newsletter/marketing-newsletter';
import { Section } from '@/components/marketing/primitives/section';
import { Container } from '@/components/marketing/primitives/container';
import { Overline } from '@/components/marketing/primitives/overline';
import { SectionHeading } from '@/components/marketing/primitives/section-heading';
import { Button } from '@/components/marketing/primitives/button';
import { DifficultyBadge } from '@/components/glossary/DifficultyBadge';
import { RelatedTerms } from '@/components/glossary/RelatedTerms';
import { GlossaryTermAnalytics } from '@/components/glossary/GlossaryTermAnalytics';

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return [];
  try {
    const slugs: { slug: string }[] = await sanityPublicClient.fetch(glossarySlugQuery);
    const locales = ['en', 'ja'];
    return locales.flatMap((locale) =>
      slugs.map(({ slug }) => ({ locale, slug }))
    );
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) return {};

  let term: GlossaryTerm | null = null;
  try {
    term = await sanityPublicClient.fetch(glossaryTermQuery, { slug });
  } catch { /* empty */ }

  if (!term) return {};

  const termName = term.abbreviation || term.term_en;
  const title = locale === 'en'
    ? `${termName} — AI Glossary | HonuVibe`
    : `${term.term_jp || termName} — AI用語辞典 | HonuVibe`;
  const description = locale === 'ja' && term.definition_short_jp
    ? term.definition_short_jp
    : term.definition_short_en;

  const localePath = locale === 'ja' ? '/ja' : '';

  return {
    title,
    description,
    alternates: {
      canonical: `${localePath}/glossary/${slug}`,
      languages: {
        en: `/glossary/${slug}`,
        ja: `/ja/glossary/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${localePath}/glossary/${slug}`,
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
      type: 'article',
    },
  };
}

const categoryLabels: Record<string, string> = {
  'core-concepts': 'Core Concepts',
  'models-architecture': 'Models & Architecture',
  'tools-platforms': 'Tools & Platforms',
  'business-strategy': 'Business & Strategy',
};

export default async function GlossaryTermPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'glossary' });

  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) notFound();

  let term: GlossaryTerm | null = null;
  try {
    term = await sanityPublicClient.fetch(glossaryTermQuery, { slug });
  } catch { /* empty */ }

  if (!term) notFound();

  const fullDef = locale === 'ja' && term.definition_full_jp?.length
    ? term.definition_full_jp
    : term.definition_full_en;
  const whyItMatters = locale === 'ja' && term.why_it_matters_jp
    ? term.why_it_matters_jp
    : term.why_it_matters_en;
  const example = locale === 'ja' && term.example_jp
    ? term.example_jp
    : term.example_en;

  const termDisplayName = term.abbreviation || term.term_en;
  const plainGlossaryTitle = t.raw('title').replace(/<\/?em>/g, '');

  const jsonLd = generateDefinedTermSchema({
    termName: termDisplayName,
    description: locale === 'ja' && term.definition_short_jp
      ? term.definition_short_jp
      : term.definition_short_en,
    slug,
    locale,
    glossaryTitle: plainGlossaryTitle,
  });

  const difficultyLabels: Record<GlossaryDifficulty, string> = {
    beginner: t('difficulty_beginner'),
    intermediate: t('difficulty_intermediate'),
    advanced: t('difficulty_advanced'),
  };

  const hasGoDeeper = term.relatedCourseSlug || term.relatedBlogSlug || term.relatedLibraryVideoSlug;

  return (
    <MarketingShell>
      <MarketingNav />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <GlossaryTermAnalytics
          slug={slug}
          category={term.category}
          difficulty={term.difficulty}
          locale={locale}
        />

        <Section variant="canvas" spacing="hero">
          <Container>
            <Link
              href="/glossary"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--m-ink-tertiary)] hover:text-[var(--m-accent-teal)] transition-colors duration-150 mb-10"
            >
              <ArrowLeft size={16} />
              {t('back_to_glossary')}
            </Link>

            <article className="mx-auto max-w-[820px]">
              <header className="mb-10">
                <h1 className="font-bold text-[var(--m-ink-primary)] text-[var(--m-text-h1)] leading-[1.1] tracking-[-0.022em]">
                  {termDisplayName}
                  {term.abbreviation && (
                    <span className="ml-3 text-[var(--m-ink-tertiary)] font-medium text-[clamp(20px,3.5vw,28px)]">
                      {term.term_en}
                    </span>
                  )}
                </h1>
                {term.term_jp && (
                  <p className="mt-3 text-[clamp(18px,2.5vw,22px)] text-[var(--m-ink-secondary)]">
                    {term.term_jp}
                    {term.reading_jp && (
                      <span className="ml-2 text-[15px] text-[var(--m-ink-tertiary)]">
                        ({term.reading_jp})
                      </span>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-5">
                  <DifficultyBadge
                    difficulty={term.difficulty}
                    label={difficultyLabels[term.difficulty]}
                  />
                  <span className="inline-flex items-center rounded-full border border-[var(--m-border-default)] bg-[var(--m-white)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--m-ink-secondary)]">
                    {categoryLabels[term.category] || term.category}
                  </span>
                </div>
              </header>

              <p className="text-[18px] text-[var(--m-ink-secondary)] leading-[1.65] mb-10">
                {locale === 'ja' && term.definition_short_jp
                  ? term.definition_short_jp
                  : term.definition_short_en}
              </p>

              {fullDef && fullDef.length > 0 && (
                <div className="mb-10 text-[var(--m-ink-secondary)]">
                  <BlogPortableText value={fullDef} />
                </div>
              )}

              {whyItMatters && (
                <div className="bg-[var(--m-accent-teal-soft)] rounded-[var(--m-radius-lg)] p-5 sm:p-6 border-l-2 border-[var(--m-accent-teal)] mb-6">
                  <Overline tone="teal" className="mb-3">{t('why_it_matters')}</Overline>
                  <p className="text-[16px] text-[var(--m-ink-primary)] leading-[1.65]">
                    {whyItMatters}
                  </p>
                </div>
              )}

              {example && (
                <div className="bg-[var(--m-accent-coral-soft)] rounded-[var(--m-radius-lg)] p-5 sm:p-6 border-l-2 border-[var(--m-accent-coral)] mb-10">
                  <Overline tone="coral" className="mb-3">{t('example')}</Overline>
                  <p className="text-[16px] text-[var(--m-ink-primary)] leading-[1.65]">
                    {example}
                  </p>
                </div>
              )}

              {term.relatedTerms && term.relatedTerms.length > 0 && (
                <div className="mb-10">
                  <Overline className="mb-4">{t('related_terms')}</Overline>
                  <RelatedTerms
                    terms={term.relatedTerms}
                    locale={locale}
                    difficultyLabels={difficultyLabels}
                    sourceTermSlug={slug}
                  />
                </div>
              )}

              {hasGoDeeper && (
                <div className="mb-10">
                  <Overline className="mb-4">{t('learn_more')}</Overline>
                  <div className="flex flex-col gap-3">
                    {term.relatedCourseSlug && (
                      <Link
                        href={`/learn/${term.relatedCourseSlug}`}
                        className="inline-flex items-center gap-3 px-4 py-3 rounded-[var(--m-radius-md)] border border-[var(--m-border-default)] bg-[var(--m-white)] hover:border-[var(--m-accent-teal)] hover:shadow-[var(--m-shadow-xs)] transition-all duration-150 group"
                      >
                        <span className="text-[var(--m-accent-teal)]"><BookOpen size={16} /></span>
                        <span className="text-[14px] font-semibold text-[var(--m-ink-primary)]">
                          {t('learn_more_course')}
                        </span>
                        <ArrowRight size={14} className="ml-auto text-[var(--m-ink-tertiary)] group-hover:text-[var(--m-accent-teal)]" />
                      </Link>
                    )}
                    {term.relatedBlogSlug && (
                      <Link
                        href={`/blog/${term.relatedBlogSlug}`}
                        className="inline-flex items-center gap-3 px-4 py-3 rounded-[var(--m-radius-md)] border border-[var(--m-border-default)] bg-[var(--m-white)] hover:border-[var(--m-accent-teal)] hover:shadow-[var(--m-shadow-xs)] transition-all duration-150 group"
                      >
                        <span className="text-[var(--m-accent-teal)]"><FileText size={16} /></span>
                        <span className="text-[14px] font-semibold text-[var(--m-ink-primary)]">
                          {t('learn_more_blog')}
                        </span>
                        <ArrowRight size={14} className="ml-auto text-[var(--m-ink-tertiary)] group-hover:text-[var(--m-accent-teal)]" />
                      </Link>
                    )}
                    {term.relatedLibraryVideoSlug && (
                      <Link
                        href={`/learn/library/${term.relatedLibraryVideoSlug}`}
                        className="inline-flex items-center gap-3 px-4 py-3 rounded-[var(--m-radius-md)] border border-[var(--m-border-default)] bg-[var(--m-white)] hover:border-[var(--m-accent-teal)] hover:shadow-[var(--m-shadow-xs)] transition-all duration-150 group"
                      >
                        <span className="text-[var(--m-accent-teal)]"><Play size={16} /></span>
                        <span className="text-[14px] font-semibold text-[var(--m-ink-primary)]">
                          {t('learn_more_video')}
                        </span>
                        <ArrowRight size={14} className="ml-auto text-[var(--m-ink-tertiary)] group-hover:text-[var(--m-accent-teal)]" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </article>
          </Container>
        </Section>

        <Section variant="sand" spacing="default">
          <Container>
            <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 text-center">
              <SectionHeading>{t('cta_heading')}</SectionHeading>
              <p className="text-[16px] leading-[1.65] text-[var(--m-ink-secondary)]">
                {t('cta_sub')}
              </p>
              <div className="mt-2">
                <Button href="/learn" variant="primary-teal" size="lg" withArrow>
                  {t('cta_button')}
                </Button>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <MarketingNewsletter />
      <MarketingFooter />
    </MarketingShell>
  );
}
