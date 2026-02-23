import Image from 'next/image';
import { Overline } from '@/components/ui/overline';
import { Container } from '@/components/layout/container';
import { Tag } from '@/components/ui/tag';

type CourseDetailHeroProps = {
  title: string;
  jpTitle?: string | null;
  description?: string | null;
  overlineParts: string[];
  heroImageUrl?: string | null;
  thumbnailUrl?: string | null;
  tags?: string[] | null;
  locale: string;
  breadcrumbLabel: string;
};

export function CourseDetailHero({
  title,
  jpTitle,
  description,
  overlineParts,
  heroImageUrl,
  thumbnailUrl,
  tags,
  locale,
  breadcrumbLabel,
}: CourseDetailHeroProps) {
  const imageUrl = heroImageUrl || thumbnailUrl;
  const learnHref = locale === 'ja' ? '/ja/learn' : '/learn';

  return (
    <div className="relative overflow-hidden">
      {/* Background image layer */}
      {imageUrl ? (
        <>
          <div className="absolute inset-0 z-0">
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          </div>
          {/* Gradient overlays for text readability */}
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[var(--bg-primary)]/95 via-[var(--bg-primary)]/80 to-[var(--bg-primary)]/60" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]/40" />
        </>
      ) : (
        /* Glow orbs fallback when no image */
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            className="glow-orb"
            style={{
              width: '400px',
              height: '400px',
              top: '-10%',
              right: '-5%',
              background: 'var(--glow-teal)',
              opacity: 0.15,
            }}
          />
          <div
            className="glow-orb"
            style={{
              width: '300px',
              height: '300px',
              bottom: '5%',
              left: '-5%',
              background: 'var(--glow-gold)',
              opacity: 0.1,
              animationDelay: '-4s',
            }}
          />
        </div>
      )}

      <Container className="relative z-10 max-w-[1100px]">
        <div className="py-16 md:py-24 max-w-2xl">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm text-fg-tertiary" aria-label="Breadcrumb">
            <a
              href={learnHref}
              className="hover:text-accent-teal transition-colors duration-[var(--duration-fast)]"
            >
              {breadcrumbLabel}
            </a>
            <span className="mx-2">/</span>
            <span className="text-fg-secondary">{title}</span>
          </nav>

          {/* Overline */}
          <Overline>{overlineParts.join(' · ')}</Overline>

          {/* Title */}
          <h1 className="mt-3 text-3xl md:text-4xl lg:text-[var(--text-h1)] font-serif text-fg-primary leading-tight">
            {title}
          </h1>

          {/* JP subtitle */}
          {locale === 'en' && jpTitle && (
            <p className="mt-2 text-lg text-fg-tertiary font-jp">
              {jpTitle}
            </p>
          )}

          {/* Description */}
          {description && (
            <p className="mt-4 text-fg-secondary leading-relaxed">
              {description}
            </p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
