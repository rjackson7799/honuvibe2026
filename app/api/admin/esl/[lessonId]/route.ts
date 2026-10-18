import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signLessonAudio } from '@/lib/esl/audio-access';

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

    const { data: canManage, error: accessError } = await supabase.rpc('can_manage_course', { p_course: data.course_id });
    if (accessError || canManage !== true) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Preview uses the same private storage boundary as learner playback.
    const { data: audio, error: audioError } = await supabase
      .from('esl_audio')
      .select('*')
      .eq('esl_lesson_id', lessonId);

    if (audioError) throw new Error('Could not load lesson audio');
    return NextResponse.json({ data: { ...data, audio: await signLessonAudio(supabase, audio ?? []) } }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[Admin ESL GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ESL lesson' },
      { status: 500 },
    );
  }
}
