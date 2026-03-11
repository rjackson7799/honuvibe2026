import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
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

    const { lessonId } = await params;

    const { data, error } = await supabase
      .from('esl_lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Include audio records for preview support
    const { data: audio } = await supabase
      .from('esl_audio')
      .select('*')
      .eq('esl_lesson_id', lessonId);

    return NextResponse.json({ data: { ...data, audio: audio ?? [] } });
  } catch (error) {
    console.error('[Admin ESL GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ESL lesson' },
      { status: 500 },
    );
  }
}
