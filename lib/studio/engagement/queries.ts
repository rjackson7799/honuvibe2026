// Engagement reads shared by more than one caller. Takes the Supabase client
// as a parameter so the same query serves the session-scoped admin pages
// (lib/admin/queries.ts, RLS) and the service-role server actions
// (lead-actions.ts, which must know whether a lead is engaged before it will
// accept a status change). Errors are THROWN, never swallowed — a query error
// must be a logged 500, not a silent "no engagement".

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EngagementStage } from './stages';

export interface EngagementRef {
  id: string;
  lead_id: string;
  stage: EngagementStage;
}

/** The engagement a lead owns, or null. UNIQUE (lead_id) guarantees at most one. */
export async function findEngagementForLead(
  client: SupabaseClient,
  leadId: string,
): Promise<EngagementRef | null> {
  const { data, error } = await client
    .from('engagements')
    .select('id, lead_id, stage')
    .eq('lead_id', leadId)
    .maybeSingle();
  if (error) throw error;
  return (data as EngagementRef | null) ?? null;
}
