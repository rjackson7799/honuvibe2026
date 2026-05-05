import React from 'react';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { BadgePill } from '@/components/ui/badge-pill';
import { Container } from '@/components/marketing/primitives/container';
import { Section } from '@/components/marketing/primitives/section';

type CourseDetailHeroProps = {
  title: string;
  jpTitle?: string | null;
  description?: string | null;
  level?: string | null;
  levelLabel?: string | null;
  formatLabel?: string | null;
  languageLabel?: string | null;
  heroImageUrl?: string | null;
  thumbnailUrl?: string | null;
  tags?: string[] | null;
  locale: string;
  breadcrumbLabel: string;
  slug: string;
  statsParts?: string[];
  /** Optional partner badge rendered above the course title */
  partnerBadge?: React.ReactNode;
};

const thumbGradients = [
  'linear-gradient(135deg, #ddeedd 0%, #c8dcc8 100%)',
  'linear-gradient(135deg, #dde8e8 0%, #c4d4d4 100%)',
  'linear-gradient(135deg, #e8dde4 0%, #d4c4cc 100%)',
  'linear-gradient(135deg, #ede8dc 0%, #d8cdb8 100%)',
  'linear-gradient(135deg, #dde0ee 0%, #c4c8d8 100%)',
  'linear-gradient(135deg, #e0ede0 0%, #c8d8c8 100%)',
  'linear-gradient(135deg, #f0e0d4 0%, #ddc8b4 100%)',
  'linear-gradient(135deg, #d8e4ee 0%, #c0ccdc 100%)',
];

function gradientFor(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return thumbGradients[Math.abs(hash) % thumbGradients.length];
}

const levelVariant: Record<string, 'teal' | 'coral' | 'purple'> = {
  beginner: 'teal',
  intermediate: 'coral',
  advanced: 'purple',
};

export function CourseDetailHero({
  title,
  jpTitle,
  description,
  level,
  levelLabel,
  formatLabel,
  languageLabel,
  heroImageUrl,
  thumbnailUrl,
  tags,
  locale,
  breadcrumbLabel,
  slug,
  statsParts,
  partnerBadge,
}: CourseDetailHeroProps) {
  const imageUrl = heroImageUrl || thumbnailUrl;
  const learnHref = locale === 'ja' ? '/ja/learn' : '/learn';
  const gradient = gradientFor(slug);

  return (
    <Section variant="canvas" spacing="hero">
      <Container>
        <a
          href={learnHref}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--m-ink-tertiary)] hover:text-[var(--m-accent-teal)] transition-colors duration-150 mb-10"
          aria-label="Breadcrumb"
        >
          <ArrowLeft size={16} />
          {breadcrumbLabel}
        </a>

        <div className="grid gap-10 md:gap-14 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:items-center">
          {/* Left column: title, badges, description */}
          <div className="min-w-0">
            {(levelLabel || formatLabel || languageLabel) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {levelLabel && (
                  <BadgePill
                    variant={(level && levelVariant[level]) || 'teal'}
                    size="sm"
                  >
                    {levelLabel}
                  </BadgePill>
                )}
                {formatLabel && (
                  <BadgePill variant="navy" size="sm">
                    {formatLabel}
                  </BadgePill>
                )}
                {languageLabel && (
                  <BadgePill variant="gray" size="sm">
                    {languageLabel}
                  </BadgePill>
                )}
              </div>
            )}

            {partnerBadge && (
              <div className="mb-2">{partnerBadge}</div>
            )}

            <h1
              className="font-serif font-normal text-[var(--m-ink-primary)] leading-[1.05] tracking-[-0.018em]"
              style={{ fontSize: 'clamp(32px, 5.2vw, 64px)' }}
            >
              {title}
            </h1>

            {locale === 'en' && jpTitle && (
              <p className="mt-3 text-[clamp(18px,2.2vw,22px)] text-[var(--m-ink-secondary)] font-jp">
                {jpTitle}
              </p>
            )}

            {description && (
              <p className="mt-5 text-[17px] leading-[1.65] text-[var(--m-ink-secondary)] max-w-[560px]">
                {description}
              </p>
            )}

            {statsParts && statsParts.length > 0 && (
              <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.09em] text-[var(--m-ink-tertiary)]">
                {statsParts.join(' · ')}
              </p>
            )}

            {tags && tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <BadgePill key={tag} variant="gray" size="xs">
                    {tag}
                  </BadgePill>
                ))}
              </div>
            )}
          </div>

          {/* Right column: illustration card */}
          <div className="relative hidden md:block">
            <div
              className="relative aspect-[4/3] w-full rounded-[var(--m-radius-xl)] overflow-hidden border border-[var(--m-border-default)] shadow-[var(--m-shadow-md)]"
              style={{ background: gradient }}
            >
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 440px"
                />
              )}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
