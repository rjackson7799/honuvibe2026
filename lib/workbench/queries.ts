// Apply-It Workbench — typed Supabase access helpers (mirrors lib/vault/queries.ts).
// Grows across build steps; for now it holds the scenario lookup the /run route
// needs to validate access before consuming quota.

import { createClient } from '@/lib/supabase/server';
import type { WorkbenchScenario } from '@/lib/workbench/types';

/**
 * Fetch a scenario by id using the request user's client, so RLS decides
 * visibility (published + has_vault_access for members; all rows for admins).
 * Returns null when the scenario does not exist or the user cannot see it.
 */
export async function getWorkbenchScenarioById(
  scenarioId: string,
): Promise<WorkbenchScenario | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workbench_scenarios')
    .select('*')
    .eq('id', scenarioId)
    .maybeSingle();

  if (error || !data) return null;
  return data as WorkbenchScenario;
}
