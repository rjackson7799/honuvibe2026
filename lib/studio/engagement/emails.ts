// Discovery-questionnaire emails (engagement spine, slice 2). Own module —
// deliberately NOT appended to lib/email/send.ts — so the studio feature owns
// its copy and the shared sender stays untouched. Uses the shared layout
// primitives + Resend client exactly as lib/email/send.ts does.
//
// Both return a typed result (the sendPresenterSummaryEmail idiom) so the
// callers record a TRUTHFUL delivery state: the invite stamps `emailed` on the
// questionnaire_sent event, and Ryan's notification stamps notification_sent_at
// only when the provider accepted. Every dynamic value is HTML-escaped —
// business/contact names are admin-entered but the contact name originated
// from a public lead form.
//
// JA copy ships flagged for native review (CLAUDE.md: no unreviewed machine
// translation in production) — see the ship report.

import { getResendClient, getFromAddress, getAdminEmail } from '@/lib/email/client';
import {
  baseLayout,
  heading,
  paragraph,
  ctaButton,
  divider,
  detailsTable,
  accentBanner,
} from '@/lib/email/templates';
import { escapeHtml } from '@/lib/email/escape';
import type { Locale } from '@/lib/email/types';
/** Client invite to a Studio discovery questionnaire (slice 2 of the engagement spine). */
export interface DiscoveryInviteEmailData {
  locale: Locale;
  email: string;
  /** Client contact's name; null falls back to a warm generic greeting. */
  contactName: string | null;
  /** The engagement title (the client's business name). */
  businessName: string;
  /** The tokenized entry URL — the ONLY place the raw token ever appears. */
  entryUrl: string;
  /** Pre-formatted expiry date for the recipient's locale. */
  expiresOn: string;
}

/** "A client submitted the discovery questionnaire" — Ryan's notification. */
export interface DiscoverySubmittedAdminNotifyData {
  businessName: string;
  contactName: string | null;
  contactEmail: string | null;
  questionnaireTitle: string;
  answeredCount: number;
  questionCount: number;
  /** Absolute link to the engagement workspace. */
  engagementUrl: string;
}

/** Client invite carrying the tokenized entry link. In questionnaire.locale. */
export async function sendDiscoveryQuestionnaireInvite(
  data: DiscoveryInviteEmailData,
): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) return { ok: false, error: 'email_not_configured' };
  if (!data.email) return { ok: false, error: 'no_recipient' };

  const isJP = data.locale === 'ja';
  const business = escapeHtml(data.businessName);
  const name = data.contactName ? escapeHtml(data.contactName) : null;
  const expiresOn = escapeHtml(data.expiresOn);

  // JA copy ships flagged for native review (CLAUDE.md: no unreviewed machine
  // translation in production) — see the ship report.
  const body = [
    heading(
      isJP
        ? name
          ? `${name} さん、いくつか質問させてください`
          : 'いくつか質問させてください'
        : name
          ? `A few questions before we build, ${name}`
          : 'A few questions before we build',
    ),
    paragraph(
      isJP
        ? `${business} のプロジェクトを始めるにあたり、短いディスカバリー・アンケートをご用意しました。ご回答は、何を作り、どう成果を測るかの土台になります。所要時間は15〜20分ほどです。`
        : `To kick off the ${business} project, I've put together a short discovery questionnaire. Your answers shape what we build and how we measure it. It takes about 15–20 minutes.`,
    ),
    paragraph(
      isJP
        ? '回答は自動保存されるので、途中で閉じても同じリンクから再開できます。おおよその数字で構いません。'
        : "Your answers save automatically, so you can close the tab and pick up later from the same link. Rough numbers are fine.",
    ),
    ctaButton({ href: data.entryUrl, label: isJP ? 'アンケートを開く →' : 'Open the questionnaire →' }),
    divider(),
    paragraph(
      isJP
        ? `このリンクはあなた専用です。${expiresOn} まで有効です。ご不明な点があれば、このメールにそのまま返信してください。`
        : `This link is personal to you and stays open until ${expiresOn}. Reply to this email with any questions.`,
    ),
    paragraph(isJP ? 'Ryan / HonuVibe Studio' : '— Ryan, HonuVibe Studio'),
  ].join('');

  const adminEmail = getAdminEmail();
  try {
    const { data: sent, error } = await resend.emails.send({
      from: getFromAddress(),
      to: data.email,
      replyTo: adminEmail || undefined,
      subject: isJP
        ? `【HonuVibe Studio】${data.businessName} — 制作前のアンケートのお願い`
        : `A few questions before we build — ${data.businessName}`,
      html: baseLayout({
        locale: data.locale,
        preheader: isJP ? '制作前のディスカバリー・アンケート' : 'Your discovery questionnaire',
        body,
      }),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, providerId: sent?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send_failed' };
  }
}

/** Ryan's "a client submitted the questionnaire" notification. EN-only (admin). */
export async function sendDiscoverySubmittedAdminNotification(
  data: DiscoverySubmittedAdminNotifyData,
): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) return { ok: false, error: 'email_not_configured' };
  const adminEmail = getAdminEmail();
  if (!adminEmail) return { ok: false, error: 'no_recipient' };

  const body = [
    accentBanner('Discovery questionnaire submitted'),
    detailsTable([
      { label: 'Client', value: escapeHtml(data.businessName) },
      { label: 'Contact', value: escapeHtml(data.contactName ?? '') },
      { label: 'Email', value: escapeHtml(data.contactEmail ?? '') },
      { label: 'Questionnaire', value: escapeHtml(data.questionnaireTitle) },
      { label: 'Answered', value: `${data.answeredCount} of ${data.questionCount}` },
    ]),
    paragraph(
      'The answers digest is ready now and the AI discovery brief is generating — open the engagement to read both.',
    ),
    ctaButton({ href: data.engagementUrl, label: 'Open the engagement →' }),
  ].join('');

  try {
    const { data: sent, error } = await resend.emails.send({
      from: getFromAddress(),
      to: adminEmail,
      replyTo: data.contactEmail ?? undefined,
      subject: `[Discovery] ${data.businessName} submitted the questionnaire`,
      html: baseLayout({ locale: 'en', body }),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, providerId: sent?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send_failed' };
  }
}
