// Ryan's "questionnaire submitted" notification. A plain server module (NOT
// 'use server') because it takes a Supabase client and a row: exporting it
// from the actions file would have made it a public server-action endpoint
// with attacker-controlled arguments. Shared by the client submit route (first
// attempt, after applied:true) and resendNotification() in
// questionnaire-actions.ts (the panel's "Notification not sent — resend").
//
// Notification is best-effort, not transactional: the durable "Ryan must look
// at this" signal is the needs_attention event the RPC wrote. Here we only
// stamp notification_sent_at when the provider ACCEPTED the email, so the
// panel's resend state is truthful.

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendDiscoverySubmittedAdminNotification } from './emails';
import { isAnswerPresent } from './validate-answers';
import type { Engagement, EngagementQuestionnaire } from '@/lib/admin/types';

export function adminEngagementUrl(engagementId: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai').replace(/\/+$/, '');
  return `${base}/admin/studio/engagements/${engagementId}`;
}

export async function notifySubmission(
  admin: SupabaseClient,
  q: EngagementQuestionnaire,
  engagement: Engagement,
): Promise<{ ok: boolean; error?: string }> {
  const snapshot = q.answer_snapshot;
  const questionCount = snapshot?.questions.length ?? (Array.isArray(q.questions) ? q.questions.length : 0);
  const answeredCount = snapshot
    ? snapshot.answers.filter((a) => isAnswerPresent(a.answer, a.other_text)).length
    : 0;

  const sent = await sendDiscoverySubmittedAdminNotification({
    businessName: engagement.title,
    contactName: engagement.client_contact_name,
    contactEmail: engagement.client_contact_email,
    questionnaireTitle: q.title,
    answeredCount,
    questionCount,
    engagementUrl: adminEngagementUrl(engagement.id),
  });

  if (sent.ok) {
    const { error } = await admin
      .from('engagement_questionnaires')
      .update({ notification_sent_at: new Date().toISOString() })
      .eq('id', q.id);
    if (error) console.error('[questionnaire] notification_sent_at stamp failed:', error);
    await admin.from('engagement_events').insert({
      engagement_id: engagement.id,
      kind: 'notification_sent',
      actor: 'system',
      summary: 'Submission notification emailed to the studio',
      data: { questionnaire_id: q.id },
    });
    return { ok: true };
  }

  console.error('[questionnaire] submission notification failed:', sent.error);
  await admin.from('engagement_events').insert({
    engagement_id: engagement.id,
    kind: 'notification_failed',
    actor: 'system',
    summary: 'Submission notification email FAILED — resend from the discovery panel',
    data: { questionnaire_id: q.id },
  });
  return { ok: false, error: sent.error };
}
