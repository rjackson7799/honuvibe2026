import { createAdminClient } from '@/lib/supabase/server';

export type InstructorPayoutStatus = 'pending' | 'paid' | 'clawed_back' | 'all';

export type InstructorPayoutFilters = {
  status: InstructorPayoutStatus;
  instructorId: string | null;
  from: string | null;
  to: string | null;
};

export type InstructorPayoutRow = {
  id: string;
  enrollment_id: string;
  instructor_id: string;
  instructor_display_name: string | null;
  course_title_en: string | null;
  student_name: string | null;
  student_email: string | null;
  gross: number;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'clawed_back';
  created_at: string;
  paid_at: string | null;
  payout_reference: string | null;
};

export type InstructorPayoutSummary = {
  filters: InstructorPayoutFilters;
  rows: InstructorPayoutRow[];
  totalsByCurrency: Record<string, number>;
};

function startOfDay(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function endOfDay(date: string): string {
  return `${date}T23:59:59.999Z`;
}

export function normalizeInstructorPayoutFilters(input: {
  status?: string;
  instructor_id?: string;
  from?: string;
  to?: string;
}): InstructorPayoutFilters {
  const status =
    input.status === 'paid' ||
    input.status === 'clawed_back' ||
    input.status === 'all'
      ? input.status
      : 'pending';

  return {
    status,
    instructorId: input.instructor_id?.trim() || null,
    from: input.from?.trim() || null,
    to: input.to?.trim() || null,
  };
}

type RawPayoutRow = {
  id: string;
  enrollment_id: string;
  instructor_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'clawed_back';
  created_at: string;
  paid_at: string | null;
  payout_reference: string | null;
  enrollments: {
    amount_paid: number | null;
    users: { full_name: string | null; email: string | null } | null;
    courses: { title_en: string | null } | null;
  } | null;
  instructor_profiles: { display_name: string | null } | null;
};

export async function getInstructorPayouts(
  filters: InstructorPayoutFilters,
): Promise<InstructorPayoutSummary> {
  const supabase = createAdminClient();

  let query = supabase
    .from('enrollment_instructor_shares')
    .select(`
      id,
      enrollment_id,
      instructor_id,
      amount,
      currency,
      status,
      created_at,
      paid_at,
      payout_reference,
      enrollments:enrollment_id (
        amount_paid,
        users:user_id ( full_name, email ),
        courses:course_id ( title_en )
      ),
      instructor_profiles:instructor_id ( display_name )
    `)
    .order('created_at', { ascending: false });

  if (filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.instructorId) {
    query = query.eq('instructor_id', filters.instructorId);
  }
  if (filters.from) {
    query = query.gte('created_at', startOfDay(filters.from));
  }
  if (filters.to) {
    query = query.lte('created_at', endOfDay(filters.to));
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Revenue Split] Failed to load instructor payouts:', error);
    return {
      filters,
      rows: [],
      totalsByCurrency: {},
    };
  }

  const rows = ((data ?? []) as unknown as RawPayoutRow[]).map((row) => ({
    id: row.id,
    enrollment_id: row.enrollment_id,
    instructor_id: row.instructor_id,
    instructor_display_name: row.instructor_profiles?.display_name ?? null,
    course_title_en: row.enrollments?.courses?.title_en ?? null,
    student_name:
      row.enrollments?.users?.full_name ??
      row.enrollments?.users?.email ??
      null,
    student_email: row.enrollments?.users?.email ?? null,
    gross: row.enrollments?.amount_paid ?? 0,
    amount: row.amount ?? 0,
    currency: row.currency,
    status: row.status,
    created_at: row.created_at,
    paid_at: row.paid_at,
    payout_reference: row.payout_reference,
  }));

  const totalsByCurrency = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.currency] = (acc[row.currency] ?? 0) + row.amount;
    return acc;
  }, {});

  return {
    filters,
    rows,
    totalsByCurrency,
  };
}
