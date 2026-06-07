import { getResendClient, getFromAddress } from './client';
import { baseLayout, heading, paragraph, ctaButton, divider, detailsTable } from './templates';
import type { Locale } from './types';

export interface EventEmailResult {
  ok: boolean;
  error?: string;
}

export interface EventEmailData {
  to: string;
  fullName: string | null;
  locale: Locale;
  eventTitle: string;
  presenterName: string | null;
  /** Pre-formatted date/time in the event timezone + recipient locale. */
  whenText: string;
  /** Magic-link CTA that lands the recipient on the gated event page. */
  ctaUrl: string;
}

export interface EventInviteEmailData extends EventEmailData {
  /** Raw .ics calendar contents — attached as text/calendar. */
  icsContent: string;
}

async function send(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}): Promise<EventEmailResult> {
  const resend = getResendClient();
  if (!resend || !opts.to) return { ok: false, error: 'email not configured' };
  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    });
    if (error) return { ok: false, error: `${error.name}: ${error.message}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error' };
  }
}

function greetingName(fullName: string | null, isJP: boolean): string {
  const trimmed = fullName?.trim();
  if (trimmed && trimmed.length > 0) return trimmed;
  return isJP ? 'お客様' : 'there';
}

function eventDetails(data: EventEmailData, isJP: boolean): string {
  return detailsTable([
    { label: isJP ? '日時' : 'When', value: data.whenText },
    { label: isJP ? '講師' : 'Presenter', value: data.presenterName ?? '' },
  ]);
}

/** Invite — carries the .ics; CTA is a magic link to the gated event page. */
export async function sendEventInviteEmail(
  data: EventInviteEmailData,
): Promise<EventEmailResult> {
  const isJP = data.locale === 'ja';
  const name = greetingName(data.fullName, isJP);

  const body = [
    heading(isJP ? `ご招待：${data.eventTitle}` : `You're invited: ${data.eventTitle}`),
    paragraph(
      isJP
        ? `${name}さん、HonuVibe.AIの招待制ライブトレーニングへご招待します。下のボタンからイベント詳細の確認と参加のお返事ができます。`
        : `Hi ${name}, you're invited to an invite-only live training at HonuVibe.AI. Use the button below to see the details and RSVP.`,
    ),
    eventDetails(data, isJP),
    ctaButton({
      href: data.ctaUrl,
      label: isJP ? 'イベントを見る・参加表明 →' : 'View event & RSVP →',
    }),
    divider(),
    paragraph(
      isJP
        ? 'この招待はあなた専用です。リンクは他の人と共有しないでください。カレンダー用の招待ファイル（.ics）を添付しています。'
        : 'This invite is just for you — please don\'t share the link. A calendar file (.ics) is attached.',
    ),
  ].join('');

  return send({
    to: data.to,
    subject: isJP
      ? `【ご招待】${data.eventTitle}`
      : `You're invited: ${data.eventTitle}`,
    html: baseLayout({
      locale: data.locale,
      preheader: isJP ? 'ライブトレーニングへのご招待' : 'An invitation to a live training',
      body,
    }),
    attachments: [
      {
        filename: 'event.ics',
        content: Buffer.from(data.icsContent, 'utf-8'),
        contentType: 'text/calendar',
      },
    ],
  });
}

/** Reminder — same details, "starts soon" framing. */
export async function sendEventReminderEmail(
  data: EventEmailData,
): Promise<EventEmailResult> {
  const isJP = data.locale === 'ja';
  const name = greetingName(data.fullName, isJP);

  const body = [
    heading(isJP ? `まもなく開始：${data.eventTitle}` : `Starting soon: ${data.eventTitle}`),
    paragraph(
      isJP
        ? `${name}さん、ご招待中のライブトレーニングがまもなく始まります。下のボタンから参加してください。`
        : `Hi ${name}, the live training you're invited to is coming up. Use the button below to join.`,
    ),
    eventDetails(data, isJP),
    ctaButton({
      href: data.ctaUrl,
      label: isJP ? 'イベントへ →' : 'Open the event →',
    }),
  ].join('');

  return send({
    to: data.to,
    subject: isJP
      ? `【まもなく開始】${data.eventTitle}`
      : `Reminder: ${data.eventTitle}`,
    html: baseLayout({
      locale: data.locale,
      preheader: isJP ? 'まもなく開始します' : 'Starting soon',
      body,
    }),
  });
}

/** Recap — recording/notes are ready on the gated event page. */
export async function sendEventRecapEmail(
  data: EventEmailData,
): Promise<EventEmailResult> {
  const isJP = data.locale === 'ja';
  const name = greetingName(data.fullName, isJP);

  const body = [
    heading(isJP ? `振り返り公開：${data.eventTitle}` : `Recap is ready: ${data.eventTitle}`),
    paragraph(
      isJP
        ? `${name}さん、「${data.eventTitle}」の録画とノートを公開しました。下のボタンからご覧いただけます。`
        : `Hi ${name}, the recording and notes for "${data.eventTitle}" are now available. Use the button below to watch.`,
    ),
    ctaButton({
      href: data.ctaUrl,
      label: isJP ? '振り返りを見る →' : 'View the recap →',
    }),
  ].join('');

  return send({
    to: data.to,
    subject: isJP
      ? `【振り返り公開】${data.eventTitle}`
      : `Recap available: ${data.eventTitle}`,
    html: baseLayout({
      locale: data.locale,
      preheader: isJP ? '録画とノートが公開されました' : 'The recording and notes are ready',
      body,
    }),
  });
}
