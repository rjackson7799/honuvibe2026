import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStudyPath, PathGenerationError } from '@/lib/paths/generate';
import {
  getPathWithItems,
  archivePath,
  createPath,
  saveGenerationLog,
} from '@/lib/paths/queries';
import { GENERATION_PROMPT_VERSION } from '@/lib/paths/prompt';
import { hasPremiumAccess } from '@/lib/paths/access';
import type { PathIntakeInput } from '@/lib/paths/types';
import { pathFeedbackSchema, pathIntakeSchema } from '@/lib/paths/validation';

export const maxDuration = 60;

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

    // Parse optional feedback
    const parsed = pathFeedbackSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });
    const feedback = parsed.data.feedback;

    const stored = pathIntakeSchema.safeParse({
      ...oldPath,
      // Older regenerated paths may include feedback; bound subsequent input.
      goal_description: oldPath.goal_description.slice(0, 500),
      focus_areas: oldPath.focus_areas ?? [],
    });
    if (!stored.success) return NextResponse.json({ error: 'Please create a new path with valid preferences' }, { status: 400 });

    // Build new goal with feedback appended
    let goalDescription = stored.data.goal_description;
    if (feedback && feedback.trim().length > 0) {
      goalDescription = `${stored.data.goal_description} | Feedback: ${feedback}`;
    }

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

    const input: PathIntakeInput = {
      goal_description: goalDescription,
      difficulty_preference: stored.data.difficulty_preference,
      language_preference: stored.data.language_preference,
      focus_areas: stored.data.focus_areas,
    };

    const generationResult = await generateStudyPath(input, user.id, userTier);
    const pathWithItems = await createPath(input, user.id, generationResult);

    // Archive the old path only after the replacement exists — a failed
    // generation must not strand the user with no path at all.
    await archivePath(id);

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

    console.error('Path regeneration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
