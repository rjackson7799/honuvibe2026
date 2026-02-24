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
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { Overline } from '@/components/ui/overline';
import { Tag } from '@/components/ui/tag';
import { Link } from '@/i18n/navigation';
import { DifficultyBadge } from '@/components/glossary/DifficultyBadge';
import { RelatedTerms } from '@/components/glossary/RelatedTerms';
import { CtaStrip } from '@/components/sections/cta-strip';
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

  const jsonLd = generateDefinedTermSchema({
    termName: termDisplayName,
    description: locale === 'ja' && term.definition_short_jp
      ? term.definition_short_jp
      : term.definition_short_en,
    slug,
    locale,
    glossaryTitle: t('title'),
  });

  const difficultyLabels: Record<GlossaryDifficulty, string> = {
    beginner: t('difficulty_beginner'),
    intermediate: t('difficulty_intermediate'),
    advanced: t('difficulty_advanced'),
  };

  const hasGoDeeper = term.relatedCourseSlug || term.relatedBlogSlug || term.relatedLibraryVideoSlug;

  return (
    <>
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

      <article>
        <Section>
          <Container>
            {/* Back link */}
            <Link
              href="/glossary"
              className="inline-flex items-center gap-1.5 text-sm text-fg-tertiary hover:text-accent-teal transition-colors duration-[var(--duration-fast)] mb-8"
            >
              <ArrowLeft size={16} />
              {t('back_to_glossary')}
            </Link>

            {/* Term header */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <h1 className="font-serif text-h1 font-normal text-fg-primary">
                  {termDisplayName}
                  {term.abbreviation && (
                    <span className="ml-3 text-fg-tertiary font-sans text-h3">
                      {term.term_en}
                    </span>
                  )}
                </h1>
              </div>
              {term.term_jp && (
                <p className="mt-2 text-h3 text-fg-secondary">
                  {term.term_jp}
                  {term.reading_jp && (
                    <span className="ml-2 text-base text-fg-tertiary">
                      ({term.reading_jp})
                    </span>
                  )}
                </p>
              )}
              <div className="flex items-center gap-2 mt-4">
                <DifficultyBadge
                  difficulty={term.difficulty}
                  label={difficultyLabels[term.difficulty]}
                />
                <Tag>{categoryLabels[term.category] || term.category}</Tag>
              </div>
            </div>

            {/* Short definition */}
            <p className="text-lg text-fg-secondary leading-relaxed max-w-[880px] mb-8">
              {locale === 'ja' && term.definition_short_jp
                ? term.definition_short_jp
                : term.definition_short_en}
            </p>

            {/* Full definition (Portable Text) */}
            {fullDef && fullDef.length > 0 && (
              <div className="max-w-[880px] mb-8">
                <BlogPortableText value={fullDef} />
              </div>
            )}

            {/* Why It Matters */}
            {whyItMatters && (
              <div className="bg-bg-tertiary rounded-lg p-6 border-l-2 border-accent-teal mb-6 max-w-[880px]">
                <Overline className="mb-3">{t('why_it_matters')}</Overline>
                <p className="text-base text-fg-secondary leading-relaxed">
                  {whyItMatters}
                </p>
              </div>
            )}

            {/* Example */}
            {example && (
              <div className="bg-bg-tertiary rounded-lg p-6 border-l-2 border-accent-gold mb-8 max-w-[880px]">
                <Overline className="mb-3">{t('example')}</Overline>
                <p className="text-base text-fg-secondary leading-relaxed">
                  {example}
                </p>
              </div>
            )}

            {/* Related Terms */}
            {term.relatedTerms && term.relatedTerms.length > 0 && (
              <div className="mb-8">
                <h2 className="font-sans text-sm font-semibold text-fg-primary uppercase tracking-wider mb-4">
                  {t('related_terms')}
                </h2>
                <RelatedTerms
                  terms={term.relatedTerms}
                  locale={locale}
                  difficultyLabels={difficultyLabels}
                  sourceTermSlug={slug}
                />
              </div>
            )}

            {/* Go Deeper */}
            {hasGoDeeper && (
              <div className="mb-8">
                <h2 className="font-sans text-sm font-semibold text-fg-primary uppercase tracking-wider mb-4">
                  {t('learn_more')}
                </h2>
                <div className="flex flex-col gap-3 max-w-[880px]">
                  {term.relatedCourseSlug && (
                    <Link
                      href={`/learn/${term.relatedCourseSlug}`}
                      className="inline-flex items-center gap-3 px-4 py-3 rounded-lg border border-border-default bg-bg-secondary hover:border-border-hover hover:bg-bg-tertiary transition-all duration-[var(--duration-fast)] group"
                    >
                      <span className="text-accent-teal"><BookOpen size={16} /></span>
                      <span className="text-sm font-medium text-fg-secondary group-hover:text-fg-primary">
                        {t('learn_more_course')}
                      </span>
                      <ArrowRight size={14} className="ml-auto text-fg-tertiary group-hover:text-fg-secondary" />
                    </Link>
                  )}
                  {term.relatedBlogSlug && (
                    <Link
                      href={`/blog/${term.relatedBlogSlug}`}
                      className="inline-flex items-center gap-3 px-4 py-3 rounded-lg border border-border-default bg-bg-secondary hover:border-border-hover hover:bg-bg-tertiary transition-all duration-[var(--duration-fast)] group"
                    >
                      <span className="text-accent-teal"><FileText size={16} /></span>
                      <span className="text-sm font-medium text-fg-secondary group-hover:text-fg-primary">
                        {t('learn_more_blog')}
                      </span>
                      <ArrowRight size={14} className="ml-auto text-fg-tertiary group-hover:text-fg-secondary" />
                    </Link>
                  )}
                  {term.relatedLibraryVideoSlug && (
                    <Link
                      href={`/learn/library/${term.relatedLibraryVideoSlug}`}
                      className="inline-flex items-center gap-3 px-4 py-3 rounded-lg border border-border-default bg-bg-secondary hover:border-border-hover hover:bg-bg-tertiary transition-all duration-[var(--duration-fast)] group"
                    >
                      <span className="text-accent-teal"><Play size={16} /></span>
                      <span className="text-sm font-medium text-fg-secondary group-hover:text-fg-primary">
                        {t('learn_more_video')}
                      </span>
                      <ArrowRight size={14} className="ml-auto text-fg-tertiary group-hover:text-fg-secondary" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </Container>
        </Section>
      </article>

      <CtaStrip
        heading={t('cta_heading')}
        sub={t('cta_sub')}
        ctaText={t('cta_button')}
        ctaHref="/learn"
      />
    </>
  );
}
