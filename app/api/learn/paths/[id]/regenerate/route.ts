import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStudyPath, PathGenerationError } from '@/lib/paths/generate';
import {
  getPathWithItems,
  archivePath,
  createPath,
  saveGenerationLog,
  getPathGenerationCount,
} from '@/lib/paths/queries';
import { GENERATION_PROMPT_VERSION } from '@/lib/paths/prompt';
import type { PathIntakeInput } from '@/lib/paths/types';

const MAX_GENERATIONS_PER_DAY = 3;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify ownership
    const oldPath = await getPathWithItems(id);
    if (!oldPath) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }
    if (oldPath.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Rate limit
    const todayCount = await getPathGenerationCount(user.id, new Date());
    if (todayCount >= MAX_GENERATIONS_PER_DAY) {
      return NextResponse.json(
        { error: 'Daily path generation limit reached (3 per day)' },
        { status: 429 },
      );
    }

    // Parse optional feedback
    const body = await request.json().catch(() => ({}));
    const feedback = (body as { feedback?: string }).feedback;

    // Archive old path
    await archivePath(id);

    // Build new goal with feedback appended
    let goalDescription = oldPath.goal_description;
    if (feedback && feedback.trim().length > 0) {
      goalDescription = `${oldPath.goal_description} | Feedback: ${feedback.trim()}`;
    }

    // Get user tier
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const userTier =
      (profile?.subscription_tier as 'free' | 'premium') ?? 'free';

    const input: PathIntakeInput = {
      goal_description: goalDescription,
      difficulty_preference: oldPath.difficulty_preference,
      language_preference: oldPath.language_preference,
      focus_areas: oldPath.focus_areas ?? [],
    };

    const generationResult = await generateStudyPath(input, user.id, userTier);
    const pathWithItems = await createPath(input, user.id, generationResult);

    // Save generation log (non-blocking)
    saveGenerationLog({
      path_id: pathWithItems.id,
      user_id: user.id,
      goal_description: input.goal_description,
      preferences: {
        difficulty: input.difficulty_preference,
        language: input.language_preference,
        focus_areas: input.focus_areas,
      },
      content_catalog_size: generationResult.catalogSize,
      prompt_version: GENERATION_PROMPT_VERSION,
      raw_response: JSON.stringify(generationResult.response),
      parsed_successfully: true,
      items_generated: generationResult.response.items.length,
      generation_time_ms: generationResult.generationTimeMs,
      input_tokens: generationResult.inputTokens,
      output_tokens: generationResult.outputTokens,
    }).catch(console.error);

    return NextResponse.json({
      path_id: pathWithItems.id,
      path: pathWithItems,
    });
  } catch (error) {
    if (error instanceof PathGenerationError) {
      const statusMap = {
        API_ERROR: 502,
        PARSE_ERROR: 502,
        VALIDATION_ERROR: 502,
        CATALOG_TOO_SMALL: 422,
      } as const;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] },
      );
    }

    console.error('Path regeneration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
