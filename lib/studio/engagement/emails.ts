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

/** Client "your deposit is ready to pay" (slice 4, migration 075). In proposal.locale. */
export interface DepositRequestEmailData {
  locale: Locale;
  email: string;
  contactName: string | null;
  /** The engagement title (the client's business name). */
  businessName: string;
  /** Pre-formatted via formatMinorUnits — "$437.50" / "¥66,000". */
  amount: string;
  /** 50 or 100 — named in the copy only when it is a part payment. */
  pct: number;
  /** The tokenized ENTRY URL — never a Stripe URL. The raw token's one appearance. */
  entryUrl: string;
  /** Pre-formatted link expiry for the recipient's locale. */
  linkExpiresOn: string;
  version: number;
}

/**
 * The deposit request. It links to the PROPOSAL PAGE via the tokenized entry
 * URL (decision 5 / judgment call 8) — never to Stripe: a Checkout Session is
 * minted on demand behind the cookie, so no durable payment URL exists in any
 * inbox. Every dynamic value is escapeHtml'd.
 * JA copy ships FLAGGED FOR NATIVE REVIEW.
 */
export async function sendDepositRequestEmail(
  data: DepositRequestEmailData,
): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) return { ok: false, error: 'email_not_configured' };
  if (!data.email) return { ok: false, error: 'no_recipient' };

  const isJP = data.locale === 'ja';
  const business = escapeHtml(data.businessName);
  const name = data.contactName ? escapeHtml(data.contactName) : null;
  const amount = escapeHtml(data.amount);
  const linkExpiresOn = escapeHtml(data.linkExpiresOn);
  const partial = data.pct < 100;

  const body = [
    heading(
      isJP
        ? name
          ? `${name} さん、${business} のお支払いのご案内です`
          : `${business} のお支払いのご案内です`
        : name
          ? `Your deposit for ${business} is ready to pay, ${name}`
          : `Your deposit for ${business} is ready to pay`,
    ),
    paragraph(
      isJP
        ? partial
          ? `ご承諾いただきありがとうございます。制作費の ${data.pct}% にあたる ${amount} を、着手金としてお支払いください。ご入金の確認後に制作を開始します。`
          : `ご承諾いただきありがとうございます。制作費 ${amount} の全額のお支払いをお願いいたします。ご入金の確認後に制作を開始します。`
        : partial
          ? `Thank you for accepting. The deposit is ${amount} — ${data.pct}% of the build investment. Work starts once it is received.`
          : `Thank you for accepting. The build investment is ${amount}, due in full. Work starts once it is received.`,
    ),
    paragraph(
      isJP
        ? '下のボタンからご提案書のページを開き、ページ上部のお支払いボタンからお進みください。'
        : "Open your proposal with the button below, then use the payment button at the top of the page.",
    ),
    ctaButton({ href: data.entryUrl, label: isJP ? '提案書を開く →' : 'Open your proposal →' }),
    divider(),
    paragraph(
      isJP
        ? `このリンクはあなた専用です。${linkExpiresOn} まで開けます。お支払いはStripeの安全な決済ページで行われ、当方がカード情報を見ることはありません。ご不明な点があれば、このメールにそのまま返信してください。`
        : `This link is personal to you and opens until ${linkExpiresOn}. You'll pay on Stripe's secure page; we never see your card details. Reply to this email with any questions.`,
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
        ? `【HonuVibe Studio】${data.businessName} — お支払いのご案内（${data.amount}）`
        : `Your deposit for ${data.businessName} — ${data.amount}`,
      html: baseLayout({
        locale: data.locale,
        preheader: isJP ? 'お支払いのご案内' : 'Your deposit is ready to pay',
        body,
      }),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, providerId: sent?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send_failed' };
  }
}

/** "An invoice was paid (or needs a refund)" — Ryan's notification (slice 4). */
export interface InvoicePaidAdminNotifyData {
  businessName: string;
  contactName: string | null;
  contactEmail: string | null;
  /** "Deposit" | "Build investment" | "Balance" | "Care" — invoiceNoun(). */
  kind: string;
  /** Pre-formatted via formatMinorUnits. */
  amount: string;
  currency: 'USD' | 'JPY';
  pct: number | null;
  version: number | null;
  variant: 'paid' | 'paid_on_void' | 'duplicate_payment' | 'not_found';
  paymentIntentId: string | null;
  /** Absolute link to the engagement workspace ('' when there is no engagement left). */
  engagementUrl: string;
}

/** Ryan's "money moved" notification. EN-only (admin). */
export async function sendInvoicePaidAdminNotification(
  data: InvoicePaidAdminNotifyData,
): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) return { ok: false, error: 'email_not_configured' };
  const adminEmail = getAdminEmail();
  if (!adminEmail) return { ok: false, error: 'no_recipient' };

  const banner =
    data.variant === 'paid'
      ? `${data.kind} received`
      : data.variant === 'paid_on_void'
        ? 'Payment landed on a VOIDED invoice'
        : data.variant === 'duplicate_payment'
          ? 'DUPLICATE payment on an already-paid invoice'
          : 'Payment for an engagement that no longer exists';

  const action =
    data.variant === 'paid'
      ? 'Open the engagement to kick off the build — the payment is flagged as needing your attention until you resolve it.'
      : data.variant === 'paid_on_void'
        ? 'This invoice had already been voided when the payment arrived. Refund the payment intent below in the Stripe dashboard, or re-issue the deposit if the deal is back on.'
        : data.variant === 'duplicate_payment'
          ? 'A second, DIFFERENT payment landed on an invoice that was already paid. Refund the payment intent below in the Stripe dashboard — nothing was changed on the invoice.'
          : 'Stripe took this payment but the engagement (and its invoice) no longer exist, so there is nowhere to record it. Refund it in the Stripe dashboard or reconcile it by hand.';

  const rows = [
    { label: 'Client', value: escapeHtml(data.businessName) },
    { label: 'Contact', value: escapeHtml(data.contactName ?? '') },
    { label: 'Email', value: escapeHtml(data.contactEmail ?? '') },
    { label: 'Invoice', value: escapeHtml(data.kind) },
    { label: 'Amount', value: escapeHtml(data.amount) },
    { label: 'Currency', value: data.currency },
  ];
  if (data.pct !== null) rows.push({ label: 'Percentage of build', value: `${data.pct}%` });
  if (data.version !== null) rows.push({ label: 'Proposal', value: `v${data.version}` });
  if (data.paymentIntentId) rows.push({ label: 'Payment intent', value: escapeHtml(data.paymentIntentId) });

  const body = [
    accentBanner(banner),
    detailsTable(rows),
    paragraph(action),
    ...(data.engagementUrl ? [ctaButton({ href: data.engagementUrl, label: 'Open the engagement →' })] : []),
  ].join('');

  const subject =
    data.variant === 'paid'
      ? `[Studio] ${data.kind} received — ${data.businessName} (${data.amount})`
      : data.variant === 'paid_on_void'
        ? `[Studio] Payment on a VOIDED invoice — ${data.businessName} (${data.amount})`
        : data.variant === 'duplicate_payment'
          ? `[Studio] DUPLICATE payment — ${data.businessName} (${data.amount})`
          : `[Studio] Payment for a deleted engagement (${data.amount}, ${data.paymentIntentId ?? 'unknown pi'})`;

  try {
    const { data: sent, error } = await resend.emails.send({
      from: getFromAddress(),
      to: adminEmail,
      replyTo: data.contactEmail ?? undefined,
      subject,
      html: baseLayout({ locale: 'en', body }),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, providerId: sent?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send_failed' };
  }
}
