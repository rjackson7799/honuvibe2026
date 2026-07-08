/**
 * Send (or resend) the instructor cohort summary for a course survey. Mirrors
 * the event presenter-summary sender: claims a delivery row, regenerates, sends
 * only when the provider accepts, and is retryable. To = the course's
 * instructor(s) (via course_instructors), BCC = admins.
 */
import { createAdminClient } from '@/lib/supabase/server';
import { getCourseResponseCount } from '@/lib/survey/course-surveys';
import {
  regenerateCourseSurveySummary,
  getCourseSummaryForSend,
  type CourseStats,
} from '@/lib/survey/course-summary';
import { sendCourseSummaryEmail } from '@/lib/email/send';
import { getAdminRecipients } from '@/lib/email/recipients';

type Admin = ReturnType<typeof createAdminClient>;
const DELIVERY = 'course_survey_summary_delivery';

function buildTopStats(stats: CourseStats) {
  return stats.questions.flatMap((q) => {
    if (q.qtype === 'text') return [];
    const rows = q.counts
      .filter((c) => c.n > 0)
      .slice(0, 5)
      .map((c) => ({ label: c.labelEn, value: String(c.n) }));
    if (rows.length === 0) return [];
    return [{ prompt: q.promptEn, rows }];
  });
}

async function instructorEmails(supabase: Admin, courseId: string): Promise<string[]> {
  const { data: ci } = await supabase
    .from('course_instructors')
    .select('instructor_profiles!inner(user_id)')
    .eq('course_id', courseId);
  const userIds = ((ci ?? []) as unknown as Array<{ instructor_profiles: { user_id: string } }>)
    .map((r) => r.instructor_profiles?.user_id)
    .filter(Boolean);
  if (userIds.length === 0) return [];
  const { data: users } = await supabase.from('users').select('email').in('id', userIds);
  return ((users ?? []) as Array<{ email: string | null }>)
    .map((u) => u.email)
    .filter((e): e is string => !!e);
}

export async function sendCourseSummary(
  surveyId: string,
  via: 'manual' | 'cron',
  opts?: { force?: boolean },
): Promise<{ sent: boolean; reason?: string }> {
  const force = opts?.force ?? false;
  const supabase = createAdminClient();

  const { data: surveyRow } = await supabase
    .from('surveys')
    .select('course_id')
    .eq('id', surveyId)
    .maybeSingle();
  const courseId = (surveyRow?.course_id as string | null) ?? null;
  if (!courseId) return { sent: false, reason: 'no_course' };

  const to = await instructorEmails(supabase, courseId);
  if (to.length === 0) return { sent: false, reason: 'no_instructor_email' };

  if ((await getCourseResponseCount(surveyId)) === 0) {
    return { sent: false, reason: 'no_responses' };
  }

  await supabase.from(DELIVERY).upsert({ survey_id: surveyId }, { onConflict: 'survey_id', ignoreDuplicates: true });
  const { data: del } = await supabase
    .from(DELIVERY)
    .select('status, sent_at, attempt_count')
    .eq('survey_id', surveyId)
    .single();

  if (!force) {
    if (del?.sent_at) return { sent: false, reason: 'already_sent' };
    if (del?.status === 'sending') return { sent: false, reason: 'in_progress' };
  }

  const nowIso = new Date().toISOString();
  let claim = supabase
    .from(DELIVERY)
    .update({
      status: 'sending',
      attempt_count: (del?.attempt_count ?? 0) + 1,
      last_attempt_at: nowIso,
      last_via: via,
      updated_at: nowIso,
    })
    .eq('survey_id', surveyId);
  if (!force) claim = claim.is('sent_at', null).neq('status', 'sending');
  const { data: claimed, error: claimErr } = await claim.select('survey_id');
  if (claimErr) return { sent: false, reason: 'claim_failed' };
  if (!force && (!claimed || claimed.length === 0)) return { sent: false, reason: 'race' };

  await regenerateCourseSurveySummary(surveyId);
  const summary = await getCourseSummaryForSend(surveyId);
  if (!summary) {
    await supabase
      .from(DELIVERY)
      .update({ status: 'failed', last_error: 'summary_unavailable', updated_at: new Date().toISOString() })
      .eq('survey_id', surveyId);
    return { sent: false, reason: 'summary_unavailable' };
  }

  const bcc = getAdminRecipients().filter(
    (a) => !to.some((t) => t.toLowerCase() === a.toLowerCase()),
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const result = await sendCourseSummaryEmail({
    to,
    bcc,
    locale: 'en',
    courseTitle: summary.courseTitle,
    responseCount: summary.responseCount,
    summaryText: summary.content.summary_text,
    keyTakeaways: summary.content.key_takeaways,
    teachingFocus: summary.content.teaching_focus,
    instructorNotes: summary.content.instructor_notes,
    topStats: buildTopStats(summary.stats),
    adminUrl: `${siteUrl}/admin/course-surveys/${courseId}`,
  });

  const finishedIso = new Date().toISOString();
  if (result.ok) {
    await supabase
      .from(DELIVERY)
      .update({
        status: 'sent',
        sent_at: finishedIso,
        provider_message_id: result.providerId ?? null,
        last_error: null,
        recipient_to: to,
        recipient_cc: bcc,
        updated_at: finishedIso,
      })
      .eq('survey_id', surveyId);
    return { sent: true };
  }

  await supabase
    .from(DELIVERY)
    .update({ status: 'failed', last_error: result.error ?? 'send_failed', updated_at: finishedIso })
    .eq('survey_id', surveyId);
  return { sent: false, reason: result.error ?? 'send_failed' };
}
