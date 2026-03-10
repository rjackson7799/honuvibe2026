import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkESLAccess } from '@/lib/esl/access';
import { getESLLessonForWeek } from '@/lib/esl/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ weekId: string }> },
) {
  try {
    const { weekId } = await params;
    const supabase = await createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the course_id from the week
    const { data: week } = await supabase
      .from('course_weeks')
      .select('course_id')
      .eq('id', weekId)
      .single();

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    // Check ESL access
    const access = await checkESLAccess(user.id, week.course_id);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'ESL access required', access },
        { status: 403 },
      );
    }

    // Fetch ESL lesson with audio
    const eslLesson = await getESLLessonForWeek(weekId);

    if (!eslLesson) {
      return NextResponse.json(
        { error: 'No ESL content for this week' },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: eslLesson });
  } catch (error) {
    console.error('[ESL Fetch] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ESL content' },
      { status: 500 },
    );
  }
}
