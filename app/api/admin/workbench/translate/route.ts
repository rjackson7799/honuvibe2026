// POST /api/admin/workbench/translate — machine-translate a scenario's English
// fields to Japanese. Admin-only. The client marks the result jp_needs_review,
// which blocks publish until a human reviews it (project rule: never
// machine-translate without human review for production).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { AuthoringError, translateScenarioToJp } from '@/lib/workbench/authoring';

export const maxDuration = 120;

const bodySchema = z.object({
  title_en: z.string().trim().min(1),
  brief_en: z.string().trim().min(1),
  expert_prompt_en: z.string().trim().min(1),
  expert_output_en: z.string().trim().min(1),
  why_this_works_en: z.string().trim().min(1).nullable(),
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

  try {
    const translation = await translateScenarioToJp(parsed.data);
    return NextResponse.json(translation);
  } catch (err) {
    if (err instanceof AuthoringError) {
      console.error('[admin/workbench/translate]', err.code, err.message);
      return NextResponse.json(
        { error: `Translate assist failed (${err.code})` },
        { status: 502 },
      );
    }
    console.error('[admin/workbench/translate]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
