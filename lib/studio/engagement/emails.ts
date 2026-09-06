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

/** "A proposal was accepted" — Ryan's notification (slice 3, migration 074). */
export interface ProposalAcceptedAdminNotifyData {
  businessName: string;
  contactName: string | null;
  contactEmail: string | null;
  acceptedByName: string;
  via: 'client' | 'admin';
  /** Pre-formatted via formatMinorUnits. */
  totalBuild: string;
  monthlyCare: string;
  currency: 'USD' | 'JPY';
  version: number;
  stageMoved: boolean;
  /** Absolute link to the engagement workspace. */
  engagementUrl: string;
}

/** Ryan's "proposal accepted" notification. EN-only (admin). */
export async function sendProposalAcceptedAdminNotification(
  data: ProposalAcceptedAdminNotifyData,
): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) return { ok: false, error: 'email_not_configured' };
  const adminEmail = getAdminEmail();
  if (!adminEmail) return { ok: false, error: 'no_recipient' };

  const body = [
    accentBanner('Proposal accepted'),
    detailsTable([
      { label: 'Client', value: escapeHtml(data.businessName) },
      { label: 'Contact', value: escapeHtml(data.contactName ?? '') },
      { label: 'Email', value: escapeHtml(data.contactEmail ?? '') },
      { label: 'Accepted by', value: escapeHtml(data.acceptedByName) },
      { label: 'Via', value: data.via === 'client' ? 'Client (proposal page)' : 'You (marked accepted)' },
      { label: 'Proposal', value: `v${data.version}` },
      { label: 'Total build', value: escapeHtml(data.totalBuild) },
      { label: 'Monthly care', value: escapeHtml(data.monthlyCare) },
      { label: 'Currency', value: data.currency },
      { label: 'Stage moved to Build', value: data.stageMoved ? 'Yes' : 'No (already past Proposal)' },
    ]),
    paragraph('The contract value is on the engagement record. Open it to kick off the build — the acceptance is flagged as needing your attention until you resolve it.'),
    ctaButton({ href: data.engagementUrl, label: 'Open the engagement →' }),
  ].join('');

  try {
    const { data: sent, error } = await resend.emails.send({
      from: getFromAddress(),
      to: adminEmail,
      replyTo: data.contactEmail ?? undefined,
      subject: `[Proposal] ${data.businessName} accepted v${data.version} — ${data.totalBuild} build`,
      html: baseLayout({ locale: 'en', body }),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, providerId: sent?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send_failed' };
  }
}

/** Client invite to a tokenized proposal page (slice 3, slice B). In proposal.locale. */
export interface ProposalInviteEmailData {
  locale: Locale;
  email: string;
  contactName: string | null;
  /** The engagement title (the client's business name). */
  businessName: string;
  /** Proposal version — named in the copy only when > 1 ("replaces the earlier version"). */
  version: number;
  /** 'issued' on first send; 'accepted_resend' when the link is refreshed on an accepted row. */
  variant: 'issued' | 'accepted_resend';
  /** The tokenized entry URL — the ONLY place the raw token ever appears. */
  entryUrl: string;
  /** Pre-formatted valid_until for the recipient's locale (null on a resend without one — never in practice). */
  validUntil: string | null;
  /** Pre-formatted link expiry for the recipient's locale. */
  linkExpiresOn: string;
}

/**
 * Client invite carrying the tokenized proposal link. Same primitives as the
 * questionnaire invite; every dynamic value escapeHtml'd. The `accepted_resend`
 * variant says "your accepted proposal" and never asks for a decision.
 * JA copy ships FLAGGED FOR NATIVE REVIEW.
 */
export async function sendProposalInvite(
  data: ProposalInviteEmailData,
): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) return { ok: false, error: 'email_not_configured' };
  if (!data.email) return { ok: false, error: 'no_recipient' };

  const isJP = data.locale === 'ja';
  const accepted = data.variant === 'accepted_resend';
  const business = escapeHtml(data.businessName);
  const name = data.contactName ? escapeHtml(data.contactName) : null;
  const validUntil = data.validUntil ? escapeHtml(data.validUntil) : null;
  const linkExpiresOn = escapeHtml(data.linkExpiresOn);
  const versionLine = data.version > 1;

  const parts: string[] = [];
  parts.push(
    heading(
      isJP
        ? accepted
          ? name
            ? `${name} さん、ご承諾いただいた提案書のリンクです`
            : 'ご承諾いただいた提案書のリンクです'
          : name
            ? `${name} さん、${business} のご提案書をお届けします`
            : `${business} のご提案書をお届けします`
        : accepted
          ? name
            ? `A fresh link to your accepted proposal, ${name}`
            : 'A fresh link to your accepted proposal'
          : name
            ? `Your proposal is ready, ${name}`
            : 'Your proposal is ready',
    ),
  );
  if (accepted) {
    parts.push(
      paragraph(
        isJP
          ? `${business} 向けにご承諾いただいた提案書（v${data.version}）を、いつでも閲覧・PDFでダウンロードいただけるよう新しいリンクをお送りします。内容に変更はありません。`
          : `Here is a fresh link to the ${business} proposal you accepted (v${data.version}), so you can read it and download the PDF any time. Nothing in it has changed.`,
      ),
    );
  } else {
    parts.push(
      paragraph(
        isJP
          ? `${business} 向けのご提案書をまとめました。下のリンクから、内容の確認、PDFのダウンロード、そしてご承諾の手続きができます。`
          : `I've put together the proposal for ${business}. Open the link below to read it, download the PDF, and accept it when you're ready.`,
      ),
    );
    if (versionLine) {
      parts.push(
        paragraph(
          isJP
            ? `これは提案書 v${data.version} で、以前お送りしたバージョンに代わるものです。以前のリンクは開けなくなっています。`
            : `This is version ${data.version} — it replaces the earlier version, whose link no longer opens.`,
        ),
      );
    }
    if (validUntil) {
      parts.push(
        paragraph(
          isJP
            ? `この提案内容は ${validUntil} まで有効です。`
            : `The proposal is valid until ${validUntil}.`,
        ),
      );
    }
  }
  parts.push(ctaButton({ href: data.entryUrl, label: isJP ? '提案書を開く →' : 'Open your proposal →' }));
  parts.push(divider());
  parts.push(
    paragraph(
      isJP
        ? `このリンクはあなた専用です。${linkExpiresOn} まで開けます。ご不明な点があれば、このメールにそのまま返信してください。`
        : `This link is personal to you and opens until ${linkExpiresOn}. Reply to this email with any questions.`,
    ),
  );
  parts.push(paragraph(isJP ? 'Ryan / HonuVibe Studio' : '— Ryan, HonuVibe Studio'));

  const adminEmail = getAdminEmail();
  try {
    const { data: sent, error } = await resend.emails.send({
      from: getFromAddress(),
      to: data.email,
      replyTo: adminEmail || undefined,
      subject: isJP
        ? accepted
          ? `【HonuVibe Studio】${data.businessName} — ご承諾済み提案書のリンク`
          : `【HonuVibe Studio】${data.businessName} — ご提案書のお届け`
        : accepted
          ? `A fresh link to your accepted proposal — ${data.businessName}`
          : `Your proposal from HonuVibe Studio — ${data.businessName}`,
      html: baseLayout({
        locale: data.locale,
        preheader: isJP ? (accepted ? 'ご承諾済み提案書のリンク' : 'ご提案書のお届け') : accepted ? 'Your accepted proposal' : 'Your proposal is ready to read',
        body: parts.join(''),
      }),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, providerId: sent?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send_failed' };
  }
}
