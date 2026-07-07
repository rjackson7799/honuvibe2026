// POST /api/admin/workbench/sanity-check — score a scenario's expert prompt
// with the REAL member evaluator, so weak "expert" prompts are caught before
// publish. Advisory only — a strong expert prompt should score 90+, and a low
// score is exactly the signal (note the evaluator sees the expert prompt as its
// own reference, which is the point: it should trivially satisfy the rubric).
// Admin-only; no persistence, no quota (~one Sonnet call per click).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { EvaluatorError, evaluateAttempt } from '@/lib/workbench/evaluator';
import {
  workbenchDimensionSchema,
  workbenchLanguageSchema,
  type WorkbenchScenario,
} from '@/lib/workbench/types';

export const maxDuration = 120;

const bodySchema = z.object({
  brief: z.string().trim().min(1),
  expert_prompt: z.string().trim().min(1),
  expert_output: z.string().trim().min(1),
  applicable_dimensions: z.array(workbenchDimensionSchema).min(1),
  language: workbenchLanguageSchema.default('en'),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const body = parsed.data;

  // Synthetic scenario/attempt shaped for evaluateAttempt — only the fields the
  // evaluator reads matter (brief, expert prompt reference, dimensions).
  const scenario: WorkbenchScenario = {
    id: 'sanity-check',
    slug: 'sanity-check',
    title_en: 'Sanity check',
    title_jp: null,
    domain: 'marketing',
    difficulty: 'beginner',
    brief_en: body.brief,
    brief_jp: null,
    applicable_dimensions: body.applicable_dimensions,
    expert_prompt_en: body.expert_prompt,
    expert_prompt_jp: null,
    expert_output_en: body.expert_output,
    expert_output_jp: null,
    why_this_works_en: null,
    why_this_works_jp: null,
    is_published: false,
    is_featured: false,
    jp_needs_review: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const result = await evaluateAttempt({
      scenario,
      attempt: {
        language: body.language,
        prompt_text: body.expert_prompt,
        output_text: body.expert_output,
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof EvaluatorError) {
      console.error('[admin/workbench/sanity-check]', err.code, err.message);
      return NextResponse.json(
        { error: `Sanity check failed (${err.code})` },
        { status: 502 },
      );
    }
    console.error('[admin/workbench/sanity-check]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
