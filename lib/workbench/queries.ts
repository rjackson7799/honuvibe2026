// Apply-It Workbench — typed Supabase access helpers (mirrors lib/vault/queries.ts).
// Grows across build steps; for now it holds the scenario lookup the /run route
// needs to validate access before consuming quota.

import { createClient, createAdminClient } from '@/lib/supabase/server';
import type {
  WorkbenchAttempt,
  WorkbenchScenario,
} from '@/lib/workbench/types';

export interface AdminWorkbenchScenarioListItem extends WorkbenchScenario {
  /** Total member attempts against this scenario (a usage signal for the list). */
  attempt_count: number;
}

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

/**
 * Published scenarios for the member-facing library, using the request user's
 * client so RLS enforces visibility (workbench_scenarios_read: published AND
 * has_vault_access). Non-Vault members get an empty list; the page gates on
 * access before calling this. Featured scenarios first, then newest.
 */
export async function getPublishedScenarios(): Promise<WorkbenchScenario[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('workbench_scenarios')
    .select('*')
    .eq('is_published', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });
  return (data as WorkbenchScenario[] | null) ?? [];
}

/**
 * Fetch one attempt by id using the request user's client, so RLS enforces
 * ownership (own_read for members; admin_read for admins). Returns null when the
 * attempt does not exist or is not visible to this user. The Score route uses
 * this to gate access before consuming evaluation quota.
 */
export async function getWorkbenchAttemptById(
  attemptId: string,
): Promise<WorkbenchAttempt | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workbench_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (error || !data) return null;
  return data as WorkbenchAttempt;
}

// ---------------------------------------------------------------------------
// Admin authoring reads (service-role client — admins see drafts too)
// ---------------------------------------------------------------------------
// These mirror lib/events/queries.ts getAdminEvents / getAdminEventById. They
// use the service-role client so unpublished scenarios are visible in the admin
// portal (the session-scoped getWorkbenchScenarioById above is RLS-gated and
// only returns published scenarios to members).

/** All scenarios (newest first) with per-scenario attempt counts. Admin only. */
export async function getAdminWorkbenchScenarios(): Promise<
  AdminWorkbenchScenarioListItem[]
> {
  const admin = createAdminClient();
  const { data: scenarios, error } = await admin
    .from('workbench_scenarios')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const { data: attempts } = await admin
    .from('workbench_attempts')
    .select('scenario_id');

  const counts = new Map<string, number>();
  for (const a of attempts ?? []) {
    counts.set(a.scenario_id, (counts.get(a.scenario_id) ?? 0) + 1);
  }

  return (scenarios ?? []).map((s) => ({
    ...(s as WorkbenchScenario),
    attempt_count: counts.get(s.id) ?? 0,
  }));
}

/** A single scenario by id, including drafts. Admin only. */
export async function getAdminWorkbenchScenarioById(
  id: string,
): Promise<WorkbenchScenario | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('workbench_scenarios')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as WorkbenchScenario | null) ?? null;
}
