// POST /api/admin/workbench/draft — AI-draft a scenario's English fields from a
// one-line idea. Admin-only; the result prefills the scenario form and is never
// saved directly (human review always happens before the row exists).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { AuthoringError, generateScenarioDraft } from '@/lib/workbench/authoring';
import {
  workbenchDifficultySchema,
  workbenchDomainSchema,
} from '@/lib/workbench/types';

export const maxDuration = 120;

const bodySchema = z.object({
  idea: z.string().trim().min(4).max(500),
  domain: workbenchDomainSchema,
  difficulty: workbenchDifficultySchema,
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
    const draft = await generateScenarioDraft(parsed.data);
    return NextResponse.json(draft);
  } catch (err) {
    if (err instanceof AuthoringError) {
      console.error('[admin/workbench/draft]', err.code, err.message);
      return NextResponse.json(
        { error: `Draft assist failed (${err.code})` },
        { status: 502 },
      );
    }
    console.error('[admin/workbench/draft]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
