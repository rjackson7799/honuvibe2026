import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export type PartnerScope = {
  id: string;
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
  website_url: string | null;
  contact_email: string | null;
  revenue_share_pct: number;
  is_public: boolean;
  is_active: boolean;
};

export type PartnerStats = {
  studentCount: number;
  revenueUsd: number;
  revenueJpy: number;
  courseCount: number;
  ownedCourseCount: number;
  monthOverMonth: {
    students: number;
    revenueUsd: number;
    revenueJpy: number;
  };
};

export type PartnerCourseStats = {
  course_id: string;
  slug: string;
  title_en: string;
  is_published: boolean;
  lifetimeEnrollments: number;
  currentMonthEnrollments: number;
  lifetimeRevenueUsd: number;
  lifetimeRevenueJpy: number;
  display_order: number;
};

export type DailyEnrollmentPoint = { date: string; count: number };

/**
 * Resolves which partner the current user is scoped to, for portal rendering.
 * - role 'partner' → their partner_admins row
 * - role 'admin'   → the partner specified by `previewId` (admin preview mode)
 *
 * Redirects unauthenticated callers to /learn/auth and unauthorized callers
 * to /learn/dashboard. Returns null only when an admin is on /partner/* without
 * a preview id (so the caller can redirect to /admin/partners).
 */
export async function resolvePartnerScope(opts: {
  locale: string;
  previewId?: string | null;
}): Promise<{ partner: PartnerScope; previewMode: boolean } | null> {
  const { locale, previewId } = opts;
  const prefix = locale === 'ja' ? '/ja' : '';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`${prefix}/learn/auth`);

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'partner' && profile?.role !== 'admin') {
    redirect(`${prefix}/learn/dashboard`);
  }

  const adminClient = createAdminClient();

  if (profile.role === 'admin') {
    if (!previewId) return null;
    const { data: partner } = await adminClient
      .from('partners')
      .select('*')
      .eq('id', previewId)
      .maybeSingle();
    if (!partner) redirect(`${prefix}/admin/partners`);
    return { partner: partner as PartnerScope, previewMode: true };
  }

  // Partner role — look up their partner_admins row (anon client + RLS)
  const { data: link } = await supabase
    .from('partner_admins')
    .select('partner_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!link) redirect(`${prefix}/learn/dashboard`);

  const { data: partner } = await adminClient
    .from('partners')
    .select('*')
    .eq('id', link.partner_id)
    .maybeSingle();

  if (!partner || !partner.is_active) redirect(`${prefix}/learn/dashboard`);

  return { partner: partner as PartnerScope, previewMode: false };
}

function monthBoundaries() {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = currentStart;
  return {
    currentStartIso: currentStart.toISOString(),
    prevStartIso: prevStart.toISOString(),
    prevEndIso: prevEnd.toISOString(),
  };
}

type EnrollmentRow = {
  id: string;
  user_id: string;
  status: string;
  amount_paid: number | null;
  currency: string | null;
  enrolled_at: string;
  course_id: string;
};

export type PartnerOwnedCourse = {
  id: string;
  slug: string;
  title_en: string;
  title_jp: string | null;
  is_published: boolean;
};

async function fetchPartnerEnrollments(partnerId: string): Promise<EnrollmentRow[]> {
  const adminClient = createAdminClient();

  // 1) Get owned-course ids
  const { data: ownedCourses } = await adminClient
    .from('courses')
    .select('id')
    .eq('partner_id', partnerId);
  const ownedIds = (ownedCourses ?? []).map((c: { id: string }) => c.id);

  // 2) Cookie-attributed enrollments
  const { data: attributedRows, error: attrErr } = await adminClient
    .from('enrollments')
    .select('id, user_id, status, amount_paid, currency, enrolled_at, course_id')
    .eq('partner_id', partnerId)
    .neq('status', 'refunded');
  if (attrErr) console.error('[PartnerPortal] attributed fetch failed:', attrErr);

  // 3) Owned-course enrollments (may overlap with #2)
  let ownedRows: EnrollmentRow[] = [];
  if (ownedIds.length > 0) {
    const { data, error } = await adminClient
      .from('enrollments')
      .select('id, user_id, status, amount_paid, currency, enrolled_at, course_id')
      .in('course_id', ownedIds)
      .neq('status', 'refunded');
    if (error) console.error('[PartnerPortal] owned fetch failed:', error);
    ownedRows = (data ?? []) as EnrollmentRow[];
  }

  // 4) Dedupe by enrollment id
  const seen = new Set<string>();
  const merged: EnrollmentRow[] = [];
  for (const r of [...(attributedRows ?? []), ...ownedRows]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r as EnrollmentRow);
  }
  return merged;
}

export async function getPartnerOwnedCourses(partnerId: string): Promise<PartnerOwnedCourse[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('courses')
    .select('id, slug, title_en, title_jp, is_published')
    .eq('partner_id', partnerId);
  if (error) {
    console.error('[PartnerPortal] owned courses fetch failed:', error);
    return [];
  }
  return (data ?? []) as PartnerOwnedCourse[];
}

export async function getPartnerStats(partnerId: string): Promise<PartnerStats> {
  const adminClient = createAdminClient();
  const [{ data: courseLinks }, { data: ownedCourseRows }, rows] = await Promise.all([
    adminClient.from('partner_courses').select('course_id').eq('partner_id', partnerId),
    adminClient.from('courses').select('id').eq('partner_id', partnerId),
    fetchPartnerEnrollments(partnerId),
  ]);

  const courseCount = courseLinks?.length ?? 0;
  const ownedCourseCount = ownedCourseRows?.length ?? 0;

  const uniqueStudents = new Set(rows.map((r) => r.user_id));
  let revenueUsd = 0;
  let revenueJpy = 0;
  for (const r of rows) {
    if (!r.amount_paid) continue;
    if (r.currency === 'usd') revenueUsd += r.amount_paid;
    else if (r.currency === 'jpy') revenueJpy += r.amount_paid;
  }

  const { currentStartIso, prevStartIso, prevEndIso } = monthBoundaries();

  const currentMonthRows = rows.filter((r) => r.enrolled_at >= currentStartIso);
  const prevMonthRows = rows.filter(
    (r) => r.enrolled_at >= prevStartIso && r.enrolled_at < prevEndIso,
  );

  const sumByCurrency = (list: EnrollmentRow[], currency: string) =>
    list.reduce((s, r) => s + (r.currency === currency ? r.amount_paid ?? 0 : 0), 0);

  const mom = {
    students:
      new Set(currentMonthRows.map((r) => r.user_id)).size -
      new Set(prevMonthRows.map((r) => r.user_id)).size,
    revenueUsd: sumByCurrency(currentMonthRows, 'usd') - sumByCurrency(prevMonthRows, 'usd'),
    revenueJpy: sumByCurrency(currentMonthRows, 'jpy') - sumByCurrency(prevMonthRows, 'jpy'),
  };

  return {
    studentCount: uniqueStudents.size,
    revenueUsd,
    revenueJpy,
    courseCount,
    ownedCourseCount,
    monthOverMonth: mom,
  };
}

export async function getPartnerCourses(partnerId: string): Promise<PartnerCourseStats[]> {
  const adminClient = createAdminClient();

  const [{ data: links }, rows] = await Promise.all([
    adminClient
      .from('partner_courses')
      .select('course_id, display_order, courses:course_id ( id, slug, title_en, is_published )')
      .eq('partner_id', partnerId)
      .order('display_order', { ascending: true }),
    fetchPartnerEnrollments(partnerId),
  ]);

  type LinkRow = {
    course_id: string;
    display_order: number;
    courses: {
      id: string;
      slug: string;
      title_en: string;
      is_published: boolean;
    } | null;
  };

  const { currentStartIso } = monthBoundaries();

  return ((links ?? []) as unknown as LinkRow[])
    .filter((l) => l.courses)
    .map((l) => {
      const courseRows = rows.filter((r) => r.course_id === l.course_id);
      const currentMonthRows = courseRows.filter((r) => r.enrolled_at >= currentStartIso);
      const lifetimeRevenueUsd = courseRows.reduce(
        (s, r) => s + (r.currency === 'usd' ? r.amount_paid ?? 0 : 0),
        0,
      );
      const lifetimeRevenueJpy = courseRows.reduce(
        (s, r) => s + (r.currency === 'jpy' ? r.amount_paid ?? 0 : 0),
        0,
      );
      return {
        course_id: l.course_id,
        slug: l.courses!.slug,
        title_en: l.courses!.title_en,
        is_published: l.courses!.is_published,
        lifetimeEnrollments: courseRows.length,
        currentMonthEnrollments: currentMonthRows.length,
        lifetimeRevenueUsd,
        lifetimeRevenueJpy,
        display_order: l.display_order,
      };
    });
}

/** Private helper: same union+dedup as fetchPartnerEnrollments but filtered to
 *  enrollments on or after `sinceIso`. Avoids pulling all-time rows into memory
 *  just to window them in JS.
 */
async function fetchPartnerEnrollmentsSince(
  partnerId: string,
  sinceIso: string,
): Promise<EnrollmentRow[]> {
  const adminClient = createAdminClient();

  // 1) Get owned-course ids
  const { data: ownedCourses } = await adminClient
    .from('courses')
    .select('id')
    .eq('partner_id', partnerId);
  const ownedIds = (ownedCourses ?? []).map((c: { id: string }) => c.id);

  // 2) Cookie-attributed enrollments within the window
  const { data: attributedRows, error: attrErr } = await adminClient
    .from('enrollments')
    .select('id, user_id, status, amount_paid, currency, enrolled_at, course_id')
    .eq('partner_id', partnerId)
    .neq('status', 'refunded')
    .gte('enrolled_at', sinceIso);
  if (attrErr) console.error('[PartnerPortal] attributed (windowed) fetch failed:', attrErr);

  // 3) Owned-course enrollments within the window (may overlap with #2)
  let ownedRows: EnrollmentRow[] = [];
  if (ownedIds.length > 0) {
    const { data, error } = await adminClient
      .from('enrollments')
      .select('id, user_id, status, amount_paid, currency, enrolled_at, course_id')
      .in('course_id', ownedIds)
      .neq('status', 'refunded')
      .gte('enrolled_at', sinceIso);
    if (error) console.error('[PartnerPortal] owned (windowed) fetch failed:', error);
    ownedRows = (data ?? []) as EnrollmentRow[];
  }

  // 4) Dedupe by enrollment id
  const seen = new Set<string>();
  const merged: EnrollmentRow[] = [];
  for (const r of [...(attributedRows ?? []), ...ownedRows]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r as EnrollmentRow);
  }
  return merged;
}

export async function getPartnerDailyEnrollments(
  partnerId: string,
  days: number,
): Promise<DailyEnrollmentPoint[]> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const rows = await fetchPartnerEnrollmentsSince(partnerId, since.toISOString());

  const counts = new Map<string, number>();
  // Pre-seed every day in the window with 0
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of rows) {
    const day = row.enrolled_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
}
