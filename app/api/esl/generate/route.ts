import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateESLForWeek } from '@/lib/esl/generator';
import type { WeekESLContext, ESLSettings } from '@/lib/esl/types';

export async function POST(request: NextRequest) {
  try {
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

    const { courseId, weekIds } = (await request.json()) as {
      courseId: string;
      weekIds?: string[];
    };

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    // Fetch course with weeks
    const { data: course } = await supabase
      .from('courses')
      .select('id, title_en, description_en, level, esl_settings_json')
      .eq('id', courseId)
      .single();

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Fetch weeks (all or specified)
    let weeksQuery = supabase
      .from('course_weeks')
      .select('id, week_number, title_en, title_jp')
      .eq('course_id', courseId)
      .order('week_number', { ascending: true });

    if (weekIds && weekIds.length > 0) {
      weeksQuery = weeksQuery.in('id', weekIds);
    }

    const { data: weeks } = await weeksQuery;

    if (!weeks || weeks.length === 0) {
      return NextResponse.json({ error: 'No weeks found' }, { status: 404 });
    }

    const eslSettings = (course.esl_settings_json ?? {
      target_language: 'ja',
      vocab_depth: 'comprehensive',
      grammar_count: 3,
      include_cultural: true,
      generate_audio: true,
      tts_voice: 'nova',
    }) as ESLSettings;

    // Create esl_lessons rows with status 'generating'
    const eslLessonIds: { weekId: string; eslLessonId: string }[] = [];

    for (const week of weeks) {
      // Check if ESL lesson already exists for this week
      const { data: existing } = await supabase
        .from('esl_lessons')
        .select('id')
        .eq('week_id', week.id)
        .maybeSingle();

      if (existing) {
        // Reset to generating status for regeneration
        await supabase
          .from('esl_lessons')
          .update({ status: 'generating', generation_error: null, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        eslLessonIds.push({ weekId: week.id, eslLessonId: existing.id });
      } else {
        const { data: newLesson } = await supabase
          .from('esl_lessons')
          .insert({
            course_id: courseId,
            week_id: week.id,
            status: 'generating',
          })
          .select('id')
          .single();

        if (newLesson) {
          eslLessonIds.push({ weekId: week.id, eslLessonId: newLesson.id });
        }
      }
    }

    // Background generation using after()
    after(async () => {
      // Use service role for background operations
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      for (const { weekId, eslLessonId } of eslLessonIds) {
        const week = weeks.find((w) => w.id === weekId);
        if (!week) continue;

        try {
          // Fetch sessions for this week
          const { data: sessions } = await serviceSupabase
            .from('course_sessions')
            .select('title_en, topics_en')
            .eq('week_id', weekId)
            .order('session_number', { ascending: true });

          // Fetch existing vocabulary for this week
          const { data: vocabulary } = await serviceSupabase
            .from('course_vocabulary')
            .select('term_en, term_jp')
            .eq('week_id', weekId);

          const sessionTitles = (sessions ?? []).map((s) => s.title_en);
          const sessionTopics = (sessions ?? [])
            .flatMap((s) => {
              const topics = s.topics_en as { title: string; subtopics?: string[] }[] | null;
              return (topics ?? []).map((t) => t.title);
            });

          const context: WeekESLContext = {
            course_id: courseId,
            week_id: weekId,
            week_number: week.week_number,
            week_title_en: week.title_en,
            week_title_jp: week.title_jp,
            session_titles: sessionTitles,
            session_topics: sessionTopics,
            course_vocabulary: (vocabulary ?? []).map((v) => ({
              term_en: v.term_en,
              term_jp: v.term_jp,
            })),
            course_level: course.level ?? 'intermediate',
            course_description_en: course.description_en ?? course.title_en,
            esl_settings: eslSettings,
          };

          const content = await generateESLForWeek(context);

          await serviceSupabase
            .from('esl_lessons')
            .update({
              vocabulary_json: content.vocabulary,
              grammar_json: content.grammar,
              cultural_notes_json: content.cultural_notes,
              comprehension_json: content.comprehension,
              status: 'review',
              updated_at: new Date().toISOString(),
            })
            .eq('id', eslLessonId);
        } catch (err) {
          console.error(`[ESL Generate] Failed for week ${weekId}:`, err);
          await serviceSupabase
            .from('esl_lessons')
            .update({
              status: 'failed',
              generation_error: err instanceof Error ? err.message : 'Unknown error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', eslLessonId);
        }
      }
    });

    return NextResponse.json(
      { message: 'ESL generation started', eslLessonIds },
      { status: 202 },
    );
  } catch (error) {
    console.error('[ESL Generate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start ESL generation' },
      { status: 500 },
    );
  }
}
