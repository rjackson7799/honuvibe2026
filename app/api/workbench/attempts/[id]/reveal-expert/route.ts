// POST /api/workbench/attempts/[id]/reveal-expert — reveal the scenario's
// expert prompt/output/why for an attempt the caller owns.
//
// Reveal is gated by attempt existence: expert content is only ever returned
// once the member has at least one attempt (i.e. has actually run the scenario).
// Idempotent — sets expert_revealed_at once, then returns the (bilingual) expert
// content; the client picks the locale. Mirrors the score route's admin-write
// pattern (workbench_attempts has no client write policy).

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireVaultAccess } from '@/lib/vault/access';
import {
  getWorkbenchAttemptById,
  getWorkbenchScenarioById,
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

  // RLS own_read — 404 covers both not-found and not-owned. No attempt => no
  // reveal, which is the gate (expert content only after a successful run).
  const attempt = await getWorkbenchAttemptById(attemptId);
  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
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
