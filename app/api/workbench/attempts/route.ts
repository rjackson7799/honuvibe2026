// GET /api/workbench/attempts?scenarioId=<uuid> — the caller's attempts for a
// scenario, newest version first. Powers the workspace version-history dropdown.
// RLS (workbench_attempts_own_read) scopes results to the caller.

import { NextRequest, NextResponse } from 'next/server';
import { requireVaultAccess } from '@/lib/vault/access';
import { getAttemptsForScenario } from '@/lib/workbench/queries';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const { hasAccess, userId } = await requireVaultAccess();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!hasAccess) {
    return NextResponse.json({ error: 'Vault access required' }, { status: 403 });
  }

  const scenarioId = request.nextUrl.searchParams.get('scenarioId');
  if (!scenarioId || !UUID_REGEX.test(scenarioId)) {
    return NextResponse.json({ error: 'Invalid scenarioId' }, { status: 400 });
  }

  const attempts = await getAttemptsForScenario(scenarioId);
  return NextResponse.json({ attempts });
}
