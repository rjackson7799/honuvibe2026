import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/layout/container';

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
    <div className="relative overflow-hidden bg-[#1A2B33] text-white">
      {/* Background image — heavily darkened for legibility */}
      {imageUrl && (
        <>
          <div className="absolute inset-0 z-0">
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover opacity-40"
              priority
              sizes="100vw"
            />
          </div>
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#1A2B33] via-[#1A2B33]/85 to-[#1A2B33]/40" />
        </>
      )}

      {/* Decorative circles per mock */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 w-[420px] h-[420px] rounded-full"
        style={{ background: 'rgba(15,169,160,0.07)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-32 w-[300px] h-[300px] rounded-full"
        style={{ background: 'rgba(232,118,90,0.06)' }}
      />

      <Container className="relative z-10 max-w-[1100px]">
        <div className="py-14 md:py-20 max-w-2xl">
          {/* Breadcrumb */}
          <nav
            className="mb-5 text-sm text-white/55 inline-flex items-center gap-1.5"
            aria-label="Breadcrumb"
          >
            <ArrowLeft size={14} />
            <a
              href={learnHref}
              className="hover:text-white transition-colors duration-[var(--duration-fast)]"
            >
              {breadcrumbLabel}
            </a>
          </nav>

          {/* Badges row (overline parts) */}
          {overlineParts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {overlineParts.map((part, i) => {
                const styles =
                  i === 0
                    ? 'bg-[rgba(15,169,160,0.18)] text-[#7fd8d2]'
                    : i === overlineParts.length - 1
                      ? 'bg-[rgba(232,118,90,0.18)] text-[#f0a08c]'
                      : 'bg-white/10 text-white/85 border border-white/15';
                return (
                  <span
                    key={part + i}
                    className={`text-[10.5px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-full ${styles}`}
                  >
                    {part}
                  </span>
                );
              })}
            </div>
          )}

          {/* Title */}
          <h1 className="text-[clamp(26px,4vw,40px)] font-bold tracking-[-0.025em] leading-[1.15] text-white">
            {title}
          </h1>

          {/* JP subtitle */}
          {locale === 'en' && jpTitle && (
            <p className="mt-2 text-lg text-white/55 font-jp">{jpTitle}</p>
          )}

          {/* Description */}
          {description && (
            <p className="mt-4 text-[15.5px] leading-[1.7] text-white/80 max-w-xl">
              {description}
            </p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11.5px] font-medium px-2.5 py-0.5 rounded-md bg-white/8 text-white/70 border border-white/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
