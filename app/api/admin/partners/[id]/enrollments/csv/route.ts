import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { id } = await params;
  const adminSupabase = createAdminClient();

  const { data: partner } = await adminSupabase
    .from('partners')
    .select('slug')
    .eq('id', id)
    .maybeSingle();

  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 });

  const { data: rows, error } = await adminSupabase
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      status,
      amount_paid,
      currency,
      users:user_id ( full_name, email ),
      courses:course_id ( slug, title_en )
    `)
    .eq('partner_id', id)
    .order('enrolled_at', { ascending: false });

  if (error) {
    console.error('[Admin/Partners] enrollments csv failed:', error);
    return NextResponse.json({ error: 'Failed to load enrollments' }, { status: 500 });
  }

  type Row = {
    id: string;
    enrolled_at: string;
    status: string;
    amount_paid: number | null;
    currency: string | null;
    users: { full_name: string | null; email: string | null } | null;
    courses: { slug: string; title_en: string } | null;
  };

  const header = [
    'enrollment_id',
    'enrolled_at',
    'status',
    'course_slug',
    'course_title',
    'student_name',
    'student_email',
    'amount_paid',
    'currency',
  ];

  const lines = [header.join(',')];
  for (const row of (rows ?? []) as unknown as Row[]) {
    lines.push(
      [
        row.id,
        row.enrolled_at,
        row.status,
        row.courses?.slug,
        row.courses?.title_en,
        row.users?.full_name,
        row.users?.email,
        row.amount_paid,
        row.currency,
      ]
        .map(csvEscape)
        .join(','),
    );
  }

  const csv = lines.join('\n');
  const filename = `partner-${partner.slug}-enrollments-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
