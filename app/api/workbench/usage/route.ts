// GET /api/workbench/usage — today's run/score quota usage for the usage meter.
//
// Read-only; the caps are enforced server-side by workbench_consume_quota. This
// just reports used vs cap so the workspace can render the remaining budget.

import { NextResponse } from 'next/server';
import { requireVaultAccess } from '@/lib/vault/access';
import { getTodayUsage } from '@/lib/workbench/queries';
import { WORKBENCH_DAILY_CAPS } from '@/lib/workbench/models';

export async function GET() {
  const { hasAccess, userId } = await requireVaultAccess();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!hasAccess) {
    return NextResponse.json({ error: 'Vault access required' }, { status: 403 });
  }

  const usage = await getTodayUsage();
  return NextResponse.json({
    runs: { used: usage.runs, cap: WORKBENCH_DAILY_CAPS.runs },
    scores: { used: usage.scores, cap: WORKBENCH_DAILY_CAPS.scores },
  });
}
