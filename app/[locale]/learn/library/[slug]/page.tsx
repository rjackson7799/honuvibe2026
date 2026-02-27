import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLibraryVideoBySlug, getRelatedVideos } from '@/lib/library/queries';
import { resolveVideoCardProps } from '@/lib/library/types';
import { generateLibraryVideoSchema } from '@/lib/json-ld';
import { resolveThumbnail } from '@/lib/library/youtube';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { Tag } from '@/components/ui/tag';
import { CtaStrip } from '@/components/sections/cta-strip';
import { LibraryPlayer } from '@/components/library/LibraryPlayer';
import { AccessGate } from '@/components/library/AccessGate';
import { FavoriteButton } from '@/components/library/FavoriteButton';
import { RelatedVideos } from '@/components/library/RelatedVideos';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const video = await getLibraryVideoBySlug(slug);

  if (!video) return { title: 'Video Not Found' };

  const title = locale === 'ja' && video.title_jp ? video.title_jp : video.title_en;
  const description = locale === 'ja' && video.description_jp ? video.description_jp : video.description_en;

  return {
    title: `${title} — AI Tutorial | HonuVibe`,
    description: description ?? '',
    alternates: {
      canonical: locale === 'en' ? `/learn/library/${slug}` : `/ja/learn/library/${slug}`,
      languages: {
        en: `/learn/library/${slug}`,
        ja: `/ja/learn/library/${slug}`,
      },
    },
    openGraph: {
      title: `${title} — AI Tutorial | HonuVibe`,
      description: description ?? '',
      url: locale === 'en' ? `/learn/library/${slug}` : `/ja/learn/library/${slug}`,
      locale: locale === 'en' ? 'en_US' : 'ja_JP',
      type: 'video.other',
      images: video.thumbnail_url ? [{ url: video.thumbnail_url }] : undefined,
    },
  };
}

export default async function LibraryVideoPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const video = await getLibraryVideoBySlug(slug);
  if (!video) notFound();

  const t = await getTranslations({ locale, namespace: 'library' });

  // Check auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Fetch user's favorite/progress for this video
  let isFavorited = false;
  if (user) {
    const { data: fav } = await supabase
      .from('user_library_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('video_id', video.id)
      .maybeSingle();
    isFavorited = !!fav;
  }

  // Fetch related videos
  const related = await getRelatedVideos(video.category, video.id, 3);
  const relatedCards = related.map((v) =>
    resolveVideoCardProps(
      { ...v, isFavorited: false, isViewed: false, progressPercent: 0 },
      locale,
      isAuthenticated,
    ),
  );

  // Resolve thumbnail (YouTube auto-thumbnail if local placeholder missing)
  const resolvedThumbnail = resolveThumbnail(video.thumbnail_url, video.video_url);

  // Resolve bilingual content
  const title = locale === 'ja' && video.title_jp ? video.title_jp : video.title_en;
  const description = locale === 'ja' && video.description_jp ? video.description_jp : (video.description_en ?? '');
  const minutes = Math.ceil(video.duration_seconds / 60);
  const prefix = locale === 'ja' ? '/ja' : '';

  // Access check
  const canWatch = video.access_tier === 'open' || isAuthenticated;

  // JSON-LD
  const jsonLd = generateLibraryVideoSchema({
    title,
    description,
    thumbnailUrl: video.thumbnail_url,
    durationSeconds: video.duration_seconds,
    publishedAt: video.published_at,
    videoUrl: video.video_url,
    slug: video.slug,
    locale,
  });

  const categoryLabels: Record<string, string> = {
    'ai-basics': t('filter_ai_basics'),
    'coding-tools': t('filter_coding_tools'),
    'business-automation': t('filter_business_automation'),
    'image-video': t('filter_image_video'),
    productivity: t('filter_productivity'),
    'getting-started': t('filter_getting_started'),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Section>
        <Container>
          {/* Back link */}
          <Link
            href={`${prefix}/learn/library`}
            className="inline-flex items-center gap-1.5 text-sm text-fg-secondary hover:text-accent-teal transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            {t('back_to_library')}
          </Link>

          {/* Video player or access gate */}
          {canWatch ? (
            <LibraryPlayer
              videoUrl={video.video_url}
              videoId={video.id}
              title={title}
              thumbnailUrl={resolvedThumbnail}
              durationSeconds={video.duration_seconds}
              isAuthenticated={isAuthenticated}
              locale={locale}
            />
          ) : (
            <AccessGate
              thumbnailUrl={resolvedThumbnail}
              videoSlug={video.slug}
              locale={locale}
              translations={{
                heading: t('auth_gate_heading'),
                sub: t('auth_gate_sub'),
                button: t('auth_gate_button'),
                login: t('auth_gate_login'),
              }}
            />
          )}

          {/* Video metadata */}
          <div className="mt-6">
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-serif text-h2 text-fg-primary">{title}</h1>
              {isAuthenticated && (
                <FavoriteButton
                  videoId={video.id}
                  isFavorited={isFavorited}
                  locale={locale}
                  ariaLabelAdd={t('favorite')}
                  ariaLabelRemove={t('favorited')}
                />
              )}
            </div>

            {/* Metadata badges */}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <Tag>{t('duration_label', { minutes })}</Tag>
              <Tag>{categoryLabels[video.category] || video.category}</Tag>
              <Tag>{video.difficulty}</Tag>
              {video.access_tier === 'open' && (
                <Tag color="var(--accent-teal)">{t('open_badge')}</Tag>
              )}
            </div>

            {/* Description */}
            {description && (
              <p className="text-base text-fg-secondary mt-4 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </Container>
      </Section>

      {/* Related course link */}
      {video.related_course_id && (
        <Section>
          <Container>
            <h2 className="font-serif text-xl text-fg-primary mb-2">{t('related_course')}</h2>
            <Link
              href={`${prefix}/learn`}
              className="text-accent-teal hover:underline text-sm"
            >
              {t('cta_button')} →
            </Link>
          </Container>
        </Section>
      )}

      {/* Related videos */}
      {relatedCards.length > 0 && (
        <Section>
          <Container size="wide">
            <RelatedVideos videos={relatedCards} heading={t('related_videos')} />
          </Container>
        </Section>
      )}

      {/* CTA */}
      <CtaStrip
        heading={t('cta_heading')}
        sub={t('cta_sub')}
        ctaText={t('cta_button')}
        ctaHref={`/${locale === 'ja' ? 'ja/' : ''}learn`}
      />
    </>
  );
}
