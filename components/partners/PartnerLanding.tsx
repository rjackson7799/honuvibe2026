'use client';

import Image from 'next/image';
import { useEffect, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Overline } from '@/components/ui/overline';
import { Container } from '@/components/layout/container';
import { trackEvent } from '@/lib/analytics';

export interface PartnerLandingData {
  slug: string;
  name_en: string;
  name_jp: string | null;
  tagline_en: string | null;
  tagline_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export interface PartnerCourseCard {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  description_en: string | null;
  description_jp: string | null;
  thumbnail_url: string | null;
  level: string | null;
  language: 'en' | 'ja' | 'both' | null;
  total_weeks: number | null;
}

interface Props {
  partner: PartnerLandingData;
  courses: PartnerCourseCard[];
  locale: string;
  copy: {
    featured_courses_heading: string;
    cta_browse_courses: string;
    cta_view_course: string;
    powered_by: string;
    no_courses_yet: string;
  };
}

function setPartnerCookie(slug: string) {
  const thirtyDays = 60 * 60 * 24 * 30;
  document.cookie = `hv_partner=${encodeURIComponent(slug)}; Max-Age=${thirtyDays}; Path=/; SameSite=Lax`;
}

export function PartnerLanding({ partner, courses, locale, copy }: Props) {
  useEffect(() => {
    setPartnerCookie(partner.slug);
    trackEvent('partner_landing_view', { partner: partner.slug, locale });
  }, [partner.slug, locale]);

  const name = locale === 'ja' && partner.name_jp ? partner.name_jp : partner.name_en;
  const tagline = locale === 'ja' && partner.tagline_jp ? partner.tagline_jp : partner.tagline_en;
  const description =
    locale === 'ja' && partner.description_jp ? partner.description_jp : partner.description_en;

  const brandStyle: CSSProperties = {};
  if (partner.primary_color) {
    (brandStyle as Record<string, string>)['--accent-teal'] = partner.primary_color;
    (brandStyle as Record<string, string>)['--accent-teal-hover'] = partner.primary_color;
  }
  if (partner.secondary_color) {
    (brandStyle as Record<string, string>)['--accent-gold'] = partner.secondary_color;
  }

  return (
    <div style={brandStyle} className="min-h-screen bg-bg-primary">
      <section className="relative overflow-hidden border-b border-border-default">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, var(--accent-teal) 0%, transparent 40%), radial-gradient(circle at 80% 60%, var(--accent-gold) 0%, transparent 40%)',
          }}
          aria-hidden
        />
        <Container size="wide" className="relative py-20 md:py-28">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            {partner.logo_url ? (
              <Image
                src={partner.logo_url}
                alt={`${name} logo`}
                width={120}
                height={120}
                className="mb-8 h-20 w-auto object-contain"
                priority
              />
            ) : (
              <div className="mb-8 h-20 w-20 rounded-lg bg-accent-teal/10 flex items-center justify-center">
                <span className="text-3xl font-serif text-accent-teal">
                  {name.charAt(0)}
                </span>
              </div>
            )}

            <Overline>{copy.powered_by}</Overline>

            <h1 className="mt-4 font-serif text-display leading-[1.05] tracking-tight text-fg-primary">
              {name}
            </h1>

            {tagline && (
              <p className="mt-4 text-lg md:text-xl text-fg-secondary tracking-[0.02em]">
                {tagline}
              </p>
            )}

            {description && (
              <p className="mt-6 max-w-2xl text-base md:text-lg text-fg-secondary leading-relaxed">
                {description}
              </p>
            )}

            <div className="mt-10">
              <Button variant="gradient" size="lg" href="#courses">
                {copy.cta_browse_courses}
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section id="courses" className="py-section-mobile md:py-section">
        <Container size="wide">
          <h2 className="font-serif text-h2 text-fg-primary text-center mb-12">
            {copy.featured_courses_heading}
          </h2>

          {courses.length === 0 ? (
            <p className="text-center text-fg-secondary">{copy.no_courses_yet}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {courses.map((course) => (
                <PartnerCourseCardView
                  key={course.id}
                  course={course}
                  locale={locale}
                  ctaLabel={copy.cta_view_course}
                  partnerSlug={partner.slug}
                />
              ))}
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}

function PartnerCourseCardView({
  course,
  locale,
  ctaLabel,
  partnerSlug,
}: {
  course: PartnerCourseCard;
  locale: string;
  ctaLabel: string;
  partnerSlug: string;
}) {
  const title = locale === 'ja' && course.title_jp ? course.title_jp : course.title_en;
  const description =
    locale === 'ja' && course.description_jp ? course.description_jp : course.description_en;

  const overlineParts = [
    course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : null,
    course.total_weeks ? `${course.total_weeks} weeks` : null,
    course.language === 'both' ? 'EN/JP' : course.language?.toUpperCase(),
  ].filter(Boolean);

  return (
    <Link
      href={`/learn/${course.slug}`}
      onClick={() =>
        trackEvent('partner_enroll_click', { partner: partnerSlug, course: course.slug })
      }
      className="group flex flex-col h-full rounded-lg bg-bg-secondary border border-border-default overflow-hidden transition-all duration-[var(--duration-normal)] hover:shadow-md hover:-translate-y-0.5 hover:border-border-hover"
    >
      <div className="aspect-[16/9] bg-bg-tertiary overflow-hidden relative">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={title}
            width={600}
            height={340}
            className="w-full h-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-tertiary">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16" />
              <path d="M14 14l1-1a2 2 0 0 1 2.8 0L21 16" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3">
        <Overline>{overlineParts.join(' · ')}</Overline>

        <h3 className="text-lg font-serif text-fg-primary leading-snug group-hover:text-accent-teal transition-colors duration-[var(--duration-fast)]">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-fg-secondary line-clamp-2 flex-1">{description}</p>
        )}

        <div className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-accent-teal">
          {ctaLabel}
          <ArrowRight size={16} />
        </div>
      </div>
    </Link>
  );
}
