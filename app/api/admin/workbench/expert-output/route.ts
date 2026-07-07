// POST /api/admin/workbench/expert-output — run an expert prompt through one of
// the real executor models to produce the expert output, instead of the admin
// hand-writing what a model "would" say. Admin-only; no quota (a single
// executor call, and members never reach this route).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ExecutorError, runExecutor } from '@/lib/workbench/executors';
import { workbenchExecutorModelSchema } from '@/lib/workbench/types';

export const maxDuration = 60;

const bodySchema = z.object({
  promptText: z.string().trim().min(1).max(8000),
  model: workbenchExecutorModelSchema,
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
    const { outputText } = await runExecutor(parsed.data);
    return NextResponse.json({ outputText });
  } catch (err) {
    if (err instanceof ExecutorError) {
      console.error('[admin/workbench/expert-output]', err.code, err.message);
      return NextResponse.json(
        { error: `Executor failed (${err.code})` },
        { status: 502 },
      );
    }
    console.error('[admin/workbench/expert-output]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
