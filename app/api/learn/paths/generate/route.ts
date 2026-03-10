import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStudyPath, PathGenerationError } from '@/lib/paths/generate';
import { createPath, saveGenerationLog, getPathGenerationCount } from '@/lib/paths/queries';
import { GENERATION_PROMPT_VERSION } from '@/lib/paths/prompt';
import type { PathIntakeInput } from '@/lib/paths/types';

const MAX_GENERATIONS_PER_DAY = 3;

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

    // Parse and validate body
    const body = await request.json();
    const { goal_description, difficulty_preference, language_preference, focus_areas } =
      body as PathIntakeInput;

    if (!goal_description || goal_description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Goal description is required' },
        { status: 400 },
      );
    }

    if (goal_description.length > 500) {
      return NextResponse.json(
        { error: 'Goal description must be 500 characters or less' },
        { status: 400 },
      );
    }

    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    if (!validDifficulties.includes(difficulty_preference)) {
      return NextResponse.json(
        { error: 'Invalid difficulty preference' },
        { status: 400 },
      );
    }

    const validLanguages = ['en', 'ja'];
    if (!validLanguages.includes(language_preference)) {
      return NextResponse.json(
        { error: 'Invalid language preference' },
        { status: 400 },
      );
    }

    // Rate limit check
    const todayCount = await getPathGenerationCount(user.id, new Date());
    if (todayCount >= MAX_GENERATIONS_PER_DAY) {
      return NextResponse.json(
        { error: 'Daily path generation limit reached (3 per day)' },
        { status: 429 },
      );
    }

    // Get user subscription tier
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const userTier =
      (profile?.subscription_tier as 'free' | 'premium') ?? 'free';

    // Generate path via Claude
    const input: PathIntakeInput = {
      goal_description: goal_description.trim(),
      difficulty_preference,
      language_preference,
      focus_areas: focus_areas ?? [],
    };

    const generationResult = await generateStudyPath(input, user.id, userTier);

    // Save path + items to DB
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

    console.error('Path generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
