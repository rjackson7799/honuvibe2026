// Ryan's "proposal accepted" notification. A plain server module (NOT
// 'use server') — the notify.ts rule: it takes a Supabase client and rows, so
// exporting it from the actions file would make it a public server-action
// endpoint with attacker-controlled arguments. Shared by markProposalAccepted
// / resendAcceptNotification (slice A) and the client accept route's after()
// (slice B).
//
// Best-effort, not transactional: the durable "Ryan must look at this" signal
// is the needs_attention proposal_accepted event the RPC wrote. Here we stamp
// notification_sent_at ONLY when the provider accepted the email, so the
// panel's "Notification not sent — resend" state is truthful.

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendProposalAcceptedAdminNotification } from './emails';
import { formatMinorUnits } from './format';
import { adminEngagementUrl } from './notify';
import type { Engagement, EngagementProposal } from '@/lib/admin/types';

export async function notifyProposalAccepted(
  admin: SupabaseClient,
  proposal: EngagementProposal,
  engagement: Engagement,
  stageMoved: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const sent = await sendProposalAcceptedAdminNotification({
    businessName: engagement.title,
    contactName: engagement.client_contact_name,
    contactEmail: engagement.client_contact_email,
    acceptedByName: proposal.accepted_by_name ?? '',
    via: proposal.accepted_via ?? 'admin',
    totalBuild: formatMinorUnits(proposal.total_build, proposal.currency),
    monthlyCare: formatMinorUnits(proposal.total_monthly, proposal.currency),
    currency: proposal.currency,
    version: proposal.version,
    stageMoved,
    engagementUrl: adminEngagementUrl(engagement.id),
  });

  if (sent.ok) {
    const { error } = await admin
      .from('engagement_proposals')
      .update({ notification_sent_at: new Date().toISOString() })
      .eq('id', proposal.id);
    if (error) console.error('[proposal] notification_sent_at stamp failed:', error);
    await admin.from('engagement_events').insert({
      engagement_id: engagement.id,
      kind: 'notification_sent',
      actor: 'system',
      summary: `Acceptance notification for proposal v${proposal.version} emailed to the studio`,
      data: { proposal_id: proposal.id, version: proposal.version },
    });
    return { ok: true };
  }

  console.error('[proposal] acceptance notification failed:', sent.error);
  await admin.from('engagement_events').insert({
    engagement_id: engagement.id,
    kind: 'notification_failed',
    actor: 'system',
    summary: `Acceptance notification for proposal v${proposal.version} FAILED — resend from the proposal panel`,
    data: { proposal_id: proposal.id, version: proposal.version },
  });
  return { ok: false, error: sent.error };
}
