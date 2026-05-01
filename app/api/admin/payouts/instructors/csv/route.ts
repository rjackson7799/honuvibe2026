import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import {
  getInstructorPayouts,
  normalizeInstructorPayoutFilters,
} from '@/lib/revenue-split/queries';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { ok: false as const, status: 403, error: 'Not authorized' };
  }

  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const searchParams = request.nextUrl.searchParams;
  const filters = normalizeInstructorPayoutFilters({
    status: searchParams.get('status') ?? undefined,
    instructor_id: searchParams.get('instructor_id') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  });

  const payouts = await getInstructorPayouts(filters);
  const adminClient = createAdminClient();

  const instructorIds = [...new Set(payouts.rows.map((row) => row.instructor_id))];
  const { data: instructorUsers } = instructorIds.length
    ? await adminClient
        .from('instructor_profiles')
        .select('id, display_name')
        .in('id', instructorIds)
    : { data: [] as { id: string; display_name: string | null }[] };

  const instructorNameMap = new Map(
    (instructorUsers ?? []).map((row) => [row.id, row.display_name]),
  );

  const lines = [
    [
      'enrollment_id',
      'course_title_en',
      'student_email',
      'instructor_id',
      'instructor_display_name',
      'amount',
      'currency',
      'status',
      'created_at',
      'paid_at',
      'payout_reference',
    ].join(','),
  ];

  for (const row of payouts.rows) {
    lines.push(
      [
        row.enrollment_id,
        row.course_title_en,
        row.student_email,
        row.instructor_id,
        instructorNameMap.get(row.instructor_id) ?? row.instructor_display_name,
        row.amount,
        row.currency,
        row.status,
        row.created_at,
        row.paid_at,
        row.payout_reference,
      ]
        .map(csvEscape)
        .join(','),
    );
  }

  const filename = `instructor-payouts-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
