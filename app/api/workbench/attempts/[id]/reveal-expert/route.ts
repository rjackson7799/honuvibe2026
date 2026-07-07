// POST /api/workbench/attempts/[id]/reveal-expert — reveal the scenario's
// expert prompt/output/why for an attempt the caller owns.
//
// Reveal is gated on scoring: expert content requires at least one SCORED
// attempt on the scenario (a throwaway run isn't enough — the practice loop is
// run → score → compare). Attempts that were already revealed under the old
// any-run gate are grandfathered in. Idempotent — sets expert_revealed_at once,
// then returns the (bilingual) expert content; the client picks the locale.
// Mirrors the score route's admin-write pattern (workbench_attempts has no
// client write policy).

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireVaultAccess } from '@/lib/vault/access';
import {
  getWorkbenchAttemptById,
  getWorkbenchScenarioById,
  userHasScoredAttempt,
} from '@/lib/workbench/queries';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { hasAccess, userId } = await requireVaultAccess();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!hasAccess) {
    return NextResponse.json({ error: 'Vault access required' }, { status: 403 });
  }

  const { id: attemptId } = await ctx.params;
  if (!UUID_REGEX.test(attemptId)) {
    return NextResponse.json({ error: 'Invalid attempt id' }, { status: 400 });
  }

  // RLS own_read — 404 covers both not-found and not-owned.
  const attempt = await getWorkbenchAttemptById(attemptId);
  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }

  // Scored-attempt gate. Already-revealed attempts stay accessible; otherwise
  // this attempt (or any sibling attempt on the scenario) must be scored first.
  if (!attempt.expert_revealed_at && !attempt.scored_at) {
    const hasScored = await userHasScoredAttempt(attempt.scenario_id);
    if (!hasScored) {
      return NextResponse.json(
        { error: 'Score at least one attempt before revealing the expert version' },
        { status: 403 },
      );
    }
  }

  const scenario = await getWorkbenchScenarioById(attempt.scenario_id);
  if (!scenario) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  // Stamp the reveal once (idempotent); guarded so a re-reveal is a no-op.
  if (!attempt.expert_revealed_at) {
    const admin = createAdminClient();
    const { error } = await admin
      .from('workbench_attempts')
      .update({ expert_revealed_at: new Date().toISOString() })
      .eq('id', attemptId)
      .is('expert_revealed_at', null);
    if (error) {
      console.error('[workbench/reveal-expert] stamp error:', error.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return NextResponse.json({
    expert_prompt_en: scenario.expert_prompt_en,
    expert_prompt_jp: scenario.expert_prompt_jp,
    expert_output_en: scenario.expert_output_en,
    expert_output_jp: scenario.expert_output_jp,
    why_this_works_en: scenario.why_this_works_en,
    why_this_works_jp: scenario.why_this_works_jp,
  });
}
