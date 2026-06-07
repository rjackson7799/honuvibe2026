// POST /api/workbench/attempts/[id]/score — score an existing attempt.
//
// Flow (docs/plans/2026-05-27-apply-it-workbench-v1.md → API routes), mirroring
// /api/workbench/run with p_kind = 'score':
//   1. requireVaultAccess()
//   2. validate the attempt id
//   3. read the attempt via RLS (own_read) — 404 if not visible
//   4. reject re-scoring (one score per attempt; revise = new attempt) -> 409
//   5. load the scenario for rubric context (applicable dimensions, bilingual)
//   6. consume 'score' quota atomically (429 if at cap — no provider call)
//   7. call the Sonnet evaluator; on any failure refund quota + 502
//   8. persist scores/overall/strengths/improvements with a race-safe guard
//   9. return the scoring result for the rubric panel

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireVaultAccess } from '@/lib/vault/access';
import {
  getWorkbenchAttemptById,
  getWorkbenchScenarioById,
} from '@/lib/workbench/queries';
import { evaluateAttempt, EvaluatorError } from '@/lib/workbench/evaluator';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AdminClient = ReturnType<typeof createAdminClient>;

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Auth + Vault gate.
    const { hasAccess, userId } = await requireVaultAccess();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasAccess) {
      return NextResponse.json({ error: 'Vault access required' }, { status: 403 });
    }

    // 2. Validate the attempt id.
    const { id: attemptId } = await ctx.params;
    if (!UUID_REGEX.test(attemptId)) {
      return NextResponse.json({ error: 'Invalid attempt id' }, { status: 400 });
    }

    // 3. Read the attempt under RLS — 404 covers both not-found and not-owned.
    const attempt = await getWorkbenchAttemptById(attemptId);
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // 4. One score per attempt — revising means creating a new attempt.
    if (attempt.scored_at) {
      return NextResponse.json(
        { error: 'This attempt has already been scored' },
        { status: 409 },
      );
    }

    // 5. Load the scenario for the rubric (applicable dimensions + bilingual copy).
    const scenario = await getWorkbenchScenarioById(attempt.scenario_id);
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const admin = createAdminClient();

    // 6. Consume the evaluation quota atomically. false => at the daily cap.
    const { data: consumed, error: consumeError } = await admin.rpc(
      'workbench_consume_quota',
      { p_user_id: userId, p_kind: 'score' },
    );
    if (consumeError) {
      console.error('[workbench/score] consume quota error:', consumeError.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    if (!consumed) {
      return NextResponse.json(
        { error: 'Daily evaluation limit reached' },
        { status: 429 },
      );
    }

    // 7. Evaluate. On any provider/parse/schema failure, refund + 502.
    let result;
    try {
      result = await evaluateAttempt({
        scenario,
        attempt: {
          language: attempt.language,
          prompt_text: attempt.prompt_text,
          output_text: attempt.output_text,
        },
      });
    } catch (err) {
      await refundScore(admin, userId);
      if (err instanceof EvaluatorError) {
        console.error(`[workbench/score] evaluator ${err.code}:`, err.message);
        return NextResponse.json(
          { error: 'The evaluator could not score this attempt. Please try again.' },
          { status: 502 },
        );
      }
      throw err;
    }

    // 8. Persist — guarded on scored_at IS NULL so a concurrent score can't
    //    double-write (and we don't double-charge the loser).
    const { data: updated, error: updateError } = await admin
      .from('workbench_attempts')
      .update({
        scores_json: result.scores,
        overall_score: result.overallScore,
        strengths: result.strengths,
        improvements: result.improvements,
        scored_at: new Date().toISOString(),
      })
      .eq('id', attemptId)
      .is('scored_at', null)
      .select('id');

    if (updateError) {
      await refundScore(admin, userId);
      console.error('[workbench/score] persist error:', updateError.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      // A concurrent request scored it first — refund this one and report 409.
      await refundScore(admin, userId);
      return NextResponse.json(
        { error: 'This attempt has already been scored' },
        { status: 409 },
      );
    }

    // 9. Return the result for the rubric panel.
    return NextResponse.json({
      scores: result.scores,
      overallScore: result.overallScore,
      strengths: result.strengths,
      improvements: result.improvements,
      dimensions: result.dimensions,
    });
  } catch (error) {
    console.error('[workbench/score] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function refundScore(admin: AdminClient, userId: string): Promise<void> {
  const { error } = await admin.rpc('workbench_refund_quota', {
    p_user_id: userId,
    p_kind: 'score',
  });
  if (error) {
    // Don't fail the request on a refund miss — log for reconciliation.
    console.error('[workbench/score] refund quota error:', error.message);
  }
}
