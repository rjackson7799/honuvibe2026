import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const lessonIds = request.nextUrl.searchParams.get('lessonIds');
    if (!lessonIds) {
      return NextResponse.json({ error: 'lessonIds is required' }, { status: 400 });
    }

    const ids = lessonIds.split(',').filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ lessons: [] });
    }

    const { data: lessons, error } = await supabase
      .from('esl_lessons')
      .select('id, week_id, status, generation_error, updated_at')
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }

    return NextResponse.json({ lessons: lessons ?? [] });
  } catch (error) {
    console.error('[ESL Status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
