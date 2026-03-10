import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAllAudioForLesson } from '@/lib/esl/tts';
import type { ESLLessonWithAudio, ESLSettings } from '@/lib/esl/types';

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

    const { eslLessonId } = (await request.json()) as {
      eslLessonId: string;
    };

    if (!eslLessonId) {
      return NextResponse.json({ error: 'eslLessonId is required' }, { status: 400 });
    }

    // Fetch ESL lesson
    const { data: lesson } = await supabase
      .from('esl_lessons')
      .select('*')
      .eq('id', eslLessonId)
      .single();

    if (!lesson) {
      return NextResponse.json({ error: 'ESL lesson not found' }, { status: 404 });
    }

    // Get course ESL settings for TTS voice
    const { data: course } = await supabase
      .from('courses')
      .select('esl_settings_json')
      .eq('id', lesson.course_id)
      .single();

    const eslSettings = course?.esl_settings_json as ESLSettings | null;
    const ttsVoice = eslSettings?.tts_voice ?? 'nova';

    // Background TTS generation
    after(async () => {
      try {
        const eslLessonWithAudio: ESLLessonWithAudio = {
          ...lesson,
          audio: [],
        } as ESLLessonWithAudio;

        await generateAllAudioForLesson(
          eslLessonWithAudio,
          lesson.course_id,
          lesson.week_id,
          ttsVoice,
        );

        console.log(`[ESL Audio] Generated audio for lesson ${eslLessonId}`);
      } catch (err) {
        console.error(`[ESL Audio] Failed for lesson ${eslLessonId}:`, err);
      }
    });

    return NextResponse.json(
      { message: 'Audio generation started' },
      { status: 202 },
    );
  } catch (error) {
    console.error('[ESL Audio Generate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start audio generation' },
      { status: 500 },
    );
  }
}
