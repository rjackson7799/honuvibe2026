import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authorizeSession } from '@/lib/discover/session';

// POST /api/discover/answer — auto-save a single answer. Upserts on
// (session_id, question_id) so editing never creates a duplicate row, bumps the
// session step, and flips the lead lifecycle new → in_progress on first save.

const schema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().min(1).max(64),
  // answer is free-form (string | string[] | object) — stored as jsonb.
  answer: z.unknown(),
  isDecideForMe: z.boolean().optional().default(false),
  step: z.number().int().min(1).max(3).optional(),
});

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { sessionId, questionId, answer, isDecideForMe, step } = parsed.data;

  const auth = await authorizeSession(sessionId);
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const { supabase, session } = auth;

  const { error: upsertError } = await supabase.from('discovery_responses').upsert(
    {
      session_id: sessionId,
      question_id: questionId,
      answer: answer ?? null,
      is_decide_for_me: isDecideForMe,
    },
    { onConflict: 'session_id,question_id' },
  );

  if (upsertError) {
    console.error('[discover/answer] upsert failed:', upsertError.message);
    return NextResponse.json({ error: 'Could not save answer' }, { status: 500 });
  }

  if (typeof step === 'number' && step !== session.current_step) {
    await supabase.from('discovery_sessions').update({ current_step: step }).eq('id', sessionId);
  }

  // First saved answer advances the lifecycle (only from 'new').
  await supabase
    .from('leads')
    .update({ lifecycle: 'in_progress' })
    .eq('id', session.lead_id)
    .eq('lifecycle', 'new');

  return NextResponse.json({ ok: true });
}
