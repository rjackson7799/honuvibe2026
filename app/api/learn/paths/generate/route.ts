import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStudyPath, PathGenerationError } from '@/lib/paths/generate';
import { createPath, saveGenerationLog } from '@/lib/paths/queries';
import { pathIntakeSchema } from '@/lib/paths/validation';
import { GENERATION_PROMPT_VERSION } from '@/lib/paths/prompt';
import { hasPremiumAccess } from '@/lib/paths/access';
import type { PathIntakeInput } from '@/lib/paths/types';

export const maxDuration = 60;

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
    const parsed = pathIntakeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid path preferences' }, { status: 400 });

    // Get user tier (mirrors the viewer's premium check: admin/trialing/grace included)
    const { data: profile } = await supabase
      .from('users')
      .select('role, subscription_tier, subscription_status, subscription_expires_at')
      .eq('id', user.id)
      .single();

    const userTier: 'free' | 'vault' =
      profile &&
      hasPremiumAccess({
        role: profile.role ?? 'student',
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        subscription_expires_at: profile.subscription_expires_at,
      })
        ? 'vault'
        : 'free';

    // Generate path via Claude
    const input: PathIntakeInput = parsed.data;

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
        QUOTA_EXCEEDED: 429,
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
