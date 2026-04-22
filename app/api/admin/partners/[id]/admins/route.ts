import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', status: 401 as const };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Not authorized', status: 403 as const };
  }
  return { user };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from('partner_admins')
    .select(`
      user_id,
      created_at,
      users:user_id ( email, full_name )
    `)
    .eq('partner_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Admin/Partners/Admins] list failed:', error);
    return NextResponse.json({ error: 'Failed to load portal admins' }, { status: 500 });
  }

  type Row = {
    user_id: string;
    created_at: string;
    users: { email: string | null; full_name: string | null } | null;
  };

  const admins = ((data ?? []) as unknown as Row[]).map((r) => ({
    user_id: r.user_id,
    email: r.users?.email ?? null,
    full_name: r.users?.full_name ?? null,
    created_at: r.created_at,
  }));

  return NextResponse.json({ admins });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id: partnerId } = await params;
  const body = (await request.json().catch(() => ({}))) as { email?: unknown };

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  const { data: partner } = await adminSupabase
    .from('partners')
    .select('id')
    .eq('id', partnerId)
    .maybeSingle();
  if (!partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  }

  const { data: targetUser, error: userErr } = await adminSupabase
    .from('users')
    .select('id, email, full_name, role')
    .ilike('email', email)
    .maybeSingle();

  if (userErr) {
    console.error('[Admin/Partners/Admins] user lookup failed:', userErr);
    return NextResponse.json({ error: 'User lookup failed' }, { status: 500 });
  }

  if (!targetUser) {
    return NextResponse.json(
      { error: 'No user with that email. Ask the partner to sign up at /learn/auth first.' },
      { status: 404 },
    );
  }

  if (targetUser.role !== 'admin' && targetUser.role !== 'partner') {
    const { error: roleErr } = await adminSupabase
      .from('users')
      .update({ role: 'partner' })
      .eq('id', targetUser.id);
    if (roleErr) {
      console.error('[Admin/Partners/Admins] role promote failed:', roleErr);
      return NextResponse.json({ error: 'Failed to promote user role' }, { status: 500 });
    }
  }

  const { error: insertErr } = await adminSupabase
    .from('partner_admins')
    .insert({ partner_id: partnerId, user_id: targetUser.id });

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json(
        { error: 'That user is already a portal admin for this partner' },
        { status: 409 },
      );
    }
    console.error('[Admin/Partners/Admins] insert failed:', insertErr);
    return NextResponse.json({ error: 'Failed to grant portal access' }, { status: 500 });
  }

  return NextResponse.json({
    user_id: targetUser.id,
    email: targetUser.email,
    full_name: targetUser.full_name,
  });
}
