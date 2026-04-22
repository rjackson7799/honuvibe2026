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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const gate = await requireAdmin();
  if ('error' in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id: partnerId, userId } = await params;
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase
    .from('partner_admins')
    .delete()
    .eq('partner_id', partnerId)
    .eq('user_id', userId);

  if (error) {
    console.error('[Admin/Partners/Admins] revoke failed:', error);
    return NextResponse.json({ error: 'Failed to revoke portal access' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
