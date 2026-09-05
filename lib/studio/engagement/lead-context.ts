// The lead-side context both AI calls share: the lead row's business facts and
// the latest website-audit summary. Loaded through the service-role client by
// the tailor route (synchronous) and the brief runner (after()). Every string
// here is untrusted — industry / notes are operator-typed, existing_url and
// the audit summary derive from an attacker-controlled website — and is
// neutralized + delimited by the generator before it reaches the model.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface LeadContext {
  company: string;
  contactName: string | null;
  industry: string | null;
  existingUrl: string | null;
  notes: string | null;
  /** summary_md of the newest completed/partial audit, or null. */
  auditSummary: string | null;
  auditedUrl: string | null;
}

export async function loadLeadContext(
  admin: SupabaseClient,
  leadId: string,
  fallbackCompany: string,
): Promise<LeadContext> {
  const { data: lead, error } = await admin
    .from('leads')
    .select('business_name, name, industry, existing_url, notes')
    .eq('id', leadId)
    .maybeSingle();
  if (error) {
    // A context-free tailoring run would silently produce a generic questionnaire;
    // fail the run (curated 'internal') instead.
    console.error('[engagement/lead-context] lead load failed:', error.message);
    throw new Error('lead load failed');
  }

  const { data: audit, error: auditErr } = await admin
    .from('lead_audits')
    .select('summary_md, audited_url, status')
    .eq('lead_id', leadId)
    .in('status', ['completed', 'partial'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (auditErr) console.error('[engagement/lead-context] audit load failed:', auditErr.message);

  const row = (lead ?? {}) as {
    business_name?: string | null;
    name?: string | null;
    industry?: string | null;
    existing_url?: string | null;
    notes?: string | null;
  };
  const a = (audit ?? null) as { summary_md: string | null; audited_url: string | null } | null;

  return {
    company: (row.business_name ?? '').trim() || fallbackCompany,
    contactName: row.name?.trim() || null,
    industry: row.industry?.trim() || null,
    existingUrl: row.existing_url?.trim() || null,
    notes: row.notes?.trim() || null,
    auditSummary: a?.summary_md?.trim() || null,
    auditedUrl: a?.audited_url ?? null,
  };
}
