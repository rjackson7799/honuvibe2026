import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const body = (await request.json()) as {
      eslLessonId: string;
      vocabulary_json?: unknown;
      grammar_json?: unknown;
      cultural_notes_json?: unknown;
      comprehension_json?: unknown;
    };

    if (!body.eslLessonId) {
      return NextResponse.json({ error: 'eslLessonId is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.vocabulary_json !== undefined) {
      updateData.vocabulary_json = body.vocabulary_json;
    }
    if (body.grammar_json !== undefined) {
      updateData.grammar_json = body.grammar_json;
    }
    if (body.cultural_notes_json !== undefined) {
      updateData.cultural_notes_json = body.cultural_notes_json;
    }
    if (body.comprehension_json !== undefined) {
      updateData.comprehension_json = body.comprehension_json;
    }

    const { data, error } = await supabase
      .from('esl_lessons')
      .update(updateData)
      .eq('id', body.eslLessonId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[Admin ESL Update] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update ESL content' },
      { status: 500 },
    );
  }
}
