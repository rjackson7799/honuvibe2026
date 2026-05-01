import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;

    // Auth: admin only
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Fetch current membership status and toggle it
    const adminSupabase = createAdminClient();
    const { data: targetUser, error: fetchError } = await adminSupabase
      .from('users')
      .select('is_vertice_member')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newValue = !targetUser.is_vertice_member;

    const { error: updateError } = await adminSupabase
      .from('users')
      .update({ is_vertice_member: newValue })
      .eq('id', targetUserId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update membership' },
        { status: 500 },
      );
    }

    return NextResponse.json({ is_vertice_member: newValue });
  } catch (error) {
    console.error('[Admin] Vertice toggle error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
