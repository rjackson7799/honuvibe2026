import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

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

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await request.json().catch(() => null);
  const shareIds = Array.isArray(body?.shareIds)
    ? body.shareIds.filter((value: unknown): value is string => typeof value === 'string')
    : [];
  const payoutReference =
    typeof body?.payoutReference === 'string' ? body.payoutReference.trim() : '';

  if (shareIds.length === 0) {
    return NextResponse.json({ error: 'No payout rows selected.' }, { status: 400 });
  }
  if (!payoutReference) {
    return NextResponse.json({ error: 'Payout reference is required.' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('enrollment_instructor_shares')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payout_reference: payoutReference,
    })
    .in('id', shareIds)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    console.error('[Admin/Payouts] mark-paid failed:', error);
    return NextResponse.json({ error: 'Failed to mark payout rows paid.' }, { status: 500 });
  }

  revalidatePath('/admin/payouts/instructors');

  return NextResponse.json({ updated: data?.length ?? 0 });
}
