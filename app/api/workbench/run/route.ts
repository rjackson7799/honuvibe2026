// POST /api/workbench/run — attempt-centric run endpoint.
//
// Flow (docs/plans/2026-05-27-apply-it-workbench-v1.md → API routes):
//   1. requireVaultAccess()
//   2. validate body (prompt length cap, model availability, language)
//   3. confirm the scenario exists / is visible (RLS) BEFORE touching quota
//   4. consume 'run' quota atomically (429 if at cap — no provider call)
//   5. call the chosen executor; on provider failure refund quota + 502
//   6. persist the attempt via the SECURITY DEFINER RPC (server-assigned,
//      monotonic version; 1 retry on a concurrent version collision)
//   7. return { attemptId, outputText, version, model }

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireVaultAccess } from '@/lib/vault/access';
import { getWorkbenchScenarioById } from '@/lib/workbench/queries';
import { getAvailableExecutorModels } from '@/lib/workbench/models';
import { runExecutor, ExecutorError } from '@/lib/workbench/executors';
import {
  workbenchExecutorModelSchema,
  workbenchLanguageSchema,
} from '@/lib/workbench/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PROMPT_CHARS = 4000;

const RunBodySchema = z.object({
  scenarioId: z.string().regex(UUID_REGEX, 'Invalid scenario id'),
  promptText: z
    .string()
    .trim()
    .min(1, 'Prompt is required')
    .max(MAX_PROMPT_CHARS, `Prompt must be ${MAX_PROMPT_CHARS} characters or less`),
  language: workbenchLanguageSchema,
  model: workbenchExecutorModelSchema,
});

type AdminClient = ReturnType<typeof createAdminClient>;

export async function POST(request: NextRequest) {
  try {
    // 1. Auth + Vault gate.
    const { hasAccess, userId } = await requireVaultAccess();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!hasAccess) {
      return NextResponse.json({ error: 'Vault access required' }, { status: 403 });
    }

    // 2. Validate body.
    let body: z.infer<typeof RunBodySchema>;
    try {
      body = RunBodySchema.parse(await request.json());
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!getAvailableExecutorModels().includes(body.model)) {
      return NextResponse.json(
        { error: `Model "${body.model}" is not available` },
        { status: 400 },
      );
    }

    // 3. Scenario must exist and be visible to this user (RLS) — before quota,
    //    so a bad scenario id never costs the student a run.
    const scenario = await getWorkbenchScenarioById(body.scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const admin = createAdminClient();

    // 4. Consume the run quota atomically. false => at the daily cap.
    const { data: consumed, error: consumeError } = await admin.rpc(
      'workbench_consume_quota',
      { p_user_id: userId, p_kind: 'run' },
    );
    if (consumeError) {
      console.error('[workbench/run] consume quota error:', consumeError.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    if (!consumed) {
      return NextResponse.json({ error: 'Daily run limit reached' }, { status: 429 });
    }

    // 5. Execute. On any provider/parse failure, refund the run and return 502.
    let outputText: string;
    try {
      ({ outputText } = await runExecutor({
        model: body.model,
        promptText: body.promptText,
      }));
    } catch (err) {
      await refundRun(admin, userId);
      if (err instanceof ExecutorError) {
        console.error(`[workbench/run] executor ${err.code}:`, err.message);
        return NextResponse.json(
          { error: 'The AI provider could not complete the run. Please try again.' },
          { status: 502 },
        );
      }
      throw err;
    }

    // 6. Persist the attempt (server-assigned monotonic version, 1 retry).
    let attemptId: string;
    try {
      attemptId = await createAttempt(admin, {
        userId,
        scenarioId: body.scenarioId,
        language: body.language,
        model: body.model,
        promptText: body.promptText,
        outputText,
      });
    } catch (err) {
      await refundRun(admin, userId);
      console.error('[workbench/run] create attempt failed:', err);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // 7. Resolve the assigned version for the response.
    const { data: attemptRow } = await admin
      .from('workbench_attempts')
      .select('version')
      .eq('id', attemptId)
      .single();

    return NextResponse.json({
      attemptId,
      outputText,
      version: (attemptRow?.version as number | undefined) ?? null,
      model: body.model,
    });
  } catch (error) {
    console.error('[workbench/run] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function refundRun(admin: AdminClient, userId: string): Promise<void> {
  const { error } = await admin.rpc('workbench_refund_quota', {
    p_user_id: userId,
    p_kind: 'run',
  });
  if (error) {
    // Don't fail the request on a refund miss — log for reconciliation.
    console.error('[workbench/run] refund quota error:', error.message);
  }
}

interface CreateAttemptParams {
  userId: string;
  scenarioId: string;
  language: string;
  model: string;
  promptText: string;
  outputText: string;
}

async function createAttempt(
  admin: AdminClient,
  params: CreateAttemptParams,
): Promise<string> {
  // workbench_create_attempt assigns coalesce(max(version),0)+1 inside the RPC;
  // concurrent runs can collide on unique(user_id, scenario_id, version), so the
  // loser (Postgres 23505) retries once with the next version.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await admin.rpc('workbench_create_attempt', {
      p_user_id: params.userId,
      p_scenario_id: params.scenarioId,
      p_language: params.language,
      p_executor_model: params.model,
      p_prompt_text: params.promptText,
      p_output_text: params.outputText,
    });

    if (!error && data) return data as string;
    if (error?.code === '23505' && attempt === 0) continue;
    throw new Error(error?.message ?? 'Failed to create attempt');
  }
  throw new Error('Failed to create attempt after version-collision retry');
}
