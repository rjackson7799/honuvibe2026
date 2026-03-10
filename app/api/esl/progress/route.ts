import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await request.json()) as {
      eslLessonId: string;
      vocabulary_completed?: number[];
      comprehension_score?: number;
      flashcard_known?: number[];
    };

    if (!body.eslLessonId) {
      return NextResponse.json({ error: 'eslLessonId is required' }, { status: 400 });
    }

    // Check if progress record exists
    const { data: existing } = await supabase
      .from('esl_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('esl_lesson_id', body.eslLessonId)
      .maybeSingle();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.vocabulary_completed !== undefined) {
      updateData.vocabulary_completed = body.vocabulary_completed;
    }
    if (body.comprehension_score !== undefined) {
      updateData.comprehension_score = body.comprehension_score;
    }
    if (body.flashcard_known !== undefined) {
      updateData.flashcard_known = body.flashcard_known;
    }

    if (existing) {
      // Update existing progress
      const { data, error } = await supabase
        .from('esl_progress')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data });
    } else {
      // Insert new progress
      const { data, error } = await supabase
        .from('esl_progress')
        .insert({
          user_id: user.id,
          esl_lesson_id: body.eslLessonId,
          ...updateData,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data }, { status: 201 });
    }
  } catch (error) {
    console.error('[ESL Progress] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 },
    );
  }
}
