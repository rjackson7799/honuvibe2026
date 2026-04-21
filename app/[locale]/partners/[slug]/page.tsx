import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  PartnerLanding,
  type PartnerLandingData,
  type PartnerCourseCard,
} from '@/components/partners/PartnerLanding';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

type PartnerRow = PartnerLandingData & {
  id: string;
  is_public: boolean;
  is_active: boolean;
};

async function fetchPartnerWithCourses(slug: string): Promise<
  | {
      partner: PartnerRow;
      courses: PartnerCourseCard[];
    }
  | null
> {
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from('partners')
    .select(
      'id, slug, name_en, name_jp, tagline_en, tagline_jp, description_en, description_jp, logo_url, primary_color, secondary_color, is_public, is_active',
    )
    .eq('slug', slug)
    .maybeSingle<PartnerRow>();

  if (!partner || !partner.is_active) return null;

  const { data: courseRows } = await supabase
    .from('partner_courses')
    .select(
      'display_order, courses:course_id(id, slug, title_en, title_jp, description_en, description_jp, thumbnail_url, level, language, total_weeks, is_published)',
    )
    .eq('partner_id', partner.id)
    .order('display_order', { ascending: true });

  type CourseJoinRow = {
    display_order: number;
    courses: (PartnerCourseCard & { is_published: boolean }) | null;
  };

  const courses: PartnerCourseCard[] = ((courseRows ?? []) as unknown as CourseJoinRow[])
    .map((row) => row.courses)
    .filter((c): c is PartnerCourseCard & { is_published: boolean } => c !== null && c.is_published !== false)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title_en: c.title_en,
      title_jp: c.title_jp,
      description_en: c.description_en,
      description_jp: c.description_jp,
      thumbnail_url: c.thumbnail_url,
      level: c.level,
      language: c.language,
      total_weeks: c.total_weeks,
    }));

  return { partner, courses };
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const result = await fetchPartnerWithCourses(slug);

  if (!result) {
    return { title: 'Partner Not Found' };
  }

  const { partner } = result;
  const name = locale === 'ja' && partner.name_jp ? partner.name_jp : partner.name_en;
  const description =
    locale === 'ja' && partner.description_jp
      ? partner.description_jp
      : (partner.description_en ??
          (locale === 'ja' && partner.tagline_jp ? partner.tagline_jp : partner.tagline_en));

  return {
    title: `${name} × HonuVibe.AI`,
    description: description ?? undefined,
    robots: partner.is_public ? undefined : { index: false, follow: false },
  };
}

export default async function PartnerLandingPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const result = await fetchPartnerWithCourses(slug);
  if (!result) notFound();

  const t = await getTranslations({ locale, namespace: 'partners' });

  return (
    <PartnerLanding
      partner={result.partner}
      courses={result.courses}
      locale={locale}
      copy={{
        featured_courses_heading: t('featured_courses_heading'),
        cta_browse_courses: t('cta_browse_courses'),
        cta_view_course: t('cta_view_course'),
        powered_by: t('powered_by'),
        no_courses_yet: t('no_courses_yet'),
      }}
    />
  );
}
