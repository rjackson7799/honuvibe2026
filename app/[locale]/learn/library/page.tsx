import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getLibraryVideosWithUserState } from '@/lib/library/queries';
import { resolveVideoCardProps } from '@/lib/library/types';
import { generateLibraryCollectionSchema } from '@/lib/json-ld';
import { CtaStrip } from '@/components/sections/cta-strip';
import { LibraryHero } from '@/components/sections/learn/library-hero';
import { LibraryContent } from '@/components/library/LibraryContent';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'library' });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
    alternates: {
      canonical: locale === 'en' ? '/learn/library' : '/ja/learn/library',
      languages: { en: '/learn/library', ja: '/ja/learn/library' },
    },
    openGraph: {
      title: t('meta_title'),
      description: t('meta_description'),
      url: locale === 'en' ? '/learn/library' : '/ja/learn/library',
      locale: locale === 'en' ? 'en_US' : 'ja_JP',
      type: 'website',
    },
  };
}

export default async function LibraryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'library' });

  // Check auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch videos with optional user state
  const videos = await getLibraryVideosWithUserState(user?.id);
  const isAuthenticated = !!user;

  // Resolve to locale-aware card props
  const videoCards = videos.map((v) =>
    resolveVideoCardProps(v, locale, isAuthenticated),
  );

  // JSON-LD
  const jsonLd = generateLibraryCollectionSchema({
    title: t('title'),
    description: t('subtitle'),
    locale,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LibraryHero />

      <Section>
        <Container size="wide">
          <LibraryContent videos={videoCards} locale={locale} />
        </Container>
      </Section>

      <CtaStrip
        heading={t('cta_heading')}
        sub={t('cta_sub')}
        ctaText={t('cta_button')}
        ctaHref={`/${locale === 'ja' ? 'ja/' : ''}learn`}
      />
    </>
  );
}
