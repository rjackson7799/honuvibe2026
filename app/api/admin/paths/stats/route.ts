import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminPathStats } from '@/lib/paths/queries';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Admin check
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const stats = await getAdminPathStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching path stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
