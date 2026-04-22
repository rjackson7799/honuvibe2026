import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { AdminPartnerForm, type PartnerFormData, type CourseOption } from '@/components/admin/AdminPartnerForm';
import { PartnerAdminManager, type PartnerAdminRow } from '@/components/admin/PartnerAdminManager';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const metadata = {
  title: 'Edit Partner — Admin',
};

export default async function AdminPartnerDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = createAdminClient();

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!partner) notFound();

  const [
    { data: courseLinks },
    { data: allCourses },
    { data: enrollmentRows },
    { data: adminRows },
  ] = await Promise.all([
    supabase
      .from('partner_courses')
      .select('course_id, display_order')
      .eq('partner_id', id)
      .order('display_order', { ascending: true }),
    supabase
      .from('courses')
      .select('id, slug, title_en, is_published')
      .order('title_en', { ascending: true }),
    supabase
      .from('enrollments')
      .select('id')
      .eq('partner_id', id),
    supabase
      .from('partner_admins')
      .select('user_id, created_at, users:user_id ( email, full_name )')
      .eq('partner_id', id)
      .order('created_at', { ascending: true }),
  ]);

  type AdminRow = {
    user_id: string;
    created_at: string;
    users: { email: string | null; full_name: string | null } | null;
  };
  const initialAdmins: PartnerAdminRow[] = ((adminRows ?? []) as unknown as AdminRow[]).map((r) => ({
    user_id: r.user_id,
    email: r.users?.email ?? null,
    full_name: r.users?.full_name ?? null,
    created_at: r.created_at,
  }));

  const featuredCourseIds = (courseLinks ?? []).map((r) => r.course_id);
  const courseOptions: CourseOption[] = (allCourses ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title_en: c.title_en,
    is_published: c.is_published,
  }));

  const formData: PartnerFormData = {
    id: partner.id,
    slug: partner.slug,
    name_en: partner.name_en,
    name_jp: partner.name_jp ?? '',
    tagline_en: partner.tagline_en ?? '',
    tagline_jp: partner.tagline_jp ?? '',
    description_en: partner.description_en ?? '',
    description_jp: partner.description_jp ?? '',
    logo_url: partner.logo_url ?? '',
    primary_color: partner.primary_color ?? '',
    secondary_color: partner.secondary_color ?? '',
    website_url: partner.website_url ?? '',
    contact_email: partner.contact_email ?? '',
    revenue_share_pct: partner.revenue_share_pct ?? 0,
    is_public: partner.is_public,
    is_active: partner.is_active,
  };

  return (
    <div className="max-w-[1100px] space-y-6">
      <AdminPartnerForm
        partner={formData}
        featuredCourseIds={featuredCourseIds}
        courseOptions={courseOptions}
        enrollmentCount={enrollmentRows?.length ?? 0}
      />
      <PartnerAdminManager partnerId={partner.id} initialAdmins={initialAdmins} />
    </div>
  );
}
