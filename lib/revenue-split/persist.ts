import type { SupabaseClient } from '@supabase/supabase-js';
import { computeEnrollmentSplit } from '@/lib/revenue-split/compute';

type AdminClient = SupabaseClient;

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function persistEnrollmentSplit(
  adminClient: AdminClient,
  enrollmentId: string,
  courseId: string,
  partnerId: string | null,
  grossAmount: number,
  currency: string,
) {
  const [courseResult, partnerResult, instructorResult] = await Promise.all([
    adminClient
      .from('courses')
      .select('instructor_revenue_share_pct')
      .eq('id', courseId)
      .single(),
    partnerId
      ? adminClient
          .from('partners')
          .select('revenue_share_pct')
          .eq('id', partnerId)
          .single()
      : Promise.resolve({ data: null, error: null }),
    adminClient
      .from('course_instructors')
      .select('instructor_id, revenue_share_pct')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true }),
  ]);

  if (courseResult.error) throw courseResult.error;
  if (partnerResult.error) throw partnerResult.error;
  if (instructorResult.error) throw instructorResult.error;

  const instructorSharePct = asNumber(
    courseResult.data?.instructor_revenue_share_pct,
  );
  const partnerSharePct = asNumber(partnerResult.data?.revenue_share_pct);
  const instructorWeights = (instructorResult.data ?? []).map((row) => ({
    instructor_id: row.instructor_id as string,
    pct: asNumber(row.revenue_share_pct),
  }));

  const split = computeEnrollmentSplit({
    gross: grossAmount,
    partnerSharePct,
    instructorSharePct,
    instructorWeights,
  });

  if (
    instructorSharePct > 0 &&
    split.instructor_total === 0 &&
    instructorWeights.reduce((sum, row) => sum + row.pct, 0) <= 0
  ) {
    console.warn(
      `[Revenue Split] Course ${courseId} has an instructor pool but no assigned instructors; collapsing share into HonuVibe`,
    );
  }

  const { error: enrollmentUpdateError } = await adminClient
    .from('enrollments')
    .update({
      partner_share_amount: split.partner,
      instructor_share_amount: split.instructor_total,
      honuvibe_share_amount: split.honuvibe,
    })
    .eq('id', enrollmentId);

  if (enrollmentUpdateError) throw enrollmentUpdateError;

  const shareRows = split.per_instructor
    .filter((row) => row.amount > 0)
    .map((row) => ({
      enrollment_id: enrollmentId,
      instructor_id: row.instructor_id,
      amount: row.amount,
      currency,
      status: 'pending',
    }));

  if (shareRows.length > 0) {
    const { error: sharesError } = await adminClient
      .from('enrollment_instructor_shares')
      .upsert(shareRows, { onConflict: 'enrollment_id,instructor_id' });

    if (sharesError) throw sharesError;
  }

  return split;
}
