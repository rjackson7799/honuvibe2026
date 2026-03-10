import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> },
) {
  try {
    const { weekId } = await params;
    const supabase = await createClient();

    // Admin-only
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

    // Update ESL lesson status to published
    const { data: lesson, error: updateError } = await supabase
      .from('esl_lessons')
      .update({
        status: 'published',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('week_id', weekId)
      .eq('status', 'review')
      .select('id, status')
      .single();

    if (updateError || !lesson) {
      return NextResponse.json(
        { error: 'No ESL lesson in review status for this week' },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: lesson });
  } catch (error) {
    console.error('[ESL Publish] Error:', error);
    return NextResponse.json(
      { error: 'Failed to publish ESL content' },
      { status: 500 },
    );
  }
}
