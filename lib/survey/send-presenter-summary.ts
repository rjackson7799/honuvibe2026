/**
 * Send (or resend) the presenter summary, used by both the manual admin action
 * and the cron. Delivery state lives in event_presenter_summary_delivery, keyed
 * by stable survey_id: claimed before sending, marked `sent` only when the
 * provider accepts, and retryable on failure. Cron is idempotent (skips an
 * already-sent or in-progress row); manual `force` always (re)sends.
 */
import { createAdminClient } from '@/lib/supabase/server';
import {
  publicEventBySlug,
  publicEventTitle,
  publicEventFormat,
} from '@/lib/events/public-events';
import { formatEventDateTime } from '@/lib/events/format';
import { getEventSurvey, getEventSurveySettings, getResponseCount } from '@/lib/survey/event-surveys';
import {
  regenerateEventSurveySummary,
  getEventSummaryForSend,
  type EventStats,
} from '@/lib/survey/event-summary';
import { sendPresenterSummaryEmail } from '@/lib/email/send';
import { getAdminRecipients } from '@/lib/email/recipients';

const DELIVERY = 'event_presenter_summary_delivery';

function buildTopStats(stats: EventStats, locale: 'en' | 'ja') {
  return stats.questions.flatMap((q) => {
    if (q.qtype === 'text') return [];
    const rows = q.counts
      .filter((c) => c.n > 0)
      .slice(0, 5)
      .map((c) => ({ label: locale === 'ja' ? c.labelJp : c.labelEn, value: String(c.n) }));
    if (rows.length === 0) return [];
    return [{ prompt: locale === 'ja' ? q.promptJp : q.promptEn, rows }];
  });
}

export async function sendPresenterSummary(
  eventSlug: string,
  via: 'manual' | 'cron',
  opts?: { force?: boolean },
): Promise<{ sent: boolean; reason?: string }> {
  const force = opts?.force ?? false;

  const event = publicEventBySlug(eventSlug);
  if (!event) return { sent: false, reason: 'unknown_event' };

  const survey = await getEventSurvey(eventSlug);
  if (!survey) return { sent: false, reason: 'no_survey' };

  const settings = await getEventSurveySettings(survey.id);
  const presenterEmail = settings?.presenterEmail ?? null;
  if (!presenterEmail) return { sent: false, reason: 'no_presenter_email' };

  // Nothing to summarize — skip before claiming / calling the model.
  if ((await getResponseCount(survey.id)) === 0) {
    return { sent: false, reason: 'no_responses' };
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // Ensure a delivery row exists, then read its state.
  await supabase.from(DELIVERY).upsert({ survey_id: survey.id }, { onConflict: 'survey_id', ignoreDuplicates: true });
  const { data: del } = await supabase
    .from(DELIVERY)
    .select('status, sent_at, attempt_count')
    .eq('survey_id', survey.id)
    .single();

  if (!force) {
    if (del?.sent_at) return { sent: false, reason: 'already_sent' };
    if (del?.status === 'sending') return { sent: false, reason: 'in_progress' };
  }

  // Claim atomically: only flip to 'sending' if not already sent/sending.
  let claim = supabase
    .from(DELIVERY)
    .update({
      status: 'sending',
      attempt_count: (del?.attempt_count ?? 0) + 1,
      last_attempt_at: nowIso,
      last_via: via,
      updated_at: nowIso,
    })
    .eq('survey_id', survey.id);
  if (!force) claim = claim.is('sent_at', null).neq('status', 'sending');
  const { data: claimed, error: claimErr } = await claim.select('survey_id');
  if (claimErr) return { sent: false, reason: 'claim_failed' };
  if (!force && (!claimed || claimed.length === 0)) return { sent: false, reason: 'race' };

  // Fresh summary, then read it back. A missing summary means generation failed
  // (e.g. model error) — mark failed so the next attempt retries.
  await regenerateEventSurveySummary(eventSlug);
  const summary = await getEventSummaryForSend(eventSlug);
  if (!summary) {
    await supabase
      .from(DELIVERY)
      .update({
        status: 'failed',
        last_error: 'summary_unavailable',
        updated_at: new Date().toISOString(),
      })
      .eq('survey_id', survey.id);
    return { sent: false, reason: 'summary_unavailable' };
  }

  const presenterLocale = settings?.presenterLocale ?? 'en';
  const bcc = getAdminRecipients().filter(
    (a) => a.toLowerCase() !== presenterEmail.toLowerCase(),
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const result = await sendPresenterSummaryEmail({
    to: presenterEmail,
    bcc,
    locale: presenterLocale,
    eventTitle: publicEventTitle(event, presenterLocale),
    eventWhen: formatEventDateTime(event.startsAt, event.timezone, presenterLocale),
    eventFormat: publicEventFormat(event, presenterLocale),
    responseCount: summary.responseCount,
    summaryText: summary.content.summary_text,
    keyTakeaways: summary.content.key_takeaways,
    focusTopics: summary.content.focus_topics,
    presenterPrepNotes: summary.content.presenter_prep_notes,
    topStats: buildTopStats(summary.stats, presenterLocale),
    eventAdminUrl: `${siteUrl}/admin/event-registrations`,
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
        recipient_to: presenterEmail,
        recipient_cc: bcc,
        updated_at: finishedIso,
      })
      .eq('survey_id', survey.id);
    return { sent: true };
  }

  await supabase
    .from(DELIVERY)
    .update({ status: 'failed', last_error: result.error ?? 'send_failed', updated_at: finishedIso })
    .eq('survey_id', survey.id);
  return { sent: false, reason: result.error ?? 'send_failed' };
}
