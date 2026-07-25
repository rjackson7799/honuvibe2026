import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { PartnerEditor } from '@/components/admin/partner-editor/partner-editor';
import type {
  PartnerFormData,
  CourseOption,
  SeatBlockRow,
  JoinCodeRow,
  PartnerBenefitsRow,
} from '@/components/admin/partner-editor/types';
import type { PartnerAdminRow } from '@/components/admin/PartnerAdminManager';

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
    { data: seatBlockRows },
    { data: joinCodeRows },
    { data: benefitsRow },
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
    supabase
      .from('partner_seat_blocks')
      .select(
        'id, label, seats_total, granted_tier, access_starts_at, access_ends_at, source, notes, is_active, created_at',
      )
      .eq('partner_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('partner_join_codes')
      .select('id, code, seat_block_id, max_uses, expires_at, is_active, created_at')
      .eq('partner_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('partner_benefits')
      .select('course_discount_pct, stripe_coupon_id, included_tier')
      .eq('partner_id', id)
      .maybeSingle(),
  ]);

  // Usage counts come from the live rows — grants for seats, ledger rows for
  // codes. Nothing in this system keeps a mutable counter.
  const blockIds = (seatBlockRows ?? []).map((b) => b.id);
  const codeIds = (joinCodeRows ?? []).map((c) => c.id);

  const [{ data: grantRows }, { data: redemptionRows }] = await Promise.all([
    blockIds.length
      ? supabase
          .from('partner_seat_grants')
          .select('seat_block_id')
          .in('seat_block_id', blockIds)
          .is('revoked_at', null)
      : Promise.resolve({ data: [] as { seat_block_id: string }[] }),
    codeIds.length
      ? supabase
          .from('partner_code_redemptions')
          .select('code_id')
          .in('code_id', codeIds)
      : Promise.resolve({ data: [] as { code_id: string }[] }),
  ]);

  const seatsUsed = new Map<string, number>();
  for (const row of grantRows ?? []) {
    seatsUsed.set(row.seat_block_id, (seatsUsed.get(row.seat_block_id) ?? 0) + 1);
  }
  const codeUses = new Map<string, number>();
  for (const row of redemptionRows ?? []) {
    codeUses.set(row.code_id, (codeUses.get(row.code_id) ?? 0) + 1);
  }

  const initialSeatBlocks: SeatBlockRow[] = (seatBlockRows ?? []).map((b) => ({
    ...(b as Omit<SeatBlockRow, 'seats_used'>),
    seats_used: seatsUsed.get(b.id) ?? 0,
  }));
  const initialJoinCodes: JoinCodeRow[] = (joinCodeRows ?? []).map((c) => ({
    ...(c as Omit<JoinCodeRow, 'uses'>),
    uses: codeUses.get(c.id) ?? 0,
  }));
  const initialBenefits = (benefitsRow ?? null) as PartnerBenefitsRow | null;

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
    <PartnerEditor
      partner={formData}
      featuredCourseIds={featuredCourseIds}
      courseOptions={courseOptions}
      enrollmentCount={enrollmentRows?.length ?? 0}
      initialAdmins={initialAdmins}
      initialSeatBlocks={initialSeatBlocks}
      initialJoinCodes={initialJoinCodes}
      initialBenefits={initialBenefits}
    />
  );
}
